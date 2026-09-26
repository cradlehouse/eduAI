"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db/types";
import { generate } from "@/app/p/[projectId]/scenes/generate";
import { setChosenTake } from "@/app/p/[projectId]/scenes/actions";
import { pickRoute } from "@/lib/elements/routes";

type R = { ok: true } | { error: string };
export type Intent = { framing?: string; camera_motion?: string; speaker?: string; lines?: { who: string; text: string }[]; on?: string[]; angle_asset_id?: string | null; end_take_id?: string | null };

const LEAD: Record<string, string> = {
  wide: "Cinematic wide shot showing the whole space and everyone in it",
  medium: "Cinematic medium shot, waist up",
  close: "Cinematic close-up on the face",
  over_shoulder: "Cinematic over-the-shoulder shot, the near person's shoulder soft in the foreground",
  two_shot: "Cinematic two-shot, both people in frame",
  insert: "Cinematic insert shot of a detail",
};

async function shotOf(shotId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("shots").select("id, project_id, scene_id, label, description, duration_target_s, intent, plate_take_id, selected_take_id").eq("id", shotId).maybeSingle();
  return data;
}
const done = (projectId: string, sceneId: string, shotId: string) => revalidatePath(`/p/${projectId}/scenes/${sceneId}/shots/${shotId}`);

export async function saveCamera(projectId: string, shotId: string, patch: { framing?: string; camera_motion?: string; angle_asset_id?: string | null; description?: string; seconds?: number }): Promise<R> {
  const supabase = await createClient();
  const s = await shotOf(shotId);
  if (!s) return { error: "Shot not found." };
  const intent = { ...((s.intent ?? {}) as Intent), ...(patch.framing ? { framing: patch.framing } : {}), ...(patch.camera_motion ? { camera_motion: patch.camera_motion } : {}), ...(patch.angle_asset_id !== undefined ? { angle_asset_id: patch.angle_asset_id } : {}) };
  const { data, error } = await supabase.from("shots").update({
    intent: intent as Json, ...(patch.description !== undefined ? { description: patch.description } : {}), ...(patch.seconds ? { duration_target_s: patch.seconds } : {}),
  }).eq("id", shotId).select("id");
  if (error || !data?.length) return { error: error?.message ?? "Nothing changed." };
  done(projectId, s.scene_id, shotId);
  return { ok: true };
}

// The looks that go into a frame: the location angle (or its master) and the people on screen.
async function framePieces(shotId: string) {
  const supabase = await createClient();
  const s = await shotOf(shotId);
  if (!s) return null;
  const intent = (s.intent ?? {}) as Intent;
  const { data: pins } = await supabase.from("shot_bible_entries").select("bible_entries(id, kind, name, appearance, reference_asset_id)").eq("shot_id", shotId);
  const entries = (pins ?? []).map((p) => p.bible_entries).filter((e): e is NonNullable<typeof e> => !!e);
  const loc = entries.find((e) => e.kind === "location");
  const on = new Set((intent.on ?? []).map((n) => n.toUpperCase()));
  const people = entries.filter((e) => e.kind === "character" && (on.size === 0 || on.has(e.name.toUpperCase())));
  const props = entries.filter((e) => e.kind === "prop");
  return { s, intent, loc, people, props };
}

export async function makeFrames(projectId: string, shotId: string, input: { extra?: string; count?: number }): Promise<R & { tokens?: number | null }> {
  const p = await framePieces(shotId);
  if (!p) return { error: "Shot not found." };
  const bg = p.intent.angle_asset_id ?? p.loc?.reference_asset_id ?? null;
  const refs = [bg, ...p.people.map((e) => e.reference_asset_id)].filter((x): x is string => !!x).slice(0, 4);
  const lead = LEAD[p.intent.framing ?? "medium"] ?? LEAD.medium;
  const cast = p.people.map((e) => `${e.name}: ${e.appearance || "as in the reference"}`).join(". ");
  const prompt = [
    `${lead}. ${p.s.description}`,
    cast && `People: ${cast}.`,
    p.loc && `Place: ${p.loc.name}${p.loc.appearance ? `, ${p.loc.appearance}` : ""}; keep the room exactly as in the first reference.`,
    p.props.length ? `Objects: ${p.props.map((e) => `${e.name}${e.appearance ? ` (${e.appearance})` : ""}`).join(", ")}.` : "",
    input.extra?.trim(),
    "Mouths closed, a still moment just before the action.",
  ].filter(Boolean).join(" ");
  const r = await pickRoute(projectId, refs.length ? "edit" : "image");
  if (!r) return { error: "Your school hasn't enabled an image route. Ask your instructor." };
  const inputs: Record<string, Json> = refs.length ? { prompt, references: refs, image_size: "landscape_16_9", num_images: input.count ?? 2 } : { prompt, image_size: "landscape_16_9", num_images: input.count ?? 2 };
  const res = await generate({ projectId, shotId, profileId: r.profileId, lane: r.lane, layer: "background", inputs, describe: false });
  if ("error" in res && res.error) return { error: res.error };
  done(projectId, p.s.scene_id, shotId);
  return { ok: true, tokens: "tokens" in res ? res.tokens : null };
}

