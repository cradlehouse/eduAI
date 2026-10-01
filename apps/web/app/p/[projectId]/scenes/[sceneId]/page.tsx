import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseScript, sceneIndex } from "@/lib/script/screenplay";
import { SceneStrip } from "../SceneStrip";
import { stripData } from "../strip";
import { SceneBoard, type Asset, type SceneBlock } from "./SceneBoard";

// One scene: where it is, who's in it, what happens (the script's own lines), then plan the shots.
export default async function ScenePage({ params }: { params: Promise<{ projectId: string; sceneId: string }> }) {
  const { projectId, sceneId } = await params;
  const supabase = await createClient();
  const [{ data: scene }, { data: project }, { data: entries }, { data: links }, { data: shots }] = await Promise.all([
    supabase.from("scenes").select("id, position, heading, title, location_entry_id").eq("id", sceneId).maybeSingle(),
    supabase.from("projects").select("script").eq("id", projectId).maybeSingle(),
    supabase.from("bible_entries").select("id, name, kind, appearance, reference_asset_id").eq("project_id", projectId).in("kind", ["character", "location", "prop"]).order("name"),
    supabase.from("scene_bible_entries").select("bible_entry_id").eq("scene_id", sceneId),
    supabase.from("shots").select("id, position, label, selected_take_id").eq("scene_id", sceneId).order("position"),
  ]);
  // Gone: most likely folded into the same scene in the script (see syncScenes). Back to Scenes.
  if (!scene) redirect(`/p/${projectId}/scenes`);
  const text = project?.script ?? "";
  const n = sceneIndex(text, scene.position, scene.heading ?? "");
  const parsed = n ? parseScript(text).scenes[n - 1] : undefined;
  const blocks: SceneBlock[] = (parsed?.blocks ?? []).map((b, i) => ({
    i, kind: b.kind, who: b.kind === "dialogue" ? b.character : "", text: b.text, raw: text.slice(b.start, b.end),
  }));
  const inScene = new Set((links ?? []).map((l) => l.bible_entry_id));
  const assets: Asset[] = (entries ?? []).map((e) => ({ id: e.id, name: e.name, kind: e.kind as Asset["kind"], image: e.reference_asset_id, look: e.appearance, inScene: inScene.has(e.id) || e.id === scene.location_entry_id }));
  const strip = await stripData(projectId);
  return (
    <div className="flex flex-col gap-2">
      <SceneStrip projectId={projectId} scenes={strip.scenes} current={sceneId} locations={strip.locations} />
      <SceneBoard projectId={projectId} scene={{ id: scene.id, position: scene.position, heading: parsed?.heading || scene.heading || scene.title || `Scene ${scene.position}`, locationId: scene.location_entry_id, inScript: !!parsed }}
                  assets={assets} blocks={blocks} shots={(shots ?? []).map((s) => ({ id: s.id, label: s.label, chosen: !!s.selected_take_id }))} />
    </div>
  );
}
