import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BibleChip } from "@/components/BibleChip";
import { createEntry } from "./actions";

const KINDS = ["character", "location", "prop", "style", "voice"] as const;
const input = "input";

export default async function BiblePage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { projectId } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data: entries } = await supabase.from("bible_entry_status")
    .select("id, kind, name, description, likeness_of, requires_consent, consent_state, reference_asset_id")
    .eq("project_id", projectId).order("kind").order("name");

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 display text-2xl">Bible</h1>
      <p className="mb-6 text-sm opacity-70">Characters, locations, props, styles and voices. Anything depicting a real person needs a signed release before it can be generated.</p>
      {ok && <p className="mb-4 rounded-[12px] bg-control/10 p-2 text-sm text-control">{ok}</p>}
      {error && <p className="mb-4 rounded-[12px] bg-danger/10 p-2 text-sm text-danger">{error}</p>}

      {KINDS.map((kind) => {
        const rows = (entries ?? []).filter((e) => e.kind === kind);
        if (rows.length === 0) return null;
        return (
          <section key={kind} className="mb-6">
            <h2 className="mb-2 label">{kind}s</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((e) => (
                <li key={e.id}>
                  <Link href={`/p/${projectId}/bible/${e.id}`} className="block card p-3 hover:bg-sand">
                    <div className="mb-1"><BibleChip state={e.requires_consent ? e.consent_state : "not_required"} /></div>
                    {e.reference_asset_id && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/assets/${e.reference_asset_id}`} alt="" className="mb-2 h-28 w-full rounded object-cover" />
                    )}
                    <div className="font-medium">{e.name}</div>
                    {e.likeness_of && <div className="text-xs opacity-70">likeness of {e.likeness_of}</div>}
                    {e.description && <div className="mt-1 line-clamp-2 text-xs opacity-70">{e.description}</div>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {(entries ?? []).length === 0 && <p className="mb-6 text-sm opacity-60">Nothing in the bible yet.</p>}

      <section className="card p-4">
        <h2 className="mb-3 font-medium">Add an entry</h2>
        <form action={createEntry} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="project_id" value={projectId} />
          <label className="text-sm">Kind<br /><select name="kind" className={input} defaultValue="character">{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
          <label className="text-sm">Name<br /><input name="name" required className={`${input} w-full`} /></label>
          <label className="text-sm sm:col-span-2">Description<br /><textarea name="description" rows={2} className={`${input} w-full`} /></label>
          <label className="text-sm sm:col-span-2">Likeness or voice of a real person (their name)<br />
            <input name="likeness_of" placeholder="leave empty if not a real person" className={`${input} w-full`} />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="requires_consent" /> Requires consent anyway (e.g. a private location)</label>
          <button className="btn-primary sm:col-span-2">Add to bible</button>
        </form>
      </section>
    </div>
  );
}
