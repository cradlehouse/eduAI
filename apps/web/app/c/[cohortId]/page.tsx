import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";


export default async function CohortPage({ params, searchParams }: { params: Promise<{ cohortId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { cohortId } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: cohort }] = await Promise.all([
    supabase.from("cohorts").select("name, starts_on, ends_on, projects(id, title, logline), enrolments(count)").eq("id", cohortId).maybeSingle(),
  ]);
  if (!cohort) notFound();
  const enrolled = cohort.enrolments?.[0]?.count ?? 0;

  return (
    <div className="max-w-4xl">
      <div className="mb-1 label">Cohort</div>
      <h1 className="display text-2xl">{cohort.name}</h1>
      <p className="mb-6 text-sm text-muted">
        {cohort.starts_on ? `Starts ${cohort.starts_on}` : "No start date"}{cohort.ends_on ? ` · ends ${cohort.ends_on}` : ""} · {enrolled} enrolled
      </p>
      {ok && <p className="mb-4 rounded-[12px] bg-control/10 p-2 text-sm text-control">{ok}</p>}
      {error && <p className="mb-4 rounded-[12px] bg-danger/10 p-2 text-sm text-danger">{error}</p>}

      <section className="card mb-8 p-5">
        <h2 className="display mb-1">Projects</h2>
        {cohort.projects.length === 0 ? <p className="text-sm text-muted">None yet.</p> : (
          <ul className="flex flex-col gap-2">
            {cohort.projects.map((p) => (
              <li key={p.id}>
                <Link href={`/p/${p.id}`} className="card block px-3 py-2 text-sm hover:bg-sand">
                  <span className="font-semibold">{p.title}</span>
                  {p.logline && <span className="block text-xs text-muted">{p.logline}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-muted">Module dates and gates are under <Link href={`/c/${cohortId}/schedule`} className="underline">Schedule</Link>.</p>

    </div>
  );
}