export async function chooseFrame(projectId: string, shotId: string, takeId: string | null) { return setChosenTake(projectId, shotId, "background", takeId); }

export async function setEndFrame(projectId: string, shotId: string, takeId: string | null): Promise<R> {
  const s = await shotOf(shotId);
  if (!s) return { error: "Shot not found." };
  const supabase = await createClient();
  const intent = { ...((s.intent ?? {}) as Intent), end_take_id: takeId };
  const { error } = await supabase.from("shots").update({ intent: intent as Json }).eq("id", shotId);
  if (error) return { error: error.message };
  done(projectId, s.scene_id, shotId);
  return { ok: true };
}

// The clip: LTX from the chosen frame (and the end frame if set), with the camera move, and the lines
// performed with sound. The voices get converted to each character's voice once a take is chosen.
export async function makeClip(projectId: string, shotId: string, input: { seconds: number; quality: "fast" | "finish"; takes: number; extra?: string }): Promise<R> {
  const supabase = await createClient();
  const p = await framePieces(shotId);
  if (!p) return { error: "Shot not found." };
  if (!p.s.plate_take_id) return { error: "Choose a frame first." };
  const ids = [p.s.plate_take_id, p.intent.end_take_id].filter((x): x is string => !!x);
  const { data: frames } = await supabase.from("takes").select("id, asset_id").in("id", ids);
  const start = frames?.find((f) => f.id === p.s.plate_take_id)?.asset_id;
  const end = p.intent.end_take_id ? frames?.find((f) => f.id === p.intent.end_take_id)?.asset_id : undefined;
  if (!start) return { error: "The chosen frame is missing." };
  const lines = (p.intent.lines ?? []).map((l) => `${l.who} says: "${l.text}"`).join(" Then ");
  const prompt = [p.s.description, lines, input.extra?.trim(), lines ? "Clear natural speech, lips in sync. No music." : "No speech, no music."].filter(Boolean).join(" ");
  const r = await pickRoute(projectId, input.quality === "finish" ? "clipFinish" : "clip");
  if (!r) return { error: "Your school hasn't enabled the video route. Ask your instructor." };
  const durations = input.quality === "finish" ? [6, 8, 10] : [6, 8, 10, 12, 14, 16, 18, 20];
  const seconds = durations.find((d) => d >= input.seconds) ?? durations.at(-1)!;
  const inputs: Record<string, Json> = { prompt, image: start, duration_s: seconds, camera_motion: p.intent.camera_motion ?? "static", generate_audio: true, ...(end ? { end_image: end } : {}) };
  for (let i = 0; i < Math.min(Math.max(input.takes, 1), 3); i++) {
    const res = await generate({ projectId, shotId, profileId: r.profileId, lane: r.lane, layer: "merged", inputs, describe: false });
    if ("error" in res && res.error) return { error: res.error };
  }
  done(projectId, p.s.scene_id, shotId);
  return { ok: true };
}

export async function chooseClip(projectId: string, shotId: string, takeId: string | null): Promise<R> {
  const r = await setChosenTake(projectId, shotId, "merged", takeId);
  if ("error" in r) return r;
  if (takeId) {
    const { queueVoices } = await import("@/lib/sound/voices");
    await queueVoices(projectId, shotId, takeId);
  }
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: true };
}
