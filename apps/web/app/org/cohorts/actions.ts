"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminOrg } from "@/lib/auth/org";

// Admin creates a cohort on a course and lays out its module schedule weekly from the start date.
export async function createCohort(formData: FormData) {
  const org = await getAdminOrg();
  if (!org) redirect("/");
  const name = String(formData.get("name") ?? "").trim();
  const courseId = String(formData.get("course_id") ?? "");
  const starts = String(formData.get("starts_on") ?? "");
  const ends = String(formData.get("ends_on") ?? "");
  const instructorId = String(formData.get("instructor_id") ?? "");
  if (!name || !courseId) redirect(`/org/cohorts?error=${encodeURIComponent("Name and course are required.")}`);
  const supabase = await createClient();
  const { data: cohort, error } = await supabase.from("cohorts").insert({
    org_id: org.id, course_id: courseId, name, starts_on: starts || null, ends_on: ends || null,
  }).select("id").single();
  if (error) redirect(`/org/cohorts?error=${encodeURIComponent(error.message)}`);

  const { data: modules } = await supabase.from("modules").select("id, position").eq("course_id", courseId).order("position");
  if (modules?.length) {
    const start = starts ? new Date(starts + "T09:00:00Z") : null;
    const rows = modules.map((m) => {
      const opens = start ? new Date(start.getTime() + (m.position - 1) * 7 * 86400000) : null;
      const due = opens ? new Date(opens.getTime() + 6 * 86400000 + 15 * 3600000) : null;
      return { org_id: org.id, cohort_id: cohort!.id, module_id: m.id, opens_at: opens?.toISOString() ?? null, due_at: due?.toISOString() ?? null };
    });
    const { error: e2 } = await supabase.from("cohort_modules").insert(rows);
    if (e2) redirect(`/org/cohorts?error=${encodeURIComponent(`Cohort created, schedule failed: ${e2.message}`)}`);
  }
  if (instructorId) {
    const { error: e3 } = await supabase.from("cohort_instructors").insert({ org_id: org.id, cohort_id: cohort!.id, user_id: instructorId });
    if (e3) redirect(`/org/cohorts?error=${encodeURIComponent(`Cohort created, instructor failed: ${e3.message}`)}`);
  }
  revalidatePath("/org/cohorts");
  redirect(`/c/${cohort!.id}`);
}

export async function setInstructor(formData: FormData) {
  const org = await getAdminOrg();
  if (!org) redirect("/");
  const cohortId = String(formData.get("cohort_id"));
  const userId = String(formData.get("user_id") ?? "");
  if (!userId) redirect("/org/cohorts");
  const supabase = await createClient();
  const { error } = await supabase.from("cohort_instructors").upsert({ org_id: org.id, cohort_id: cohortId, user_id: userId }, { onConflict: "cohort_id,user_id", ignoreDuplicates: true });
  if (error) redirect(`/org/cohorts?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/org/cohorts");
  redirect("/org/cohorts");
}
