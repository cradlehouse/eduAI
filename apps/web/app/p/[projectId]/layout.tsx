import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/projects/data";
import { getNav } from "@/lib/auth/nav";
import { Sidebar } from "@/components/Sidebar";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [data, nav] = await Promise.all([getProject(projectId), getNav()]);
  if (!data || !nav) notFound();
  const { project, budget, isMember } = data;
  const ring = budget ? { spent: budget.spent_tokens ?? 0, total: budget.total_tokens ?? 0, scope: budget.scope } : null;
  return (
    <div className="flex min-h-screen">
      <Sidebar nav={nav} ctx={{ cohortId: project.cohort_id, projectId: project.id, budget: ring }} />
      <div className="flex-1">
        {!isMember && (
          <div className="bg-control/10 px-6 py-2 text-sm text-control">
            Viewing as instructor. You are not a member of this project; edits still count as yours.{" "}
            <Link href={`/c/${project.cohort_id}`} className="underline">Cohort overview</Link>
          </div>
        )}
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
