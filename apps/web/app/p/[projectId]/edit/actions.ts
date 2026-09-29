"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db/types";
import { generateForEntry } from "@/app/p/[projectId]/scenes/generate";
import { pickRoute } from "@/lib/elements/routes";

// The film's music has nowhere else to live, so it is a hidden 'style' entry of the project ("Music"):
// what's made lands in its assets (role 'music'), like room tone on a location. The chosen piece is
// projects.edit.music; it plays under the whole film and loops if the film is longer.
const MUSIC_ENTRY = "Music";

async function musicEntry(projectId: string) {
  const supabase = await createClient();
  const { data: found } = await supabase.from("bible_entries").select("id").eq("project_id", projectId).eq("kind", "style").eq("name", MUSIC_ENTRY).maybeSingle();
  if (found) return found.id;
  const { data: { user } } = await supabase.auth.getUser();
  const { data: project } = await supabase.from("projects").select("org_id").eq("id", projectId).maybeSingle();
  if (!user || !project) return null;
  const { data } = await supabase.from("bible_entries").insert({
    org_id: project.org_id, project_id: projectId, kind: "style", name: MUSIC_ENTRY, description: "the film's music", appearance: "",
    likeness_of: null, requires_consent: false, created_by: user.id,
  }).select("id").single();
  return data?.id ?? null;
}

export async function makeMusic(projectId: string, prompt: string, seconds: number): Promise<{ ok: true } | { error: string }> {
  const ask = prompt.trim();
  if (!ask) return { error: "Say what the music should feel like." };
  const entryId = await musicEntry(projectId);
  if (!entryId) return { error: "Couldn't set up the music track." };
  const r = await pickRoute(projectId, "music");
  if (!r) return { error: "Your school hasn't enabled a sound route yet. Ask your instructor." };
  const res = await generateForEntry({
    projectId, entryId, role: "music", profileId: r.profileId, lane: r.lane, layer: "sfx",
    inputs: { prompt: `Instrumental film score, no vocals, no speech. ${ask}`, duration_s: Math.min(47, Math.max(5, Math.ceil(seconds))), label: ask.slice(0, 60) },
  });
  if ("error" in res && res.error) return { error: res.error };
  revalidatePath(`/p/${projectId}/edit`);
  return { ok: true };
}

export async function chooseMusic(projectId: string, assetId: string | null): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: p } = await supabase.from("projects").select("edit").eq("id", projectId).maybeSingle();
  const edit = { ...((p?.edit ?? {}) as Record<string, Json>), music: assetId } as Json;
  const { error } = await supabase.from("projects").update({ edit }).eq("id", projectId);
  if (error) return { error: error.message };
  revalidatePath(`/p/${projectId}/edit`);
  return { ok: true };
}

export async function saveLevels(projectId: string, levels: Record<string, number>): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: p } = await supabase.from("projects").select("edit").eq("id", projectId).maybeSingle();
  const edit = { ...((p?.edit ?? {}) as Record<string, Json>), levels } as Json;
  const { error } = await supabase.from("projects").update({ edit }).eq("id", projectId);
  return error ? { error: error.message } : { ok: true };
}

// Export: the orchestrator lays the picture, each character's track (at its own level), the room and
// the music under it into one file (fal's ffmpeg compose for picture; the sound is mixed there).
export async function exportFilm(projectId: string, plan: { video: string; seconds: number; voices: { asset: string; name: string }[]; room: string | null }[], levels: Record<string, number>, music: string | null): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: project } = await supabase.from("projects").select("org_id, cohort_id").eq("id", projectId).maybeSingle();
  if (!user || !project) return { error: "Not found." };
  if (!plan.length) return { error: "Choose some takes first." };
  const { error } = await supabase.from("jobs").insert({
    org_id: project.org_id, cohort_id: project.cohort_id, requested_by: user.id, project_id: projectId, kind: "render",
    inputs: { op: "export", clips: plan, levels, music } as unknown as Json,
  });
  if (error) return { error: error.message };
  revalidatePath(`/p/${projectId}/edit`);
  return { ok: true };
}
