import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BibleChip } from "@/components/BibleChip";
import { GateNotice } from "@/components/GateNotice";
import { deleteShot, linkBible, unlinkBible, updateShot } from "../../scenes/actions";

const input = "rounded border border-ink/20 bg-white px-2 py-1 text-sm text-ink dark:border-paper/20";
const btn = "rounded border border-ink/20 px-2 py-1 text-xs hover:bg-ink/5 dark:border-paper/20 dark:hover:bg-paper/10";
const LANES = ["explore", "control", "finish"] as const;

export default async function ShotPage({ params, searchParams }: { params: Promise<{ projectId: string; shotId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { projectId, shotId } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: shot }, { data: links }, { data: entries }] = await Promise.all([
    supabase.from("shots").select("id, label, description, duration_target_s, intent, scenes(position, title)").eq("id", shotId).maybeSingle(),
    supabase.from("shot_bible_entries").select("bible_entry_id, bible_entry_status:bible_entries(id, name, kind, requires_consent)").eq("shot_id", shotId),
    supabase.from("bible_entry_status").select("id, name, kind, requires_consent, consent_state").eq("project_id", projectId).order("kind").order("name"),
  ]);
  if (!shot) notFound();
  const entryList = (entries ?? []).filter((e): e is typeof e & { id: string } => !!e.id);
  const intent = (shot.intent ?? {}) as { objective?: string; continuity?: string; camera_language?: string; no_bible_assets?: boolean };
  const linkedIds = new Set((links ?? []).map((l) => l.bible_entry_id));
  const readiness = await Promise.all(LANES.map(async (lane) => {
    const { data } = await supabase.rpc("shot_ready_for", { p_shot: shotId, p_lane: lane }).maybeSingle();
    return { lane, ready: !!data?.ready, missing: data?.missing ?? [] };
  }));

  return (
    <div className="max-w-4xl">
      <Link href={`/p/${projectId}/scenes`} className="text-xs underline opacity-70">← Scenes</Link>
      <div className="mt-2 text-xs uppercase tracking-wide opacity-60">Scene {shot.scenes?.position} · {shot.scenes?.title}</div>
      <h1 className="mb-4 text-2xl font-semibold">Shot {shot.label}</h1>
      {ok && <p className="mb-4 rounded bg-money/10 p-2 text-sm text-money">{ok}</p>}
      {error && <p className="mb-4 rounded bg-danger/10 p-2 text-sm text-danger">{error}</p>}

      <div className="grid gap-8 md:grid-cols-[1fr_300px]">
        <div>
          <form action={updateShot} className="grid gap-3 rounded-lg border border-ink/10 p-4 dark:border-paper/15">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="shot_id" value={shotId} />
            <h2 className="font-medium">Shot intent</h2>
            <p className="-mt-2 text-xs opacity-70">Required before Generate: what you are testing or making, what it must match, and how the camera behaves.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">Label<br /><input name="label" defaultValue={shot.label} className={`${input} w-full`} /></label>
              <label className="text-sm sm:col-span-2">Description<br /><input name="description" defaultValue={shot.description} className={`${input} w-full`} /></label>
            </div>
            <label className="text-sm">Objective — what this shot must achieve<br /><textarea name="objective" rows={2} defaultValue={intent.objective ?? ""} className={`${input} w-full`} placeholder="e.g. establish that the warehouse is bigger than it should be" /></label>
            <label className="text-sm">Continuity / reference requirement<br /><textarea name="continuity" rows={2} defaultValue={intent.continuity ?? ""} className={`${input} w-full`} placeholder="e.g. match 1B: sodium light from camera left, Ana's jacket zipped. Or: none" /></label>
            <label className="text-sm">Camera language<br /><input name="camera_language" defaultValue={intent.camera_language ?? ""} className={`${input} w-full`} placeholder="e.g. slow push-in, wide lens, eye level" /></label>
            <label className="text-sm">Target duration (seconds)<br /><input name="duration_target_s" type="number" min={1} max={60} defaultValue={shot.duration_target_s ?? ""} className={`${input} w-28`} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="no_bible_assets" defaultChecked={!!intent.no_bible_assets} /> This shot uses no bible entries (no characters, locations or props from the bible)</label>
            <div className="flex gap-2">
              <button className="rounded bg-ink px-3 py-2 text-sm font-medium text-paper dark:bg-paper dark:text-ink">Save intent</button>
              <button formAction={deleteShot} className={`${btn} text-danger`}>Delete shot</button>
            </div>
          </form>

          <section className="mt-6 rounded-lg border border-ink/10 p-4 dark:border-paper/15">
            <h2 className="mb-1 font-medium">Bible entries in this shot</h2>
            <p className="mb-3 text-xs opacity-70">Every consent-bearing entry linked here must have a valid release for the lane you generate in.</p>
            {(links ?? []).length === 0 ? <p className="mb-3 text-sm opacity-60">None linked.</p> : (
              <ul className="mb-3 flex flex-wrap gap-2">
                {(links ?? []).map((l) => {
                  const e = (entries ?? []).find((x) => x.id === l.bible_entry_id);
                  const entryId = l.bible_entry_id ?? "";
                  return (
                    <li key={entryId} className="flex items-center gap-2 rounded border border-ink/10 px-2 py-1 text-sm dark:border-paper/15">
                      <span>{e?.name ?? "…"} <span className="text-xs opacity-60">{e?.kind}</span></span>
                      {e?.requires_consent && <BibleChip state={e.consent_state} />}
                      <form action={unlinkBible}><input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="shot_id" value={shotId} /><input type="hidden" name="entry_id" value={entryId} /><button className={btn}>×</button></form>
                    </li>
                  );
                })}
              </ul>
            )}
            <form action={linkBible} className="flex items-center gap-2">
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="shot_id" value={shotId} />
              <select name="entry_id" className={input} defaultValue="">
                <option value="">add an entry…</option>
                {entryList.filter((e) => !linkedIds.has(e.id)).map((e) => <option key={e.id} value={e.id}>{e.kind}: {e.name}</option>)}
              </select>
              <button className={btn}>Link</button>
            </form>
          </section>
        </div>

        <aside>
          <div className="rounded-lg border border-ink/10 p-4 dark:border-paper/15">
            <h2 className="mb-2 font-medium">Ready to generate?</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {readiness.map((r) => (
                <li key={r.lane}>
                  <div className="flex items-center justify-between"><span className="capitalize">{r.lane}</span><span className={r.ready ? "text-money" : "text-danger"}>{r.ready ? "ready" : "blocked"}</span></div>
                  {!r.ready && r.missing.length > 0 && <div className="text-xs opacity-70">missing: {r.missing.join(", ")}</div>}
                </li>
              ))}
            </ul>
            {!readiness.some((r) => r.ready) && <div className="mt-3"><GateNotice reason="Complete the intent and consent above." /></div>}
            <p className="mt-4 text-xs opacity-60">The generation console (lane and model tiles, inputs, token estimate, Generate) arrives in P1-08/09 and lives on this page.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
