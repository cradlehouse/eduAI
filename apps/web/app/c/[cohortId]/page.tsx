import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/welcome/actions";

export default async function CohortStub({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const supabase = await createClient();
  const [{ data: cohort }, { data: admin }] = await Promise.all([
    supabase.from("cohorts").select("name, starts_on, ends_on, projects(id, title, logline), enrolments(count)").eq("id", cohortId).maybeSingle(),
    supabase.from("memberships").select("id").in("role", ["admin", "owner"]).limit(1).maybeSingle(),
  ]);
  if (!cohort) notFound();
  const enrolled = cohort.enrolments?.[0]?.count ?? 0;

  return (
    <Card title={cohort.name}>
      <p className="mb-4 text-sm opacity-80">
        {cohort.starts_on ? `Starts ${cohort.starts_on}` : "No start date"}{cohort.ends_on ? ` · ends ${cohort.ends_on}` : ""} · {enrolled} enrolled
      </p>
      <div className="mb-1 text-xs uppercase tracking-wide opacity-60">Projects</div>
      {cohort.projects.length === 0 ? <p className="text-sm opacity-60">None yet.</p> : (
        <ul className="mb-4 flex flex-col gap-2">
          {cohort.projects.map((p) => (
            <li key={p.id}>
              <Link href={`/p/${p.id}`} className="block rounded border border-ink/10 px-3 py-2 text-sm hover:bg-ink/5 dark:border-paper/15 dark:hover:bg-paper/10">
                <span className="font-medium">{p.title}</span>
                {p.logline && <span className="block text-xs opacity-70">{p.logline}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-4 text-xs">
        {admin && <Link href="/org" className="underline">Admin</Link>}
        <form action={signOut}><button className="underline" type="submit">Sign out</button></form>
      </div>
      <p className="mt-4 text-xs opacity-60">The full instructor shell (cohort grid, review queue, budgets) arrives in Phase 2.</p>
    </Card>
  );
}
