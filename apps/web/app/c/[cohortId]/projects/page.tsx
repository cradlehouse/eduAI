import Link from "next/link";
import { redirect } from "next/navigation";
import { getNav } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/server";
import { decide, deleteProject, postProject, signUp, updateProject } from "./actions";

const STATUS = ["draft", "open", "crewed", "closed"] as const;

export default async function ProjectsPage({ params, searchParams }: { params: Promise<{ cohortId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { cohortId } = await params;
  const { ok, error } = await searchParams;
  const nav = await getNav();
  if (!nav) redirect("/login");
  const manage = nav.cohorts.find((c) => c.id === cohortId)?.manage ?? false;
  const supabase = await createClient();
  const [{ data: projects }, { data: tokens }, { data: pending }, { data: org }] = await Promise.all([
    supabase.from("projects").select("id, title, logline, status, crew_cap, roles_needed, requires_approval, project_members(user_id, roles, users(email, display_name))").eq("cohort_id", cohortId).order("created_at"),
    manage ? supabase.from("project_tokens").select("project_id, total_tokens, spent_tokens").eq("cohort_id", cohortId) : Promise.resolve({ data: [] as { project_id: string | null; total_tokens: number | null; spent_tokens: number | null }[] }),
    supabase.from("signup_requests").select("id, project_id, user_id, roles, status, users!signup_requests_user_id_fkey(email, display_name)").eq("status", "pending"),
    supabase.from("orgs").select("project_roles").eq("id", nav.org?.id ?? "").maybeSingle(),
  ]);
  const roleList = org?.project_roles ?? [];
  const name = (u: { email: string; display_name: string | null } | null) => u?.display_name ?? u?.email?.split("@")[0] ?? "?";
  const tok = (id: string) => (tokens ?? []).find((t) => t.project_id === id);
  const RoleBoxes = ({ n, checked }: { n: string; checked?: string[] }) => (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">{roleList.map((r) => <label key={r} className="flex items-center gap-1"><input type="checkbox" name={n} value={r} defaultChecked={checked?.includes(r)} /> {r}</label>)}</div>
  );

  return (
    <div className="max-w-4xl">
      <h1 className="display mb-1 text-2xl">Projects</h1>
      <p className="mb-4 text-sm text-dim">{manage ? "Post a project; apprentices sign up and pick their roles." : "Sign up for a project and pick the role or roles you'll take."}</p>
      {ok && <p className="mb-4 rounded-[6px] bg-ok/10 p-2 text-sm text-ok">{ok}</p>}
      {error && <p className="mb-4 rounded-[6px] bg-drift/10 p-2 text-sm text-drift">{error}</p>}

      {manage && (
        <details className="card mb-6 p-4" style={{ borderRadius: 10 }}>
          <summary className="display cursor-pointer list-none">+ Post a project</summary>
          <form action={postProject} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="cohort_id" value={cohortId} />
            <label className="text-sm"><span className="label">Title</span><br /><input name="title" required className="input w-full" /></label>
            <label className="text-sm"><span className="label">Logline</span><br /><input name="logline" className="input w-full" /></label>
            <label className="text-sm"><span className="label">Budget (tokens)</span><br /><input name="budget_tokens" type="number" min={0} step={1000} defaultValue={600000} className="input w-full" /></label>
            <label className="text-sm"><span className="label">Crew cap (0 = none)</span><br /><input name="crew_cap" type="number" min={0} defaultValue={4} className="input w-full" /></label>
            <div className="sm:col-span-2"><span className="label">Roles needed</span><RoleBoxes n="roles_needed" /></div>
            <label className="text-sm"><span className="label">Status</span><br /><select name="status" className="input" defaultValue="open">{STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
            <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="requires_approval" /> Sign-ups need my approval</label>
            <div className="sm:col-span-2"><button className="btn-primary">Post</button></div>
          </form>
        </details>
      )}

      <ul className="flex flex-col gap-4">
        {(projects ?? []).map((p) => {
          const onIt = p.project_members.some((m) => m.user_id === nav.userId);
          const myPending = (pending ?? []).find((r) => r.project_id === p.id && r.user_id === nav.userId);
          const reqs = (pending ?? []).filter((r) => r.project_id === p.id);
          const t = tok(p.id);
          const full = p.crew_cap != null && p.project_members.length >= p.crew_cap;
          return (
            <li key={p.id} className="card p-5" style={{ borderRadius: 10 }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="display text-lg">{p.title}</span>
                  <span className={`pill ml-2 ${p.status === "open" ? "bg-ok/15 text-ok" : "bg-glass"}`}>{p.status}{full ? " · full" : ""}</span>
                  {p.logline && <p className="text-sm text-dim">{p.logline}</p>}
                </div>
                {(onIt || manage) && <Link href={`/p/${p.id}`} className="btn-primary">Open ▸</Link>}
              </div>
              <div className="mt-2 text-sm">
                <span className="label">Crew</span>{p.crew_cap ? <span className="ml-2 text-xs text-dim">{p.project_members.length} / {p.crew_cap}</span> : null}
                <ul className="mt-1 flex flex-wrap gap-2">
                  {p.project_members.map((m) => <li key={m.user_id} className="rounded-full border border-glass-edge bg-card px-3 py-0.5 text-sm">{name(m.users)} <span className="text-xs text-dim">{m.roles.join(" · ")}</span></li>)}
                  {p.project_members.length === 0 && <li className="text-sm text-dim">nobody yet</li>}
                </ul>
                {p.roles_needed.length > 0 && <div className="mt-1 text-xs text-dim">needs: {p.roles_needed.join(", ")}</div>}
              </div>

              {!manage && !onIt && p.status === "open" && !full && (
                myPending ? <p className="mt-3 text-sm text-ok">Sign-up sent as {myPending.roles.join(", ")}; waiting for approval.</p> : (
                  <form action={signUp} className="mt-3 flex flex-col gap-2">
                    <input type="hidden" name="cohort_id" value={cohortId} />
                    <input type="hidden" name="project_id" value={p.id} />
                    <span className="label">Sign up as</span>
                    <RoleBoxes n="roles" />
                    <div><button className="btn-primary">{p.requires_approval ? "Request to join" : "Join project"}</button></div>
                  </form>
                )
              )}

              {manage && reqs.length > 0 && (
                <div className="mt-3 rounded-[6px] bg-gold/15 p-3 text-sm">
                  <span className="label">Sign-ups awaiting approval</span>
                  <ul className="mt-1 flex flex-col gap-1">
                    {reqs.map((r) => (
                      <li key={r.id} className="flex items-center gap-2">
                        <span>{name(r.users)} <span className="text-xs text-dim">as {r.roles.join(", ")}</span></span>
                        <form action={decide} className="flex gap-1"><input type="hidden" name="cohort_id" value={cohortId} /><input type="hidden" name="request_id" value={r.id} /><button name="approve" value="1" className="btn">Approve</button><button name="approve" value="0" className="btn text-drift">Decline</button></form>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {manage && (
                <details className="mt-3">
                  <summary className="btn cursor-pointer list-none">Edit</summary>
                  <form action={updateProject} className="mt-2 grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="cohort_id" value={cohortId} />
                    <input type="hidden" name="project_id" value={p.id} />
                    <label className="text-sm"><span className="label">Title</span><br /><input name="title" defaultValue={p.title} className="input w-full" /></label>
                    <label className="text-sm"><span className="label">Logline</span><br /><input name="logline" defaultValue={p.logline} className="input w-full" /></label>
                    <label className="text-sm"><span className="label">Budget (tokens){t ? ` · ${(t.spent_tokens ?? 0).toLocaleString()} spent` : ""}</span><br /><input name="budget_tokens" type="number" min={0} step={1000} defaultValue={t?.total_tokens ?? 0} className="input w-full" /></label>
                    <label className="text-sm"><span className="label">Crew cap (0 = none)</span><br /><input name="crew_cap" type="number" min={0} defaultValue={p.crew_cap ?? 0} className="input w-full" /></label>
                    <div className="sm:col-span-2"><span className="label">Roles needed</span><RoleBoxes n="roles_needed" checked={p.roles_needed} /></div>
                    <label className="text-sm"><span className="label">Status</span><br /><select name="status" className="input" defaultValue={p.status}>{STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
                    <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="requires_approval" defaultChecked={p.requires_approval} /> Sign-ups need my approval</label>
                    <div className="flex gap-2 sm:col-span-2"><button className="btn-primary">Save</button><button formAction={deleteProject} className="btn text-drift">Delete project</button></div>
                  </form>
                </details>
              )}
            </li>
          );
        })}
        {(projects ?? []).length === 0 && <p className="text-sm text-dim">Nothing posted yet.</p>}
      </ul>
    </div>
  );
}
