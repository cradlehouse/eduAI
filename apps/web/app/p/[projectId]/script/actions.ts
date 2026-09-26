"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { breakDownScript, type BreakdownT } from "@/lib/script/breakdown";

export async function saveScript(projectId: string, script: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").update({ script, script_updated_at: new Date().toISOString() }).eq("id", projectId).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "You can't edit this project's script." };
  revalidatePath(`/p/${projectId}`);
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
// are matched by slugline; everything else is created. Nothing is deleted.
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

  const { data: scenes } = await supabase.from("scenes").select("id, position, heading, title").eq("project_id", projectId).order("position");
  const byHeading = new Map((scenes ?? []).filter((s) => s.heading).map((s) => [norm(s.heading), s]));
  let pos = (scenes ?? []).reduce((m, s) => Math.max(m, s.position), 0);
  let scenesCreated = 0;
  for (const s of [...b.scenes].sort((x, y) => x.number - y.number)) {
    const locId = ids.get(`location:${norm(s.location)}`) ?? null;
    const fields = { heading: s.heading, time_of_day: s.time_of_day, location_entry_id: locId, synopsis: s.synopsis, script_excerpt: s.excerpt };
    let sceneId: string;
    const cur = byHeading.get(norm(s.heading));
    if (cur) {
      await supabase.from("scenes").update(fields).eq("id", cur.id);
      sceneId = cur.id;
    } else {
      pos += 1;
      const { data, error } = await supabase.from("scenes").insert({ org_id: org, project_id: projectId, position: pos, title: s.heading, ...fields }).select("id").single();
      if (error) return { error: `Scene ${s.number}: ${error.message}` };
      sceneId = data.id; scenesCreated++;
    }
    const links = [
      ...s.characters.map((n) => ids.get(`character:${norm(n)}`)),
      ...s.props.map((n) => ids.get(`prop:${norm(n)}`)),
    ].filter((x): x is string => !!x);
    if (links.length) await supabase.from("scene_bible_entries").upsert(links.map((id) => ({ org_id: org, scene_id: sceneId, bible_entry_id: id })), { onConflict: "scene_id,bible_entry_id", ignoreDuplicates: true });
  }

  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: true, summary: `${created} added to the bible, ${updated} filled in, ${scenesCreated} scene${scenesCreated === 1 ? "" : "s"} created.` };
}
