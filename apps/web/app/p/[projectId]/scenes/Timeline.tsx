import Link from "next/link";

// The timeline drawer (docs/DESIGN.md §4.4): chosen takes in story order, one lane per kind. Not an
// editor. A cut with no chosen take is a gap the width of the cut, never a stand-in.
export type TLScene = { id: string; position: number; title: string };
export type TLShot = { id: string; scene_id: string; label: string; duration_target_s: number | null; selected_take_id: string | null };
export type TLTake = { id: string; shot_id: string; layer: string; asset_id: string; kind: string; duration_s: number | null };

const W = 110, GAP = 6;

export function Timeline({ projectId, scenes, shots, takes, spent, total, open }: { projectId: string; scenes: TLScene[]; shots: TLShot[]; takes: TLTake[]; spent: number; total: number; open: boolean }) {
  const ordered = scenes.flatMap((sc) => shots.filter((s) => s.scene_id === sc.id).map((s) => ({ ...s, scene: sc })));
  const chosen = (s: TLShot) => takes.find((t) => t.id === s.selected_take_id) ?? null;
  const sfx = (s: TLShot) => takes.filter((t) => t.shot_id === s.id && t.layer === "sfx");
  const runtime = ordered.reduce((a, s) => a + (chosen(s)?.duration_s ?? 0), 0);
  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, "0")}`;
  const lane = (name: string, cells: React.ReactNode, h = 34) => (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center border-t border-glass-edge" style={{ height: h }}>
      <span className="text-[11px] text-mute">{name}</span>
      <div className="flex items-center overflow-x-auto" style={{ gap: GAP }}>{cells}</div>
    </div>
  );
  return (
    <details open={open} className="glass mt-4 rounded-[10px] px-4 py-3">
      <summary className="flex cursor-pointer list-none items-baseline gap-3">
        <span className="text-[12px] font-medium">Timeline</span>
        <span className="text-[11px] text-dim">assembly · {fmt(runtime)} chosen{ordered.some((s) => !chosen(s)) ? ` · ${ordered.filter((s) => !chosen(s)).length} cuts without a chosen take` : ""}</span>
        <span className="ml-auto text-[11px] text-mute">chosen takes only, in story order</span>
      </summary>
      <div className="mt-3 grid grid-cols-[110px_minmax(0,1fr)]">
        <span />
        <div className="flex text-[10px] text-mute" style={{ gap: GAP }}>
          {scenes.map((sc) => { const n = shots.filter((s) => s.scene_id === sc.id).length; return n ? <span key={sc.id} className="truncate" style={{ width: n * W + (n - 1) * GAP }}>Scene {sc.position} · {sc.title}</span> : null; })}
        </div>
      </div>
      {lane("Picture", ordered.map((s) => { const t = chosen(s); return (
        <Link key={s.id} href={`/p/${projectId}/scenes?cut=${s.id}`} style={{ width: W }}
              className={`relative h-[52px] shrink-0 overflow-hidden rounded-[4px] border text-[11px] ${t ? "border-chosen bg-card" : "border-dashed border-card-edge text-mute"}`}>
          {t ? (t.kind === "video" ? <video src={`/api/assets/${t.asset_id}`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={`/api/assets/${t.asset_id}`} alt="" className="h-full w-full object-cover" />) : null}
          <span className="absolute left-1.5 top-1 text-ink [text-shadow:0_1px_2px_#000]">{s.label}</span>
          {!t && <span className="absolute inset-x-1.5 bottom-1 truncate">no take chosen</span>}
        </Link>
      ); }), 60)}
      {lane("Ambience", <span className="h-[26px] w-full rounded-[4px] border border-dashed border-card-edge px-2 text-[11px] leading-[26px] text-mute">one bed per environment · generated when an environment is saved (coming)</span>)}
      {lane("Effects", ordered.map((s) => { const fx = sfx(s); return (
        <div key={s.id} style={{ width: W }} className={`flex h-[26px] shrink-0 items-center rounded-[4px] px-2 text-[11px] ${fx.length ? "border border-chosen/30 bg-chosen-wash text-dim" : "text-mute"}`}>{fx.length ? `${fx.length} sfx` : ""}</div>
      ); }))}
      {lane("Voice", <span className="h-[26px] w-full rounded-[4px] border border-dashed border-card-edge px-2 text-[11px] leading-[26px] text-mute">voice route · phase 2</span>)}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-dim">
        <span>Spent this project <span className="text-ink">{spent.toLocaleString()}</span> of {total.toLocaleString()} tokens</span>
        <div className={`bar w-40 ${total && spent / total >= 0.9 ? "over" : ""}`}><i style={{ width: `${total ? Math.min(100, (spent / total) * 100) : 0}%` }} /></div>
        <span className="ml-auto text-mute">Export rough cut · coming</span>
      </div>
    </details>
  );
}
