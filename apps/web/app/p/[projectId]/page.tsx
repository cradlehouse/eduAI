import Link from "next/link";
import { notFound } from "next/navigation";
import { currentModule, getModules, getProject } from "@/lib/projects/data";
import { GateNotice } from "@/components/GateNotice";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const data = await getProject(projectId);
  if (!data) notFound();
  const { project, members, budget } = data;
  const mods = await getModules(project.cohort_id, project.id);
  const current = currentModule(mods);
  const supabase = await createClient();
  const { data: jobs } = await supabase.from("job_tokens").select("job_id, status, lane, estimated_tokens, actual_tokens, created_at").eq("project_id", project.id).order("created_at", { ascending: false }).limit(5);

  return (
    <div className="max-w-3xl">
      <h1 className="display text-2xl">{project.title}</h1>
      <p className="mb-6 text-sm opacity-80">{project.logline}</p>

      <section className="mb-8 card p-4">
        <div className="mb-1 label">This week</div>
        {current ? (
          <>
            <h2 className="font-medium">Module {current.module.position}: {current.module.title}</h2>
            {current.state === "open" && current.due_at && <p className="text-xs opacity-70">Due {new Date(current.due_at).toLocaleDateString()}</p>}
            {current.reason && <div className="mt-2"><GateNotice reason={current.reason} /></div>}
            <Link href={`/p/${project.id}/module`} className="mt-2 inline-block text-sm underline">Read the brief</Link>
          </>
        ) : <p className="text-sm opacity-60">No modules scheduled for this cohort yet.</p>}
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="mb-2 label">Crew</div>
          <ul className="text-sm">
            {members.map((m) => <li key={m.user_id}>{m.users?.display_name ?? m.users?.email} <span className="opacity-60">· {m.role}</span></li>)}
          </ul>
        </div>
        <div className="card p-4">
          <div className="mb-2 label">Budget</div>
          {budget ? (
            <dl className="grid grid-cols-2 gap-y-1 text-sm">
              <dt className="opacity-60">Remaining</dt><dd>{(budget.remaining_tokens ?? 0).toLocaleString()} tokens</dd>
              <dt className="opacity-60">Reserved (in flight)</dt><dd>{(budget.reserved_open_tokens ?? 0).toLocaleString()}</dd>
              <dt className="opacity-60">Spent</dt><dd>{(budget.spent_tokens ?? 0).toLocaleString()}</dd>
            </dl>
          ) : <p className="text-sm opacity-60">No envelope yet. Your instructor sets one.</p>}
        </div>
      </section>

      <section>
        <div className="mb-2 label">Recent generations</div>
        {(jobs ?? []).length === 0 ? <p className="text-sm opacity-60">Nothing generated yet. The shot console arrives in P1-09.</p> : (
          <ul className="text-sm">{(jobs ?? []).map((j) => <li key={j.job_id}>{j.created_at ? new Date(j.created_at).toLocaleString() : ""} · {j.lane} · {j.status} · {(j.actual_tokens ?? j.estimated_tokens ?? 0).toLocaleString()} tokens</li>)}</ul>
        )}
      </section>
    </div>
  );
}
