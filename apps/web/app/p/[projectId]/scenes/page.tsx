import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createScene, createShot, deleteScene, updateScene } from "./actions";

const input = "input";
const btn = "btn";
const LAYERS = ["background", "character", "merged", "dialogue", "sfx"] as const;
const LANE_DOT: Record<string, string> = { explore: "bg-explore", control: "bg-control", finish: "bg-finish" };

// The storyboard as an e-conte: one column of cuts, picture left, notes beside, timing right.
export default async function ScenesPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { projectId } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: scenes }, { data: shots }, { data: takes }, { data: jobs }] = await Promise.all([
    supabase.from("scenes").select("id, position, title, synopsis").eq("project_id", projectId).order("position"),
    supabase.from("shots").select("id, scene_id, position, label, description, duration_target_s, intent, selected_take_id, plate_take_id").eq("project_id", projectId).order("position"),
    supabase.from("takes").select("shot_id, layer, asset_id").eq("project_id", projectId).eq("lifecycle", "live"),
    supabase.from("job_tokens").select("shot_id, lane, created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);
  const shotIds = (shots ?? []).map((s) => s.id);
  const { data: linkRows } = shotIds.length ? await supabase.from("shot_bible_entries").select("shot_id, bible_entries(name, requires_consent)").in("shot_id", shotIds) : { data: [] as { shot_id: string; bible_entries: { name: string; requires_consent: boolean } | null }[] };
  const total = (shots ?? []).reduce((a, s) => a + (s.duration_target_s ?? 0), 0);
  const layerCount = (shotId: string, layer: string) => (takes ?? []).filter((t) => t.shot_id === shotId && t.layer === layer).length;
  const laneOf = (shotId: string) => (jobs ?? []).find((j) => j.shot_id === shotId)?.lane ?? null;

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex flex-wrap items-baseline gap-4">
        <h1 className="display text-2xl">Storyboard</h1>
        <span className="text-sm text-muted">{(shots ?? []).length} cuts · {Math.floor(total / 60)}:{String(Math.round(total % 60)).padStart(2, "0")} planned</span>
      </div>
      {ok && <p className="mb-4 rounded-[12px] bg-control/10 p-2 text-sm text-control">{ok}</p>}
      {error && <p className="mb-4 rounded-[12px] bg-danger/10 p-2 text-sm text-danger">{error}</p>}

      {(scenes ?? []).map((sc) => {
        const cuts = (shots ?? []).filter((s) => s.scene_id === sc.id);
        return (
          <section key={sc.id} className="card mb-8 p-5" style={{ borderRadius: 22 }}>
            <form action={updateScene} className="mb-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="scene_id" value={sc.id} />
              <span className="label">Scene {sc.position}</span>
              <input name="title" defaultValue={sc.title} className={`${input} display`} />
              <input name="synopsis" defaultValue={sc.synopsis} placeholder="synopsis" className={`${input} min-w-64 flex-1`} />
              <button className={btn}>Save</button>
              <button formAction={deleteScene} className={`${btn} text-danger`}>Delete scene</button>
            </form>

            <div className="grid grid-cols-[54px_300px_minmax(0,1fr)_96px] border-b-2 border-ink pb-2 text-[11px]">
              <span className="label">Cut</span><span className="label">Picture · bg / char / merged · dialogue / sfx</span><span className="label pl-4">Action · camera · continuity · dialogue</span><span className="label text-right">Time</span>
            </div>

            {cuts.map((s) => {
              const intent = (s.intent ?? {}) as { objective?: string; continuity?: string; camera_language?: string; dialogue?: string; no_bible_assets?: boolean };
              const complete = !!(intent.objective && intent.continuity && intent.camera_language);
              const lane = laneOf(s.id);
              const bible = (linkRows ?? []).filter((l) => l.shot_id === s.id);
              const selectedAsset = (takes ?? []).find((t) => t.shot_id === s.id && t.layer === "merged")?.asset_id ?? null;
              return (
                <div key={s.id} className="grid grid-cols-[54px_300px_minmax(0,1fr)_96px] border-b border-line py-4">
                  <div className="flex flex-col gap-2">
                    <Link href={`/p/${projectId}/shots/${s.id}`} className="mono text-sm hover:underline">{s.label}</Link>
                    <span className={`h-2.5 w-2.5 rounded-full ${lane ? LANE_DOT[lane] : "bg-line"}`} title={lane ?? "not started"}></span>
                  </div>
                  <div>
                    <Link href={`/p/${projectId}/shots/${s.id}`} className={`relative block aspect-video overflow-hidden rounded-[12px] ${selectedAsset ? "bg-ink" : "border border-dashed border-line bg-paper"}`}>
                      {selectedAsset ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/assets/${selectedAsset}`} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-xs text-muted">{layerCount(s.id, "merged") + layerCount(s.id, "character") > 0 ? "takes waiting to be compared" : "no takes yet · open the cut to generate"}</span>
                      )}
                    </Link>
                    <div className="mt-2 flex gap-1.5">
                      {LAYERS.slice(0, 3).map((l) => {
                        const n = layerCount(s.id, l);
                        const reused = l === "background" && !!s.plate_take_id;
                        return <span key={l} className={`flex-1 rounded-[8px] px-1.5 py-1 text-center text-[10px] ${n || reused ? "bg-sand text-ink" : "border border-dashed border-line text-muted"}`}>{l === "background" ? "BG" : l === "character" ? "Char" : "Merged"} {reused ? "reused" : n || "—"}</span>;
                      })}
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                      {LAYERS.slice(3).map((l) => {
                        const n = layerCount(s.id, l);
                        return <span key={l} className={`flex-1 rounded-[8px] px-1.5 py-1 text-center text-[10px] ${n ? "bg-sand text-ink" : "border border-dashed border-line text-muted"}`}>{l === "dialogue" ? "Dialogue" : "SFX"} {n || "—"}</span>;
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 px-4 text-[13px] leading-snug">
                    <div><span className="label">Action</span><br />{s.description || <span className="text-muted">not set</span>}</div>
                    <div><span className="label">Camera</span><br />{intent.camera_language || <span className="text-muted">not set</span>}</div>
                    <div><span className="label">Continuity</span><br />{intent.continuity || <span className="text-muted">not set</span>}</div>
                    {intent.dialogue && <div><span className="label">Dialogue</span><br /><em>{intent.dialogue}</em></div>}
                    {!complete && <Link href={`/p/${projectId}/shots/${s.id}`} className="text-xs text-explore underline">intent incomplete — finish the notes first</Link>}
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    <span className="mono text-sm">{s.duration_target_s != null ? `${s.duration_target_s.toFixed(1)}s` : "—"}</span>
                    {bible.length > 0
                      ? bible.map((b, i) => <span key={i} className="text-[11px] text-muted">{b.bible_entries?.name}{b.bible_entries?.requires_consent ? " ✓" : ""}</span>)
                      : <span className="text-[11px] text-muted">{intent.no_bible_assets ? "no bible" : ""}</span>}
                  </div>
                </div>
              );
            })}

            <form action={createShot} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="scene_id" value={sc.id} />
              <label className="text-sm"><span className="label">Cut</span><br /><input name="label" placeholder="auto" className={`${input} w-20`} /></label>
              <label className="flex-1 text-sm"><span className="label">Action</span><br /><input name="description" placeholder="what happens in this cut" className={`${input} w-full`} /></label>
              <label className="text-sm"><span className="label">Seconds</span><br /><input name="duration_target_s" type="number" min={1} max={60} className={`${input} w-24`} /></label>
              <button className="btn-primary">+ Add cut</button>
            </form>
          </section>
        );
      })}

      <form action={createScene} className="panel flex flex-wrap items-end gap-2 p-4">
        <input type="hidden" name="project_id" value={projectId} />
        <label className="text-sm"><span className="label">New scene</span><br /><input name="title" placeholder="title" className={input} /></label>
        <label className="text-sm"><span className="label">Synopsis</span><br /><input name="synopsis" className={`${input} min-w-72`} /></label>
        <button className="btn-primary">+ Add scene</button>
      </form>
      <p className="mt-3 text-xs text-muted">Cuts read top to bottom as the film. Music is scored to the locked cut at the timeline stage.</p>
    </div>
  );
}
