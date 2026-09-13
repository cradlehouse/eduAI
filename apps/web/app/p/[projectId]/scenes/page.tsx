import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BibleChip } from "@/components/BibleChip";
import { createScene, createShot, deleteScene, deleteShot, linkBible, unlinkBible, updateScene, updateShot } from "./actions";
import { CutWorkspace, type Option, type Readiness, type TakeRow } from "./CutWorkspace";
import { EConte } from "./EConte";
import { JobWatcher } from "./JobWatcher";

const input = "input";
const btn = "btn";
const LANES = ["explore", "control", "finish", "voice_likeness"] as const;
const LANE_DOT: Record<string, string> = { explore: "bg-explore", control: "bg-control", finish: "bg-finish" };
type Intent = { objective?: string; continuity?: string; camera_language?: string; dialogue?: string; no_bible_assets?: boolean };

// The storyboard: a filmstrip of cuts per scene, the selected cut large with its takes and the prompt
// dock under it, and the e-conte notes / bible / generations in an inspector on the right.
// ?cut=<shotId> selects; ?view=list shows the same scene as the e-conte column.
export default async function ScenesPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ ok?: string; error?: string; cut?: string; scene?: string; view?: string }> }) {
  const { projectId } = await params;
  const { ok, error, cut, scene: sceneParam, view } = await searchParams;
  const supabase = await createClient();
  const [{ data: scenes }, { data: shots }, { data: takeRows }, { data: jobs }, { data: entries }, { data: imageAssets }] = await Promise.all([
    supabase.from("scenes").select("id, position, title, synopsis").eq("project_id", projectId).order("position"),
    supabase.from("shots").select("id, scene_id, position, label, description, duration_target_s, intent, selected_take_id, plate_take_id").eq("project_id", projectId).order("position"),
    supabase.from("takes").select("id, shot_id, layer, asset_id, created_at, lifecycle, assets(mime, kind, duration_s)").eq("project_id", projectId).in("lifecycle", ["live", "killed"]).order("created_at"),
    supabase.from("job_tokens").select("job_id, shot_id, lane, layer, status, estimated_tokens, actual_tokens, created_at, error").eq("project_id", projectId).order("created_at", { ascending: false }).limit(60),
    supabase.from("bible_entry_status").select("id, name, kind, requires_consent, consent_state").eq("project_id", projectId).order("kind").order("name"),
    supabase.from("assets").select("id, kind, provenance").eq("project_id", projectId).in("kind", ["image", "audio"]).order("created_at", { ascending: false }).limit(40),
  ]);
  const allTakes: (TakeRow & { shot_id: string })[] = (takeRows ?? []).map((t) => ({
    id: t.id, shot_id: t.shot_id, layer: t.layer, asset_id: t.asset_id, created_at: t.created_at, lifecycle: t.lifecycle,
    mime: t.assets?.mime ?? "application/octet-stream", kind: t.assets?.kind ?? "video", duration_s: t.assets?.duration_s ?? null,
  }));
  const takes = allTakes.filter((t) => t.lifecycle === "live");
  const allShots = shots ?? [];
  const selectedShot = allShots.find((s) => s.id === cut) ?? null;
  const scene = (scenes ?? []).find((sc) => sc.id === (selectedShot?.scene_id ?? sceneParam)) ?? (scenes ?? [])[0] ?? null;
  const cuts = allShots.filter((s) => s.scene_id === scene?.id);
  const current = selectedShot ?? cuts[0] ?? null;
  const total = allShots.reduce((a, s) => a + (s.duration_target_s ?? 0), 0);
  const laneOf = (shotId: string) => (jobs ?? []).find((j) => j.shot_id === shotId)?.lane ?? null;
  const busy = (jobs ?? []).some((j) => j.status === "queued" || j.status === "claimed" || j.status === "submitted" || j.status === "running");

  const shotIds = allShots.map((s) => s.id);
  const { data: linkRows } = shotIds.length
    ? await supabase.from("shot_bible_entries").select("shot_id, bible_entry_id, bible_entries(name, requires_consent)").in("shot_id", shotIds)
    : { data: [] as { shot_id: string; bible_entry_id: string; bible_entries: { name: string; requires_consent: boolean } | null }[] };
  const links = (linkRows ?? []).map((l) => ({ shot_id: l.shot_id, entry_id: l.bible_entry_id, name: l.bible_entries?.name ?? "…", requires_consent: !!l.bible_entries?.requires_consent }));

  // Console data for the selected cut only.
  let readiness: Readiness[] = [];
  let optionsByLane: Record<"explore" | "control" | "finish", Option[]> = { explore: [], control: [], finish: [] };
  if (current) {
    const [r, ...sets] = await Promise.all([
      Promise.all(LANES.map(async (lane) => { const { data } = await supabase.rpc("shot_ready_for", { p_shot: current.id, p_lane: lane }).maybeSingle(); return { lane, ready: !!data?.ready, missing: data?.missing ?? [] } as Readiness; })),
      ...(["explore", "control", "finish"] as const).map(async (lane) => { const { data } = await supabase.rpc("model_options", { p_project: projectId, p_lane: lane }); return (data ?? []) as Option[]; }),
    ]);
    readiness = r; optionsByLane = { explore: sets[0], control: sets[1], finish: sets[2] };
  }
  const intent = ((current?.intent ?? {}) as Intent);
  const entryList = (entries ?? []).filter((e): e is typeof e & { id: string } => !!e.id);
  const linkedIds = new Set(links.filter((l) => l.shot_id === current?.id).map((l) => l.entry_id));
  const promptSeed = current ? [current.description, intent.camera_language, intent.continuity && intent.continuity.toLowerCase() !== "none" ? intent.continuity : ""].filter(Boolean).join(". ") : "";
  const assetOptions = (imageAssets ?? []).map((a) => ({ id: a.id, kind: a.kind, label: String((a.provenance as { original_name?: string } | null)?.original_name ?? a.id.slice(0, 8)) }));
  const cutJobs = (jobs ?? []).filter((j) => j.shot_id === current?.id).slice(0, 8);
  const thumbFor = (shotId: string) => takes.find((t) => t.shot_id === shotId && t.layer === "merged") ?? takes.find((t) => t.shot_id === shotId && t.layer === "background") ?? null;

  return (
    <div className="max-w-[1400px]">
      <JobWatcher active={busy} />
      <div className="mb-3 flex flex-wrap items-baseline gap-4">
        <h1 className="display text-2xl">Storyboard</h1>
        <span className="text-sm text-muted">{allShots.length} cuts · {Math.floor(total / 60)}:{String(Math.round(total % 60)).padStart(2, "0")} planned</span>
        <div className="ml-auto flex gap-1 rounded-full bg-sand p-0.5 text-xs">
          <Link href={`/p/${projectId}/scenes${current ? `?cut=${current.id}` : ""}`} className={`rounded-full px-3 py-1 ${view !== "list" ? "bg-ink text-paper" : ""}`}>Filmstrip</Link>
          <Link href={`/p/${projectId}/scenes?view=list${scene ? `&scene=${scene.id}` : ""}`} className={`rounded-full px-3 py-1 ${view === "list" ? "bg-ink text-paper" : ""}`}>E-conte</Link>
        </div>
      </div>
      {ok && <p className="mb-3 rounded-[12px] bg-control/10 p-2 text-sm text-control">{ok}</p>}
      {error && <p className="mb-3 rounded-[12px] bg-danger/10 p-2 text-sm text-danger">{error}</p>}

      {(scenes ?? []).length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {(scenes ?? []).map((sc) => {
            const first = allShots.find((s) => s.scene_id === sc.id);
            const href = view === "list" ? `/p/${projectId}/scenes?view=list&scene=${sc.id}` : first ? `/p/${projectId}/scenes?cut=${first.id}` : `/p/${projectId}/scenes?scene=${sc.id}`;
            return <Link key={sc.id} href={href} className={`pill ${sc.id === scene?.id ? "bg-ink text-paper" : "bg-card"}`}>Scene {sc.position} · {sc.title}</Link>;
          })}
        </div>
      )}

      {scene && (
        <form action={updateScene} className="mb-4 flex flex-wrap items-center gap-2">
          <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="scene_id" value={scene.id} />
          <span className="label">Scene {scene.position}</span>
          <input name="title" defaultValue={scene.title} className={`${input} display`} />
          <input name="synopsis" defaultValue={scene.synopsis} placeholder="synopsis" className={`${input} min-w-64 flex-1`} />
          <button className={btn}>Save</button>
          <button formAction={deleteScene} className={`${btn} text-danger`}>Delete scene</button>
        </form>
      )}

      {scene && view === "list" ? (
        <section className="card mb-6 p-5" style={{ borderRadius: 22 }}>
          <EConte projectId={projectId} cuts={cuts} takes={takes} laneOf={laneOf} links={links} />
        </section>
      ) : scene ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-4">
            {/* filmstrip */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {cuts.map((s) => {
                const i = (s.intent ?? {}) as Intent;
                const complete = !!(i.objective && i.continuity && i.camera_language);
                const thumb = thumbFor(s.id); const lane = laneOf(s.id); const on = s.id === current?.id;
                return (
                  <Link key={s.id} href={`/p/${projectId}/scenes?cut=${s.id}`} className={`card flex w-40 shrink-0 flex-col p-2 text-[11px] ${on ? "ring-2 ring-ink" : ""}`} style={{ borderRadius: 12 }}>
                    <div className="flex items-center justify-between"><span className="mono">{s.label}</span><span className="mono text-muted">{s.duration_target_s != null ? `${s.duration_target_s.toFixed(1)}s` : "—"}</span></div>
                    <div className={`my-1.5 aspect-video overflow-hidden rounded-[8px] ${thumb ? "bg-ink" : "border border-dashed border-line"}`}>
                      {thumb && (thumb.kind === "video"
                        ? <video src={`/api/assets/${thumb.asset_id}`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img src={`/api/assets/${thumb.asset_id}`} alt="" className="h-full w-full object-cover" />)}
                    </div>
                    <div className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${lane ? LANE_DOT[lane] : "bg-line"}`} /><span className="truncate text-muted">{s.description || (complete ? "" : "notes incomplete")}</span></div>
                  </Link>
                );
              })}
              <form action={createShot} className="card flex w-40 shrink-0 flex-col justify-center gap-1 p-2 text-[11px]" style={{ borderRadius: 12 }}>
                <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="scene_id" value={scene.id} />
                <input name="description" placeholder="what happens in this cut" className={`${input} w-full text-xs`} />
                <div className="flex gap-1"><input name="duration_target_s" type="number" min={1} max={60} placeholder="s" className={`${input} w-14 text-xs`} /><button className="btn-primary flex-1 text-xs">+ Add cut</button></div>
              </form>
            </div>

            {current ? (
              <CutWorkspace projectId={projectId} shot={{ id: current.id, label: current.label, selected_take_id: current.selected_take_id, plate_take_id: current.plate_take_id }}
                            takes={allTakes.filter((t) => t.shot_id === current.id)} optionsByLane={optionsByLane} readiness={readiness}
                            promptSeed={promptSeed} dialogueSeed={intent.dialogue ?? ""} assets={assetOptions} />
            ) : <p className="text-sm text-muted">Add the first cut of this scene above.</p>}
          </div>

          {/* inspector */}
          {current && (
            <aside className="flex flex-col gap-4">
              <form action={updateShot} className="card grid gap-2 p-4" style={{ borderRadius: 18 }}>
                <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="shot_id" value={current.id} />
                <div className="flex items-baseline justify-between"><h2 className="display">Cut {current.label}</h2><span className="text-[11px] text-muted">e-conte notes</span></div>
                <div className="grid grid-cols-[64px_1fr] gap-2">
                  <label className="text-xs"><span className="label">Cut</span><input name="label" defaultValue={current.label} className={`${input} w-full`} /></label>
                  <label className="text-xs"><span className="label">Action</span><input name="description" defaultValue={current.description} className={`${input} w-full`} /></label>
                </div>
                <label className="text-xs"><span className="label">Objective</span><textarea name="objective" rows={2} defaultValue={intent.objective ?? ""} className={`${input} w-full`} placeholder="what this cut must achieve" /></label>
                <label className="text-xs"><span className="label">Continuity</span><textarea name="continuity" rows={2} defaultValue={intent.continuity ?? ""} className={`${input} w-full`} placeholder="what it must match, or: none" /></label>
                <label className="text-xs"><span className="label">Camera</span><input name="camera_language" defaultValue={intent.camera_language ?? ""} className={`${input} w-full`} /></label>
                <label className="text-xs"><span className="label">Dialogue</span><input name="dialogue" defaultValue={intent.dialogue ?? ""} className={`${input} w-full`} placeholder="ANA: That wasn't there." /></label>
                <div className="flex items-end gap-3">
                  <label className="text-xs"><span className="label">Seconds</span><input name="duration_target_s" type="number" min={1} max={60} defaultValue={current.duration_target_s ?? ""} className={`${input} w-20`} /></label>
                  <label className="flex items-center gap-2 pb-2 text-xs"><input type="checkbox" name="no_bible_assets" defaultChecked={!!intent.no_bible_assets} /> no bible entries</label>
                </div>
                <div className="flex gap-2"><button className="btn-primary text-xs">Save notes</button><button formAction={deleteShot} className={`${btn} text-xs text-danger`}>Delete cut</button></div>
              </form>

              <section className="card p-4" style={{ borderRadius: 18 }}>
                <h2 className="display mb-1 text-sm">Bible in this cut</h2>
                <p className="mb-2 text-[11px] text-muted">Consent-bearing entries need a valid release for the lane you generate in.</p>
                {links.filter((l) => l.shot_id === current.id).length === 0 ? <p className="mb-2 text-xs text-muted">None linked.</p> : (
                  <ul className="mb-2 flex flex-wrap gap-1.5">
                    {links.filter((l) => l.shot_id === current.id).map((l) => { const e = entryList.find((x) => x.id === l.entry_id); return (
                      <li key={l.entry_id} className="flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-0.5 text-xs">
                        <span>{l.name} <span className="text-muted">{e?.kind}</span></span>{e?.requires_consent && <BibleChip state={e.consent_state} />}
                        <form action={unlinkBible}><input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="shot_id" value={current.id} /><input type="hidden" name="entry_id" value={l.entry_id} /><button className="text-muted hover:text-danger" aria-label="unlink">×</button></form>
                      </li>); })}
                  </ul>
                )}
                <form action={linkBible} className="flex items-center gap-1.5">
                  <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="shot_id" value={current.id} />
                  <select name="entry_id" className={`${input} min-w-0 flex-1 text-xs`} defaultValue="">
                    <option value="">add an entry…</option>
                    {entryList.filter((e) => !linkedIds.has(e.id)).map((e) => <option key={e.id} value={e.id}>{e.kind}: {e.name}</option>)}
                  </select>
                  <button className={`${btn} text-xs`}>Link</button>
                </form>
                <Link href={`/p/${projectId}/bible`} className="mt-2 block text-[11px] text-muted underline">Open the bible</Link>
              </section>

              <section className="panel p-4" style={{ borderRadius: 18 }}>
                <h2 className="display mb-2 text-sm">Generations</h2>
                {cutJobs.length === 0 ? <p className="text-xs text-muted">Nothing generated for this cut yet.</p> : (
                  <ul className="flex flex-col gap-1.5 text-xs">
                    {cutJobs.map((j) => (
                      <li key={j.job_id} className="card px-2.5 py-1.5">
                        <div className="flex justify-between"><span className="font-semibold">{j.layer} · {j.lane}</span><span className="mono">{(j.actual_tokens ?? j.estimated_tokens ?? 0).toLocaleString()} tk</span></div>
                        <div className="text-muted">{j.status}{j.created_at ? ` · ${new Date(j.created_at).toLocaleTimeString()}` : ""}</div>
                        {j.error && <div className="mt-0.5 text-danger">{j.error}</div>}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-[11px] text-muted">Tokens are reserved when a job starts and returned if it fails.</p>
              </section>
            </aside>
          )}
        </div>
      ) : null}

      <form action={createScene} className="panel mt-6 flex flex-wrap items-end gap-2 p-4">
        <input type="hidden" name="project_id" value={projectId} />
        <label className="text-sm"><span className="label">New scene</span><br /><input name="title" placeholder="title" className={input} /></label>
        <label className="text-sm"><span className="label">Synopsis</span><br /><input name="synopsis" className={`${input} min-w-72`} /></label>
        <button className="btn-primary">+ Add scene</button>
      </form>
      <p className="mt-3 text-xs text-muted">Cuts read left to right as the film. Music is scored to the locked cut at the timeline stage.</p>
    </div>
  );
}
