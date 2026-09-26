import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db/types";

type Intent = { lines?: { who: string; text: string }[] };

// A chosen talking take gets its sound split (docs/research/dialogue-spike-2026-09.md): voices from the
// room, who speaks when, each speaker converted to their Cast voice, one track each. The orchestrator
// does the work as a 'render' job; this only queues it, once per take.
export async function queueVoices(projectId: string, shotId: string, takeId: string) {
  const supabase = await createClient();
  const [{ data: shot }, { count }] = await Promise.all([
    supabase.from("shots").select("intent, scene_id").eq("id", shotId).maybeSingle(),
    supabase.from("take_tracks").select("id", { count: "exact", head: true }).eq("take_id", takeId),
  ]);
  const lines = ((shot?.intent ?? {}) as Intent).lines ?? [];
  if (!lines.length || (count ?? 0) > 0) return { skipped: true };
  const { data: open } = await supabase.from("jobs").select("id").eq("kind", "render").eq("shot_id", shotId).in("status", ["queued", "claimed", "submitted", "running"]).contains("inputs", { take_id: takeId });
  if (open?.length) return { skipped: true };
  const names = [...new Set(lines.map((l) => l.who.toUpperCase()))];
  const { data: people } = await supabase.from("bible_entries").select("id, name, voice_asset_id").eq("project_id", projectId).eq("kind", "character");
  const speakers = names.map((n) => {
    const e = (people ?? []).find((p) => p.name.toUpperCase() === n);
    return { name: n, entry_id: e?.id ?? null, voice_asset_id: e?.voice_asset_id ?? null };
  });
  const { data: take } = await supabase.from("takes").select("asset_id").eq("id", takeId).maybeSingle();
  if (!take) return { skipped: true };
  const { data: project } = await supabase.from("projects").select("org_id, cohort_id").eq("id", projectId).maybeSingle();
  const { data: { user } } = await supabase.auth.getUser();
  if (!project || !user) return { skipped: true };
  const inputs = { op: "voices", take_id: takeId, video: take.asset_id, lines, speakers } as unknown as Json;
  const { error } = await supabase.from("jobs").insert({ org_id: project.org_id, cohort_id: project.cohort_id, requested_by: user.id, project_id: projectId, shot_id: shotId, kind: "render", inputs });
  return error ? { error: error.message } : { ok: true };
}
