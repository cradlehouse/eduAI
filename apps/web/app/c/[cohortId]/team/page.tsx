import Link from "next/link";
import { redirect } from "next/navigation";
import { getNav } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/server";
import { assign, unassign } from "./actions";

export default async function TeamPage({ params, searchParams }: { params: Promise<{ cohortId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { cohortId } = await params;
  const { ok, error } = await searchParams;
  const nav = await getNav();
  if (!nav) redirect("/login");
  const manage = nav.cohorts.find((c) => c.id === cohortId)?.manage ?? false;
  const supabase = await createClient();
  const [{ data: enrolled }, { data: instructors }, { data: projects }, { data: pending }, { data: org }] = await Promise.all([
    supabase.from("enrolments").select("user_id, users(email, display_name)").eq("cohort_id", cohortId).eq("status", "active"),
    supabase.from("cohort_instructors").select("user_id, users(email, display_name)").eq("cohort_id", cohortId),
    supabase.from("projects").select("id, title, status, project_members(user_id, roles)").eq("cohort_id", cohortId).order("created_at"),
    manage ? supabase.from("signup_requests").select("user_id, roles, projects(title)").eq("status", "pending") : Promise.resolve({ data: [] as { user_id: string; roles: string[]; projects: { title: string } | null }[] }),
    supabase.from("orgs").select("project_roles").eq("id", nav.org?.id ?? "").maybeSingle(),
  ]);
  const roleList = org?.project_roles ?? [];
  const name = (u: { email: string; display_name: string | null } | null) => u?.display_name ?? u?.email ?? "?";
  type Row = { userId: string; person: string; project: string | null; projectId: string | null; roles: string[]; status: "active" | "pending" | "none" };
  const rows: Row[] = [];
  for (const e of enrolled ?? []) {
    const on = (projects ?? []).flatMap((p) => p.project_members.filter((m) => m.user_id === e.user_id).map((m) => ({ p, m })));
    const pend = (pending ?? []).filter((r) => r.user_id === e.user_id);
    if (on.length === 0 && pend.length === 0) rows.push({ userId: e.user_id, person: name(e.users), project: null, projectId: null, roles: [], status: "none" });
    for (const { p, m } of on) rows.push({ userId: e.user_id, person: name(e.users), project: p.title, projectId: p.id, roles: m.roles, status: "active" });
    for (const r of pend) rows.push({ userId: e.user_id, person: name(e.users), project: `${r.projects?.title ?? "?"} (pending)`, projectId: null, roles: r.roles, status: "pending" });
  }
  const notOn = rows.filter((r) => r.status === "none").length;
  const csv = ["person,project,roles,status", ...rows.map((r) => [r.person, r.project ?? "", r.roles.join("|"), r.status].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");

  return (
    <div className="max-w-4xl">
      <h1 className="display mb-1 text-2xl">Team</h1>
      <p className="mb-4 text-sm text-muted">
        {(enrolled ?? []).length} apprentices · {(instructors ?? []).length} instructor(s) · {(projects ?? []).length} project(s)
        {manage && <> · <span className="text-danger">{notOn} not on a project · {(pending ?? []).length} awaiting approval</span></>}
      </p>
      {ok && <p className="mb-4 rounded-[12px] bg-control/10 p-2 text-sm text-control">{ok}</p>}
      {error && <p className="mb-4 rounded-[12px] bg-danger/10 p-2 text-sm text-danger">{error}</p>}
      {manage && <a className="btn mb-3 inline-block" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download={`team-${cohortId.slice(0, 8)}.csv`}>Export CSV</a>}

      <table className="w-full text-sm">
        <thead><tr className="label text-left"><th className="py-1">Person</th><th>Project</th><th>Roles</th>{manage && <th>Status</th>}{manage && <th></th>}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              <td className="py-2">{r.person}</td>
              <td>{r.projectId ? <Link href={`/p/${r.projectId}`} className="underline">{r.project}</Link> : <span className="text-muted">{r.project ?? "—"}</span>}</td>
              <td>{r.roles.join(" · ") || <span className="text-muted">—</span>}</td>
              {manage && <td className={r.status === "active" ? "text-muted" : "text-danger"}>{r.status === "active" ? "active" : r.status === "pending" ? "awaiting approval" : "not on a project"}</td>}
              {manage && (
                <td>
                  <details>
                    <summary className="btn cursor-pointer list-none">{r.projectId ? "roles" : "assign"} ▾</summary>
                    <form action={assign} className="card mt-1 flex flex-col gap-2 p-2">
                      <input type="hidden" name="cohort_id" value={cohortId} />
                      <input type="hidden" name="user_id" value={r.userId} />
                      <select name="project_id" className="input" defaultValue={r.projectId ?? ""}>
                        <option value="">project…</option>
                        {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                      </select>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {roleList.map((role) => <label key={role} className="flex items-center gap-1"><input type="checkbox" name="roles" value={role} defaultChecked={r.roles.includes(role)} /> {role}</label>)}
                      </div>
                      <div className="flex gap-2">
                        <button className="btn">Save</button>
                        {r.projectId && <button formAction={unassign} className="btn text-danger"><input type="hidden" name="project_id" value={r.projectId} />Remove</button>}
                      </div>
                    </form>
                  </details>
                </td>
              )}
            </tr>
          ))}
          {(instructors ?? []).map((i) => (
            <tr key={i.user_id} className="border-t border-line text-muted"><td className="py-2">{name(i.users)}</td><td colSpan={manage ? 4 : 2}>instructor</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
