import Link from "next/link";

// The e-conte view: one column of cuts, picture left, notes beside, timing right. The list twin of the filmstrip.
const LAYERS = ["background", "character", "merged", "dialogue", "sfx"] as const;
const LANE_DOT: Record<string, string> = { explore: "bg-field", control: "bg-gold", finish: "bg-field" };

export type EConteShot = { id: string; scene_id: string; label: string; description: string; duration_target_s: number | null; intent: unknown; plate_take_id: string | null };
export type EConteTake = { shot_id: string; layer: string; asset_id: string; kind: string };

export function EConte({ projectId, cuts, takes, laneOf, links }: {
  projectId: string; cuts: EConteShot[]; takes: EConteTake[]; laneOf: (shotId: string) => string | null;
  links: { shot_id: string; name: string; requires_consent: boolean }[];
}) {
  const layerCount = (shotId: string, layer: string) => takes.filter((t) => t.shot_id === shotId && t.layer === layer).length;
  return (
    <div>
      <div className="grid grid-cols-[54px_300px_minmax(0,1fr)_96px] border-b-2 border-card-edge pb-2 text-[11px]">
        <span className="label">Cut</span><span className="label">Picture · bg / char / merged · dialogue / sfx</span><span className="label pl-4">Action · camera · continuity · dialogue</span><span className="label text-right">Time</span>
      </div>
      {cuts.map((s) => {
        const intent = (s.intent ?? {}) as { objective?: string; continuity?: string; camera_language?: string; dialogue?: string; no_bible_assets?: boolean };
        const complete = !!(intent.objective && intent.continuity && intent.camera_language);
        const lane = laneOf(s.id);
        const bible = links.filter((l) => l.shot_id === s.id);
        const pic = takes.find((t) => t.shot_id === s.id && t.layer === "merged") ?? takes.find((t) => t.shot_id === s.id && t.layer === "background") ?? null;
        const href = `/p/${projectId}/scenes?cut=${s.id}`;
        return (
          <div key={s.id} className="grid grid-cols-[54px_300px_minmax(0,1fr)_96px] border-b border-glass-edge py-4">
            <div className="flex flex-col gap-2">
              <Link href={href} className="mono text-sm hover:underline">{s.label}</Link>
              <span className={`h-2.5 w-2.5 rounded-full ${lane ? LANE_DOT[lane] : "bg-glass-edge"}`} title={lane ?? "not started"}></span>
            </div>
            <div>
              <Link href={href} className={`relative block aspect-video overflow-hidden rounded-[6px] ${pic ? "bg-gold" : "border border-dashed border-glass-edge bg-bg"}`}>
                {pic ? (pic.kind === "video"
                  ? <video src={`/api/assets/${pic.asset_id}`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={`/api/assets/${pic.asset_id}`} alt="" className="h-full w-full object-cover" />)
                  : <span className="absolute inset-0 flex items-center justify-center text-xs text-dim">no takes yet · open the cut to generate</span>}
              </Link>
              <div className="mt-2 flex gap-1.5">
                {LAYERS.slice(0, 3).map((l) => { const n = layerCount(s.id, l); const reused = l === "background" && !!s.plate_take_id;
                  return <span key={l} className={`flex-1 rounded-[8px] px-1.5 py-1 text-center text-[10px] ${n || reused ? "bg-glass text-ink" : "border border-dashed border-glass-edge text-dim"}`}>{l === "background" ? "BG" : l === "character" ? "Char" : "Merged"} {n || (reused ? "plate" : "—")}</span>; })}
              </div>
              <div className="mt-1.5 flex gap-1.5">
                {LAYERS.slice(3).map((l) => { const n = layerCount(s.id, l);
                  return <span key={l} className={`flex-1 rounded-[8px] px-1.5 py-1 text-center text-[10px] ${n ? "bg-glass text-ink" : "border border-dashed border-glass-edge text-dim"}`}>{l === "dialogue" ? "Dialogue" : "SFX"} {n || "—"}</span>; })}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 px-4 text-[13px] leading-snug">
              <div><span className="label">Action</span><br />{s.description || <span className="text-dim">not set</span>}</div>
              <div><span className="label">Camera</span><br />{intent.camera_language || <span className="text-dim">not set</span>}</div>
              <div><span className="label">Continuity</span><br />{intent.continuity || <span className="text-dim">not set</span>}</div>
              {intent.dialogue && <div><span className="label">Dialogue</span><br /><em>{intent.dialogue}</em></div>}
              {!complete && <Link href={href} className="text-xs text-dim underline">intent incomplete — finish the notes first</Link>}
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              <span className="mono text-sm">{s.duration_target_s != null ? `${s.duration_target_s.toFixed(1)}s` : "—"}</span>
              {bible.length > 0 ? bible.map((b, i) => <span key={i} className="text-[11px] text-dim">{b.name}{b.requires_consent ? " ✓" : ""}</span>)
                : <span className="text-[11px] text-dim">{intent.no_bible_assets ? "no bible" : ""}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
