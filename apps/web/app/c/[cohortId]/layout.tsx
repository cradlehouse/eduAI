import { notFound, redirect } from "next/navigation";
import { getNav } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/Shell";
import { NavGroup, NavItem } from "@/components/NavItem";

const SECTIONS = { "": "Home", team: "Team", projects: "Projects", schedule: "Schedule" };

export default async function CohortLayout({ children, params }: { children: React.ReactNode; params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const nav = await getNav();
  if (!nav) redirect("/login");
  const me = nav.cohorts.find((c) => c.id === cohortId);
  if (!me) notFound();
  const supabase = await createClient();
  const [{ data: cohort }, { data: personal }] = await Promise.all([
    supabase.from("cohorts").select("id, name").eq("id", cohortId).maybeSingle(),
    supabase.from("personal_tokens").select("total_tokens, spent_tokens").eq("cohort_id", cohortId).eq("user_id", nav.userId).maybeSingle(),
  ]);
  if (!cohort) notFound();
  const mine = nav.myProjects.filter((p) => p.cohort_id === cohortId);
  const base = `/c/${cohortId}`;
  const siblings = nav.cohorts.map((c) => ({ id: c.id, label: c.name, href: `/c/${c.id}` }));

  return (
    <Shell nav={nav}
      crumbs={[{ label: nav.org?.name ?? "Imaje", href: "/home", image: nav.org?.mark_url }, { label: cohort.name, href: base, siblings }]}
      base={base} sections={SECTIONS} sidebarTitle={cohort.name}
      budget={personal ? { spent: personal.spent_tokens ?? 0, total: personal.total_tokens ?? 0, scope: "personal" } : null}
      sidebar={<>
        <NavGroup title="Cohort">
          <NavItem href={base} exact icon="Home">Home</NavItem>
          <NavItem href={`${base}/team`} icon="Users">Team</NavItem>
          <NavItem href={`${base}/projects`} icon="Clapperboard">Projects</NavItem>
          {me.manage && <>
            <NavItem href={`${base}/schedule`} mark="instructor" icon="CalendarDays">Schedule</NavItem>
          </>}
        </NavGroup>
        {mine.length > 0 && (
          <NavGroup title="My projects">
            {mine.map((p) => <NavItem key={p.id} href={`/p/${p.id}`} mark={p.roles.join(" · ")} icon="Film">{p.title}</NavItem>)}
          </NavGroup>
        )}
      </>}>
      {children}
    </Shell>
  );
}
