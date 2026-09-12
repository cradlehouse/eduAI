"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Instructors (assigned to the cohort) and admins may change dates and unlock gates: cohort_modules RLS.
export async function setModuleDates(formData: FormData) {
  const cohortId = String(formData.get("cohort_id"));
  const id = String(formData.get("id"));
  const opens = String(formData.get("opens_at") ?? "");
  const due = String(formData.get("due_at") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.from("cohort_modules").update({
    opens_at: opens ? new Date(opens).toISOString() : null,
    due_at: due ? new Date(due).toISOString() : null,
    enabled: formData.get("enabled") === "on",
  }).eq("id", id).select("id");
  if (error) redirect(`/c/${cohortId}?error=${encodeURIComponent(error.message)}`);
  if (!data?.length) redirect(`/c/${cohortId}?error=${encodeURIComponent("Nothing changed: you need to be an instructor on this cohort or an admin. Check which account this window is signed in as.")}`);
  revalidatePath(`/c/${cohortId}`);
  redirect(`/c/${cohortId}`);
}

export async function openModuleNow(formData: FormData) {
  const cohortId = String(formData.get("cohort_id"));
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("cohort_modules").update({
    opens_at: new Date().toISOString(), enabled: true,
    gate_unlocked_at: new Date().toISOString(), gate_unlocked_by: user?.id ?? null,
  }).eq("id", id).select("id, opens_at");
  if (error) redirect(`/c/${cohortId}?error=${encodeURIComponent(error.message)}`);
  if (!data?.length) redirect(`/c/${cohortId}?error=${encodeURIComponent(`Nothing changed: ${user?.email ?? "this account"} isn't an instructor on this cohort or an admin. Check which account this window is signed in as.`)}`);
  revalidatePath(`/c/${cohortId}`);
  redirect(`/c/${cohortId}?ok=${encodeURIComponent("Module opened.")}`);
}
