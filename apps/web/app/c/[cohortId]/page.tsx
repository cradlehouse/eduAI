import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { openModuleNow, setModuleDates } from "./actions";

const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

export default async function CohortPage({ params, searchParams }: { params: Promise<{ cohortId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { cohortId } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: cohort }, { data: mods }] = await Promise.all([
    supabase.from("cohorts").select("name, starts_on, ends_on, projects(id, title, logline), enrolments(count)").eq("id", cohortId).maybeSingle(),
    supabase.from("cohort_modules").select("id, opens_at, due_at, enabled, gate_unlocked_at, modules(position, title, gate_kind)").eq("cohort_id", cohortId),
  ]);
  if (!cohort) notFound();
  const enrolled = cohort.enrolments?.[0]?.count ?? 0;
  const modules = (mods ?? []).filter((m) => m.modules).sort((a, b) => a.modules!.position - b.modules!.position);
  const now = Date.now();

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

      <section className="card mb-8 p-5">
        <h2 className="display mb-1">Schedule</h2>
        <p className="mb-3 text-xs text-muted">Students see a module once it opens. “Open now” opens it today and clears any instructor gate.</p>
        <table className="w-full text-sm">
          <thead><tr className="label text-left"><th className="py-1">Module</th><th>Opens</th><th>Due</th><th>On</th><th>State</th><th></th></tr></thead>
          <tbody>
            {modules.map((m) => {
              const opens = m.opens_at ? new Date(m.opens_at).getTime() : null;
              const state = !m.enabled ? "disabled" : opens && opens > now ? "upcoming" : m.modules!.gate_kind === "instructor" && !m.gate_unlocked_at ? "gated" : "open";
              return (
                <tr key={m.id} className="border-t border-line">
                  <td className="py-2">{m.modules!.position}. {m.modules!.title}</td>
                  <td colSpan={3}>
                    <form action={setModuleDates} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="cohort_id" value={cohortId} />
                      <input type="hidden" name="id" value={m.id} />
                      <input type="datetime-local" name="opens_at" defaultValue={toLocal(m.opens_at)} className="input" />
                      <input type="datetime-local" name="due_at" defaultValue={toLocal(m.due_at)} className="input" />
                      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="enabled" defaultChecked={m.enabled} /> on</label>
                      <button className="btn">Save</button>
                    </form>
                  </td>
                  <td className={state === "open" ? "text-control" : "text-muted"}>{state}</td>
                  <td>
                    {state !== "open" && (
                      <form action={openModuleNow}><input type="hidden" name="cohort_id" value={cohortId} /><input type="hidden" name="id" value={m.id} /><button className="btn">Open now</button></form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

    </div>
  );
}
