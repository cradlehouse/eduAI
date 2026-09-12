import "server-only";
import { createClient } from "@/lib/supabase/server";

// Everything the student shell needs for one project, fetched as the signed-in user (RLS decides
// what they can see: members see their projects, instructors see their cohorts', admins the org's).
export async function getProject(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: project }, { data: myProjects }, { data: members }, { data: projectBudget }] = await Promise.all([
    supabase.from("projects").select("id, title, slug, logline, org_id, cohort_id, cohorts(id, name, starts_on, ends_on)").eq("id", projectId).maybeSingle(),
    supabase.from("projects").select("id, title, cohorts(name)").order("created_at"),
    supabase.from("project_members").select("user_id, role, users(email, display_name)").eq("project_id", projectId).order("created_at"),
    supabase.from("project_tokens").select("total_tokens, spent_tokens, remaining_tokens, reserved_open_tokens").eq("project_id", projectId).maybeSingle(),
  ]);
  if (!project) return null;

  let personalBudget = null;
  if (!projectBudget && project.cohort_id) {
    const { data } = await supabase.from("personal_tokens")
      .select("total_tokens, spent_tokens, remaining_tokens, reserved_open_tokens")
      .eq("cohort_id", project.cohort_id).eq("user_id", user.id).maybeSingle();
    personalBudget = data;
  }

  const isMember = (members ?? []).some((m) => m.user_id === user.id);
  return { user, project, myProjects: myProjects ?? [], members: members ?? [], isMember,
           budget: projectBudget ? { scope: "project" as const, ...projectBudget } : personalBudget ? { scope: "personal" as const, ...personalBudget } : null };
}

export type ModuleRow = {
  id: string; opens_at: string | null; due_at: string | null; enabled: boolean; gate_unlocked_at: string | null;
  modules: { id: string; position: number; title: string; brief: string; gate_kind: "none" | "submission" | "instructor"; gate_module_id: string | null } | null;
};

// The cohort's schedule with a derived state per module: open / upcoming / locked (+ why) / closed.
export async function getModules(cohortId: string, projectId: string) {
  const supabase = await createClient();
  const [{ data: rows }, { data: accepted }] = await Promise.all([
    supabase.from("cohort_modules").select("id, opens_at, due_at, enabled, gate_unlocked_at, modules(id, position, title, brief, gate_kind, gate_module_id)").eq("cohort_id", cohortId),
    supabase.from("submissions").select("cohort_module_id").eq("project_id", projectId).eq("status", "accepted"),
  ]);
  const acceptedIds = new Set((accepted ?? []).map((s) => s.cohort_module_id));
  const list = ((rows ?? []) as ModuleRow[]).filter((r) => r.modules).sort((a, b) => a.modules!.position - b.modules!.position);
  const byModuleId = new Map(list.map((r) => [r.modules!.id, r]));
  const now = Date.now();

  return list.map((r) => {
    const m = r.modules!;
    let state: "open" | "upcoming" | "locked" | "closed" = "open";
    let reason: string | null = null;
    if (!r.enabled) { state = "locked"; reason = "Not enabled for this cohort."; }
    else if (r.opens_at && new Date(r.opens_at).getTime() > now) { state = "upcoming"; reason = `Opens ${new Date(r.opens_at).toLocaleDateString()}.`; }
    else if (m.gate_kind === "instructor" && !r.gate_unlocked_at) { state = "locked"; reason = "Your instructor unlocks this module."; }
    else if (m.gate_kind === "submission" && m.gate_module_id) {
      const gate = byModuleId.get(m.gate_module_id);
      if (gate && !acceptedIds.has(gate.id)) { state = "locked"; reason = `Opens when “${gate.modules!.title}” is accepted.`; }
    }
    if (state === "open" && r.due_at && new Date(r.due_at).getTime() < now) state = "closed";
    return { ...r, module: m, state, reason };
  });
}

export function currentModule<T extends { state: string }>(mods: T[]): T | null {
  return mods.find((m) => m.state === "open") ?? mods.find((m) => m.state === "locked" || m.state === "upcoming") ?? mods.at(-1) ?? null;
}
