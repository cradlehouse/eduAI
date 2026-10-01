import "server-only";
import { createClient } from "@/lib/supabase/server";
import { normHeading, parseScript, sceneKey, type Edit } from "./screenplay";

type Source = "scene" | "cast" | "locations" | "props" | "script";

// The script is the one master copy. Anything added elsewhere is written into it here, logged as a
// change ("added in Scene 2 · who · when", undoable), and the scenes table re-follows the script.
export async function writeScript(projectId: string, edit: Edit, change: { source: Source; label: string; scene?: number | null }) {
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("org_id").eq("id", projectId).maybeSingle();
  if (!project) return { error: "Project not found." };
  const { data, error } = await supabase.from("projects").update({ script: edit.text, script_updated_at: new Date().toISOString() }).eq("id", projectId).select("id");
  if (error || !data?.length) return { error: error?.message ?? "You can't edit this project's script." };
  await supabase.from("script_changes").insert({ org_id: project.org_id, project_id: projectId, source: change.source, label: change.label, snippet: edit.snippet, scene_position: change.scene ?? null });
  await syncScenes(projectId, edit.text);
  return { ok: true as const };
}

export async function currentScript(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("script").eq("id", projectId).maybeSingle();
  return data?.script ?? "";
}

// Scenes follow the script: walk the script's scenes in order and match each to a scenes row with the
// same heading (in order); a row whose heading changed in place keeps its shots. New scenes are
// created; rows no longer in the script move to the end, kept (their shots and takes are the crew's work).
export async function syncScenes(projectId: string, text: string) {
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("org_id").eq("id", projectId).maybeSingle();
  if (!project) return;
  const parsed = parseScript(text).scenes;
  if (!parsed.length) return;
  const { data: rows } = await supabase.from("scenes").select("id, position, heading").eq("project_id", projectId).order("position");
  const pool = [...(rows ?? [])];
  const order: string[] = [];
  for (const sc of parsed) {
    const h = normHeading(sc.heading);
    let i = pool.findIndex((r) => normHeading(r.heading || "") === h);
    // The same scene written another way ("ext. of diner night" / EXT. DINER - NIGHT).
    if (i < 0) i = pool.findIndex((r) => !!r.heading && sceneKey(r.heading) === sceneKey(sc.heading));
    // No same-heading row: reuse the next row whose heading appears nowhere in the script (a rename).
    if (i < 0) i = pool.findIndex((r) => !r.heading || !parsed.some((p) => normHeading(p.heading) === normHeading(r.heading)));
    const excerpt = text.slice(sc.start, sc.end);
    if (i >= 0) {
      const row = pool.splice(i, 1)[0];
      await supabase.from("scenes").update({ heading: sc.heading, time_of_day: sc.timeOfDay.toLowerCase(), script_excerpt: excerpt }).eq("id", row.id);
      order.push(row.id);
    } else {
      // Park new rows far out of the way; set_scene_order renumbers everything in one statement.
      const { data: made } = await supabase.from("scenes").insert({
        org_id: project.org_id, project_id: projectId, position: 10000 + order.length, title: sc.heading,
        heading: sc.heading, time_of_day: sc.timeOfDay.toLowerCase(), script_excerpt: excerpt,
      }).select("id").single();
      if (made) order.push(made.id);
    }
  }
  // A leftover row that is the same scene as one in the script is a duplicate: fold its people, place
  // and shots into the script's scene and drop it, so nothing is planned or shot twice.
  const keyOf = new Map<string, string>();
  for (const [n, sc] of parsed.entries()) if (!keyOf.has(sceneKey(sc.heading))) keyOf.set(sceneKey(sc.heading), order[n]);
  const kept = [];
  for (const r of pool) {
    const into = r.heading ? keyOf.get(sceneKey(r.heading)) : undefined;
    if (into && (await mergeScene(r.id, into))) continue;
    kept.push(r.id);
  }
  order.push(...kept);
  await supabase.rpc("set_scene_order", { p_project: projectId, p_ids: order });
}

async function mergeScene(fromId: string, intoId: string) {
  const supabase = await createClient();
  const [{ data: from }, { data: into }, { data: links }, { data: moving }, { data: last }] = await Promise.all([
    supabase.from("scenes").select("org_id, location_entry_id").eq("id", fromId).maybeSingle(),
    supabase.from("scenes").select("location_entry_id").eq("id", intoId).maybeSingle(),
    supabase.from("scene_bible_entries").select("bible_entry_id").eq("scene_id", fromId),
    supabase.from("shots").select("id").eq("scene_id", fromId).order("position"),
    supabase.from("shots").select("position").eq("scene_id", intoId).order("position", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!from || !into) return false;
  if (links?.length) await supabase.from("scene_bible_entries").upsert(links.map((l) => ({ org_id: from.org_id, scene_id: intoId, bible_entry_id: l.bible_entry_id })), { onConflict: "scene_id,bible_entry_id", ignoreDuplicates: true });
  if (!into.location_entry_id && from.location_entry_id) await supabase.from("scenes").update({ location_entry_id: from.location_entry_id }).eq("id", intoId);
  let pos = last?.position ?? 0;
  for (const sh of moving ?? []) {
    const { error } = await supabase.from("shots").update({ scene_id: intoId, position: ++pos }).eq("id", sh.id);
    if (error) return false; // keep the row rather than lose a shot
  }
  const { error } = await supabase.from("scenes").delete().eq("id", fromId);
  return !error;
}
