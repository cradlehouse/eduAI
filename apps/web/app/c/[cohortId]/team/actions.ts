"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const back = (cohortId: string, msg?: { ok?: string; error?: string }) => {
  const q = msg?.ok ? `?ok=${encodeURIComponent(msg.ok)}` : msg?.error ? `?error=${encodeURIComponent(msg.error)}` : "";
  redirect(`/c/${cohortId}/team${q}`);
};
const rolesFrom = (fd: FormData) => Array.from(fd.getAll("roles")).map(String).filter(Boolean);

// Instructor: put a person on a project with roles (or change their roles).
export async function assign(formData: FormData) {
  const cohortId = String(formData.get("cohort_id"));
  const projectId = String(formData.get("project_id") ?? "");
  const userId = String(formData.get("user_id"));
  const roles = rolesFrom(formData);
  if (!projectId) back(cohortId, { error: "Pick a project." });
  if (roles.length === 0) back(cohortId, { error: "Pick at least one role." });
  const supabase = await createClient();
  const { data: cohort } = await supabase.from("cohorts").select("org_id").eq("id", cohortId).maybeSingle();
  const { error } = await supabase.from("project_members").upsert({ org_id: cohort!.org_id, project_id: projectId, user_id: userId, roles }, { onConflict: "project_id,user_id" });
  if (error) back(cohortId, { error: error.message });
  revalidatePath(`/c/${cohortId}`);
  back(cohortId, { ok: "Updated." });
}

export async function unassign(formData: FormData) {
  const cohortId = String(formData.get("cohort_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("project_members").delete().eq("project_id", String(formData.get("project_id"))).eq("user_id", String(formData.get("user_id")));
  if (error) back(cohortId, { error: error.message });
  revalidatePath(`/c/${cohortId}`);
  back(cohortId);
}
