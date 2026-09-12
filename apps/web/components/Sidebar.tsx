import Link from "next/link";
import type { Nav } from "@/lib/auth/nav";
import { NavLink } from "./NavLink";
import { Switcher } from "./Switcher";
import { BudgetRing } from "./BudgetRing";
import { signOut } from "@/app/welcome/actions";

export type SidebarContext = {
  cohortId?: string | null;                 // cohort in view (directly, or via the project)
  projectId?: string | null;                // project in view
  budget?: { spent: number; total: number; scope: "project" | "personal" } | null;
};

// THE navigation. One fixed tree for a given user; sections never move or vanish as you navigate.
// Admins see ADMIN + COHORT + PROJECT; instructors COHORT + PROJECT; apprentices PROJECT.
export function Sidebar({ nav, ctx }: { nav: Nav; ctx: SidebarContext }) {
  const cohort = (ctx.cohortId && nav.cohorts.find((c) => c.id === ctx.cohortId)) || nav.cohorts[0] || null;
  const cohortProjects = cohort ? nav.projects.filter((p) => p.cohort_id === cohort.id) : nav.projects;
  const projectPool = cohortProjects.length ? cohortProjects : nav.projects;
  const project = (ctx.projectId && nav.projects.find((p) => p.id === ctx.projectId)) || projectPool[0] || null;
  const role = nav.isAdmin ? "admin" : nav.isInstructor ? "instructor" : "apprentice";
  const soon = (label: string, when: string) => <span key={label} className="block rounded-full px-3 py-1 text-sm opacity-40">{label} <span className="text-[10px]">{when}</span></span>;

  return (
    <aside className="panel m-3 flex w-60 shrink-0 flex-col p-4">
      <Link href="/" className="display mb-4 text-lg">eduai</Link>

      {nav.isAdmin && (
        <section className="mb-5">
          <div className="label mb-1">Admin</div>
          <NavLink href="/org" exact>Organisation</NavLink>
          <NavLink href="/org/people">People</NavLink>
          <NavLink href="/org/cohorts">Cohorts</NavLink>
          {soon("Models", "P1-15")}
          {soon("Credentials", "Phase 4")}
        </section>
      )}

      {(nav.isAdmin || nav.isInstructor) && cohort && (
        <section className="mb-5">
          <Switcher label="Cohort" current={cohort} options={nav.cohorts} hrefFor={(id) => `/c/${id}`} />
          <NavLink href={`/c/${cohort.id}`} exact>Overview</NavLink>
          <NavLink href={`/c/${cohort.id}/schedule`}>Schedule</NavLink>
          <NavLink href={`/c/${cohort.id}/projects`}>Projects</NavLink>
          {soon("Review queue", "Phase 2")}
          {soon("Budgets", "Phase 2")}
          {soon("Release", "Phase 3")}
          {soon("Integrity", "Phase 2")}
          {soon("Evidence", "Phase 4")}
        </section>
      )}

      {project && (
        <section className="mb-5">
          <Switcher label="Project" current={{ id: project.id, name: project.title }} options={projectPool.map((p) => ({ id: p.id, name: p.title }))} hrefFor={(id) => `/p/${id}`} />
          <NavLink href={`/p/${project.id}`} exact>Dashboard</NavLink>
          <NavLink href={`/p/${project.id}/module`}>Module brief</NavLink>
          <NavLink href={`/p/${project.id}/bible`}>Bible</NavLink>
          <NavLink href={`/p/${project.id}/scenes`}>Storyboard</NavLink>
          {soon("Takes", "P1-13")}
          {soon("Compare", "Phase 2")}
          {soon("Timeline", "Phase 3")}
          {soon("Export", "Phase 3")}
          {ctx.projectId === project.id && ctx.budget && (
            <div className="mt-3"><BudgetRing spent={ctx.budget.spent} total={ctx.budget.total} scope={ctx.budget.scope} /></div>
          )}
        </section>
      )}

      <div className="mt-auto flex items-center gap-2 border-t border-line pt-3">
        <span className="display flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs text-paper">{(nav.email[0] ?? "?").toUpperCase()}</span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[11px]">{nav.email}</div>
          <div className="text-[10px] text-muted">{role} · {nav.orgName}</div>
        </div>
        <form action={signOut}><button type="submit" className="text-[10px] text-muted underline">sign out</button></form>
      </div>
    </aside>
  );
}
