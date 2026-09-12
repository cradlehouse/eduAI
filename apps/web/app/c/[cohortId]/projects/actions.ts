"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";

type ProjectRole = Database["public"]["Enums"]["project_role"];
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "project";
const back = (cohortId: string, msg?: { ok?: string; error?: string }) => {
  const q = msg?.ok ? `?ok=${encodeURIComponent(msg.ok)}` : msg?.error ? `?error=${encodeURIComponent(msg.error)}` : "";
  redirect(`/c/${cohortId}/projects${q}`);
};

// Instructor/admin creates a project in the cohort (projects RLS: can_manage_cohort) and sets its
// token budget through set_project_budget_tokens (converted once to cents; tokens never money here).
export async function createProject(formData: FormData) {
  const cohortId = String(formData.get("cohort_id"));
  const title = String(formData.get("title") ?? "").trim();
  if (!title) back(cohortId, { error: "A title is required." });
  const tokens = Number(formData.get("budget_tokens") ?? 0);
  const supabase = await createClient();
  const { data: cohort } = await supabase.from("cohorts").select("org_id").eq("id", cohortId).maybeSingle();
  if (!cohort) back(cohortId, { error: "Cohort not found." });
  let slug = slugify(title);
  const { data: clash } = await supabase.from("projects").select("id").eq("cohort_id", cohortId).eq("slug", slug).maybeSingle();
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const { data: project, error } = await supabase.from("projects").insert({
    org_id: cohort!.org_id, cohort_id: cohortId, slug, title, logline: String(formData.get("logline") ?? "").trim(),
  }).select("id").single();
  if (error) back(cohortId, { error: error.message });
  if (Number.isFinite(tokens) && tokens > 0) {
    const { error: e2 } = await supabase.rpc("set_project_budget_tokens", { p_project: project!.id, p_tokens: Math.round(tokens) });
    if (e2) back(cohortId, { error: `Project created, but the budget failed: ${e2.message}` });
  }
  revalidatePath(`/c/${cohortId}/projects`);
  back(cohortId, { ok: `Created “${title}”.` });
}

export async function setBudget(formData: FormData) {
  const cohortId = String(formData.get("cohort_id"));
  const tokens = Number(formData.get("budget_tokens") ?? 0);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_project_budget_tokens", { p_project: String(formData.get("project_id")), p_tokens: Math.max(0, Math.round(tokens)) });
  if (error) back(cohortId, { error: error.message });
  revalidatePath(`/c/${cohortId}/projects`);
  back(cohortId, { ok: "Budget updated." });
}

export async function addCrew(formData: FormData) {
  const cohortId = String(formData.get("cohort_id"));
  const projectId = String(formData.get("project_id"));
  const userId = String(formData.get("user_id") ?? "");
  if (!userId) back(cohortId, { error: "Pick a person." });
  const supabase = await createClient();
  const { data: cohort } = await supabase.from("cohorts").select("org_id").eq("id", cohortId).maybeSingle();
  const { error } = await supabase.from("project_members").upsert(
    { org_id: cohort!.org_id, project_id: projectId, user_id: userId, role: String(formData.get("role") ?? "director") as ProjectRole },
    { onConflict: "project_id,user_id" });
  if (error) back(cohortId, { error: error.message });
  revalidatePath(`/c/${cohortId}/projects`);
  back(cohortId);
}

export async function removeCrew(formData: FormData) {
  const cohortId = String(formData.get("cohort_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("project_members").delete().eq("project_id", String(formData.get("project_id"))).eq("user_id", String(formData.get("user_id")));
  if (error) back(cohortId, { error: error.message });
  revalidatePath(`/c/${cohortId}/projects`);
  back(cohortId);
}

export async function deleteProject(formData: FormData) {
  const cohortId = String(formData.get("cohort_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", String(formData.get("project_id")));
  if (error) back(cohortId, { error: error.message });
  revalidatePath(`/c/${cohortId}/projects`);
  back(cohortId, { ok: "Project deleted." });
}

export async function updateProject(formData: FormData) {
  const cohortId = String(formData.get("cohort_id"));
  const title = String(formData.get("title") ?? "").trim();
  if (!title) back(cohortId, { error: "A title is required." });
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").update({ title, logline: String(formData.get("logline") ?? "").trim() })
    .eq("id", String(formData.get("project_id"))).select("id");
  if (error) back(cohortId, { error: error.message });
  if (!data?.length) back(cohortId, { error: "Nothing changed: you need to be an instructor on this cohort or an admin." });
  revalidatePath(`/c/${cohortId}/projects`);
  back(cohortId, { ok: "Project updated." });
}
