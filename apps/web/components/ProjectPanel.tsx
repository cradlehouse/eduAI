import type { Nav } from "@/lib/auth/nav";
import { NavGroup, NavItem } from "./NavItem";
import { TokenBar, TokenRing, type Budget } from "./TokenMeter";

// The slide-out for a project: the cohort's projects (current one open) with the project's pages
// underneath, the project's token meter, and below it whatever the layout adds (the bible rail).
export function ProjectPanel({ nav, cohortId, projectId, budget, note, inline, children }: { nav: Nav; cohortId: string; projectId: string; budget?: Budget | null; note?: React.ReactNode; inline?: boolean; children?: React.ReactNode }) {
  const projects = nav.projectsByCohort[cohortId] ?? [];
  const cohort = nav.cohorts.find((c) => c.id === cohortId);
  return (
    <aside className={inline ? "flex flex-col" : "panel my-3 mr-3 flex w-[230px] shrink-0 flex-col p-3"}>
      {budget && <div className="mb-2 flex items-center gap-3 rounded-[8px] bg-field p-2.5"><TokenRing spent={budget.spent} total={budget.total} size={36} /><div className="min-w-0 flex-1"><TokenBar {...budget} /></div></div>}
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
      {children}
      {note}
    </aside>
  );
}
