import Link from "next/link";
import { getAdminOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";

export default async function CohortsPage() {
  const org = (await getAdminOrg())!;
  const supabase = await createClient();
  const { data: cohorts } = await supabase.from("cohorts")
    .select("id, name, starts_on, ends_on, courses(title), projects(id, title), enrolments(count), cohort_instructors(users(email, display_name))")
    .eq("org_id", org.id).order("starts_on", { ascending: false });
  return (
    <div className="max-w-3xl">
      <h1 className="display mb-1 text-2xl">Cohorts</h1>
      <p className="mb-6 text-sm text-muted">Open a cohort to set its module schedule and reach its projects.</p>
      {(cohorts ?? []).length === 0 ? <p className="text-sm text-muted">No cohorts yet. Cohort creation arrives with course authoring.</p> : (
        <ul className="flex flex-col gap-3">
          {(cohorts ?? []).map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex items-baseline justify-between">
                <Link href={`/c/${c.id}`} className="display text-lg hover:underline">{c.name}</Link>
                <span className="text-xs text-muted">{c.starts_on ?? "no start"}{c.ends_on ? ` → ${c.ends_on}` : ""}</span>
              </div>
              <div className="mt-1 text-sm text-muted">{c.courses?.title} · {c.enrolments?.[0]?.count ?? 0} enrolled · instructors: {c.cohort_instructors.map((i) => i.users?.display_name ?? i.users?.email).join(", ") || "none"}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link href={`/c/${c.id}`} className="btn">Schedule</Link>
                {c.projects.map((p) => <Link key={p.id} href={`/p/${p.id}`} className="btn">{p.title}</Link>)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
