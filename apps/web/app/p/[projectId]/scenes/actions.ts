"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db/types";

const go = (projectId: string, path = "scenes", msg?: { ok?: string; error?: string }) => {
  const q = msg?.ok ? `?ok=${encodeURIComponent(msg.ok)}` : msg?.error ? `?error=${encodeURIComponent(msg.error)}` : "";
  redirect(`/p/${projectId}/${path}${q}`);
};

// Everything about one cut lands back on the storyboard with that cut selected.
const goCut = (projectId: string, shotId: string, msg?: { ok?: string; error?: string }) => {
  const q = msg?.ok ? `&ok=${encodeURIComponent(msg.ok)}` : msg?.error ? `&error=${encodeURIComponent(msg.error)}` : "";
  redirect(`/p/${projectId}/scenes?cut=${shotId}${q}`);
};

async function orgOf(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("org_id").eq("id", projectId).maybeSingle();
  return data?.org_id ?? null;
}

export async function createScene(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const orgId = await orgOf(projectId);
  if (!orgId) go(projectId, "scenes", { error: "Project not found." });
  const supabase = await createClient();
  const { data: last } = await supabase.from("scenes").select("position").eq("project_id", projectId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("scenes").insert({
    org_id: orgId!, project_id: projectId, position: (last?.position ?? 0) + 1,
    title: String(formData.get("title") ?? "").trim() || `Scene ${(last?.position ?? 0) + 1}`,
    synopsis: String(formData.get("synopsis") ?? "").trim(),
  });
  if (error) go(projectId, "scenes", { error: error.message });
  revalidatePath(`/p/${projectId}/scenes`);
  go(projectId);
}

export async function updateScene(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("scenes").update({
    title: String(formData.get("title") ?? "").trim(), synopsis: String(formData.get("synopsis") ?? "").trim(),
  }).eq("id", String(formData.get("scene_id")));
  if (error) go(projectId, "scenes", { error: error.message });
  revalidatePath(`/p/${projectId}/scenes`);
  go(projectId);
}

export async function deleteScene(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("scenes").delete().eq("id", String(formData.get("scene_id")));
  if (error) go(projectId, "scenes", { error: error.message });
  revalidatePath(`/p/${projectId}/scenes`);
  go(projectId, "scenes", { ok: "Scene deleted." });
}

export async function createShot(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const sceneId = String(formData.get("scene_id"));
  const orgId = await orgOf(projectId);
  if (!orgId) go(projectId, "scenes", { error: "Project not found." });
  const supabase = await createClient();
  const { data: last } = await supabase.from("shots").select("position").eq("scene_id", sceneId).order("position", { ascending: false }).limit(1).maybeSingle();
  const pos = (last?.position ?? 0) + 1;
  const { data: scene } = await supabase.from("scenes").select("position").eq("id", sceneId).maybeSingle();
  const label = String(formData.get("label") ?? "").trim() || `${scene?.position ?? "?"}${String.fromCharCode(64 + Math.min(pos, 26))}`;
  const dur = String(formData.get("duration_target_s") ?? "");
  const { data: row, error } = await supabase.from("shots").insert({
    org_id: orgId!, project_id: projectId, scene_id: sceneId, position: pos, label,
    description: String(formData.get("description") ?? "").trim(),
    duration_target_s: dur ? Number(dur) : null,
  }).select("id").single();
  if (error) go(projectId, "scenes", { error: error.message });
  revalidatePath(`/p/${projectId}/scenes`);
  go(projectId, `shots/${row!.id}`);
}

export async function updateShot(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const shotId = String(formData.get("shot_id"));
  const supabase = await createClient();
  const dur = String(formData.get("duration_target_s") ?? "");
  const intent: Json = {
    objective: String(formData.get("objective") ?? "").trim(),
    continuity: String(formData.get("continuity") ?? "").trim(),
    camera_language: String(formData.get("camera_language") ?? "").trim(),
    dialogue: String(formData.get("dialogue") ?? "").trim(),
    no_bible_assets: formData.get("no_bible_assets") === "on",
  };
  const { error } = await supabase.from("shots").update({
    label: String(formData.get("label") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    duration_target_s: dur ? Number(dur) : null,
    intent,
  }).eq("id", shotId);
  if (error) goCut(projectId, shotId, { error: error.message });
  revalidatePath(`/p/${projectId}/scenes`);
  goCut(projectId, shotId, { ok: "Saved." });
}

export async function deleteShot(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("shots").delete().eq("id", String(formData.get("shot_id")));
  if (error) go(projectId, "scenes", { error: error.message });
  revalidatePath(`/p/${projectId}/scenes`);
  go(projectId, "scenes", { ok: "Shot deleted." });
}

export async function linkBible(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const shotId = String(formData.get("shot_id"));
  const entryId = String(formData.get("entry_id") ?? "");
  if (!entryId) goCut(projectId, shotId);
  const orgId = await orgOf(projectId);
  const supabase = await createClient();
  const { error } = await supabase.from("shot_bible_entries").upsert({ org_id: orgId!, shot_id: shotId, bible_entry_id: entryId }, { onConflict: "shot_id,bible_entry_id", ignoreDuplicates: true });
  if (error) goCut(projectId, shotId, { error: error.message });
  revalidatePath(`/p/${projectId}/scenes`);
  goCut(projectId, shotId);
}

export async function unlinkBible(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const shotId = String(formData.get("shot_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("shot_bible_entries").delete().eq("shot_id", shotId).eq("bible_entry_id", String(formData.get("entry_id")));
  if (error) goCut(projectId, shotId, { error: error.message });
  revalidatePath(`/p/${projectId}/scenes`);
  goCut(projectId, shotId);
}

// P1-13: choose a take (background → the cut's plate, merged → the cut's selected take) or kill one.
// Users may only change lifecycle on takes (RLS); pointers live on the shot.
export async function selectTake(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const shotId = String(formData.get("shot_id"));
  const takeId = String(formData.get("take_id"));
  const layer = String(formData.get("layer"));
  const supabase = await createClient();
  const patch = layer === "background" ? { plate_take_id: takeId } : layer === "merged" ? { selected_take_id: takeId } : null;
  if (!patch) goCut(projectId, shotId, { error: "Only background plates and merged takes are chosen per cut." });
  const { data, error } = await supabase.from("shots").update(patch!).eq("id", shotId).select("id");
  if (error || !data?.length) goCut(projectId, shotId, { error: error?.message ?? "Nothing changed." });
  revalidatePath(`/p/${projectId}/scenes`);
  goCut(projectId, shotId, { ok: layer === "background" ? "Plate chosen for this cut." : "Take chosen for this cut." });
}

export async function killTake(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const shotId = String(formData.get("shot_id"));
  const takeId = String(formData.get("take_id"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("takes").update({ lifecycle: "killed", killed_at: new Date().toISOString(), killed_by: user?.id ?? null }).eq("id", takeId).select("id");
  if (error || !data?.length) goCut(projectId, shotId, { error: error?.message ?? "Nothing changed." });
  revalidatePath(`/p/${projectId}/scenes`);
  goCut(projectId, shotId, { ok: "Take killed. It stays in the receipts; it just leaves the bin." });
}

// Kill is a flag, never a delete: the take and its receipt stay. Restore puts it back in the bin.
export async function restoreTake(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const shotId = String(formData.get("shot_id"));
  const takeId = String(formData.get("take_id"));
  const supabase = await createClient();
  const { data, error } = await supabase.from("takes").update({ lifecycle: "live", killed_at: null, killed_by: null }).eq("id", takeId).select("id");
  if (error || !data?.length) goCut(projectId, shotId, { error: error?.message ?? "Nothing changed." });
  revalidatePath(`/p/${projectId}/scenes`);
  goCut(projectId, shotId, { ok: "Take restored." });
}
