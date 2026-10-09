import "server-only";
import { createClient } from "@/lib/supabase/server";
import { loadReadiness } from "@/lib/project/load";
import type { StripScene } from "./SceneStrip";

// What the scene strip needs: every scene with whether it's finished (set up, planned, every shot has a
// take; see lib/project/readiness), and the locations to set a new one in.
export async function stripData(projectId: string) {
  const supabase = await createClient();
  const [ready, { data: locs }] = await Promise.all([
    loadReadiness(projectId),
    supabase.from("bible_entries").select("id, name").eq("project_id", projectId).eq("kind", "location").order("name"),
  ]);
  const list: StripScene[] = ready.scenes.map((s) => ({ id: s.id, position: s.position, heading: s.heading, state: s.state }));
  return { scenes: list, locations: locs ?? [], ready };
}
