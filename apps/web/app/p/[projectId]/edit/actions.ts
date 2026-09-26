"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db/types";

export async function saveLevels(projectId: string, levels: Record<string, number>): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: p } = await supabase.from("projects").select("edit").eq("id", projectId).maybeSingle();
  const edit = { ...((p?.edit ?? {}) as Record<string, Json>), levels } as Json;
  const { error } = await supabase.from("projects").update({ edit }).eq("id", projectId);
  return error ? { error: error.message } : { ok: true };
}

// Export: the orchestrator lays the picture, each character's track and the room under it into one
// file (fal's ffmpeg compose today; plain ffmpeg on our own server later).
export async function exportFilm(projectId: string, plan: { video: string; seconds: number; voices: string[]; room: string | null }[], levels: Record<string, number>): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: project } = await supabase.from("projects").select("org_id, cohort_id").eq("id", projectId).maybeSingle();
  if (!user || !project) return { error: "Not found." };
  if (!plan.length) return { error: "Choose some takes first." };
  const { error } = await supabase.from("jobs").insert({
    org_id: project.org_id, cohort_id: project.cohort_id, requested_by: user.id, project_id: projectId, kind: "render",
    inputs: { op: "export", clips: plan, levels } as unknown as Json,
  });
  if (error) return { error: error.message };
  revalidatePath(`/p/${projectId}/edit`);
  return { ok: true };
}
