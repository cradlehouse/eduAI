import { notFound, redirect } from "next/navigation";
import { getProject } from "@/lib/projects/data";
import { getNav } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/Shell";
import { NavGroup, NavItem } from "@/components/NavItem";
import { SidebarNote } from "@/components/Sidebar";

const SECTIONS = { "": "Scenes", bible: "Bible", scenes: "Scenes", shoot: "Scenes", shots: "Scenes", members: "Members" };

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [data, nav] = await Promise.all([getProject(projectId), getNav()]);
  if (!data || !nav) notFound();
  if (!nav.cohorts.some((c) => c.id === data.project.cohort_id) && !data.isMember) redirect("/");
  const { project, budget, isMember } = data;
  const manage = nav.cohorts.find((c) => c.id === project.cohort_id)?.manage ?? false;
  const supabase = await createClient();
  // Sibling projects for the header dropdown: mine in this cohort, or all of them for instructors.
  const { data: sib } = manage
    ? await supabase.from("projects").select("id, title").eq("cohort_id", project.cohort_id).order("title")
    : { data: nav.myProjects.filter((p) => p.cohort_id === project.cohort_id).map((p) => ({ id: p.id, title: p.title })) };
  const base = `/p/${projectId}`;
  const cohortName = project.cohorts?.name ?? "Cohort";

  return (
    <Shell nav={nav}
      crumbs={[{ label: nav.org?.name ?? "Imaje", href: "/home", image: nav.org?.mark_url }, { label: cohortName, href: `/c/${project.cohort_id}` },
               { label: project.title, href: base, siblings: (sib ?? []).map((p) => ({ id: p.id, label: p.title, href: `/p/${p.id}` })) }]}
      base={base} sections={SECTIONS} sidebarTitle={project.title}
      budget={budget ? { spent: budget.spent_tokens ?? 0, total: budget.total_tokens ?? 0, scope: budget.scope } : null}
      sidebar={<>
        <NavItem href={`/c/${project.cohort_id}`} exact icon="ArrowLeft">{cohortName}</NavItem>
        <NavGroup title="Project">
          <NavItem href={`${base}/scenes`} icon="LayoutGrid">Scenes</NavItem>
          <NavItem href={`${base}/bible`} icon="BookOpen">Bible</NavItem>
          <NavItem href={`${base}/members`} icon="Users">Members</NavItem>
        </NavGroup>
        {!isMember && <SidebarNote>You&apos;re not on this crew; you&apos;re here as {manage ? "an instructor" : "a viewer"}.</SidebarNote>}
      </>}>
      {children}
    </Shell>
  );
}
