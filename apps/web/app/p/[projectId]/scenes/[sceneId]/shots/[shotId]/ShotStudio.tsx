"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkFrame, chooseClip, chooseFrame, makeClip, makeFrames, saveCamera, setEndFrame, type Intent } from "./actions";
import { FailureNote } from "@/components/FailureNote";

type Check = NonNullable<Intent["checks"]>[string];

// What the frame check found, in plain words (nothing ⇒ the frame is fine).
function problems(c: Check): string[] {
  if ("error" in c) return [];
  const out: string[] = [];
  if (c.extra_people) out.push("someone not in the Cast");
  for (const p of c.people) out.push(...(!p.visible ? [`${p.name} is missing`] : !p.matches ? [`doesn't look like ${p.name}`] : []));
  if (c.weather_indoors) out.push("weather inside");
  return out;
}

export type Take = { id: string; layer: string; assetId: string; at: string; video: boolean };
type Shot = { id: string; label: string; description: string; seconds: number; intent: Intent; frame: string | null; clip: string | null };

const FRAMINGS: { key: string; label: string; svg: React.ReactNode }[] = [
  { key: "wide", label: "Wide", svg: <><rect x="3" y="3" width="24" height="18" rx="2" /><circle cx="11" cy="14" r="1.6" /><circle cx="19" cy="14" r="1.6" /></> },
  { key: "medium", label: "Medium", svg: <><rect x="3" y="3" width="24" height="18" rx="2" /><circle cx="15" cy="10" r="3" /><path d="M9 21c1-4 4-6 6-6s5 2 6 6" /></> },
  { key: "close", label: "Close-up", svg: <><rect x="3" y="3" width="24" height="18" rx="2" /><circle cx="15" cy="13" r="7" /></> },
  { key: "over_shoulder", label: "Over the shoulder", svg: <><rect x="3" y="3" width="24" height="18" rx="2" /><circle cx="20" cy="11" r="3.5" /><path d="M3 21c2-6 6-8 9-8" /></> },
  { key: "two_shot", label: "Two-shot", svg: <><rect x="3" y="3" width="24" height="18" rx="2" /><circle cx="10" cy="11" r="3" /><circle cx="20" cy="11" r="3" /></> },
  { key: "insert", label: "Insert", svg: <><rect x="3" y="3" width="24" height="18" rx="2" /><rect x="11" y="9" width="8" height="6" rx="1" /></> },
];
const MOTIONS: { key: string; label: string; svg: React.ReactNode }[] = [
  { key: "static", label: "Static", svg: <><rect x="4" y="4" width="22" height="16" rx="2" /><circle cx="15" cy="12" r="2" /></> },
  { key: "dolly_in", label: "Push in", svg: <><rect x="9" y="7" width="12" height="10" rx="1" /><path d="M2 2l6 4M28 2l-6 4M2 22l6-4M28 22l-6-4" /></> },
  { key: "dolly_out", label: "Pull out", svg: <><rect x="9" y="7" width="12" height="10" rx="1" /><path d="M8 6L3 2M22 6l5-4M8 18l-5 4M22 18l5 4" /></> },
  { key: "dolly_left", label: "Track left", svg: <><rect x="8" y="6" width="14" height="12" rx="1" /><path d="M6 12H1M4 9l-3 3 3 3" /></> },
  { key: "dolly_right", label: "Track right", svg: <><rect x="8" y="6" width="14" height="12" rx="1" /><path d="M24 12h5M26 9l3 3-3 3" /></> },
  { key: "jib_up", label: "Rise", svg: <><rect x="8" y="8" width="14" height="12" rx="1" /><path d="M15 6V1M12 3l3-3 3 3" /></> },
  { key: "jib_down", label: "Lower", svg: <><rect x="8" y="4" width="14" height="12" rx="1" /><path d="M15 18v5M12 21l3 3 3-3" /></> },
  { key: "focus_shift", label: "Focus shift", svg: <><circle cx="15" cy="12" r="7" /><circle cx="15" cy="12" r="3" /></> },
];

