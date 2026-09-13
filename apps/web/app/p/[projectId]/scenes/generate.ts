"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/db/types";

type Lane = Database["public"]["Enums"]["lane"];
type Layer = Database["public"]["Enums"]["layer"];

// Writes the jobs row as the signed-in user. RLS + the fill-defaults trigger derive org, cohort,
// provider and model version; the orchestrator (P1-10) claims it. Nothing here talks to a vendor.
export async function generate(input: { projectId: string; shotId: string; profileId: string; lane: Lane; layer: Layer; inputs: Record<string, Json> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const gateLane: Lane = input.layer === "dialogue" ? "voice_likeness" : input.lane;
  const { data: ready } = await supabase.rpc("shot_ready_for", { p_shot: input.shotId, p_lane: gateLane }).maybeSingle();
  if (!ready?.ready) return { error: `Shot is not ready for the ${gateLane} lane: ${(ready?.missing ?? ["unknown"]).join(", ")}.` };

  const { data: opts } = await supabase.rpc("model_options", { p_project: input.projectId, p_lane: input.lane });
  const opt = (opts ?? []).find((o) => o.profile_id === input.profileId);
  if (!opt) return { error: "Unknown route." };
  if (!opt.allowed) return { error: `Route not allowed: ${opt.reason}.` };

  const { data: est } = await supabase.rpc("estimate_tokens", { p_profile: input.profileId, p_inputs: input.inputs });
  const { data: budget } = await supabase.from("project_tokens").select("remaining_tokens").eq("project_id", input.projectId).maybeSingle();
  if (budget && est != null && est > (budget.remaining_tokens ?? 0)) return { error: `Not enough tokens: this needs ${est.toLocaleString()} and ${(budget.remaining_tokens ?? 0).toLocaleString()} are left.` };

  // org_id / cohort_id / requested_by are re-derived by the jobs_fill_defaults trigger before RLS;
  // they are passed here only because the insert type requires them.
  const { data: project } = await supabase.from("projects").select("org_id, cohort_id").eq("id", input.projectId).maybeSingle();
  if (!project) return { error: "Project not found." };
  const { data: job, error } = await supabase.from("jobs").insert({
    org_id: project.org_id, cohort_id: project.cohort_id, requested_by: user.id,
    project_id: input.projectId, shot_id: input.shotId, deployment_profile_id: input.profileId,
    lane: input.lane, layer: input.layer, inputs: input.inputs,
  }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath(`/p/${input.projectId}/scenes`);
  revalidatePath(`/p/${input.projectId}`);
  return { ok: true, jobId: job.id, tokens: est ?? null };
}
