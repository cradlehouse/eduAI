"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { breakDownScript, type BreakdownT } from "@/lib/script/breakdown";
import { normHeading, parseScript, removeSnippet, setHeading } from "@/lib/script/screenplay";
import { currentScript, syncScenes, writeScript } from "@/lib/script/sync";

export async function saveScript(projectId: string, script: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").update({ script, script_updated_at: new Date().toISOString() }).eq("id", projectId).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "You can't edit this project's script." };
  await syncScenes(projectId, script);
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: true };
}

// Undo a change the app wrote into the script: take its text back out. What was made alongside it
// (a character, a location) stays where it is; the student deletes that on its own page if they want.
export async function undoScriptChange(projectId: string, changeId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const [{ data: ch }, { data: proj }] = await Promise.all([
    supabase.from("script_changes").select("id, snippet, undone_at").eq("id", changeId).eq("project_id", projectId).maybeSingle(),
    supabase.from("projects").select("script").eq("id", projectId).maybeSingle(),
  ]);
  if (!ch || ch.undone_at) return { error: "That change is already undone." };
  if (!ch.snippet) return { error: "A cut line can't be put back from here. Add it again from the scene." };
  const next = removeSnippet(proj?.script ?? "", ch.snippet);
  if (next === null) return { error: "That text isn't in the script any more (it was edited by hand), so there is nothing to undo." };
  const saved = await saveScript(projectId, next);
  if ("error" in saved) return saved;
  await supabase.from("script_changes").update({ undone_at: new Date().toISOString() }).eq("id", changeId);
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: true };
}

export async function runBreakdown(projectId: string, script: string) {
  const saved = await saveScript(projectId, script);
  if ("error" in saved) return saved;
  if (script.trim().length < 40) return { error: "Write or paste a bit more script first." };
  return breakDownScript(script);
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

// Apply what the student kept. Existing bible entries are matched by name (never duplicated); scenes
// follow the script (see below); everything else is created. Nothing is deleted.
export async function applyBreakdown(projectId: string, b: BreakdownT): Promise<{ ok: true; summary: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: project } = await supabase.from("projects").select("org_id").eq("id", projectId).maybeSingle();
  if (!project) return { error: "Project not found." };
  const org = project.org_id;

  const { data: existing } = await supabase.from("bible_entries").select("id, kind, name, appearance, description").eq("project_id", projectId);
  const byKey = new Map((existing ?? []).map((e) => [`${e.kind}:${norm(e.name)}`, e]));
  const ids = new Map<string, string>(); // "kind:name" -> id
  let created = 0, updated = 0;

  async function upsert(kind: "character" | "location" | "prop", name: string, description: string, appearance: string) {
    const key = `${kind}:${norm(name)}`;
    const cur = byKey.get(key);
    if (cur) {
      // Fill blanks only: never overwrite what a student already wrote.
      const patch: { appearance?: string; description?: string } = {};
      if (!cur.appearance && appearance) patch.appearance = appearance;
      if (!cur.description && description) patch.description = description;
      if (Object.keys(patch).length) { await supabase.from("bible_entries").update(patch).eq("id", cur.id); updated++; }
      ids.set(key, cur.id);
      return;
    }
    const { data, error } = await supabase.from("bible_entries").insert({
      org_id: org, project_id: projectId, kind, name: name.trim(), description, appearance, source: "script",
      likeness_of: null, requires_consent: false, created_by: user!.id,
    }).select("id").single();
    if (error) throw new Error(`${name}: ${error.message}`);
    ids.set(key, data.id); created++;
  }

  try {
    for (const c of b.characters) await upsert("character", c.name, c.who, c.appearance);
    for (const l of b.locations) await upsert("location", l.name, `${l.int_ext}${l.times.length ? ` · ${l.times.join(", ")}` : ""}`, l.appearance);
    for (const p of b.props) await upsert("prop", p.name, "", p.appearance);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save the bible entries." };
  }

  // Scenes come from the script, never from the breakdown alone: the breakdown's scene N is the script's
  // scene N. Where it tidied a heading ("ext. of diner night" → EXT. DINER - NIGHT), the tidy heading is
  // written into the script (logged, undoable) rather than made into a second scene beside it.
  let text = await currentScript(projectId);
  await syncScenes(projectId, text);
  let tidied = 0;
  for (const s of [...b.scenes].sort((x, y) => x.number - y.number)) {
    const inScript = parseScript(text).scenes[s.number - 1];
    if (!inScript) continue;
    if (s.heading.trim() && normHeading(s.heading) !== normHeading(inScript.heading)) {
      const ed = setHeading(text, s.number, s.heading);
      const w = await writeScript(projectId, ed, { source: "script", label: `Scene ${s.number} heading tidied: ${normHeading(s.heading)}`, scene: s.number });
      if (!("error" in w)) { text = ed.text; tidied++; }
    }
    const { data: row } = await supabase.from("scenes").select("id").eq("project_id", projectId).eq("position", s.number).maybeSingle();
    if (!row) continue;
    const locId = ids.get(`location:${norm(s.location)}`) ?? null;
    await supabase.from("scenes").update({ time_of_day: s.time_of_day, location_entry_id: locId, synopsis: s.synopsis }).eq("id", row.id);
    const links = [
      ...s.characters.map((n) => ids.get(`character:${norm(n)}`)),
      ...s.props.map((n) => ids.get(`prop:${norm(n)}`)),
    ].filter((x): x is string => !!x);
    if (links.length) await supabase.from("scene_bible_entries").upsert(links.map((id) => ({ org_id: org, scene_id: row.id, bible_entry_id: id })), { onConflict: "scene_id,bible_entry_id", ignoreDuplicates: true });
  }

  const { data: after } = await supabase.from("projects").select("script").eq("id", projectId).maybeSingle();
  if (after?.script) await syncScenes(projectId, after.script);
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: true, summary: `${created} added to the bible, ${updated} filled in${tidied ? `, ${tidied} scene heading${tidied === 1 ? "" : "s"} tidied in the script` : ""}.` };
}
