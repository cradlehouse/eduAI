import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { priceOf } from "@/lib/elements/routes";
import { JobWatcher } from "@/app/p/[projectId]/scenes/JobWatcher";
import { ShotStudio, type Take } from "./ShotStudio";
import type { Intent } from "./actions";

const BUSY = ["queued", "claimed", "submitted", "running"];

// One shot at a time: Camera (framing + move, the location angle behind), Frame (stills with the
// cast and the location in them; choose one), Clip (LTX from that frame, lines performed; choose one).
export default async function ShotPage({ params, searchParams }: { params: Promise<{ projectId: string; sceneId: string; shotId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ projectId, sceneId, shotId }, { tab }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [{ data: shot }, { data: shots }, { data: scene }, { data: takes }, { data: jobs }, { data: pins }] = await Promise.all([
    supabase.from("shots").select("id, label, description, duration_target_s, intent, plate_take_id, selected_take_id").eq("id", shotId).maybeSingle(),
    supabase.from("shots").select("id, position, label, plate_take_id, selected_take_id, intent").eq("scene_id", sceneId).order("position"),
    supabase.from("scenes").select("position, heading, location_entry_id").eq("id", sceneId).maybeSingle(),
    supabase.from("takes").select("id, layer, asset_id, created_at, job_id, assets(kind, duration_s)").eq("shot_id", shotId).eq("lifecycle", "live").order("created_at", { ascending: false }),
    supabase.from("job_tokens").select("job_id, layer, status, error, created_at").eq("shot_id", shotId).order("created_at", { ascending: false }).limit(20),
    supabase.from("shot_bible_entries").select("bible_entries(id, kind, name, reference_asset_id)").eq("shot_id", shotId),
  ]);
  if (!shot || !scene) notFound();
  const intent = (shot.intent ?? {}) as Intent;
  const entries = (pins ?? []).map((p) => p.bible_entries).filter((e): e is NonNullable<typeof e> => !!e);
  const loc = entries.find((e) => e.kind === "location") ?? null;
  const { data: angleRows } = loc ? await supabase.from("bible_entry_assets").select("asset_id, role, label").eq("bible_entry_id", loc.id).eq("lifecycle", "live").in("role", ["angle", "time"]).order("created_at") : { data: [] };
  const angles = [...(loc?.reference_asset_id ? [{ assetId: loc.reference_asset_id, label: "Master wide" }] : []), ...(angleRows ?? []).map((a) => ({ assetId: a.asset_id, label: a.label || a.role }))];
  const { data: tracks } = shot.selected_take_id ? await supabase.from("take_tracks").select("kind, bible_entry_id, asset_id").eq("take_id", shot.selected_take_id) : { data: [] };

  const all: Take[] = (takes ?? []).map((t) => ({ id: t.id, layer: t.layer, assetId: t.asset_id, at: t.created_at, video: (t.assets as { kind?: string } | null)?.kind === "video" }));
  const open = (jobs ?? []).filter((j) => BUSY.includes(j.status ?? ""));
  const lastFailed = (jobs ?? []).slice(0, 1).find((j) => ["failed", "rejected", "timed_out"].includes(j.status ?? ""));
  const current = tab ?? (!intent.framing ? "camera" : !shot.plate_take_id ? "frame" : "clip");
  const secs = Number(shot.duration_target_s ?? 6);
  const prices = {
    frames: await priceOf(projectId, "edit", { prompt: "x", references: ["x"], num_images: 2 }),
    clip: await priceOf(projectId, "clip", { duration_s: Math.max(6, secs) }),
    finish: await priceOf(projectId, "clipFinish", { duration_s: Math.min(10, Math.max(6, secs)) }),
  };
  const who = entries.filter((e) => e.kind === "character").map((e) => ({ name: e.name, image: e.reference_asset_id }));

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <JobWatcher active={open.length > 0} />
      <aside className="glass flex w-full shrink-0 flex-col gap-1 rounded-[10px] p-2 lg:w-[220px]">
        <Link href={`/p/${projectId}/scenes/${sceneId}`} className="px-1 pb-1 text-[11px] text-mute hover:text-ink">← Scene {scene.position}</Link>
        {(shots ?? []).map((s) => {
          const it = (s.intent ?? {}) as Intent;
          const st = s.selected_take_id ? "✓" : s.plate_take_id ? "clip" : it.framing ? "frame" : "camera";
          return (
            <Link key={s.id} href={`/p/${projectId}/scenes/${sceneId}/shots/${s.id}`} className={`flex items-center gap-2 rounded-[7px] p-1.5 text-[12px] ${s.id === shotId ? "bg-field text-ink outline outline-1 outline-card-edge" : "text-dim hover:bg-field"}`}>
              <span className="w-4 text-mute">{s.position}</span>
              <span className="min-w-0 flex-1"><span className="block truncate">{s.label}</span>{it.lines?.[0] && <span className="block truncate text-[10.5px] text-mute">&ldquo;{it.lines[0].text}&rdquo;</span>}</span>
              <span className={`text-[10px] ${st === "✓" ? "text-ok" : "text-gold"}`}>{st === "✓" ? "✓" : `next: ${st}`}</span>
            </Link>
          );
        })}
      </aside>
      <ShotStudio projectId={projectId} sceneId={sceneId} tab={current}
                  shot={{ id: shot.id, label: shot.label, description: shot.description, seconds: secs, intent, frame: shot.plate_take_id, clip: shot.selected_take_id }}
                  who={who} locName={loc?.name ?? null} angles={angles} takes={all}
                  pending={{ frames: open.filter((j) => j.layer === "background").length, clips: open.filter((j) => j.layer === "merged").length }}
                  failed={lastFailed?.error ?? null} prices={prices}
                  tracks={(tracks ?? []).map((t) => ({ kind: t.kind, name: entries.find((e) => e.id === t.bible_entry_id)?.name ?? "", assetId: t.asset_id }))} />
    </div>
  );
}
