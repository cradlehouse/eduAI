import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseScript } from "@/lib/script/screenplay";
import { SceneBoard, type Asset, type SceneBlock } from "./SceneBoard";

// One scene: where it is, who's in it, what happens (the script's own lines), then plan the shots.
export default async function ScenePage({ params }: { params: Promise<{ projectId: string; sceneId: string }> }) {
  const { projectId, sceneId } = await params;
  const supabase = await createClient();
  const [{ data: scene }, { data: project }, { data: entries }, { data: links }, { data: shots }, { data: all }] = await Promise.all([
    supabase.from("scenes").select("id, position, heading, title, location_entry_id").eq("id", sceneId).maybeSingle(),
    supabase.from("projects").select("script").eq("id", projectId).maybeSingle(),
    supabase.from("bible_entries").select("id, name, kind, appearance, reference_asset_id").eq("project_id", projectId).in("kind", ["character", "location", "prop"]).order("name"),
    supabase.from("scene_bible_entries").select("bible_entry_id").eq("scene_id", sceneId),
    supabase.from("shots").select("id, position, label, selected_take_id").eq("scene_id", sceneId).order("position"),
    supabase.from("scenes").select("id, position").eq("project_id", projectId).order("position"),
  ]);
  if (!scene) notFound();
  const text = project?.script ?? "";
  const parsed = parseScript(text).scenes[scene.position - 1];
  const blocks: SceneBlock[] = (parsed?.blocks ?? []).map((b, i) => ({
    i, kind: b.kind, who: b.kind === "dialogue" ? b.character : "", text: b.text, raw: text.slice(b.start, b.end),
  }));
  const inScene = new Set((links ?? []).map((l) => l.bible_entry_id));
  const assets: Asset[] = (entries ?? []).map((e) => ({ id: e.id, name: e.name, kind: e.kind as Asset["kind"], image: e.reference_asset_id, look: e.appearance, inScene: inScene.has(e.id) || e.id === scene.location_entry_id }));
  const i = (all ?? []).findIndex((s) => s.id === sceneId);
  const prev = i > 0 ? all![i - 1] : null, next = i >= 0 && i < (all ?? []).length - 1 ? all![i + 1] : null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 text-[12px] text-mute">
        <Link href={`/p/${projectId}/scenes`} className="hover:text-ink">← All scenes</Link>
        <span className="ml-auto flex gap-3">
          {prev && <Link href={`/p/${projectId}/scenes/${prev.id}`} className="hover:text-ink">Scene {prev.position}</Link>}
          {next && <Link href={`/p/${projectId}/scenes/${next.id}`} className="hover:text-ink">Scene {next.position} →</Link>}
        </span>
      </div>
      <SceneBoard projectId={projectId} scene={{ id: scene.id, position: scene.position, heading: parsed?.heading ?? scene.heading ?? scene.title, locationId: scene.location_entry_id, inScript: !!parsed }}
                  assets={assets} blocks={blocks} shots={(shots ?? []).map((s) => ({ id: s.id, label: s.label, chosen: !!s.selected_take_id }))} />
    </div>
  );
}
