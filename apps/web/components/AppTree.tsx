import type { Nav } from "@/lib/auth/nav";
import { NavGroup, NavItem } from "./NavItem";

export type Scope = { cohortId?: string | null; projectId?: string | null };

// One tree for the whole app: the organisation rows (admins), every cohort you can reach, and the
// current cohort's pages. It stops at Projects on purpose: a project opens in its own panel beside
// this tree (ProjectPanel), and the tree drops to icons to make room.
export function AppTree({ nav, scope }: { nav: Nav; scope: Scope }) {
  const openCohort = scope.cohortId ?? (nav.cohorts.length === 1 ? nav.cohorts[0].id : undefined);
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
          return (
            <div key={c.id}>
              <NavItem href={`/c/${c.id}`} exact={open} icon="GraduationCap" mark={c.manage ? "instructor" : undefined}>{c.name}</NavItem>
              {open && (
                <div>
                  <NavItem href={`/c/${c.id}/team`} depth={1} icon="Users">Team</NavItem>
                  <NavItem href={`/c/${c.id}/projects`} depth={1} icon="Clapperboard">Projects</NavItem>
                  {c.manage && <NavItem href={`/c/${c.id}/schedule`} depth={1} icon="CalendarDays">Schedule</NavItem>}
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
