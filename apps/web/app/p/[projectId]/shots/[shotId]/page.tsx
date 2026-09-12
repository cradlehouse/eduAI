import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BibleChip } from "@/components/BibleChip";
import { deleteShot, linkBible, unlinkBible, updateShot } from "../../scenes/actions";
import { Console, type Option, type Readiness } from "./Console";

const input = "input";
const btn = "btn";
const LANES = ["explore", "control", "finish", "voice_likeness"] as const;

export default async function ShotPage({ params, searchParams }: { params: Promise<{ projectId: string; shotId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { projectId, shotId } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: shot }, { data: links }, { data: entries }, { data: takes }, { data: jobs }, { data: assets }] = await Promise.all([
    supabase.from("shots").select("id, label, description, duration_target_s, intent, plate_take_id, scenes(position, title)").eq("id", shotId).maybeSingle(),
    supabase.from("shot_bible_entries").select("bible_entry_id").eq("shot_id", shotId),
    supabase.from("bible_entry_status").select("id, name, kind, requires_consent, consent_state").eq("project_id", projectId).order("kind").order("name"),
    supabase.from("takes").select("id, layer, lifecycle").eq("shot_id", shotId).eq("lifecycle", "live"),
    supabase.from("job_tokens").select("job_id, lane, layer, status, estimated_tokens, actual_tokens, created_at").eq("shot_id", shotId).order("created_at", { ascending: false }).limit(8),
    supabase.from("assets").select("id, kind, provenance").eq("project_id", projectId).in("kind", ["image", "audio"]).order("created_at", { ascending: false }).limit(40),
  ]);
  if (!shot) notFound();
  const entryList = (entries ?? []).filter((e): e is typeof e & { id: string } => !!e.id);
  const intent = (shot.intent ?? {}) as { objective?: string; continuity?: string; camera_language?: string; dialogue?: string; no_bible_assets?: boolean };
  const linkedIds = new Set((links ?? []).map((l) => l.bible_entry_id));

  const [readiness, ...optionSets] = await Promise.all([
    Promise.all(LANES.map(async (lane) => {
      const { data } = await supabase.rpc("shot_ready_for", { p_shot: shotId, p_lane: lane }).maybeSingle();
      return { lane, ready: !!data?.ready, missing: data?.missing ?? [] } as Readiness;
    })),
    ...(["explore", "control", "finish"] as const).map(async (lane) => {
      const { data } = await supabase.rpc("model_options", { p_project: projectId, p_lane: lane });
      return (data ?? []) as Option[];
    }),
  ]);
  const optionsByLane = { explore: optionSets[0], control: optionSets[1], finish: optionSets[2] };
  const layerCounts: Record<string, number> = {};
  for (const t of takes ?? []) layerCounts[t.layer] = (layerCounts[t.layer] ?? 0) + 1;
  const promptSeed = [shot.description, intent.camera_language, intent.continuity && intent.continuity.toLowerCase() !== "none" ? intent.continuity : ""].filter(Boolean).join(". ");
  const assetOptions = (assets ?? []).map((a) => ({ id: a.id, kind: a.kind, label: String((a.provenance as { original_name?: string } | null)?.original_name ?? a.id.slice(0, 8)) }));

  return (
    <div className="max-w-6xl">
      <Link href={`/p/${projectId}/scenes`} className="text-xs text-muted underline">← Storyboard</Link>
      <div className="mt-2 label">Scene {shot.scenes?.position} · {shot.scenes?.title}</div>
      <h1 className="display mb-4 text-2xl">Cut {shot.label}</h1>
      {ok && <p className="mb-4 rounded-[12px] bg-control/10 p-2 text-sm text-control">{ok}</p>}
      {error && <p className="mb-4 rounded-[12px] bg-danger/10 p-2 text-sm text-danger">{error}</p>}

      <Console projectId={projectId} shotId={shotId} optionsByLane={optionsByLane} readiness={readiness}
               promptSeed={promptSeed} dialogueSeed={intent.dialogue ?? ""} assets={assetOptions}
               layerCounts={layerCounts} hasPlate={!!shot.plate_take_id || (layerCounts.background ?? 0) > 0} />

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <form action={updateShot} className="card grid gap-3 p-4">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="shot_id" value={shotId} />
            <h2 className="display">Notes</h2>
            <p className="-mt-2 text-xs text-muted">The e-conte column for this cut. Objective, continuity and camera are required before Generate; the dialogue line is what the Dialogue layer voices.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">Cut<br /><input name="label" defaultValue={shot.label} className={`${input} w-full`} /></label>
              <label className="text-sm sm:col-span-2">Action<br /><input name="description" defaultValue={shot.description} className={`${input} w-full`} /></label>
            </div>
            <label className="text-sm">Objective — what this cut must achieve<br /><textarea name="objective" rows={2} defaultValue={intent.objective ?? ""} className={`${input} w-full`} /></label>
            <label className="text-sm">Continuity / reference<br /><textarea name="continuity" rows={2} defaultValue={intent.continuity ?? ""} className={`${input} w-full`} placeholder="what it must match, or: none" /></label>
            <label className="text-sm">Camera<br /><input name="camera_language" defaultValue={intent.camera_language ?? ""} className={`${input} w-full`} /></label>
            <label className="text-sm">Dialogue<br /><input name="dialogue" defaultValue={intent.dialogue ?? ""} className={`${input} w-full`} placeholder="ANA: That wasn't there." /></label>
            <label className="text-sm">Target seconds<br /><input name="duration_target_s" type="number" min={1} max={60} defaultValue={shot.duration_target_s ?? ""} className={`${input} w-28`} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="no_bible_assets" defaultChecked={!!intent.no_bible_assets} /> This cut uses no bible entries</label>
            <div className="flex gap-2"><button className="btn-primary">Save notes</button><button formAction={deleteShot} className={`${btn} text-danger`}>Delete cut</button></div>
          </form>

          <section className="card p-4">
            <h2 className="display mb-1">Bible in this cut</h2>
            <p className="mb-3 text-xs text-muted">Every consent-bearing entry linked here needs a valid release for the lane you generate in.</p>
            {(links ?? []).length === 0 ? <p className="mb-3 text-sm text-muted">None linked.</p> : (
              <ul className="mb-3 flex flex-wrap gap-2">
                {(links ?? []).map((l) => {
                  const e = entryList.find((x) => x.id === l.bible_entry_id);
                  const entryId = l.bible_entry_id ?? "";
                  return (
                    <li key={entryId} className="flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-sm">
                      <span>{e?.name ?? "…"} <span className="text-xs text-muted">{e?.kind}</span></span>
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

        <aside className="panel p-4">
          <h2 className="display mb-2">Generations</h2>
          {(jobs ?? []).length === 0 ? <p className="text-sm text-muted">Nothing queued yet.</p> : (
            <ul className="flex flex-col gap-2 text-sm">
              {(jobs ?? []).map((j) => (
                <li key={j.job_id} className="card px-3 py-2">
                  <div className="flex justify-between"><span className="font-semibold">{j.layer} · {j.lane}</span><span className="mono text-xs">{(j.actual_tokens ?? j.estimated_tokens ?? 0).toLocaleString()} tk</span></div>
                  <div className="text-xs text-muted">{j.status}{j.created_at ? ` · ${new Date(j.created_at).toLocaleTimeString()}` : ""}</div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">Jobs run when the orchestrator ships (P1-10). Until then they queue.</p>
        </aside>
      </div>
    </div>
  );
}
