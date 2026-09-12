"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminOrg } from "@/lib/auth/org";
import type { Database } from "@/lib/db/types";

type MemberRole = Database["public"]["Enums"]["member_role"];
type ProjectRole = Database["public"]["Enums"]["project_role"];

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function parseEmails(raw: string): { ok: string[]; bad: string[] } {
  const seen = new Set<string>();
  const ok: string[] = [], bad: string[] = [];
  for (const piece of raw.split(/[\s,;]+/)) {
    const e = piece.trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    (EMAIL.test(e) ? ok : bad).push(e);
  }
  return { ok, bad };
}

// Paste emails → one invites row each. RLS enforces: admin of the org, invited_by = me,
// and role grantable by me (admins can't invite admins; only owners can).
export async function createInvites(formData: FormData) {
  const org = await getAdminOrg();
  if (!org) redirect("/");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { ok, bad } = parseEmails(String(formData.get("emails") ?? ""));
  const role = String(formData.get("role") ?? "student") as MemberRole;
  const cohortId = String(formData.get("cohort_id") ?? "") || null;
  const projectId = String(formData.get("project_id") ?? "") || null;
  const projectRole = (String(formData.get("project_role") ?? "") || null) as ProjectRole | null;
  const isMinor = formData.get("is_minor") === "on";

  if (ok.length === 0) redirect(`/org/people?error=${encodeURIComponent("No valid email addresses.")}`);
  if (projectId && !cohortId) redirect(`/org/people?error=${encodeURIComponent("A project invite needs its cohort.")}`);

  const rows = ok.map((email) => ({
    org_id: org.id, email, role, cohort_id: cohortId, project_id: projectId,
    project_role: projectId ? projectRole ?? "director" : null, is_minor: isMinor, invited_by: user.id,
  }));
  const { error } = await supabase.from("invites").insert(rows);
  if (error) redirect(`/org/people?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/org/people");
  const note = bad.length ? ` Skipped ${bad.length} invalid: ${bad.join(", ")}` : "";
  redirect(`/org/people?ok=${encodeURIComponent(`Created ${ok.length} invite(s).${note}`)}`);
}

export async function revokeInvite(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("invites").delete().eq("id", String(formData.get("id"))).is("accepted_at", null);
  if (error) redirect(`/org/people?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/org/people");
  redirect("/org/people");
}

export async function setMemberRole(formData: FormData) {
  const supabase = await createClient();
  const role = String(formData.get("role")) as MemberRole;
  const { error } = await supabase.from("memberships").update({ role }).eq("id", String(formData.get("id")));
  if (error) redirect(`/org/people?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/org/people");
  redirect("/org/people");
}

export async function setMemberMinor(formData: FormData) {
  const supabase = await createClient();
  const is_minor = formData.get("is_minor") === "true";
  const { error } = await supabase.from("memberships").update({ is_minor }).eq("id", String(formData.get("id")));
  if (error) redirect(`/org/people?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/org/people");
  redirect("/org/people");
}

export async function removeMember(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("memberships").delete().eq("id", String(formData.get("id")));
  if (error) redirect(`/org/people?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/org/people");
  redirect("/org/people");
}

// Put an existing member on a project (instructor/admin only, via project_members RLS).
export async function addToProject(formData: FormData) {
  const org = await getAdminOrg();
  if (!org) redirect("/");
  const supabase = await createClient();
  const userId = String(formData.get("user_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const role = String(formData.get("project_role") ?? "director") as ProjectRole;
  if (!userId || !projectId) redirect(`/org/people?error=${encodeURIComponent("Pick a project.")}`);
  const { data: project } = await supabase.from("projects").select("cohort_id").eq("id", projectId).maybeSingle();
  if (!project) redirect(`/org/people?error=${encodeURIComponent("Project not found.")}`);
  // Enrol in the cohort too, so the student sees its schedule.
  await supabase.from("enrolments").upsert({ org_id: org.id, cohort_id: project.cohort_id, user_id: userId }, { onConflict: "cohort_id,user_id", ignoreDuplicates: true });
  const { error } = await supabase.from("project_members").upsert({ org_id: org.id, project_id: projectId, user_id: userId, role }, { onConflict: "project_id,user_id" });
  if (error) redirect(`/org/people?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/org/people");
  redirect(`/org/people?ok=${encodeURIComponent("Added to project.")}`);
}
