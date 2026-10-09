import Link from "next/link";
import { redirect } from "next/navigation";
import { cohortHref, getNav } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/server";
import { loadReadiness } from "@/lib/project/load";
import { loadSignoffs } from "@/lib/signoff/load";
import { SignoffList } from "@/components/SignoffList";

// The hub: every cohort you can reach, and the organisation card for admins.
export default async function Home() {
  const nav = await getNav();
  if (!nav) redirect("/login");
  const supabase = await createClient();
  const ids = nav.cohorts.map((c) => c.id);
  const { data: cohorts } = ids.length
    ? await supabase.from("cohorts").select("id, name, starts_on, ends_on, courses(title), projects(id, title, status), enrolments(count)").in("id", ids).order("starts_on", { ascending: false })
    : { data: [] as never[] };
  // Sign-off waiting for you, and where each of your productions is up to (lib/project/readiness).
  const [signoffs, mine] = await Promise.all([
    loadSignoffs({ onlyOpen: true }),
    Promise.all(nav.myProjects.slice(0, 4).map(async (p) => ({ p, next: (await loadReadiness(p.id)).next }))),
  ]);
  const toSign = signoffs.filter((x) => x.mineToSign.length > 0);
  const waiting = signoffs.filter((x) => x.mine && x.mineToSign.length === 0);
  return (
    <div className="max-w-4xl">
      <h1 className="display mb-4 text-2xl">Home</h1>
      {mine.length > 0 && (
        <div className="mb-6 flex flex-col gap-2">
          {mine.map(({ p, next }) => (
            <Link key={p.id} href={next.href} className="card flex flex-wrap items-baseline gap-2 p-4 hover:bg-glass">
              <span className="label w-full">Continue</span>
              <span className="display text-lg">{p.title}</span>
              <span className="text-sm text-gold">Next: {next.text} →</span>
            </Link>
          ))}
        </div>
      )}
      {toSign.length > 0 && <div className="mb-6"><SignoffList items={toSign} title={`Needs your sign-off (${toSign.length})`} showProject /></div>}
      {waiting.length > 0 && <div className="mb-6"><SignoffList items={waiting} title="Waiting for others to sign off" showProject /></div>}
      {nav.isAdmin && (
        <Link href="/org" className="card mb-6 block p-4 hover:bg-glass">
          <div className="label">Organisation</div>
          <div className="display text-lg">{nav.org?.name}</div>
          <div className="text-sm text-dim">people, cohorts, courses, models, settings</div>
        </Link>
      )}
      <div className="label mb-2">{nav.isAdmin || nav.isInstructor ? "Cohorts" : "My cohort"}</div>
      {(cohorts ?? []).length === 0 && <p className="text-sm text-dim">No cohorts yet.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {(cohorts ?? []).map((c) => (
          <Link key={c.id} href={cohortHref(nav, c.id)} className="card block p-4 hover:bg-glass">
            <div className="display text-lg">{c.name}</div>
            <div className="text-sm text-dim">{c.courses?.title}{c.starts_on ? ` · from ${c.starts_on}` : ""}</div>
            <div className="mt-2 text-sm">{c.enrolments?.[0]?.count ?? 0} apprentices · {c.projects.length} project(s)</div>
            <ul className="mt-1 text-xs text-dim">{c.projects.slice(0, 4).map((p) => <li key={p.id}>{p.title} · {p.status}</li>)}</ul>
          </Link>
        ))}
      </div>
    </div>
  );
}
