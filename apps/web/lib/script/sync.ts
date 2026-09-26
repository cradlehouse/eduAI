import "server-only";
import { createClient } from "@/lib/supabase/server";
import { normHeading, parseScript, type Edit } from "./screenplay";

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
  order.push(...pool.map((r) => r.id));
  await supabase.rpc("set_scene_order", { p_project: projectId, p_ids: order });
}
