import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { StripScene } from "./SceneStrip";

// What the scene strip needs: every scene with how far its shots have got, and the locations to set a new one in.
export async function stripData(projectId: string) {
  const supabase = await createClient();
  const [{ data: scenes }, { data: shots }, { data: locs }] = await Promise.all([
    supabase.from("scenes").select("id, position, heading, title").eq("project_id", projectId).order("position"),
    supabase.from("shots").select("scene_id, selected_take_id").eq("project_id", projectId),
    supabase.from("bible_entries").select("id, name").eq("project_id", projectId).eq("kind", "location").order("name"),
  ]);
  const list: StripScene[] = (scenes ?? []).map((s) => {
    const sh = (shots ?? []).filter((x) => x.scene_id === s.id);
    return { id: s.id, position: s.position, heading: s.heading || s.title || `Scene ${s.position}`, state: !sh.length ? "todo" : sh.every((x) => x.selected_take_id) ? "done" : "todo" };
  });
  return { scenes: list, locations: locs ?? [] };
}
