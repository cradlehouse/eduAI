import "server-only";
import { createClient } from "@/lib/supabase/server";
import { readiness, type Entry, type Kind } from "./readiness";

// The rows readiness() needs, fetched as the signed-in user, plus the result.
export async function loadReadiness(projectId: string) {
  const supabase = await createClient();
  const [{ data: project }, { data: entries }, { data: scenes }, { data: shots }] = await Promise.all([
    supabase.from("projects").select("script").eq("id", projectId).maybeSingle(),
    supabase.from("bible_entries").select("id, kind, name, reference_asset_id, voice_asset_id, room_tone_asset_id").eq("project_id", projectId).in("kind", ["character", "location", "prop"]).order("created_at"),
    supabase.from("scenes").select("id, position, heading, title, location_entry_id, plan_note").eq("project_id", projectId).order("position"),
    supabase.from("shots").select("id, scene_id, position, label, selected_take_id").eq("project_id", projectId).order("position"),
  ]);
  const ids = (scenes ?? []).map((s) => s.id);
  const { data: links } = ids.length
    ? await supabase.from("scene_bible_entries").select("scene_id, bible_entry_id").in("scene_id", ids)
    : { data: [] as { scene_id: string; bible_entry_id: string }[] };
  const list: Entry[] = (entries ?? []).map((e) => ({ ...e, kind: e.kind as Kind, name: e.name ?? "" }));
  return readiness({ projectId, script: project?.script ?? "", entries: list, scenes: scenes ?? [], links: links ?? [], shots: shots ?? [] });
}
