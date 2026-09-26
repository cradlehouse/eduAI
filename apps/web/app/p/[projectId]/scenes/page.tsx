import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getNav } from "@/lib/auth/nav";
import { getProject } from "@/lib/projects/data";
import { BibleChip } from "@/components/BibleChip";
import { createScene, createShot, deleteScene, deleteShot, setLook, updateScene, updateShot } from "./actions";
import { CutWorkspace, type Option, type Readiness, type TakeRow } from "./CutWorkspace";
import { EConte } from "./EConte";
import { JobWatcher } from "./JobWatcher";
import { Timeline } from "./Timeline";

const input = "input";
const LANES = ["explore", "control", "finish", "voice_likeness"] as const;
const BUSY = ["queued", "claimed", "submitted", "running"];
type Intent = { objective?: string; continuity?: string; continuity_notes?: string; match_cuts?: string[]; camera_language?: string; dialogue?: string; no_bible_assets?: boolean };

// The Scene screen (docs/DESIGN.md §4.3): header with budget, pinned chips, the cuts as cards on the
// canvas with their takes underneath, the selected cut's workspace + route + notes, the instructor
// strip, and the timeline drawer. ?cut=<shotId> selects; ?view=list shows the e-conte column.
export default async function ScenesPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ ok?: string; error?: string; cut?: string; scene?: string; view?: string }> }) {
  const { projectId } = await params;
  const { ok, error, cut, scene: sceneParam, view } = await searchParams;
  const supabase = await createClient();
  const [{ data: project }, { data: scenes }, { data: shots }, { data: takeRows }, { data: jobs }, { data: entries }, { data: imageAssets }, nav, pdata] = await Promise.all([
    supabase.from("projects").select("look, cohort_id, orgs(looks)").eq("id", projectId).maybeSingle(),
    supabase.from("scenes").select("id, position, title, synopsis, heading, time_of_day, location_entry_id").eq("project_id", projectId).order("position"),
    supabase.from("shots").select("id, scene_id, position, label, description, duration_target_s, intent, selected_take_id, plate_take_id").eq("project_id", projectId).order("position"),
    supabase.from("takes").select("id, shot_id, layer, asset_id, created_at, lifecycle, assets(mime, kind, duration_s)").eq("project_id", projectId).in("lifecycle", ["live", "killed"]).order("created_at"),
    supabase.from("job_tokens").select("job_id, shot_id, lane, layer, status, estimated_tokens, actual_tokens, created_at, error").eq("project_id", projectId).order("created_at", { ascending: false }).limit(200),
    supabase.from("bible_entry_status").select("id, name, kind, requires_consent, consent_state").eq("project_id", projectId).order("kind").order("name"),
    supabase.from("assets").select("id, kind, provenance").eq("project_id", projectId).in("kind", ["image", "audio"]).order("created_at", { ascending: false }).limit(40),
    getNav(), getProject(projectId),
  ]);
  const allTakes: (TakeRow & { shot_id: string })[] = (takeRows ?? []).map((t) => ({
    id: t.id, shot_id: t.shot_id, layer: t.layer, asset_id: t.asset_id, created_at: t.created_at, lifecycle: t.lifecycle,
    mime: t.assets?.mime ?? "application/octet-stream", kind: t.assets?.kind ?? "video", duration_s: t.assets?.duration_s ?? null,
  }));
  const takes = allTakes.filter((t) => t.lifecycle === "live");
  const allShots = shots ?? [];
  const sceneList = scenes ?? [];
  const looks = ((project?.orgs?.looks ?? []) as { key: string; label: string; prompt: string }[]);
  const look = looks.find((l) => l.key === project?.look) ?? null;
  const selectedShot = allShots.find((s) => s.id === cut) ?? null;
  const scene = sceneList.find((sc) => sc.id === (selectedShot?.scene_id ?? sceneParam)) ?? sceneList[0] ?? null;
  const cuts = allShots.filter((s) => s.scene_id === scene?.id);
  const current = selectedShot ?? cuts[0] ?? null;
  const laneOf = (shotId: string) => (jobs ?? []).find((j) => j.shot_id === shotId)?.lane ?? null;
  const busy = (jobs ?? []).some((j) => BUSY.includes(j.status ?? ""));
  const manage = !!nav && (nav.isAdmin || (nav.cohorts.find((c) => c.id === project?.cohort_id)?.manage ?? false));
  const budget = pdata?.budget ? { spent: pdata.budget.spent_tokens ?? 0, total: pdata.budget.total_tokens ?? 0 } : { spent: 0, total: 0 };

  const { data: sceneCast } = scene ? await supabase.from("scene_bible_entries").select("bible_entry_id").eq("scene_id", scene.id) : { data: [] as { bible_entry_id: string }[] };
  const sceneLocation = (entries ?? []).find((e) => e.id === scene?.location_entry_id) ?? null;
  const sceneMembers = (entries ?? []).filter((e) => (sceneCast ?? []).some((c) => c.bible_entry_id === e.id));
  const shotIds = allShots.map((s) => s.id);
  const { data: linkRows } = shotIds.length
    ? await supabase.from("shot_bible_entries").select("shot_id, bible_entry_id, bible_entries(name, kind, requires_consent)").in("shot_id", shotIds)
    : { data: [] as { shot_id: string; bible_entry_id: string; bible_entries: { name: string; kind: string; requires_consent: boolean } | null }[] };
  const links = (linkRows ?? []).map((l) => ({ shot_id: l.shot_id, entry_id: l.bible_entry_id, name: l.bible_entries?.name ?? "…", kind: l.bible_entries?.kind ?? "", requires_consent: !!l.bible_entries?.requires_consent }));

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
  const cutLinks = links.filter((l) => l.shot_id === current?.id);
  const linkedIds = new Set(cutLinks.map((l) => l.entry_id));
  const promptSeed = current ? [current.description, intent.camera_language, intent.continuity && intent.continuity.toLowerCase() !== "none" ? intent.continuity : ""].filter(Boolean).join(". ") : "";
  const assetOptions = (imageAssets ?? []).map((a) => ({ id: a.id, kind: a.kind, label: String((a.provenance as { original_name?: string } | null)?.original_name ?? a.id.slice(0, 8)) }));
  const cutJobs = (jobs ?? []).filter((j) => j.shot_id === current?.id).slice(0, 6);
  const chosenFor = (s: { id: string; selected_take_id: string | null; plate_take_id: string | null }) => takes.find((t) => t.id === s.selected_take_id) ?? takes.find((t) => t.id === s.plate_take_id) ?? takes.filter((t) => t.shot_id === s.id && (t.layer === "merged" || t.layer === "background")).at(-1) ?? null;
  const pct = budget.total ? Math.min(100, (budget.spent / budget.total) * 100) : 0;
  const sceneJobs = (jobs ?? []).filter((j) => cuts.some((c) => c.id === j.shot_id));
  const refused = sceneJobs.filter((j) => j.status === "rejected").length;
  const cutHref = (id: string) => `/p/${projectId}/scenes?cut=${id}`;
  const media = (t: TakeRow, cls: string) => t.kind === "video"
    ? <video src={`/api/assets/${t.asset_id}`} muted playsInline preload="metadata" className={cls} />
    // eslint-disable-next-line @next/next/no-img-element
    : t.kind === "image" ? <img src={`/api/assets/${t.asset_id}`} alt="" className={cls} /> : <span className="grid h-full place-items-center text-[10px] text-mute">{t.layer}</span>;

  return (
    <div className="flex min-h-full flex-col">
      <JobWatcher active={busy} />
      {/* header: scene title, scene switch, budget, look, view */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <h1 className="text-[22px]">{scene ? <>Scene {scene.position} <span className="ml-2 text-[13px] text-dim">{scene.heading || scene.title}</span></> : "Scenes"}</h1>
          {scene && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              {sceneLocation ? <Link href={`/p/${projectId}/bible/${sceneLocation.id}`} className="pill pinned">{sceneLocation.name}</Link>
                : <Link href={`/p/${projectId}/places`} className="pill border-dashed text-gold">set a place for this scene</Link>}
              {scene.time_of_day && <span className="pill text-dim">{scene.time_of_day}</span>}
              {sceneMembers.map((m) => <Link key={m.id} href={`/p/${projectId}/bible/${m.id}`} className="pill text-dim">{m.name}</Link>)}
            </div>
          )}
        </div>
        {sceneList.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {sceneList.map((sc) => { const first = allShots.find((s) => s.scene_id === sc.id); const href = view === "list" ? `/p/${projectId}/scenes?view=list&scene=${sc.id}` : first ? cutHref(first.id) : `/p/${projectId}/scenes?scene=${sc.id}`;
              return <Link key={sc.id} href={href} title={sc.title} className={`rounded-[6px] px-2 py-1 text-[12px] ${sc.id === scene?.id ? "bg-field text-gold" : "text-dim hover:bg-field"}`}>{sc.position}</Link>; })}
          </div>
        )}
        <div className="ml-auto w-56"><div className="kv py-0"><span className="text-dim">Budget</span><span className="mono">{budget.spent.toLocaleString()} / {budget.total.toLocaleString()}</span></div><div className={`bar ${pct >= 90 ? "over" : ""}`}><i style={{ width: `${pct}%` }} /></div></div>
        <form action={setLook} className="flex items-center gap-1.5 text-[11px]">
          <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="back" value={`/p/${projectId}/scenes${current ? `?cut=${current.id}` : ""}`} />
          <label htmlFor="look" className="text-mute">Look</label>
          <select id="look" name="look" defaultValue={project?.look ?? ""} className="input py-1 text-[11px]" title={look?.prompt ?? "Pick the film's look; it leads every picture prompt"}>
            <option value="">not set</option>{looks.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
          <button className="btn py-1 text-[11px]">Set</button>
        </form>
        <div className="flex gap-0.5 rounded-[6px] bg-field p-0.5 text-[11px]">
          <Link href={`/p/${projectId}/scenes${current ? `?cut=${current.id}` : ""}`} className={`rounded-[5px] px-2 py-1 ${view !== "list" ? "bg-glass text-gold" : "text-dim"}`}>Canvas</Link>
          <Link href={`/p/${projectId}/scenes?view=list${scene ? `&scene=${scene.id}` : ""}`} className={`rounded-[5px] px-2 py-1 ${view === "list" ? "bg-glass text-gold" : "text-dim"}`}>E-conte</Link>
        </div>
      </div>
      {ok && <p className="mt-3 rounded-[6px] bg-ok/10 px-3 py-2 text-[12px] text-ok">{ok}</p>}
      {error && <p className="mt-3 rounded-[6px] bg-drift/10 px-3 py-2 text-[12px] text-drift">{error}</p>}

      {/* pinned chips for the selected cut */}
      {current && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {cutLinks.map((l) => <span key={l.entry_id} className="pill pinned flex items-center gap-1">{l.name}{l.requires_consent && <BibleChip state={entryList.find((e) => e.id === l.entry_id)?.consent_state ?? null} />}</span>)}
          {cutLinks.length === 0 && <span className="text-[11px] text-mute">{intent.no_bible_assets ? "This cut uses nothing from the bible." : "Nothing pinned to this cut yet · pin from the bible rail."}</span>}
        </div>
      )}

      {scene ? (
        <details className="mt-3 text-[11px] text-mute">
          <summary className="cursor-pointer select-none">{scene.synopsis || "no synopsis"} · edit scene · add a scene</summary>
          <form action={updateScene} className="mt-2 flex flex-wrap items-center gap-2">
            <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="scene_id" value={scene.id} />
            <input name="title" defaultValue={scene.title} className={input} /><input name="synopsis" defaultValue={scene.synopsis} placeholder="synopsis" className={`${input} min-w-64 flex-1`} />
            <button className="btn">Save</button><button formAction={deleteScene} className="btn text-drift">Delete scene</button>
          </form>
          <form action={createScene} className="mt-2 flex flex-wrap items-center gap-2 border-t border-glass-edge pt-2">
            <input type="hidden" name="project_id" value={projectId} /><span>Next scene</span>
            <input name="title" placeholder="title" className={input} /><input name="synopsis" placeholder="synopsis" className={`${input} min-w-64 flex-1`} /><button className="btn-primary">Add scene</button>
          </form>
        </details>
      ) : (
        <form action={createScene} className="glass mt-4 flex flex-wrap items-end gap-2 rounded-[10px] p-4">
          <input type="hidden" name="project_id" value={projectId} />
          <label className="text-[12px]"><span className="label">First scene</span><br /><input name="title" placeholder="title" className={input} /></label>
          <label className="text-[12px]"><span className="label">Synopsis</span><br /><input name="synopsis" className={`${input} min-w-72`} /></label>
          <button className="btn-primary">Add scene</button>
        </form>
      )}

      {scene && view === "list" ? (
        <section className="glass mt-4 rounded-[10px] p-5"><EConte projectId={projectId} cuts={cuts} takes={takes} laneOf={laneOf} links={links} /></section>
      ) : scene ? (
        <>
          {/* the canvas: cuts as cards, takes under each */}
          <div className="mt-4 flex items-start gap-4 overflow-x-auto pb-2">
            {cuts.map((s) => {
              const i = (s.intent ?? {}) as Intent; const on = s.id === current?.id; const pic = chosenFor(s);
              const cutTakes = takes.filter((t) => t.shot_id === s.id && (t.layer === "merged" || t.layer === "background"));
              const generating = (jobs ?? []).some((j) => j.shot_id === s.id && BUSY.includes(j.status ?? ""));
              return (
                <div key={s.id} className="w-[290px] shrink-0">
                  <Link href={cutHref(s.id)} className={`imgcard relative block h-[164px] ${on ? "chosen" : ""} ${generating ? "generating" : ""}`}>
                    {pic && media(pic, "h-full w-full object-cover")}
                    <span className="absolute left-2.5 top-2 text-[11px] text-ink [text-shadow:0_1px_2px_#000]">Cut {s.label}{s.description ? ` · ${s.description.slice(0, 28)}${s.description.length > 28 ? "…" : ""}` : ""}</span>
                    <span className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/75 to-transparent px-2.5 py-1.5 text-[11px]">
                      <span>{cutTakes.length ? `${cutTakes.length} take${cutTakes.length === 1 ? "" : "s"}${s.selected_take_id ? "" : " · not chosen"}` : generating ? "generating…" : "no take yet"}</span>
                      <span className="mono text-dim">{s.duration_target_s != null ? `${s.duration_target_s}s` : ""}</span>
                    </span>
                  </Link>
                  <div className="mt-2 flex items-center gap-1.5 overflow-x-auto">
                    {cutTakes.slice(-4).map((t) => { const onT = t.id === s.selected_take_id || t.id === s.plate_take_id; return (
                      <Link key={t.id} href={cutHref(s.id)} className={`relative block h-10 w-[68px] shrink-0 overflow-hidden rounded-[5px] border bg-card ${onT ? "border-chosen" : "border-transparent opacity-60"}`}>{media(t, "h-full w-full object-cover")}</Link>
                    ); })}
                    <Link href={cutHref(s.id)} className="grid h-10 w-[68px] shrink-0 place-items-center rounded-[5px] border border-dashed border-card-edge text-[11px] text-mute hover:text-dim">+</Link>
                  </div>
                  <div className="mt-1.5 truncate text-[11px] text-mute">{i.camera_language || "camera · not set"}</div>
                </div>
              );
            })}
            <form action={createShot} className="flex h-[164px] w-[200px] shrink-0 flex-col justify-center gap-1.5 rounded-[8px] border border-dashed border-card-edge p-3 text-[11px]">
              <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="scene_id" value={scene.id} />
              <span className="text-mute">+ cut</span>
              <input name="description" placeholder="what happens in this cut" className={`${input} w-full`} />
              <div className="flex gap-1"><input name="duration_target_s" type="number" min={1} max={60} placeholder="s" className={`${input} w-14`} /><button className="btn-primary flex-1">Add cut</button></div>
            </form>
          </div>

          {current ? (
            <div className="mt-2">
              <CutWorkspace key={current.id} projectId={projectId} shot={{ id: current.id, label: current.label, selected_take_id: current.selected_take_id, plate_take_id: current.plate_take_id }}
                            takes={allTakes.filter((t) => t.shot_id === current.id)} optionsByLane={optionsByLane} readiness={readiness}
                            promptSeed={promptSeed} dialogueSeed={intent.dialogue ?? ""} assets={assetOptions} look={look}
                            inspector={
                <>
                  <form key={current.id} action={updateShot} className="glass grid gap-2 rounded-[10px] p-3">
                    <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="shot_id" value={current.id} />
                    <div className="flex items-baseline justify-between"><span className="text-[12px] font-medium">Cut {current.label}</span><span className="text-[11px] text-mute">notes</span></div>
                    <div className="grid grid-cols-[56px_1fr] gap-2">
                      <label className="label">Cut<input name="label" defaultValue={current.label} className={`${input} mt-0.5 w-full`} /></label>
                      <label className="label">Action<input name="description" defaultValue={current.description} className={`${input} mt-0.5 w-full`} /></label>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <label className="label">Camera<input name="camera_language" defaultValue={intent.camera_language ?? ""} placeholder="close · eye level · static · 50mm" className={`${input} mt-0.5 w-full`} /></label>
                      <label className="label">Seconds<input name="duration_target_s" type="number" min={1} max={60} defaultValue={current.duration_target_s ?? ""} className={`${input} mt-0.5 w-full`} /></label>
                    </div>
                    <label className="label">Objective<textarea name="objective" rows={2} defaultValue={intent.objective ?? ""} className={`${input} mt-0.5 w-full`} placeholder="what this cut must achieve" /></label>
                    <div className="label">Continuity · what this cut must match</div>
                    {cuts.filter((c) => c.id !== current.id).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {cuts.filter((c) => c.id !== current.id).map((c) => (
                          <label key={c.id} className="pill flex cursor-pointer items-center gap-1 text-[11px]"><input type="checkbox" name="match_cut" value={c.id} defaultChecked={(intent.match_cuts ?? []).includes(c.id)} /> Cut {c.label}</label>
                        ))}
                      </div>
                    )}
                    {[...linkedIds].map((id) => <input key={id} type="hidden" name="entry" value={id} />)}
                    <textarea name="continuity" rows={2} defaultValue={intent.continuity_notes ?? intent.continuity ?? ""} className={`${input} w-full`} placeholder="lighting, props, position, or: none" />
                    <label className="flex items-center gap-2 text-[11px] text-dim"><input type="checkbox" name="no_bible_assets" defaultChecked={!!intent.no_bible_assets} /> This cut uses nothing from the bible</label>
                    <label className="label">Dialogue<input name="dialogue" defaultValue={intent.dialogue ?? ""} className={`${input} mt-0.5 w-full`} placeholder="ANA: That wasn't there." /></label>
                    <div className="flex gap-2"><button className="btn-primary">Save notes</button><button formAction={deleteShot} className="btn text-drift">Delete cut</button></div>
                  </form>
                  <section className="glass rounded-[10px] p-3">
                    <div className="text-[12px] font-medium">Receipts</div>
                    {cutJobs.length === 0 ? <p className="mt-1 text-[11px] text-mute">Nothing generated for this cut yet.</p> : (
                      <ul className="mt-1 flex flex-col text-[11px]">
                        {cutJobs.map((j) => (
                          <li key={j.job_id} className="kv border-t border-glass-edge">
                            <span>{j.layer} · {j.lane} <span className={j.status === "rejected" || j.status === "failed" ? "text-drift" : "text-mute"}>· {j.status === "rejected" ? "refused · no charge" : j.status}</span>{j.error && <span className="block text-drift">{j.error}</span>}</span>
                            <span className="mono text-dim">{(j.actual_tokens ?? j.estimated_tokens ?? 0).toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              } />
            </div>
          ) : <p className="mt-4 text-[12px] text-dim">Add the first cut of this scene.</p>}

          {manage && (
            <div className="glass mt-4 rounded-[10px] px-4 py-3">
              <div className="flex items-baseline gap-3"><span className="text-[12px] font-medium">Instructor</span><span className="text-[11px] text-dim">every take, its prompt, its cost, who chose what. Nothing is deleted.</span></div>
              <div className="kv"><span className="text-dim">Screened prompts on this scene</span><span>{sceneJobs.length} run · {refused} refused (no charge)</span></div>
              <div className="kv"><span className="text-dim">Team on this project</span><span>{(pdata?.members ?? []).map((m) => m.users?.display_name ?? m.users?.email?.split("@")[0]).filter(Boolean).join(", ") || "—"}</span></div>
            </div>
          )}
        </>
      ) : null}

      {sceneList.length > 0 && (
        <Timeline projectId={projectId} scenes={sceneList} shots={allShots} takes={takes} spent={budget.spent} total={budget.total} open={view !== "list"} />
      )}
    </div>
  );
}
