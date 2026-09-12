"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";

type Status = Database["public"]["Enums"]["project_status"];
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "project";
const back = (cohortId: string, msg?: { ok?: string; error?: string }) => {
  const q = msg?.ok ? `?ok=${encodeURIComponent(msg.ok)}` : msg?.error ? `?error=${encodeURIComponent(msg.error)}` : "";
  redirect(`/c/${cohortId}/projects${q}`);
};
const rolesFrom = (fd: FormData, key = "roles") => Array.from(fd.getAll(key)).map(String).filter(Boolean);
const FRIENDLY: Record<string, string> = {
  not_enrolled: "You're not enrolled in this cohort.", project_not_open: "This project isn't open for sign-up.",
  already_on_project: "You're already on this project.", invalid_roles: "Pick at least one role from the list.", project_full: "This project is full.",
};

// Instructor posts a project: title, logline, budget (tokens), crew cap, roles needed, approval.
export async function postProject(formData: FormData) {
  const cohortId = String(formData.get("cohort_id"));
  const title = String(formData.get("title") ?? "").trim();
  if (!title) back(cohortId, { error: "A title is required." });
  const supabase = await createClient();
  const { data: cohort } = await supabase.from("cohorts").select("org_id").eq("id", cohortId).maybeSingle();
  if (!cohort) back(cohortId, { error: "Cohort not found." });
  let slug = slugify(title);
  const { data: clash } = await supabase.from("projects").select("id").eq("cohort_id", cohortId).eq("slug", slug).maybeSingle();
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const cap = Number(formData.get("crew_cap") ?? 0);
  const { data: project, error } = await supabase.from("projects").insert({
    org_id: cohort!.org_id, cohort_id: cohortId, slug, title, logline: String(formData.get("logline") ?? "").trim(),
    status: (String(formData.get("status") ?? "open") as Status), crew_cap: cap > 0 ? cap : null,
    roles_needed: rolesFrom(formData, "roles_needed"), requires_approval: formData.get("requires_approval") === "on",
  }).select("id").single();
  if (error) back(cohortId, { error: error.message });
  const tokens = Number(formData.get("budget_tokens") ?? 0);
  if (tokens > 0) {
    const { error: e2 } = await supabase.rpc("set_project_budget_tokens", { p_project: project!.id, p_tokens: Math.round(tokens) });
    if (e2) back(cohortId, { error: `Posted, but the budget failed: ${e2.message}` });
  }
  revalidatePath(`/c/${cohortId}`);
  back(cohortId, { ok: `Posted “${title}”.` });
}

export async function updateProject(formData: FormData) {
  const cohortId = String(formData.get("cohort_id"));
  const title = String(formData.get("title") ?? "").trim();
  if (!title) back(cohortId, { error: "A title is required." });
  const supabase = await createClient();
  const cap = Number(formData.get("crew_cap") ?? 0);
  const { data, error } = await supabase.from("projects").update({
    title, logline: String(formData.get("logline") ?? "").trim(), status: String(formData.get("status") ?? "open") as Status,
    crew_cap: cap > 0 ? cap : null, roles_needed: rolesFrom(formData, "roles_needed"), requires_approval: formData.get("requires_approval") === "on",
  }).eq("id", String(formData.get("project_id"))).select("id");
  if (error) back(cohortId, { error: error.message });
  if (!data?.length) back(cohortId, { error: "Nothing changed: you need to be an instructor on this cohort or an admin." });
  const tokens = Number(formData.get("budget_tokens") ?? -1);
  if (tokens >= 0) await supabase.rpc("set_project_budget_tokens", { p_project: String(formData.get("project_id")), p_tokens: Math.round(tokens) });
  revalidatePath(`/c/${cohortId}`);
  back(cohortId, { ok: "Saved." });
}

export async function deleteProject(formData: FormData) {
  const cohortId = String(formData.get("cohort_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", String(formData.get("project_id")));
  if (error) back(cohortId, { error: error.message });
  revalidatePath(`/c/${cohortId}`);
  back(cohortId, { ok: "Project deleted." });
}

// Student signs up with one or more roles.
export async function signUp(formData: FormData) {
  const cohortId = String(formData.get("cohort_id"));
  const roles = rolesFrom(formData);
  if (roles.length === 0) back(cohortId, { error: "Tick at least one role." });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sign_up", { p_project: String(formData.get("project_id")), p_roles: roles });
  if (error) back(cohortId, { error: FRIENDLY[error.message] ?? error.message });
  revalidatePath(`/c/${cohortId}`);
  back(cohortId, { ok: data === "pending" ? "Sign-up sent. Your instructor will approve it." : "You're on the project." });
}

export async function decide(formData: FormData) {
  const cohortId = String(formData.get("cohort_id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_signup", { p_request: String(formData.get("request_id")), p_approve: formData.get("approve") === "1" });
  if (error) back(cohortId, { error: error.message });
  revalidatePath(`/c/${cohortId}`);
  back(cohortId);
}
