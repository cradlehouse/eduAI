"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db/types";
import { generateForEntry } from "@/app/p/[projectId]/scenes/generate";
import { addAction, addDialogue, addScene, normName, parseScript, setHeading, slugFor } from "@/lib/script/screenplay";
import { currentScript, writeScript } from "@/lib/script/sync";
import { pickRoute, type RouteKey } from "@/lib/elements/routes";

type Kind = "character" | "location" | "prop";
export type What = "look" | "turnaround" | "angle" | "time" | "voice" | "room";
type Result = { ok: true; tokens?: number | null } | { error: string };

const PATH: Record<Kind, string> = { character: "cast", location: "locations", prop: "props" };
const LAYER = { character: "character", location: "background", prop: "background" } as const;

async function entry(entryId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("bible_entries").select("id, project_id, kind, name, appearance, reference_asset_id").eq("id", entryId).maybeSingle();
  return data;
}

// Portrait for people, wide for places, a clean object shot for props.
const FRAMING: Record<Kind, { size: string; lead: string }> = {
  character: { size: "portrait_4_3", lead: "Cinematic portrait, head and shoulders, plain dark background, soft key light" },
  location: { size: "landscape_16_9", lead: "Cinematic establishing wide shot, no people" },
  prop: { size: "square_hd", lead: "Cinematic product shot on a plain surface, no people" },
};

// One entry point for everything the element pages make. `extra` is what the student typed in the
// prompt bar; `start` is an image to start from (theirs, or one of the results).
export async function makeElement(input: { projectId: string; entryId: string; what: What; extra?: string; start?: string | null; count?: number; label?: string; params?: Record<string, Json> }): Promise<Result> {
  const e = await entry(input.entryId);
  if (!e || e.project_id !== input.projectId) return { error: "Not found." };
  const kind = e.kind as Kind;
  const look = [e.appearance || e.name, input.extra?.trim()].filter(Boolean).join(". ");
  const layer = LAYER[kind] ?? "background";
  const go = async (key: RouteKey, role: string, inputs: Record<string, Json>, lyr: "character" | "background" | "dialogue" | "sfx" = layer) => {
    const r = await pickRoute(input.projectId, key);
    if (!r) return { error: "Your school hasn't enabled a route for this yet. Ask your instructor." } as const;
    const res = await generateForEntry({ projectId: input.projectId, entryId: e.id, role, profileId: r.profileId, lane: r.lane, layer: lyr, inputs });
    if ("error" in res && res.error) return { error: res.error } as const;
    return { ok: true as const, tokens: "tokens" in res ? res.tokens : null };
  };

  switch (input.what) {
    case "look": {
      const f = FRAMING[kind];
      const n = Math.min(Math.max(input.count ?? 3, 1), 4);
      if (input.start) return go("edit", "look", { prompt: `${f.lead}. ${look}`, references: [input.start], image_size: f.size, num_images: n, label: input.label ?? "" });
      return go("image", "look", { prompt: `${f.lead}. ${look}`, image_size: f.size, num_images: n, label: input.label ?? "" });
    }
    case "turnaround": {
      if (!e.reference_asset_id) return { error: "Choose the look first." };
      const view = input.label ?? "front";
      const ask = { front: "facing the camera", side: "in profile, facing left", back: "seen from behind" }[view] ?? view;
      return go("edit", "turnaround", { prompt: `The same person, full length, ${ask}, standing on a plain grey background, same clothes and hair. ${look}`, references: [e.reference_asset_id], image_size: "portrait_4_3", num_images: 1, label: view });
    }
    case "angle": {
      if (!e.reference_asset_id) return { error: "Choose the master wide first." };
      const p = input.params ?? {};
      return go("angle", "angle", { image: e.reference_asset_id, horizontal_angle: Number(p.horizontal_angle ?? 45), vertical_angle: Number(p.vertical_angle ?? 0), zoom: Number(p.zoom ?? 0), additional_prompt: input.extra || undefined, image_size: "landscape_16_9", num_images: 1, label: input.label ?? "" } as Record<string, Json>, "background");
    }
    case "time": {
      if (!e.reference_asset_id) return { error: "Choose the master wide first." };
      const t = input.label ?? "day";
      return go("edit", "time", { prompt: `The exact same place from the same camera position, at ${t}. Same layout, same objects; only the light and sky change. ${input.extra ?? ""}`.trim(), references: [e.reference_asset_id], image_size: "landscape_16_9", num_images: 1, label: t });
    }
    case "voice": {
      const voice = String(input.params?.voice ?? "af_heart");
      const nm = e.name.split(" ")[0]; const text = input.extra?.trim() || `Hi, I'm ${nm.charAt(0).toUpperCase()}${nm.slice(1).toLowerCase()}. This is how I sound.`;
      return go("voice", "voice", { text, voice, label: voice }, "dialogue");
    }
    case "room": {
      const t = input.extra?.trim() || `Room tone for ${e.name}: ${e.appearance}`;
      return go("room", "room", { prompt: `Ambient room tone, no speech, no music. ${t}`, duration_s: 30, label: "room tone" }, "sfx");
    }
  }
}

