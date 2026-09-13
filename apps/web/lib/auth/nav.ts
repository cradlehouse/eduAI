import "server-only";
import { createClient } from "@/lib/supabase/server";

// What the signed-in user can reach, filtered to THEIR rows. Feeds the header breadcrumb and the sidebars.
export async function getNav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: memberships }, { data: instructing }, { data: enrolled }] = await Promise.all([
    supabase.from("memberships").select("role, is_minor, orgs(id, name, logo_url, mark_url)").eq("user_id", user.id),
    supabase.from("cohort_instructors").select("cohorts(id, name)").eq("user_id", user.id),
    supabase.from("enrolments").select("cohorts(id, name)").eq("user_id", user.id).eq("status", "active"),
  ]);
  const isAdmin = (memberships ?? []).some((m) => m.role === "admin" || m.role === "owner");
  const cohorts = new Map<string, { id: string; name: string; manage: boolean }>();
  for (const r of instructing ?? []) if (r.cohorts) cohorts.set(r.cohorts.id, { ...r.cohorts, manage: true });
  if (isAdmin) {
    const { data: all } = await supabase.from("cohorts").select("id, name");
    for (const c of all ?? []) cohorts.set(c.id, { ...c, manage: true });
  }
  for (const r of enrolled ?? []) if (r.cohorts && !cohorts.has(r.cohorts.id)) cohorts.set(r.cohorts.id, { ...r.cohorts, manage: false });
  const { data: myProjects } = await supabase.from("project_members").select("project_id, roles, projects(id, title, cohort_id)").eq("user_id", user.id);
  const manageIds = [...cohorts.values()].filter((c) => c.manage).map((c) => c.id);
  const { data: managed } = manageIds.length
    ? await supabase.from("projects").select("id, title, cohort_id").in("cohort_id", manageIds).order("title")
    : { data: [] as { id: string; title: string; cohort_id: string }[] };
  const projectsByCohort: Record<string, { id: string; title: string }[]> = {};
  for (const p of managed ?? []) (projectsByCohort[p.cohort_id] ??= []).push({ id: p.id, title: p.title });
  for (const m of myProjects ?? []) {
    if (!m.projects) continue;
    const list = (projectsByCohort[m.projects.cohort_id] ??= []);
    if (!list.some((x) => x.id === m.projects!.id)) list.push({ id: m.projects.id, title: m.projects.title });
  }
  return {
    projectsByCohort,
    userId: user.id, email: user.email ?? "",
    isAdmin, isInstructor: (instructing ?? []).length > 0,
    org: memberships?.[0]?.orgs ?? null,
    orgs: (memberships ?? []).flatMap((m) => (m.orgs ? [m.orgs] : [])),
    cohorts: [...cohorts.values()],
    myProjects: (myProjects ?? []).flatMap((m) => (m.projects ? [{ id: m.projects.id, title: m.projects.title, cohort_id: m.projects.cohort_id, roles: m.roles }] : [])),
  };
}
export type Nav = NonNullable<Awaited<ReturnType<typeof getNav>>>;
