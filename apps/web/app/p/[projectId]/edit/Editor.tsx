"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { exportFilm, saveLevels } from "./actions";

export type Clip = { shotId: string; sceneId: string; scene: number; label: string; video: string; seconds: number; voices: { name: string; assetId: string }[]; room: string | null };
export type Levels = Record<string, number>;

const PX = 22; // pixels per second on the timeline

// Plays the chosen takes in order with their tracks in step: the picture, each character's voice
// (converted), the room tone of each scene's location. Levels per track; export mixes it down.
export function Editor({ projectId, clips, levels: initial, exporting, exportAsset, exportError }: { projectId: string; clips: Clip[]; levels: Levels; exporting: boolean; exportAsset: string | null; exportError: string | null }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [levels, setLevels] = useState<Levels>({ picture: 1, room: 0.5, ...initial });
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const room = useRef<HTMLAudioElement>(null);
  const voiceEls = useRef<Record<string, HTMLAudioElement | null>>({});
  const clip = clips[i];
  const names = useMemo(() => [...new Set(clips.flatMap((c) => c.voices.map((v) => v.name)))], [clips]);
  const starts = useMemo(() => clips.reduce<number[]>((a, c, k) => [...a, k === 0 ? 0 : a[k - 1] + clips[k - 1].seconds], []), [clips]);
  const total = clips.reduce((s, c) => s + c.seconds, 0);
  const lvl = (k: string) => levels[k] ?? 1;

  // Keep the voice tracks locked to the picture.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const sync = () => {
      for (const el of Object.values(voiceEls.current)) {
        if (!el) continue;
        if (Math.abs(el.currentTime - v.currentTime) > 0.15) el.currentTime = v.currentTime;
        if (!v.paused && el.paused) el.play().catch(() => {});
        if (v.paused && !el.paused) el.pause();
      }
      const r = room.current;
      if (r) { if (!v.paused && r.paused) r.play().catch(() => {}); if (v.paused && !r.paused) r.pause(); }
    };
    v.addEventListener("timeupdate", sync); v.addEventListener("play", sync); v.addEventListener("pause", sync); v.addEventListener("seeked", sync);
    return () => { v.removeEventListener("timeupdate", sync); v.removeEventListener("play", sync); v.removeEventListener("pause", sync); v.removeEventListener("seeked", sync); };
  }, [i]);

  // Levels apply live. The picture's own sound is muted where the voices were split out of it.
  useEffect(() => {
    if (video.current) video.current.volume = clip?.voices.length ? 0 : lvl("picture");
    if (room.current) room.current.volume = lvl("room");
    for (const v of clip?.voices ?? []) { const el = voiceEls.current[v.name]; if (el) el.volume = lvl(`voice:${v.name}`); }
  });

  useEffect(() => {
    if (!playing) return;
    video.current?.play().catch(() => setPlaying(false));
  }, [i, playing]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function setLevel(k: string, v: number) {
    const next = { ...levels, [k]: v };
    setLevels(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveLevels(projectId, next); }, 600);
  }

  const row = (key: string, label: string, cells: React.ReactNode, level?: boolean) => (
    <div className="grid grid-cols-[132px_1fr] items-center gap-2 text-[11px]">
      <div className="flex items-center gap-1.5 text-mute">
        <span className="w-16 truncate">{label}</span>
        {level && <input type="range" min={0} max={1} step={0.05} value={lvl(key)} onChange={(e) => setLevel(key, Number(e.target.value))} className="w-14 accent-[#F2B441]" aria-label={`${label} level`} />}
      </div>
      <div className="relative h-8 rounded-[5px] bg-[rgba(255,255,255,.02)]" style={{ width: total * PX }}>{cells}</div>
    </div>
  );
  const box = (k: number, cls: string, text: string, onClick?: () => void) => (
    <button key={k} type="button" onClick={onClick} style={{ left: starts[k] * PX, width: clips[k].seconds * PX - 2 }}
            className={`absolute top-0.5 bottom-0.5 overflow-hidden rounded-[4px] border px-1 text-left text-[10px] ${cls}`}>{text}</button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="overflow-hidden rounded-[10px] border border-card-edge bg-black">
          {clip && <video key={clip.video} ref={video} src={`/api/assets/${clip.video}`} playsInline preload="auto" className="aspect-video w-full"
                          onEnded={() => { if (i < clips.length - 1) setI(i + 1); else setPlaying(false); }} onPlay={() => setPlaying(true)} onPause={(e) => { if (!e.currentTarget.ended) setPlaying(false); }} />}
          {clip?.voices.map((v) => <audio key={`${clip.shotId}-${v.name}`} ref={(el) => { voiceEls.current[v.name] = el; }} src={`/api/assets/${v.assetId}`} preload="auto" />)}
          {clip?.room && <audio key={`room-${clip.sceneId}`} ref={room} src={`/api/assets/${clip.room}`} loop preload="auto" />}
        </div>
        <div className="glass flex flex-col gap-2 rounded-[10px] p-3 text-[12px]">
          <div className="flex gap-2">
            <button type="button" className="btn-primary" onClick={() => (playing ? video.current?.pause() : (setPlaying(true), video.current?.play()))}>{playing ? "Pause" : "Play"}</button>
            <button type="button" className="btn" onClick={() => { setI(0); setPlaying(false); if (video.current) video.current.currentTime = 0; }}>From the top</button>
          </div>
          <div className="text-mute">Shot {i + 1} of {clips.length}: <span className="text-ink">{clip?.label}</span> (scene {clip?.scene})</div>
          <Link href={`/p/${projectId}/scenes/${clip?.sceneId}/shots/${clip?.shotId}?tab=clip`} className="text-[11px] text-dim underline">Not working? Open this shot</Link>
          <div className="mt-auto border-t border-glass-edge pt-2">
            {exportAsset && <a href={`/api/assets/${exportAsset}`} download className="btn mb-2 block text-center">Download the film</a>}
            <button type="button" disabled={busy || exporting} className="btn-primary w-full" onClick={() => start(async () => {
              setMsg(null);
              const r = await exportFilm(projectId, clips.map((c) => ({ video: c.video, seconds: c.seconds, voices: c.voices.map((v) => v.assetId), room: c.room })), levels);
              if ("error" in r) setMsg(r.error); else router.refresh();
            })}>{exporting ? "Exporting…" : exportAsset ? "Export again" : "Export the film"}</button>
            {exportError && <p className="mt-1 text-[11px] text-drift">Export failed: {exportError}</p>}
            {msg && <p className="mt-1 text-[11px] text-drift">{msg}</p>}
          </div>
        </div>
      </div>

      <div className="glass overflow-x-auto rounded-[10px] p-3">
        <div className="flex min-w-max flex-col gap-1.5">
          {row("picture", "Picture", clips.map((c, k) => box(k, k === i ? "border-chosen bg-chosen-wash text-ink" : "border-card-edge bg-card text-dim", `${c.scene}. ${c.label}`, () => { setI(k); })), true)}
          {names.map((n) => row(`voice:${n}`, n, clips.map((c, k) => c.voices.some((v) => v.name === n) ? box(k, "border-gold/60 bg-gold-wash text-gold", n) : null), true))}
          {row("room", "Room", clips.map((c, k) => c.room ? box(k, "border-ok/40 bg-ok/10 text-ok", "room tone") : null), true)}
          {row("music", "Music", <span className="absolute inset-0 grid place-items-center text-[10px] text-mute">music comes next</span>)}
        </div>
      </div>
      {!names.length && <p className="text-[11px] text-mute">No voice tracks yet: they appear once a take with lines is chosen and its voices have been split (about a minute).</p>}
    </div>
  );
}
