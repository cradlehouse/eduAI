import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getNav } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/server";
import { currentModule, getModules } from "@/lib/projects/data";

export default async function CohortHome({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const nav = await getNav();
  if (!nav) redirect("/login");
  const manage = nav.cohorts.find((c) => c.id === cohortId)?.manage ?? false;
  const supabase = await createClient();
  const [{ data: cohort }, { data: enrolled }, { data: projects }, { data: pending }] = await Promise.all([
    supabase.from("cohorts").select("name, starts_on, ends_on, courses(title)").eq("id", cohortId).maybeSingle(),
    supabase.from("enrolments").select("user_id, users(email, display_name)").eq("cohort_id", cohortId).eq("status", "active"),
    supabase.from("projects").select("id, title, status, roles_needed, crew_cap, project_members(user_id, roles)").eq("cohort_id", cohortId).order("created_at"),
    manage ? supabase.from("signup_requests").select("id").eq("status", "pending") : Promise.resolve({ data: [] as { id: string }[] }),
  ]);
  if (!cohort) notFound();
  const mine = nav.myProjects.filter((p) => p.cohort_id === cohortId);
  const mods = mine[0] ? await getModules(cohortId, mine[0].id) : await getModules(cohortId, "00000000-0000-0000-0000-000000000000");
  const week = currentModule(mods);
  const open = (projects ?? []).filter((p) => p.status === "open");
  const name = (u: { email: string; display_name: string | null } | null) => u?.display_name ?? u?.email?.split("@")[0] ?? "?";

  return (
    <div className="max-w-4xl">
      {nav.org?.logo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={nav.org.logo_url} alt={nav.org.name} className="mb-4 h-12 w-auto" />
      )}
      <h1 className="display mb-1 text-2xl">{cohort.name}</h1>
      <p className="mb-6 text-sm text-muted">{cohort.courses?.title}{cohort.starts_on ? ` · ${cohort.starts_on}` : ""}{cohort.ends_on ? ` → ${cohort.ends_on}` : ""}</p>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <section className="card p-4">
          <div className="label mb-1">This week</div>
          {week ? (
            <>
              <div className="display">Module {week.module.position}: {week.module.title}</div>
              <div className="text-xs text-muted">{week.state === "open" && week.due_at ? `due ${new Date(week.due_at).toLocaleDateString()}` : week.reason ?? ""}</div>
              {mine[0] && <Link href={`/p/${mine[0].id}/brief`} className="mt-2 inline-block text-sm underline">Read the brief</Link>}
            </>
          ) : <p className="text-sm text-muted">No modules scheduled.</p>}
        </section>
        <section className="card p-4">
          <div className="label mb-1">Team</div>
          <div className="display">{(enrolled ?? []).length} apprentices</div>
          <div className="truncate text-xs text-muted">{(enrolled ?? []).slice(0, 6).map((e) => name(e.users)).join(", ")}{(enrolled ?? []).length > 6 ? ", …" : ""}</div>
          <Link href={`/c/${cohortId}/team`} className="mt-2 inline-block text-sm underline">See the team</Link>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4">
          <div className="label mb-1">{manage ? "Projects" : "My projects"}</div>
          {(manage ? projects ?? [] : mine).length === 0 ? (
            <p className="text-sm text-muted">{manage ? "Nothing posted yet." : "You're not on a project yet."}</p>
          ) : (
            <ul className="text-sm">
              {manage
                ? (projects ?? []).map((p) => <li key={p.id}><Link href={`/p/${p.id}`} className="underline">{p.title}</Link> <span className="text-muted">· {p.status} · {p.project_members.length} crew</span></li>)
                : mine.map((p) => <li key={p.id}><Link href={`/p/${p.id}`} className="underline">{p.title}</Link> <span className="text-muted">· {p.roles.join(", ")}</span></li>)}
            </ul>
          )}
        </section>
        <section className="card p-4">
          <div className="label mb-1">{manage ? "Needs attention" : "Open for sign-up"}</div>
          {manage ? (
            <p className="text-sm">{(pending ?? []).length} sign-up(s) awaiting approval · {(enrolled ?? []).filter((e) => !(projects ?? []).some((p) => p.project_members.some((m) => m.user_id === e.user_id))).length} not on a project</p>
          ) : open.length === 0 ? <p className="text-sm text-muted">Nothing open right now.</p> : (
            <ul className="text-sm">{open.map((p) => <li key={p.id}>{p.title} <span className="text-muted">· needs {p.roles_needed.join(", ") || "crew"}</span></li>)}</ul>
          )}
          <Link href={`/c/${cohortId}/projects`} className="mt-2 inline-block text-sm underline">See projects</Link>
        </section>
      </div>
    </div>
  );
}
