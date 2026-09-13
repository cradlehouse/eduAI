import type { Nav } from "@/lib/auth/nav";
import { NavGroup, NavItem } from "./NavItem";
import { TokenBar, TokenRing, type Budget } from "./TokenMeter";

// The slide-out for a project: the cohort's projects (current one open) with the project's pages
// underneath, and the project's token meter. Appears beside the main tree, which drops to icons.
export function ProjectPanel({ nav, cohortId, projectId, budget, note }: { nav: Nav; cohortId: string; projectId: string; budget?: Budget | null; note?: React.ReactNode }) {
  const projects = nav.projectsByCohort[cohortId] ?? [];
  const cohort = nav.cohorts.find((c) => c.id === cohortId);
  return (
    <aside className="panel my-3 mr-3 flex w-64 shrink-0 flex-col p-3">
      {budget && <div className="card mb-3 flex items-center gap-3 p-3"><TokenRing spent={budget.spent} total={budget.total} size={40} /><div className="min-w-0 flex-1"><TokenBar {...budget} /></div></div>}
      <NavGroup title={`${cohort?.name ?? "Cohort"} · projects`}>
        {projects.map((p) => {
          const cur = p.id === projectId;
          return (
            <div key={p.id}>
              <NavItem href={`/p/${p.id}`} exact={cur} icon="Film">{p.title}</NavItem>
              {cur && (
                <div>
                  <NavItem href={`/p/${p.id}/scenes`} depth={1} icon="LayoutGrid">Scenes</NavItem>
                  <NavItem href={`/p/${p.id}/bible`} depth={1} icon="BookOpen">Bible</NavItem>
                  <NavItem href={`/p/${p.id}/members`} depth={1} icon="Users">Members</NavItem>
                </div>
              )}
            </div>
          );
        })}
        <NavItem href={`/c/${cohortId}/projects`} icon="Clapperboard">All projects</NavItem>
      </NavGroup>
      {note}
    </aside>
  );
}
