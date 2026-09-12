import { notFound, redirect } from "next/navigation";
import { getNav } from "@/lib/auth/nav";
import { getProject } from "@/lib/projects/data";
import { createClient } from "@/lib/supabase/server";
import { removeMember, setRoles } from "./actions";

export default async function MembersPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { projectId } = await params;
  const { ok, error } = await searchParams;
  const [data, nav] = await Promise.all([getProject(projectId), getNav()]);
  if (!data || !nav) notFound();
  if (!nav.cohorts.some((c) => c.id === data.project.cohort_id) && !data.isMember) redirect("/");
  const manage = nav.cohorts.find((c) => c.id === data.project.cohort_id)?.manage ?? false;
  const supabase = await createClient();
  const { data: org } = await supabase.from("orgs").select("project_roles").eq("id", data.project.org_id).maybeSingle();
  const roleList = org?.project_roles ?? [];
  const name = (u: { email: string; display_name: string | null } | null) => u?.display_name ?? u?.email ?? "?";

  return (
    <div className="max-w-3xl">
      <h1 className="display mb-1 text-2xl">Members</h1>
      <p className="mb-4 text-sm text-muted">The crew and their roles. Roles are credits, not permissions; you can hold more than one.</p>
      {ok && <p className="mb-4 rounded-[12px] bg-control/10 p-2 text-sm text-control">{ok}</p>}
      {error && <p className="mb-4 rounded-[12px] bg-danger/10 p-2 text-sm text-danger">{error}</p>}
      <ul className="flex flex-col gap-3">
        {data.members.map((m) => {
          const editable = manage || m.user_id === nav.userId;
          return (
            <li key={m.user_id} className="card p-4">
              <div className="flex items-baseline justify-between"><span className="font-semibold">{name(m.users)}</span><span className="text-xs text-muted">{m.roles.join(" · ")}</span></div>
              {editable && (
                <form action={setRoles} className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  <input type="hidden" name="project_id" value={projectId} />
                  <input type="hidden" name="user_id" value={m.user_id} />
                  {roleList.map((r) => <label key={r} className="flex items-center gap-1"><input type="checkbox" name="roles" value={r} defaultChecked={m.roles.includes(r)} /> {r}</label>)}
                  <button className="btn">Save roles</button>
                  {manage && <button formAction={removeMember} className="btn text-danger">Remove</button>}
                </form>
              )}
            </li>
          );
        })}
        {data.members.length === 0 && <p className="text-sm text-muted">Nobody on this crew yet.</p>}
      </ul>
      {manage && <p className="mt-4 text-xs text-muted">Add people from the cohort&apos;s Team page or approve their sign-ups under Projects.</p>}
    </div>
  );
}