// One shot: 1 Camera → 2 Frame → 3 Clip. Each tab does one thing; the prompt bar only appears where
// something is being made.
export function ShotStudio({ projectId, sceneId, tab, shot, who, locName, angles, takes, pending, failed, prices, tracks }: {
  projectId: string; sceneId: string; tab: string; shot: Shot; who: { name: string; image: string | null }[]; locName: string | null;
  angles: { assetId: string; label: string }[]; takes: Take[]; pending: { frames: number; clips: number }; failed: string | null;
  prices: { frames: number | null; clip: number | null; finish: number | null }; tracks: { kind: string; name: string; assetId: string }[];
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [desc, setDesc] = useState(shot.description);
  const [extra, setExtra] = useState("");
  const [quality, setQuality] = useState<"fast" | "finish">("fast");
  const [n, setN] = useState(2);
  const base = `/p/${projectId}/scenes/${sceneId}/shots/${shot.id}`;
  const it = shot.intent;
  const frames = takes.filter((t) => t.layer === "background" && !t.video);
  const clips = takes.filter((t) => t.layer === "merged" && t.video);
  const frameAsset = frames.find((f) => f.id === shot.frame)?.assetId ?? null;
  const endAsset = frames.find((f) => f.id === it.end_take_id)?.assetId ?? null;
  const act = (fn: () => Promise<{ ok: true } | { error: string }>, ok?: string, then?: string) =>
    start(async () => { setMsg(null); const r = await fn(); if ("error" in r) setMsg({ ok: false, text: r.error }); else { if (ok) setMsg({ ok: true, text: ok }); if (then) router.push(then); router.refresh(); } });
  const price = (v: number | null) => (v != null ? <span className="mono ml-1.5 text-[11px] font-normal opacity-75">{v.toLocaleString()}</span> : null);
  const tile = (on: boolean) => `flex w-[78px] flex-col items-center gap-1 rounded-[7px] border p-1.5 text-[10.5px] ${on ? "border-gold text-ink" : "border-card-edge text-dim hover:text-ink"}`;
  const svg = (on: boolean, c: React.ReactNode) => <svg viewBox="0 0 30 24" className={`h-7 w-9 fill-none stroke-[1.4] ${on ? "stroke-gold" : "stroke-ink opacity-70"}`}>{c}</svg>;
  // "Use this frame" checks that frame first (once). Fine ⇒ chosen and on to the clip. Flagged ⇒ the
  // problems show on the frame with "Use it anyway" / "Make more frames". A check that can't run never blocks.
  const [checking, setChecking] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<string | null>(null);
  const pickFrame = (id: string, anyway = false) => start(async () => {
    setMsg(null); setFlagged(null);
    let note = "";
    if (!anyway) {
      setChecking(id);
      const r = await checkFrame(projectId, shot.id, id);
      setChecking(null);
      if ("check" in r && problems(r.check).length) { setFlagged(id); router.refresh(); return; }
      if ("check" in r && "error" in r.check) note = " (the check couldn't run, so it wasn't checked)";
    }
    const c = await chooseFrame(projectId, shot.id, id);
    if ("error" in c) { setMsg({ ok: false, text: c.error }); return; }
    setMsg({ ok: true, text: `Frame chosen${note}.` });
    router.push(`${base}?tab=clip`); router.refresh();
  });
  const tabs = [{ k: "camera", l: "Camera", done: !!it.framing }, { k: "frame", l: "Frame", done: !!shot.frame }, { k: "clip", l: "Clip", done: !!shot.clip }];
  const lines = it.lines ?? [];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-[18px]">{shot.label}</h1>
        <span className="text-[12px] text-mute">{[who.map((w) => w.name).join(" & "), locName && `in ${locName}`].filter(Boolean).join(" ")}{lines.length ? ` · says ${lines.map((l) => `"${l.text}"`).join(" ")}` : ""}</span>
        <nav className="ml-auto flex gap-1.5 text-[12px]">
          {tabs.map((t, i) => <Link key={t.k} href={`${base}?tab=${t.k}`} className={`rounded-full border px-3 py-1 ${tab === t.k ? "border-gold text-ink" : t.done ? "border-card-edge text-ok" : "border-card-edge text-mute hover:text-dim"}`}>{i + 1} · {t.l}{t.done ? " ✓" : ""}</Link>)}
        </nav>
      </div>

      {tab === "camera" && (
        <>
          <div><div className="label mb-1">Framing</div>
            <div className="flex flex-wrap gap-1.5">{FRAMINGS.map((f) => <button key={f.key} type="button" disabled={busy} className={tile(it.framing === f.key)} onClick={() => act(() => saveCamera(projectId, shot.id, { framing: f.key }))}>{svg(it.framing === f.key, f.svg)}{f.label}</button>)}</div></div>
          <div><div className="label mb-1">Camera move</div>
            <div className="flex flex-wrap gap-1.5">{MOTIONS.map((m) => <button key={m.key} type="button" disabled={busy} className={tile((it.camera_motion ?? "static") === m.key)} onClick={() => act(() => saveCamera(projectId, shot.id, { camera_motion: m.key }))}>{svg((it.camera_motion ?? "static") === m.key, m.svg)}{m.label}</button>)}</div></div>
          <div><div className="label mb-1">Background: which view of {locName ?? "the location"}</div>
            {angles.length ? (
              <div className="flex flex-wrap gap-2">
                {angles.map((a) => {
                  const on = (it.angle_asset_id ?? angles[0].assetId) === a.assetId;
                  return (
                    <button key={a.assetId} type="button" disabled={busy} onClick={() => act(() => saveCamera(projectId, shot.id, { angle_asset_id: a.assetId }))} className={`relative h-[72px] w-[128px] overflow-hidden rounded-[6px] border ${on ? "border-gold ring-1 ring-gold" : "border-card-edge"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/assets/${a.assetId}`} alt="" className="h-full w-full object-cover" /><span className="absolute left-1.5 top-1 text-[10.5px] [text-shadow:0_1px_2px_#000]">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : <p className="text-[12px] text-gold">No views of this location yet. <Link href={`/p/${projectId}/locations`} className="underline">Make its master wide and angles</Link>.</p>}
          </div>
          <label className="label">What the camera sees<textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} className="input mt-0.5 w-full text-[12.5px]" /></label>
          <div className="flex gap-2">
            {desc !== shot.description && <button type="button" className="btn" disabled={busy} onClick={() => act(() => saveCamera(projectId, shot.id, { description: desc }), "Saved.")}>Save</button>}
            <button type="button" className="btn-primary" disabled={busy || !it.framing} onClick={() => act(() => saveCamera(projectId, shot.id, { description: desc }), undefined, `${base}?tab=frame`)}>Next: the frame →</button>
          </div>
        </>
      )}

      {tab === "frame" && (
        <>
          <p className="text-[12px] text-dim">A still of the shot with {who.length ? who.map((w) => w.name).join(" and ") : "the scene"} in {locName ?? "the location"}. Choose one; it becomes the clip&apos;s first frame.</p>
          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
            {Array.from({ length: pending.frames ? 2 : 0 }).map((_, i) => <div key={i} className="grid aspect-video place-items-center rounded-[8px] border border-dashed border-gold bg-gold-wash text-[11px] text-gold">Making…</div>)}
            {frames.map((f) => {
              const chosen = f.id === shot.frame, end = f.id === it.end_take_id;
              return (
                <div key={f.id} className={`group relative aspect-video overflow-hidden rounded-[8px] border ${chosen ? "border-chosen shadow-[0_0_0_1px_var(--color-chosen)]" : "border-card-edge"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/assets/${f.assetId}`} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  {chosen && <span className="absolute left-2 top-1.5 text-[11px] text-chosen [text-shadow:0_1px_2px_#000]">first frame</span>}
                  {end && <span className="absolute left-2 top-1.5 text-[11px] text-gold [text-shadow:0_1px_2px_#000]">end frame</span>}
                  <FrameFlag check={it.checks?.[f.id]} running={checking === f.id} />
                  {flagged === f.id && it.checks?.[f.id] && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/75 p-3 text-center text-[11.5px]">
                      <span className="text-gold">⚠ {problems(it.checks[f.id]).join(" · ")}</span>
                      {"notes" in it.checks[f.id] && <span className="text-dim">{(it.checks[f.id] as { notes: string }).notes}</span>}
                      <span className="flex gap-1.5">
                        <button className="rounded-[5px] border border-card-edge bg-[rgba(20,21,25,.92)] px-2 py-1 text-[11px]" onClick={() => pickFrame(f.id, true)}>Use it anyway</button>
                        <button className="rounded-[5px] bg-gold px-2 py-1 text-[11px] font-medium text-[#1a1408]" onClick={() => setFlagged(null)}>Make more frames</button>
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-black/85 to-transparent p-2 pt-6 md:opacity-0 md:group-hover:opacity-100">
                    {!chosen && <button className="rounded-[5px] bg-gold px-2 py-1 text-[11px] font-medium text-[#1a1408]" disabled={busy} onClick={() => pickFrame(f.id)}>{checking === f.id ? "Checking…" : "Use this frame"}</button>}
                    {!chosen && <button className="rounded-[5px] border border-card-edge bg-[rgba(20,21,25,.92)] px-2 py-1 text-[11px]" onClick={() => act(() => setEndFrame(projectId, shot.id, end ? null : f.id))}>{end ? "Not the end frame" : "Use as end frame"}</button>}
                  </div>
                </div>
              );
            })}
          </div>
          {!frames.length && !pending.frames && <p className="text-[12px] text-dim">No frames yet.</p>}
        </>
      )}

      {tab === "clip" && (
        !shot.frame ? <p className="text-[12px] text-gold">Choose a frame first (tab 2).</p> : (
          <>
            <div className="flex flex-wrap items-center gap-3 text-[12px] text-dim">
              <span className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {frameAsset && <img src={`/api/assets/${frameAsset}`} alt="" className="h-10 w-16 rounded-[4px] border border-chosen object-cover" />}
                <span>⇄</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {endAsset ? <img src={`/api/assets/${endAsset}`} alt="" className="h-10 w-16 rounded-[4px] border border-gold object-cover" /> : <Link href={`${base}?tab=frame`} className="grid h-10 w-16 place-items-center rounded-[4px] border border-dashed border-card-edge text-[10px] text-mute">+ end frame</Link>}
              </span>
              <span>{MOTIONS.find((m) => m.key === (it.camera_motion ?? "static"))?.label} · {shot.seconds}s{lines.length ? " · with the lines, spoken" : ""}</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {Array.from({ length: pending.clips }).map((_, i) => <div key={i} className="grid aspect-video place-items-center rounded-[8px] border border-dashed border-gold bg-gold-wash text-[11px] text-gold">Rendering…</div>)}
              {clips.map((c, i) => {
                const chosen = c.id === shot.clip;
                return (
                  <div key={c.id} className={`overflow-hidden rounded-[8px] border ${chosen ? "border-chosen shadow-[0_0_0_1px_var(--color-chosen)]" : "border-card-edge"}`}>
                    <video src={`/api/assets/${c.assetId}`} controls preload="metadata" className="aspect-video w-full bg-black" />
                    <div className="flex items-center gap-2 p-1.5 text-[11px]">
                      <span className="text-mute">Take {clips.length - i}</span>
                      {chosen ? <span className="ml-auto text-chosen">chosen</span>
                        : <button className="ml-auto rounded-[5px] bg-gold px-2 py-1 font-medium text-[#1a1408]" onClick={() => act(() => chooseClip(projectId, shot.id, c.id), lines.length ? "Chosen. The voices are being turned into each character's voice." : "Chosen.")}>Choose this take</button>}
                    </div>
                  </div>
                );
              })}
            </div>
            {shot.clip && lines.length > 0 && (
              <div className="glass rounded-[10px] p-2.5 text-[12px]">
                <div className="text-[11px] text-mute">Sound tracks for the chosen take</div>
                {tracks.length ? tracks.map((t, i) => (
                  <div key={i} className="mt-1 flex items-center gap-2"><span className="w-24 text-gold">{t.kind === "voice" ? t.name : t.kind}</span><audio controls preload="none" src={`/api/assets/${t.assetId}`} className="h-7 flex-1" /></div>
                )) : <p className="mt-1 text-dim">Splitting the voices into one track per character… (about a minute)</p>}
              </div>
            )}
          </>
        )
      )}

      {msg && <p className={`text-[12px] ${msg.ok ? "text-ok" : "text-drift"}`}>{msg.text}</p>}
      {failed && !pending.frames && !pending.clips && <FailureNote error={failed} />}

      {(tab === "frame" || (tab === "clip" && shot.frame)) && (
        <div className="glass sticky bottom-3 mt-auto flex flex-col gap-2 rounded-[10px] p-2.5 shadow-[0_14px_34px_rgba(0,0,0,.45)]">
          <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
            {who.map((w) => (
              <span key={w.name} className="flex items-center gap-1.5 rounded-full border border-gold bg-gold-wash py-0.5 pl-0.5 pr-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {w.image ? <img src={`/api/assets/${w.image}`} alt="" className="h-5 w-5 rounded-full object-cover" /> : <span className="h-5 w-5 rounded-full bg-field" />}{w.name}
              </span>
            ))}
            {locName && <span className="rounded-full border border-gold bg-gold-wash px-2 py-0.5">{locName} · {angles.find((a) => a.assetId === (it.angle_asset_id ?? angles[0]?.assetId))?.label ?? "master wide"}</span>}
            <span className="text-mute">their looks go in automatically</span>
          </div>
          <input value={extra} onChange={(e) => setExtra(e.target.value)} className="input w-full text-[12.5px]" placeholder={tab === "frame" ? "Anything to add: she's mid-wipe, looking up" : "Anything to add: she hesitates before the second line"} />
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            {tab === "frame" ? (
              <>
                <label className="flex items-center gap-1 text-mute">Frames<select value={n} onChange={(e) => setN(Number(e.target.value))} className="input py-0.5 text-[12px]">{[1, 2, 3, 4].map((x) => <option key={x}>{x}</option>)}</select></label>
                <button type="button" disabled={busy} onClick={() => act(() => makeFrames(projectId, shot.id, { extra, count: n }), "Making frames.")} className="btn-primary ml-auto">Make frames{price(prices.frames != null ? Math.round((prices.frames / 2) * n) : null)}</button>
              </>
            ) : (
              <>
                <span className="inline-flex overflow-hidden rounded-[6px] border border-card-edge">
                  {(["fast", "finish"] as const).map((q) => <button key={q} type="button" onClick={() => setQuality(q)} className={`px-2.5 py-1 ${quality === q ? "bg-field text-ink" : "text-dim"}`}>{q === "fast" ? "Fast" : "Quality"}</button>)}
                </span>
                <label className="flex items-center gap-1 text-mute">Takes<select value={n} onChange={(e) => setN(Number(e.target.value))} className="input py-0.5 text-[12px]">{[1, 2, 3].map((x) => <option key={x}>{x}</option>)}</select></label>
                <span className="text-[11px] text-mute">LTX 2.5 · set for the whole film</span>
                <button type="button" disabled={busy} onClick={() => act(() => makeClip(projectId, shot.id, { seconds: shot.seconds, quality, takes: n, extra }), "Rendering. Takes appear here when they're done.")} className="btn-primary ml-auto">
                  Make {n} take{n > 1 ? "s" : ""}{price((quality === "fast" ? prices.clip : prices.finish) != null ? (quality === "fast" ? prices.clip! : prices.finish!) * n : null)}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// The check's verdict on a frame that has been checked (the ones someone tried to use): a quiet tick
// when it's fine, the problems in gold when it isn't. Unchecked frames show nothing.
function FrameFlag({ check, running }: { check: Check | undefined; running: boolean }) {
  const pill = "absolute right-2 top-1.5 max-w-[70%] rounded-[5px] bg-black/65 px-1.5 py-0.5 text-right text-[10.5px] leading-snug";
  if (running) return <span className={`${pill} text-mute`}>checking…</span>;
  if (!check || "error" in check) return null;
  const p = problems(check);
  if (!p.length) return <span className={`${pill} text-ok`} title="Claude checked the people and the room">✓ looks right</span>;
  return <span title={check.notes} className={`${pill} text-gold`}>⚠ {p.join(" · ")}</span>;
}
