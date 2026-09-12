import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addCrew, createProject, deleteProject, removeCrew, setBudget, updateProject } from "./actions";

const ROLES = ["director", "dp", "sound", "editor", "producer"] as const;

export default async function CohortProjects({ params, searchParams }: { params: Promise<{ cohortId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { cohortId } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: projects }, { data: enrolled }, { data: tokens }] = await Promise.all([
    supabase.from("projects").select("id, title, logline, project_members(user_id, role, users(email, display_name))").eq("cohort_id", cohortId).order("created_at"),
    supabase.from("enrolments").select("user_id, users(email, display_name)").eq("cohort_id", cohortId).eq("status", "active"),
    supabase.from("project_tokens").select("project_id, total_tokens, spent_tokens, remaining_tokens").eq("cohort_id", cohortId),
  ]);
  const tok = (id: string) => (tokens ?? []).find((t) => t.project_id === id);
  const name = (u: { email: string; display_name: string | null } | null) => u?.display_name ?? u?.email ?? "?";

  return (
    <div className="max-w-4xl">
      <h1 className="display mb-1 text-2xl">Projects</h1>
      <p className="mb-6 text-sm text-muted">A project is a film with a crew and a token budget. Cohort film: one project, everyone on it. Individual films: one each.</p>
      {ok && <p className="mb-4 rounded-[12px] bg-control/10 p-2 text-sm text-control">{ok}</p>}
      {error && <p className="mb-4 rounded-[12px] bg-danger/10 p-2 text-sm text-danger">{error}</p>}

      <form action={createProject} className="card mb-8 grid gap-3 p-5 sm:grid-cols-[1fr_1fr_140px_auto]" style={{ borderRadius: 22 }}>
        <input type="hidden" name="cohort_id" value={cohortId} />
        <label className="text-sm"><span className="label">Title</span><br /><input name="title" required className="input w-full" placeholder="SC/Warehouse" /></label>
        <label className="text-sm"><span className="label">Logline</span><br /><input name="logline" className="input w-full" placeholder="one sentence" /></label>
        <label className="text-sm"><span className="label">Budget (tokens)</span><br /><input name="budget_tokens" type="number" min={0} step={1000} defaultValue={600000} className="input w-full" /></label>
        <div className="flex items-end"><button className="btn-primary">+ New project</button></div>
      </form>

      <ul className="flex flex-col gap-4">
        {(projects ?? []).map((p) => {
          const t = tok(p.id);
          const onProject = new Set(p.project_members.map((m) => m.user_id));
          return (
            <li key={p.id} className="card p-5" style={{ borderRadius: 22 }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <form action={updateProject} className="flex flex-1 flex-wrap items-end gap-2">
                  <input type="hidden" name="cohort_id" value={cohortId} />
                  <input type="hidden" name="project_id" value={p.id} />
                  <label className="text-sm"><span className="label">Title</span><br /><input name="title" defaultValue={p.title} className="input display" /></label>
                  <label className="min-w-64 flex-1 text-sm"><span className="label">Logline</span><br /><input name="logline" defaultValue={p.logline} className="input w-full" /></label>
                  <button className="btn">Save</button>
                  <Link href={`/p/${p.id}`} className="btn-primary">Open project →</Link>
                </form>
                <form action={setBudget} className="flex items-center gap-2 text-sm">
                  <input type="hidden" name="cohort_id" value={cohortId} />
                  <input type="hidden" name="project_id" value={p.id} />
                  <span className="text-xs text-muted">{t ? `${(t.spent_tokens ?? 0).toLocaleString()} spent of` : "no budget ·"}</span>
                  <input name="budget_tokens" type="number" min={0} step={1000} defaultValue={t?.total_tokens ?? 0} className="input w-32" />
                  <span className="text-xs text-muted">tokens</span>
                  <button className="btn">Set</button>
                </form>
              </div>

              <div className="mt-3">
                <div className="label mb-1">Crew</div>
                {p.project_members.length === 0 ? <p className="text-sm text-muted">Nobody yet.</p> : (
                  <ul className="mb-2 flex flex-wrap gap-2">
                    {p.project_members.map((m) => (
                      <li key={m.user_id} className="flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-sm">
                        {name(m.users)} <span className="text-xs text-muted">{m.role}</span>
                        <form action={removeCrew}><input type="hidden" name="cohort_id" value={cohortId} /><input type="hidden" name="project_id" value={p.id} /><input type="hidden" name="user_id" value={m.user_id} /><button className="btn">×</button></form>
                      </li>
                    ))}
                  </ul>
                )}
                <form action={addCrew} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="cohort_id" value={cohortId} />
                  <input type="hidden" name="project_id" value={p.id} />
                  <select name="user_id" className="input" defaultValue="">
                    <option value="">add an apprentice…</option>
                    {(enrolled ?? []).filter((e) => !onProject.has(e.user_id)).map((e) => <option key={e.user_id} value={e.user_id}>{name(e.users)}</option>)}
                  </select>
                  <select name="role" className="input" defaultValue="director">{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
                  <button className="btn">Add</button>
                  <form action={deleteProject} className="ml-auto"><input type="hidden" name="cohort_id" value={cohortId} /><input type="hidden" name="project_id" value={p.id} /><button className="btn text-danger">Delete project</button></form>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
      {(enrolled ?? []).length === 0 && <p className="mt-4 text-xs text-muted">No apprentices are enrolled in this cohort yet. Invite them from Admin → People with this cohort selected.</p>}
    </div>
  );
}
