import Link from "next/link";
import { redirect } from "next/navigation";
import { getNav } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/server";

// The hub: every cohort you can reach, and the organisation card for admins.
export default async function Home() {
  const nav = await getNav();
  if (!nav) redirect("/login");
  const supabase = await createClient();
  const ids = nav.cohorts.map((c) => c.id);
  const { data: cohorts } = ids.length
    ? await supabase.from("cohorts").select("id, name, starts_on, ends_on, courses(title), projects(id, title, status), enrolments(count)").in("id", ids).order("starts_on", { ascending: false })
    : { data: [] as never[] };
  return (
    <div className="max-w-4xl">
      <h1 className="display mb-4 text-2xl">Home</h1>
      {nav.isAdmin && (
        <Link href="/org" className="card mb-6 block p-4 hover:bg-sand">
          <div className="label">Organisation</div>
          <div className="display text-lg">{nav.org?.name}</div>
          <div className="text-sm text-muted">people, cohorts, courses, models, settings</div>
        </Link>
      )}
      <div className="label mb-2">{nav.isAdmin || nav.isInstructor ? "Cohorts" : "My cohort"}</div>
      {(cohorts ?? []).length === 0 && <p className="text-sm text-muted">No cohorts yet.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {(cohorts ?? []).map((c) => (
          <Link key={c.id} href={`/c/${c.id}`} className="card block p-4 hover:bg-sand">
            <div className="display text-lg">{c.name}</div>
            <div className="text-sm text-muted">{c.courses?.title}{c.starts_on ? ` · from ${c.starts_on}` : ""}</div>
            <div className="mt-2 text-sm">{c.enrolments?.[0]?.count ?? 0} apprentices · {c.projects.length} project(s)</div>
            <ul className="mt-1 text-xs text-muted">{c.projects.slice(0, 4).map((p) => <li key={p.id}>{p.title} · {p.status}</li>)}</ul>
          </Link>
        ))}
      </div>
    </div>
  );
}