// "This is Angie" / "Set as master wide": the chosen image is the element's look everywhere.
export async function chooseLook(projectId: string, entryId: string, assetId: string): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("bible_entries").update({ reference_asset_id: assetId }).eq("id", entryId).select("id, kind");
  if (error || !data?.length) return { error: error?.message ?? "Nothing changed." };
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: true };
}

export async function chooseSound(projectId: string, entryId: string, which: "voice" | "room", assetId: string | null): Promise<Result> {
  const supabase = await createClient();
  const patch = which === "voice" ? { voice_asset_id: assetId } : { room_tone_asset_id: assetId };
  const { data, error } = await supabase.from("bible_entries").update(patch).eq("id", entryId).select("id");
  if (error || !data?.length) return { error: error?.message ?? "Nothing changed." };
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: true };
}

export async function saveAppearance(projectId: string, entryId: string, appearance: string, description?: string): Promise<Result> {
  const supabase = await createClient();
  const patch: { appearance: string; description?: string } = { appearance: appearance.trim() };
  if (description !== undefined) patch.description = description.trim();
  const { data, error } = await supabase.from("bible_entries").update(patch).eq("id", entryId).select("id");
  if (error || !data?.length) return { error: error?.message ?? "Nothing changed." };
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: true };
}

export async function hideResult(projectId: string, rowId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("bible_entry_assets").update({ lifecycle: "killed" }).eq("id", rowId);
  if (error) return { error: error.message };
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: true };
}

