import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/projects/data";
import { BudgetRing } from "@/components/BudgetRing";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { AppBar } from "@/components/AppBar";
import { getNav } from "@/lib/auth/nav";

const NAV = [
  { seg: "", label: "Dashboard" },
  { seg: "module", label: "Module brief" },
  { seg: "bible", label: "Bible" },
  { seg: "scenes", label: "Storyboard" },
  { seg: "takes", label: "Takes", soon: "P1-13" },
  { seg: "compare", label: "Compare", soon: "Phase 2" },
  { seg: "timeline", label: "Timeline", soon: "Phase 3" },
  { seg: "export", label: "Export", soon: "Phase 3" },
];

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [data, nav] = await Promise.all([getProject(projectId), getNav()]);
  if (!data || !nav) notFound();
  const { project, myProjects, budget, isMember } = data;

  return (
    <div className="flex min-h-screen flex-col">
      <AppBar nav={nav} area="project" crumbs={[{ label: project.cohorts?.name ?? "Cohort", href: nav.cohorts.some((c) => c.id === project.cohort_id) ? `/c/${project.cohort_id}` : undefined }, { label: project.title }]} />
      <div className="flex flex-1">
      <aside className="flex w-60 shrink-0 flex-col panel m-3 p-4">
        <ProjectSwitcher current={project.id} projects={myProjects} />
        <nav className="mt-6 flex flex-col gap-1 text-sm">
          {NAV.map((n) =>
            n.soon ? (
              <span key={n.seg} className="rounded px-2 py-1 opacity-40">{n.label} <span className="text-xs">{n.soon}</span></span>
            ) : (
              <Link key={n.seg} href={`/p/${project.id}${n.seg ? `/${n.seg}` : ""}`} className="rounded-full px-3 py-1 hover:bg-card">{n.label}</Link>
            ),
          )}
        </nav>
        <div className="mt-auto border-t border-line pt-4">
          {budget ? <BudgetRing spent={budget.spent_tokens ?? 0} total={budget.total_tokens ?? 0} scope={budget.scope} />
                  : <p className="text-xs opacity-60">No budget set yet.</p>}
        </div>
      </aside>
      <div className="flex-1">
        {!isMember && (
          <div className="bg-control/10 px-6 py-2 text-sm text-control">
            Viewing as instructor. You are not a member of this project; edits still count as yours.{" "}
            <Link href={`/c/${project.cohort_id}`} className="underline">Back to the cohort</Link>
          </div>
        )}
        <main className="p-8">{children}</main>
      </div>
      </div>
    </div>
  );
}
