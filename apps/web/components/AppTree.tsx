import type { Nav } from "@/lib/auth/nav";
import { NavGroup, NavItem } from "./NavItem";

export type Scope = { cohortId?: string | null; projectId?: string | null };

// One tree for the whole app. It opens along the path you're on: the organisation rows (admins),
// every cohort you can reach, the current cohort's pages and projects, and the current project's pages.
// Nothing swaps; deeper pages appear underneath the row you clicked.
export function AppTree({ nav, scope }: { nav: Nav; scope: Scope }) {
  const projectCohort = scope.projectId ? Object.entries(nav.projectsByCohort).find(([, ps]) => ps.some((p) => p.id === scope.projectId))?.[0] : undefined;
  const openCohort = scope.cohortId ?? projectCohort ?? (nav.cohorts.length === 1 ? nav.cohorts[0].id : undefined);
  return (
    <nav aria-label="Sections">
      {nav.isAdmin && (
        <NavGroup title={nav.org?.name ?? "Organisation"}>
          <NavItem href="/org" exact icon="Building2">Overview</NavItem>
          <NavItem href="/org/cohorts" icon="GraduationCap">Cohorts</NavItem>
          <NavItem href="/org/people" icon="Users">People</NavItem>
          <NavItem href="/org/keys" icon="KeyRound">Keys</NavItem>
        </NavGroup>
      )}
      <NavGroup title={nav.cohorts.length === 1 ? "Cohort" : "Cohorts"}>
        {nav.cohorts.map((c) => {
          const open = c.id === openCohort;
          const projects = nav.projectsByCohort[c.id] ?? [];
          return (
            <div key={c.id}>
              <NavItem href={`/c/${c.id}`} exact={open} icon="GraduationCap" mark={c.manage ? "instructor" : undefined}>{c.name}</NavItem>
              {open && (
                <div>
                  <NavItem href={`/c/${c.id}/team`} depth={1} icon="Users">Team</NavItem>
                  <NavItem href={`/c/${c.id}/projects`} depth={1} icon="Clapperboard">Projects</NavItem>
                  {c.manage && <NavItem href={`/c/${c.id}/schedule`} depth={1} icon="CalendarDays">Schedule</NavItem>}
                  {projects.map((p) => {
                    const cur = p.id === scope.projectId;
                    return (
                      <div key={p.id}>
                        <NavItem href={`/p/${p.id}`} depth={1} exact={cur} icon="Film">{p.title}</NavItem>
                        {cur && (
                          <div>
                            <NavItem href={`/p/${p.id}/scenes`} depth={2} icon="LayoutGrid">Scenes</NavItem>
                            <NavItem href={`/p/${p.id}/bible`} depth={2} icon="BookOpen">Bible</NavItem>
                            <NavItem href={`/p/${p.id}/members`} depth={2} icon="Users">Members</NavItem>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {nav.cohorts.length === 0 && <div className="px-3 text-xs text-muted">No cohort yet.</div>}
      </NavGroup>
    </nav>
  );
}