// Add a character, location or prop, and write it into the script where the student says it goes.
//   location: `scene` = an existing scene it becomes the setting of, or `after` = a new scene after N
//   character: `scene` (optional) + an optional first line
//   prop: `scene` (optional): an action line where it first appears
export async function addElement(input: {
  projectId: string; kind: Kind; name: string; appearance: string; description?: string;
  scene?: number | null; after?: number | null; intExt?: "INT" | "EXT"; time?: string; line?: string;
}): Promise<{ ok: true; id: string; href: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const name = input.name.trim();
  if (!name) return { error: "Give it a name." };
  const { data: project } = await supabase.from("projects").select("org_id").eq("id", input.projectId).maybeSingle();
  if (!project) return { error: "Project not found." };
  const { data: row, error } = await supabase.from("bible_entries").insert({
    org_id: project.org_id, project_id: input.projectId, kind: input.kind, name: input.kind === "character" ? normName(name) : name,
    description: input.description?.trim() ?? "", appearance: input.appearance.trim(), likeness_of: null, requires_consent: false, created_by: user.id,
  }).select("id").single();
  if (error || !row) return { error: error?.message ?? "Could not add it." };

  // Into the script.
  let text = await currentScript(input.projectId);
  const scenes = parseScript(text).scenes;
  try {
    if (input.kind === "location" && (input.scene || input.after != null)) {
      const heading = slugFor(name, input.intExt ?? "INT", input.time ?? "");
      if (input.scene && scenes[input.scene - 1]) {
        const ed = setHeading(text, input.scene, heading);
        await writeScript(input.projectId, ed, { source: "locations", label: `Scene ${input.scene} now set in ${name}: ${heading}`, scene: input.scene });
        await linkScene(input.projectId, input.scene, row.id, "location");
      } else {
        const at = Math.min(input.after ?? scenes.length, scenes.length);
        const ed = addScene(text, at, heading, input.appearance ? `${input.appearance.charAt(0).toUpperCase()}${input.appearance.slice(1)}.` : "");
        await writeScript(input.projectId, ed, { source: "locations", label: `New scene ${at + 1}: ${heading}`, scene: at + 1 });
        await linkScene(input.projectId, at + 1, row.id, "location");
      }
    } else if (input.kind === "character" && input.scene && scenes[input.scene - 1]) {
      const cap = normName(name);
      const intro = `${cap}${input.description ? ` (${input.description.trim()})` : ""} is here.`;
      let ed = addAction(text, input.scene, "top", intro);
      text = ed.text;
      if (input.line?.trim()) {
        const s2 = parseScript(text).scenes[input.scene - 1];
        const introIdx = s2.blocks.findIndex((b) => b.kind === "action" && b.text === intro);
        const ed2 = addDialogue(text, input.scene, introIdx >= 0 ? introIdx : 0, cap, input.line);
        ed = { text: ed2.text, snippet: `${ed.snippet}\n\n${ed2.snippet}`, at: ed.at };
      }
      await writeScript(input.projectId, ed, { source: "cast", label: `${cap} added to Scene ${input.scene}${input.line ? `: "${input.line.trim()}"` : ""}`, scene: input.scene });
      await linkScene(input.projectId, input.scene, row.id, "character");
    } else if (input.kind === "prop" && input.scene && scenes[input.scene - 1]) {
      const ed = addAction(text, input.scene, "end", `The ${name.toUpperCase()} is here.`);
      await writeScript(input.projectId, ed, { source: "props", label: `${name} appears in Scene ${input.scene}`, scene: input.scene });
      await linkScene(input.projectId, input.scene, row.id, "prop");
    }
  } catch (e) {
    return { error: `Added, but not written into the script: ${e instanceof Error ? e.message : "unknown problem"}` };
  }
  revalidatePath(`/p/${input.projectId}`, "layout");
  return { ok: true, id: row.id, href: `/p/${input.projectId}/${PATH[input.kind]}/${row.id}` };
}

async function linkScene(projectId: string, position: number, entryId: string, kind: Kind) {
  const supabase = await createClient();
  const { data: scene } = await supabase.from("scenes").select("id, org_id").eq("project_id", projectId).eq("position", position).maybeSingle();
  if (!scene) return;
  if (kind === "location") await supabase.from("scenes").update({ location_entry_id: entryId }).eq("id", scene.id);
  else await supabase.from("scene_bible_entries").upsert({ org_id: scene.org_id, scene_id: scene.id, bible_entry_id: entryId }, { onConflict: "scene_id,bible_entry_id", ignoreDuplicates: true });
}

// "Start from an image": the student's own photo or drawing, kept on the element as an upload.
export async function uploadStart(projectId: string, entryId: string, form: FormData): Promise<{ ok: true; assetId: string } | { error: string }> {
  const file = form.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Pick an image first." };
  const { storeUpload } = await import("@/lib/assets/store");
  const r = await storeUpload(file, projectId, "image");
  if ("error" in r) return r;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: e } = await supabase.from("bible_entries").select("org_id").eq("id", entryId).maybeSingle();
  if (!e || !user) return { error: "Not found." };
  await supabase.from("bible_entry_assets").insert({ org_id: e.org_id, project_id: projectId, bible_entry_id: entryId, asset_id: r.id, role: "upload", label: file.name, created_by: user.id });
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: true, assetId: r.id };
}
