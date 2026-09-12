import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/projects/data";
import { BudgetRing } from "@/components/BudgetRing";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { signOut } from "@/app/welcome/actions";

const NAV = [
  { seg: "", label: "Dashboard" },
  { seg: "module", label: "Module brief" },
  { seg: "bible", label: "Bible" },
  { seg: "scenes", label: "Scenes", soon: "P1-07" },
  { seg: "takes", label: "Takes", soon: "P1-13" },
  { seg: "compare", label: "Compare", soon: "Phase 2" },
  { seg: "timeline", label: "Timeline", soon: "Phase 3" },
  { seg: "export", label: "Export", soon: "Phase 3" },
];

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const data = await getProject(projectId);
  if (!data) notFound();
  const { project, myProjects, budget, isMember, user } = data;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-ink/10 p-4 dark:border-paper/15">
        <ProjectSwitcher current={project.id} projects={myProjects} />
        <nav className="mt-6 flex flex-col gap-1 text-sm">
          {NAV.map((n) =>
            n.soon ? (
              <span key={n.seg} className="rounded px-2 py-1 opacity-40">{n.label} <span className="text-xs">{n.soon}</span></span>
            ) : (
              <Link key={n.seg} href={`/p/${project.id}${n.seg ? `/${n.seg}` : ""}`} className="rounded px-2 py-1 hover:bg-ink/5 dark:hover:bg-paper/10">{n.label}</Link>
            ),
          )}
        </nav>
        <div className="mt-auto border-t border-ink/10 pt-4 dark:border-paper/15">
          {budget ? <BudgetRing spent={budget.spent_tokens ?? 0} total={budget.total_tokens ?? 0} scope={budget.scope} />
                  : <p className="text-xs opacity-60">No budget set yet.</p>}
          <div className="mt-4 text-xs opacity-70">{user.email}</div>
          <form action={signOut}><button className="text-xs underline" type="submit">Sign out</button></form>
        </div>
      </aside>
      <div className="flex-1">
        {!isMember && (
          <div className="border-b border-accent/50 bg-accent/10 px-6 py-2 text-sm">
            Viewing as instructor. You are not a member of this project; edits still count as yours.
          </div>
        )}
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
