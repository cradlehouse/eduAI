import "server-only";
import { createClient } from "@/lib/supabase/server";

// What the signed-in user can navigate to, under RLS: admin orgs, cohorts they instruct or are
// enrolled in, projects they can access. Powers the AppBar switcher on every shell.
export async function getNav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: memberships }, { data: instructing }, { data: enrolled }, { data: projects }] = await Promise.all([
    supabase.from("memberships").select("role, orgs(id, name)"),
    supabase.from("cohort_instructors").select("cohorts(id, name)"),
    supabase.from("enrolments").select("cohorts(id, name)"),
    supabase.from("projects").select("id, title, cohort_id").order("created_at"),
  ]);
  const isAdmin = (memberships ?? []).some((m) => m.role === "admin" || m.role === "owner");
  const cohortMap = new Map<string, string>();
  for (const r of instructing ?? []) if (r.cohorts) cohortMap.set(r.cohorts.id, r.cohorts.name);
  const isInstructor = cohortMap.size > 0;
  // Admins can open every cohort in their org; RLS lets them read all of them.
  if (isAdmin) {
    const { data: all } = await supabase.from("cohorts").select("id, name");
    for (const c of all ?? []) cohortMap.set(c.id, c.name);
  }
  const studentCohorts = (enrolled ?? []).flatMap((e) => (e.cohorts ? [e.cohorts] : []));
  return {
    email: user.email ?? "",
    isAdmin, isInstructor,
    orgName: memberships?.[0]?.orgs?.name ?? "",
    cohorts: [...cohortMap].map(([id, name]) => ({ id, name })),
    studentCohorts,
    projects: projects ?? [],
  };
}
export type Nav = NonNullable<Awaited<ReturnType<typeof getNav>>>;
