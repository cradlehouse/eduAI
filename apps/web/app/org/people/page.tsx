import { headers } from "next/headers";
import { getAdminOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { CopyButton } from "@/components/CopyButton";
import { addToProject, createInvites, removeMember, revokeInvite, setMemberMinor, setMemberRole } from "./actions";

const btn = "btn";
const input = "input";

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const org = (await getAdminOrg())!;
  const supabase = await createClient();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const [{ data: members }, { data: invites }, { data: cohorts }, { data: projects }, { data: pm }] = await Promise.all([
    supabase.from("memberships").select("id, user_id, role, is_minor, created_at, users(email, display_name)").eq("org_id", org.id).order("created_at"),
    supabase.from("invites").select("id, email, role, is_minor, token, expires_at, accepted_at, cohorts(name), projects(title)").eq("org_id", org.id).order("created_at", { ascending: false }),
    supabase.from("cohorts").select("id, name").eq("org_id", org.id).order("starts_on", { ascending: false }),
    supabase.from("projects").select("id, title, cohort_id").eq("org_id", org.id).order("title"),
    supabase.from("project_members").select("user_id, roles, projects(title)").eq("org_id", org.id),
  ]);
  const projectsOf = (userId: string) => (pm ?? []).filter((x) => x.user_id === userId);
  const pending = (invites ?? []).filter((i) => !i.accepted_at && new Date(i.expires_at) > new Date());
  const canInviteAdmins = org.role === "owner";

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 display text-2xl">People</h1>
      {ok && <p className="mb-4 rounded-[6px] bg-ok/10 p-2 text-sm text-ok">{ok}</p>}
      {error && <p className="mb-4 rounded-[6px] bg-drift/10 p-2 text-sm text-drift">{error}</p>}

      <section className="mb-10 card p-4">
        <h2 className="mb-1 font-medium">Invite</h2>
        <p className="mb-3 text-xs opacity-70">Paste emails (one per line, or comma-separated). Each gets a link below to share. Email sending arrives with Resend.</p>
        <form action={createInvites} className="grid gap-3 md:grid-cols-2">
          <textarea name="emails" required rows={4} placeholder={"ana@example.com\nsam@example.com"} className={`${input} md:col-span-2`} />
          <label className="text-sm">Role<br />
            <select name="role" className={input} defaultValue="student">
              <option value="student">apprentice (student)</option>
              <option value="instructor">instructor</option>
              {canInviteAdmins && <option value="admin">admin</option>}
            </select>
          </label>
          <label className="text-sm">Cohort<br />
            <select name="cohort_id" className={input} defaultValue={cohorts?.[0]?.id ?? ""}>
              <option value="">none yet</option>
              {(cohorts ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Project (optional)<br />
            <select name="project_id" className={input} defaultValue="">
              <option value="">none</option>
              {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </label>
          <label className="text-sm">Project role<br />
            <select name="project_role" className={input} defaultValue="director">
              {["director", "dp", "sound", "editor", "producer"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="is_minor" /> These people are under 18 (forces content tier M, guardian signer, no personal social accounts)
          </label>
          <button type="submit" className="btn-primary md:col-span-2">Create invites</button>
        </form>
      </section>

      <section className="mb-10">
        <h2 className="mb-2 font-medium">Pending invites ({pending.length})</h2>
        {pending.length === 0 ? <p className="text-sm opacity-60">None.</p> : (
          <table className="w-full text-sm">
            <thead className="label text-left"><tr><th className="py-1">Email</th><th>Role</th><th>Cohort / project</th><th>Expires</th><th></th></tr></thead>
            <tbody>
              {pending.map((i) => (
                <tr key={i.id} className="border-t border-glass-edge">
                  <td className="py-2">{i.email}{i.is_minor && <span className="ml-1 text-xs opacity-60">minor</span>}</td>
                  <td>{i.role}</td>
                  <td className="opacity-80">{i.cohorts?.name ?? "—"}{i.projects?.title ? ` / ${i.projects.title}` : ""}</td>
                  <td className="opacity-80">{new Date(i.expires_at).toLocaleDateString()}</td>
                  <td className="flex gap-2 py-2">
                    <CopyButton text={`${origin}/invite/${i.token}`} />
                    <form action={revokeInvite}><input type="hidden" name="id" value={i.id} /><button className={btn}>Revoke</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-medium">Members ({members?.length ?? 0})</h2>
        <table className="w-full text-sm">
          <thead className="label text-left"><tr><th className="py-1">Person</th><th>Role</th><th>Projects</th><th>Minor</th><th></th></tr></thead>
          <tbody>
            {(members ?? []).map((m) => {
              const locked = m.role === "owner" || (m.role === "admin" && !canInviteAdmins);
              return (
                <tr key={m.id} className="border-t border-glass-edge">
                  <td className="py-2">{m.users?.display_name ?? m.users?.email}<div className="text-xs opacity-60">{m.users?.email}</div></td>
                  <td>
                    {locked ? m.role : (
                      <form action={setMemberRole} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={m.id} />
                        <select name="role" defaultValue={m.role} className={input}>
                          <option value="student">student</option>
                          <option value="instructor">instructor</option>
                          {canInviteAdmins && <option value="admin">admin</option>}
                        </select>
                        <button className={btn}>Save</button>
                      </form>
                    )}
                  </td>
                  <td>
                    <ul className="text-xs">{projectsOf(m.user_id).map((x, i) => <li key={i}>{x.projects?.title} · {x.roles.join(", ")}</li>)}</ul>
                    <form action={addToProject} className="mt-1 flex items-center gap-1">
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <select name="project_id" className={input} defaultValue="">
                        <option value="">add to…</option>
                        {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                      </select>
                      <select name="project_role" className={input} defaultValue="director">
                        {["director", "dp", "sound", "editor", "producer"].map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button className={btn}>Add</button>
                    </form>
                  </td>
                  <td>
                    <form action={setMemberMinor}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="is_minor" value={m.is_minor ? "false" : "true"} />
                      <button className={btn}>{m.is_minor ? "Yes · clear" : "No · mark"}</button>
                    </form>
                  </td>
                  <td>{!locked && <form action={removeMember}><input type="hidden" name="id" value={m.id} /><button className={`${btn} text-drift`}>Remove</button></form>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
