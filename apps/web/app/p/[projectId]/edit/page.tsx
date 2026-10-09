import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { JobWatcher } from "@/app/p/[projectId]/scenes/JobWatcher";
import { pickRoute } from "@/lib/elements/routes";
import { loadReadiness } from "@/lib/project/load";
import { Editor, type Clip, type Levels } from "./Editor";

// Step 7: the chosen takes in script order, with their sound on separate tracks: one per character
// (their converted voice), the room (each location's room tone), and the picture's own sound where a
// take has no split yet. Mixed down only on export.
export default async function EditPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const [{ data: scenes }, { data: shots }, { data: project }, { data: people }, { data: exports }, { data: musicEntry }] = await Promise.all([
    supabase.from("scenes").select("id, position, heading, location_entry_id").eq("project_id", projectId).order("position"),
    supabase.from("shots").select("id, scene_id, position, label, selected_take_id").eq("project_id", projectId).order("position"),
    supabase.from("projects").select("title, edit").eq("id", projectId).maybeSingle(),
    supabase.from("bible_entries").select("id, name, kind, room_tone_asset_id").eq("project_id", projectId).in("kind", ["character", "location"]),
    supabase.from("jobs").select("id, status, created_at, error").eq("project_id", projectId).eq("kind", "render").contains("inputs", { op: "export" }).order("created_at", { ascending: false }).limit(3),
    supabase.from("bible_entries").select("id").eq("project_id", projectId).eq("kind", "style").eq("name", "Music").maybeSingle(),
  ]);
  // Music made so far (the hidden "Music" entry's results) and whatever is still being made.
  const [{ data: pieces }, { data: musicJobs }] = musicEntry ? await Promise.all([
    supabase.from("bible_entry_assets").select("asset_id, label, created_at").eq("bible_entry_id", musicEntry.id).eq("role", "music").eq("lifecycle", "live").order("created_at", { ascending: false }),
    supabase.from("job_tokens").select("status, error, created_at").eq("bible_entry_id", musicEntry.id).order("created_at", { ascending: false }).limit(5),
  ]) : [{ data: [] }, { data: [] }];
  const musicBusy = (musicJobs ?? []).some((j) => ["queued", "claimed", "submitted", "running"].includes(j.status ?? ""));
  const musicFailed = (musicJobs ?? [])[0] && ["failed", "rejected", "timed_out"].includes(musicJobs![0].status ?? "") ? musicJobs![0].error : null;
  const { data: musicPrice } = await (async () => {
    const r = await pickRoute(projectId, "music");
    return r ? supabase.rpc("estimate_tokens", { p_profile: r.profileId, p_inputs: { duration_s: 30 } }) : { data: null };
  })();
  const takeIds = (shots ?? []).map((s) => s.selected_take_id).filter((x): x is string => !!x);
  const [{ data: takes }, { data: tracks }] = takeIds.length ? await Promise.all([
    supabase.from("takes").select("id, asset_id, assets(duration_s)").in("id", takeIds),
    supabase.from("take_tracks").select("take_id, kind, bible_entry_id, asset_id").in("take_id", takeIds),
  ]) : [{ data: [] }, { data: [] }];
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  const clips: Clip[] = [];
  for (const sc of scenes ?? []) {
    for (const sh of (shots ?? []).filter((s) => s.scene_id === sc.id && s.selected_take_id)) {
      const t = (takes ?? []).find((x) => x.id === sh.selected_take_id);
      if (!t) continue;
      const tr = (tracks ?? []).filter((x) => x.take_id === t.id);
      clips.push({
        shotId: sh.id, sceneId: sc.id, scene: sc.position, shot: sh.position, label: sh.label, video: t.asset_id,
        seconds: Number((t.assets as { duration_s?: number } | null)?.duration_s ?? 6),
        voices: tr.filter((x) => x.kind === "voice").map((x) => ({ name: x.bible_entry_id ? byId.get(x.bible_entry_id)?.name ?? "Voice" : "Voice", assetId: x.asset_id })),
        room: sc.location_entry_id ? byId.get(sc.location_entry_id)?.room_tone_asset_id ?? null : null,
      });
    }
  }
  // What isn't in the film yet, so the timeline never looks finished when it isn't.
  const ready = await loadReadiness(projectId);
  const gaps = ready.scenes.filter((s) => s.state !== "done").map((s) => ({
    href: `/p/${projectId}/scenes/${s.id}`,
    text: `Scene ${s.position} · ${s.heading}: ${!s.shots ? (s.ready ? "shots not planned yet" : `not set up (${s.missing.join(", ")})`) : `${s.chosen} of ${s.shots} shots have a take`}`,
  }));
  const sounds = (people ?? []).filter((p) => ready.entries[p.id]?.needed && ["no voice yet", "no room tone"].includes(ready.entries[p.id].status))
    .map((p) => ({ href: `/p/${projectId}/${p.kind === "location" ? "locations" : "cast"}/${p.id}?tab=${ready.entries[p.id].tab}`, text: `${p.name}: ${ready.entries[p.id].status}` }));
  const edit = (project?.edit ?? {}) as { levels?: Levels; music?: string | null };
  const levels = (edit.levels ?? {}) as Levels;
  const lastExport = exports?.[0] ?? null;
  const exporting = !!lastExport && ["queued", "claimed", "submitted", "running"].includes(lastExport.status ?? "");
  const { data: out } = lastExport?.status === "succeeded" ? await supabase.from("assets").select("id").eq("job_id", lastExport.id).eq("kind", "video").maybeSingle() : { data: null };

  return (
    <div className="flex flex-col gap-3">
      <JobWatcher active={exporting || musicBusy} />
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-[20px]">Edit</h1>
        <span className="text-[12px] text-mute">{project?.title} · {ready.film.chosen} of {ready.film.shots} shots chosen · {ready.film.planned} of {ready.film.scenes} scenes planned</span>
      </div>
      {(gaps.length > 0 || sounds.length > 0) && (
        <section className="rounded-[10px] border border-gold/50 bg-gold-wash p-3 text-[12px]">
          <div className="font-medium text-gold">Not in the film yet</div>
          <ul className="mt-1 flex flex-col gap-0.5">
            {[...gaps, ...sounds].map((g) => <li key={g.href + g.text}><Link href={g.href} className="text-dim underline decoration-card-edge underline-offset-2 hover:text-ink">{g.text} →</Link></li>)}
          </ul>
          <p className="mt-1.5 text-mute">You can export now; the film will only have what&apos;s chosen so far.</p>
        </section>
      )}
      {!clips.length ? (
        <p className="text-[12px] text-dim">No chosen takes yet. <Link href={`/p/${projectId}/scenes`} className="underline">Go to Scenes</Link>, and in each shot choose the take you want in the film.</p>
      ) : (
        <Editor projectId={projectId} clips={clips} levels={levels} exporting={exporting} exportAsset={out?.id ?? null} exportError={lastExport?.status === "failed" ? lastExport.error : null}
                music={{ chosen: edit.music ?? null, pieces: (pieces ?? []).map((p) => ({ assetId: p.asset_id, label: p.label })), busy: musicBusy, failed: musicFailed ?? null, price: musicPrice ?? null }} />
      )}
    </div>
  );
}
