import Link from "next/link";
import { getAdminOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { createCohort, setInstructor } from "./actions";

export default async function CohortsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const org = (await getAdminOrg())!;
  const supabase = await createClient();
  const [{ data: cohorts }, { data: courses }, { data: instructors }] = await Promise.all([
    supabase.from("cohorts").select("id, name, starts_on, ends_on, courses(title), projects(id, title), enrolments(count), cohort_instructors(user_id, users(email, display_name))").eq("org_id", org.id).order("starts_on", { ascending: false }),
    supabase.from("courses").select("id, title").eq("org_id", org.id).order("title"),
    supabase.from("memberships").select("user_id, users(email, display_name)").eq("org_id", org.id).in("role", ["instructor", "admin", "owner"]),
  ]);
  const name = (u: { email: string; display_name: string | null } | null) => u?.display_name ?? u?.email ?? "?";

  return (
    <div className="max-w-4xl">
      <h1 className="display mb-1 text-2xl">Cohorts</h1>
      <p className="mb-6 text-sm text-muted">A cohort is one run of a course: a term, a class, a programme intake. Each has its own schedule, instructors and projects.</p>
      {ok && <p className="mb-4 rounded-[12px] bg-control/10 p-2 text-sm text-control">{ok}</p>}
      {error && <p className="mb-4 rounded-[12px] bg-danger/10 p-2 text-sm text-danger">{error}</p>}

      <form action={createCohort} className="card mb-8 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_130px_130px_1fr_auto]" style={{ borderRadius: 22 }}>
        <label className="text-sm"><span className="label">Name</span><br /><input name="name" required className="input w-full" placeholder="Spring 2027" /></label>
        <label className="text-sm"><span className="label">Course</span><br />
          <select name="course_id" className="input w-full" defaultValue={courses?.[0]?.id ?? ""}>{(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
        </label>
        <label className="text-sm"><span className="label">Starts</span><br /><input name="starts_on" type="date" className="input w-full" /></label>
        <label className="text-sm"><span className="label">Ends</span><br /><input name="ends_on" type="date" className="input w-full" /></label>
        <label className="text-sm"><span className="label">Instructor</span><br />
          <select name="instructor_id" className="input w-full" defaultValue=""><option value="">assign later</option>{(instructors ?? []).map((i) => <option key={i.user_id} value={i.user_id}>{name(i.users)}</option>)}</select>
        </label>
        <div className="flex items-end"><button className="btn-primary">+ New cohort</button></div>
        <p className="text-xs text-muted sm:col-span-2 lg:col-span-6">The module schedule is laid out weekly from the start date; adjust it on the cohort&apos;s Schedule page.</p>
      </form>

      {(cohorts ?? []).length === 0 ? <p className="text-sm text-muted">No cohorts yet.</p> : (
        <ul className="flex flex-col gap-3">
          {(cohorts ?? []).map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex items-baseline justify-between">
                <Link href={`/c/${c.id}`} className="display text-lg hover:underline">{c.name}</Link>
                <span className="text-xs text-muted">{c.starts_on ?? "no start"}{c.ends_on ? ` → ${c.ends_on}` : ""}</span>
              </div>
              <div className="mt-1 text-sm text-muted">{c.courses?.title} · {c.enrolments?.[0]?.count ?? 0} enrolled · {c.projects.length} project(s)</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-xs text-muted">Instructors:</span>
                {c.cohort_instructors.map((i) => <span key={i.user_id} className="pill bg-sand">{name(i.users)}</span>)}
                <form action={setInstructor} className="flex items-center gap-1">
                  <input type="hidden" name="cohort_id" value={c.id} />
                  <select name="user_id" className="input" defaultValue=""><option value="">add…</option>{(instructors ?? []).filter((i) => !c.cohort_instructors.some((x) => x.user_id === i.user_id)).map((i) => <option key={i.user_id} value={i.user_id}>{name(i.users)}</option>)}</select>
                  <button className="btn">Add</button>
                </form>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/c/${c.id}/schedule`} className="btn">Schedule</Link>
                <Link href={`/c/${c.id}/projects`} className="btn">Projects</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
