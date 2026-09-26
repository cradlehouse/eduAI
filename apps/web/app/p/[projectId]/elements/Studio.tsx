"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Json } from "@/lib/db/types";
import { chooseLook, chooseSound, hideResult, makeElement, saveAppearance, uploadStart, type What } from "./actions";

type Kind = "character" | "location" | "prop";
export type Result = { id: string; assetId: string; role: string; label: string; at: string; jobId: string | null; audio: boolean };
type Entry = { id: string; name: string; appearance: string; description: string; reference: string | null; voice: string | null; room: string | null; likeness: string | null };
type Prices = { look: number | null; edit: number | null; angle: number | null; voice: number | null; room: number | null };

// Kokoro's stock voices, named for people choosing a voice rather than for engineers.
const VOICES: { id: string; label: string }[] = [
  { id: "af_heart", label: "Heart · warm woman" }, { id: "af_bella", label: "Bella · bright young woman" }, { id: "af_nicole", label: "Nicole · soft, close" },
  { id: "af_sarah", label: "Sarah · clear, even" }, { id: "af_sky", label: "Sky · light, young" }, { id: "af_nova", label: "Nova · crisp" },
  { id: "am_michael", label: "Michael · steady man" }, { id: "am_onyx", label: "Onyx · deep, older man" }, { id: "am_adam", label: "Adam · plain, young man" },
  { id: "am_eric", label: "Eric · firm" }, { id: "am_liam", label: "Liam · easy, friendly" }, { id: "am_puck", label: "Puck · quick, playful" },
];
const ANGLES: { label: string; params: Record<string, number> }[] = [
  { label: "Reverse", params: { horizontal_angle: 180, vertical_angle: 0, zoom: 0 } },
  { label: "From the right", params: { horizontal_angle: 90, vertical_angle: 0, zoom: 0 } },
  { label: "From the left", params: { horizontal_angle: 270, vertical_angle: 0, zoom: 0 } },
  { label: "45° right", params: { horizontal_angle: 45, vertical_angle: 0, zoom: 2 } },
  { label: "45° left", params: { horizontal_angle: 315, vertical_angle: 0, zoom: 2 } },
  { label: "High, looking down", params: { horizontal_angle: 0, vertical_angle: 60, zoom: 0 } },
  { label: "Low, looking up", params: { horizontal_angle: 0, vertical_angle: -30, zoom: 2 } },
  { label: "Closer in", params: { horizontal_angle: 0, vertical_angle: 0, zoom: 6 } },
];
const TIMES = ["dawn", "midday", "golden hour", "dusk", "night"];

export function Studio({ projectId, kind, base, tab, tabs, entry, scenes, results, pending, failed, prices }: {
  projectId: string; kind: Kind; base: string; tab: string; tabs: { key: string; label: string }[]; entry: Entry;
  scenes: number[]; results: Result[]; pending: { role: string; status: string }[]; failed: string | null; prices: Prices;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [look, setLook] = useState(entry.appearance);
  const [who, setWho] = useState(entry.description);
  const [extra, setExtra] = useState(kind === "location" && tab === "room" ? `${entry.name}: ${entry.appearance}` : "");
  const [startImg, setStartImg] = useState<string | null>(null);
  const [count, setCount] = useState(3);
  const [voice, setVoice] = useState(VOICES[0].id);
  const file = useRef<HTMLInputElement>(null);
  const first = entry.name.split(" ")[0].replace(/^(.)(.*)$/, (_, a: string, b: string) => a.toUpperCase() + b.toLowerCase());
  const choose = kind === "character" ? `This is ${first}` : kind === "location" ? "Set as master wide" : "Use this look";

  const act = (fn: () => Promise<{ ok: true } | { error: string } | { ok: true; tokens?: number | null }>, ok?: string) =>
    start(async () => { setMsg(null); const r = await fn(); if ("error" in r) setMsg({ ok: false, text: r.error }); else { if (ok) setMsg({ ok: true, text: ok }); router.refresh(); } });
  const make = (what: What, extraIn?: string, more?: { label?: string; params?: Record<string, Json>; count?: number; start?: string | null }) =>
    act(() => makeElement({ projectId, entryId: entry.id, what, extra: extraIn ?? extra, start: more?.start, count: more?.count, label: more?.label, params: more?.params }), "Making it. It appears here when it's done.");

  const of = (...roles: string[]) => results.filter((r) => roles.includes(r.role));
  const waiting = (...roles: string[]) => pending.filter((p) => roles.includes(p.role)).length;
  const price = (n: number | null) => (n != null ? <span className="mono ml-1.5 text-[11px] font-normal opacity-75">{n.toLocaleString()}</span> : null);

  const Img = ({ r, actions }: { r: Result; actions: React.ReactNode }) => (
    <div className={`group relative overflow-hidden rounded-[8px] border ${entry.reference === r.assetId ? "border-chosen shadow-[0_0_0_1px_var(--color-chosen)]" : "border-card-edge"} bg-card ${kind === "character" && tab === "look" ? "aspect-[4/5]" : "aspect-video"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/assets/${r.assetId}`} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {r.label && <span className="absolute left-2 top-1.5 text-[11px] [text-shadow:0_1px_2px_#000]">{r.label}</span>}
      {entry.reference === r.assetId && <span className="absolute right-2 top-1.5 text-[11px] text-chosen [text-shadow:0_1px_2px_#000]">chosen</span>}
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-black/85 to-transparent p-2 pt-6 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">{actions}</div>
    </div>
  );
  const Pending = ({ n, label }: { n: number; label: string }) => (
    <>{Array.from({ length: n }).map((_, i) => <div key={i} className={`grid place-items-center rounded-[8px] border border-dashed border-gold bg-gold-wash text-[11px] text-gold ${kind === "character" && tab === "look" ? "aspect-[4/5]" : "aspect-video"}`}>{label}…</div>)}</>
  );
  const chip = "rounded-[5px] border border-card-edge bg-[rgba(20,21,25,.92)] px-2 py-1 text-[11px] hover:border-ink";
  const chipGold = "rounded-[5px] bg-gold px-2 py-1 text-[11px] font-medium text-[#1a1408]";

  const lookResults = of("look", "test", "upload", "face");
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-[20px]">{entry.name}</h1>
        <span className="text-[12px] text-mute">{scenes.length ? `in scene${scenes.length > 1 ? "s" : ""} ${scenes.join(", ")}` : "not in any scene yet"}</span>
        <nav className="ml-auto flex flex-wrap gap-1.5 text-[12px]">
          {tabs.map((t, i) => {
            const done = t.key === "look" ? !!entry.reference : t.key === "voice" ? !!entry.voice : t.key === "room" ? !!entry.room : t.key === "turnaround" ? of("turnaround").length >= 3 : of(t.key).length > 0;
            return <Link key={t.key} href={`${base}/${entry.id}?tab=${t.key}`} className={`rounded-full border px-3 py-1 ${tab === t.key ? "border-gold text-ink" : done ? "border-card-edge text-ok" : "border-card-edge text-mute hover:text-dim"}`}>{i + 1} · {t.label}{done ? " ✓" : ""}</Link>;
          })}
        </nav>
      </div>

      {tab === "look" && (
        <>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <label className="label">{kind === "character" ? "What they look like" : "What it looks like"} <span className="text-mute">(from the script; goes into every shot)</span>
              <textarea rows={2} value={look} onChange={(e) => setLook(e.target.value)} className={`input mt-0.5 w-full text-[12.5px] ${look ? "" : "border-gold"}`}
                        placeholder={kind === "character" ? "woman, early 20s, curly auburn hair tied back, freckles, mint-green diner uniform" : kind === "location" ? "small American diner at night, chrome counter, red booths, rain on the window" : "slice of cherry pie on a chipped white plate"} />
            </label>
            {kind === "character" && (
              <label className="label md:w-64">Who they are<textarea rows={2} value={who} onChange={(e) => setWho(e.target.value)} className="input mt-0.5 w-full text-[12.5px]" placeholder="waitress, leaving town" /></label>
            )}
          </div>
          {(look !== entry.appearance || who !== entry.description) && (
            <div><button type="button" className="btn" disabled={busy} onClick={() => act(() => saveAppearance(projectId, entry.id, look, kind === "character" ? who : undefined), "Saved.")}>Save description</button></div>
          )}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            <Pending n={waiting("look")} label="Making" />
            {lookResults.map((r) => (
              <Img key={r.id} r={r} actions={<>
                {entry.reference !== r.assetId && <button className={chipGold} onClick={() => act(() => chooseLook(projectId, entry.id, r.assetId), `${choose.replace("Set as", "Set as the")}.`)}>{choose}</button>}
                <button className={chip} onClick={() => { setStartImg(r.assetId); setMsg({ ok: true, text: "It's in the image slot below. Say what to change, then Generate." }); }}>Start from this</button>
                <button className={chip} onClick={() => act(() => hideResult(projectId, r.id))}>Hide</button>
              </>} />
            ))}
          </div>
          {!lookResults.length && !waiting("look") && <p className="text-[12px] text-dim">Nothing yet. Check the description above, then Generate. Three to choose from is a good start.</p>}
        </>
      )}

      {tab === "turnaround" && (
        !entry.reference ? <p className="text-[12px] text-gold">Choose {first}&apos;s look first (tab 1).</p> : (
          <>
            <p className="text-[12px] text-dim">Front, side and back from the chosen look, so {first} stays the same from every angle.</p>
            <div className="grid grid-cols-3 gap-2.5 md:max-w-2xl">
              {["front", "side", "back"].map((v) => {
                const r = of("turnaround").find((x) => x.label === v);
                const w = pending.some((p) => p.role === "turnaround");
                return r ? <div key={v} className="aspect-[3/4]"><Img r={r} actions={<><button className={chip} onClick={() => make("turnaround", "", { label: v })}>Again</button><button className={chip} onClick={() => act(() => hideResult(projectId, r.id))}>Hide</button></>} /></div>
                  : <button key={v} disabled={busy} onClick={() => make("turnaround", "", { label: v })} className={`grid aspect-[3/4] place-items-center rounded-[8px] border border-dashed text-[12px] ${w ? "border-gold bg-gold-wash text-gold" : "border-card-edge text-dim hover:text-ink"}`}>{w ? "Making…" : `Make ${v}`}{!w && price(prices.edit)}</button>;
              })}
            </div>
          </>
        )
      )}

      {tab === "voice" && (
        <>
          <p className="text-[12px] text-dim">Pick {first}&apos;s voice. Every line {first} says in the film is turned into this voice, so it sounds like the same person in every shot.</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="label">Voice<select value={voice} onChange={(e) => setVoice(e.target.value)} className="input mt-0.5 block text-[12.5px]">{VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
            <label className="label min-w-60 flex-1">What they say in the sample<input value={extra} onChange={(e) => setExtra(e.target.value)} className="input mt-0.5 w-full text-[12.5px]" placeholder={`Hi, I'm ${first}. This is how I sound.`} /></label>
            <button className="btn-primary" disabled={busy} onClick={() => make("voice", extra, { params: { voice } })}>Hear it{price(prices.voice)}</button>
          </div>
          <div className="flex flex-col gap-2 md:max-w-xl">
            {waiting("voice") > 0 && <div className="rounded-[8px] border border-dashed border-gold bg-gold-wash p-2 text-[12px] text-gold">Making a sample…</div>}
            {of("voice").map((r) => (
              <div key={r.id} className={`flex flex-wrap items-center gap-2 rounded-[8px] border p-2 ${entry.voice === r.assetId ? "border-chosen" : "border-card-edge"}`}>
                <span className="w-40 truncate text-[12px]">{VOICES.find((v) => v.id === r.label)?.label ?? r.label}</span>
                <audio controls preload="none" src={`/api/assets/${r.assetId}`} className="h-8 min-w-0 flex-1" />
                {entry.voice === r.assetId ? <span className="text-[11px] text-chosen">{first}&apos;s voice</span>
                  : <button className={chipGold} onClick={() => act(() => chooseSound(projectId, entry.id, "voice", r.assetId), `That's ${first}'s voice now.`)}>Use this voice</button>}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-mute">Stock voices only. A real person&apos;s voice, including yours, needs a signed release first; ask your instructor.</p>
        </>
      )}

      {tab === "angle" && (
        !entry.reference ? <p className="text-[12px] text-gold">Choose the master wide first (tab 1).</p> : (
          <>
            <p className="text-[12px] text-dim">Every angle is made from the master wide, so it stays the same place. Angles within about 90° hold the layout best; a full reverse has to invent the wall it has never seen.</p>
            <div className="flex flex-wrap gap-1.5">
              {ANGLES.map((a) => <button key={a.label} disabled={busy} className="btn py-1 text-[12px]" onClick={() => make("angle", extra, { label: a.label, params: a.params })}>{a.label}{price(prices.angle)}</button>)}
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              <div className="relative aspect-video overflow-hidden rounded-[8px] border border-chosen">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/assets/${entry.reference}`} alt="" className="h-full w-full object-cover" /><span className="absolute left-2 top-1.5 text-[11px] [text-shadow:0_1px_2px_#000]">Master wide</span></div>
              <Pending n={waiting("angle")} label="Making" />
              {of("angle").map((r) => <Img key={r.id} r={r} actions={<button className={chip} onClick={() => act(() => hideResult(projectId, r.id))}>Hide</button>} />)}
            </div>
          </>
        )
      )}

      {tab === "time" && (
        !entry.reference ? <p className="text-[12px] text-gold">Choose the master wide first (tab 1).</p> : (
          <>
            <p className="text-[12px] text-dim">The same place from the same spot, in different light. Make the ones the script needs.</p>
            <div className="flex flex-wrap gap-1.5">{TIMES.map((t) => <button key={t} disabled={busy} className="btn py-1 text-[12px]" onClick={() => make("time", extra, { label: t })}>{t}{price(prices.edit)}</button>)}</div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              <Pending n={waiting("time")} label="Making" />
              {of("time").map((r) => <Img key={r.id} r={r} actions={<button className={chip} onClick={() => act(() => hideResult(projectId, r.id))}>Hide</button>} />)}
            </div>
          </>
        )
      )}

      {tab === "room" && (
        <>
          <p className="text-[12px] text-dim">What {entry.name} sounds like with nobody talking: the hum, the weather, the traffic. It plays under every shot here, so the sound doesn&apos;t jump between cuts.</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="label min-w-72 flex-1">Describe the sound<input value={extra} onChange={(e) => setExtra(e.target.value)} className="input mt-0.5 w-full text-[12.5px]" placeholder="rain on the window, fridge hum, distant traffic, a clock" /></label>
            <button className="btn-primary" disabled={busy} onClick={() => make("room", extra)}>Make 30 s{price(prices.room)}</button>
          </div>
          <div className="flex flex-col gap-2 md:max-w-xl">
            {waiting("room") > 0 && <div className="rounded-[8px] border border-dashed border-gold bg-gold-wash p-2 text-[12px] text-gold">Making room tone…</div>}
            {of("room").map((r) => (
              <div key={r.id} className={`flex items-center gap-2 rounded-[8px] border p-2 ${entry.room === r.assetId ? "border-chosen" : "border-card-edge"}`}>
                <audio controls preload="none" src={`/api/assets/${r.assetId}`} className="h-8 min-w-0 flex-1" />
                {entry.room === r.assetId ? <span className="text-[11px] text-chosen">in use</span>
                  : <button className={chipGold} onClick={() => act(() => chooseSound(projectId, entry.id, "room", r.assetId), "Room tone set.")}>Use this</button>}
              </div>
            ))}
          </div>
        </>
      )}

      {msg && <p className={`text-[12px] ${msg.ok ? "text-ok" : "text-drift"}`}>{msg.text}</p>}
      {failed && !pending.length && <p className="text-[12px] text-drift">The last one didn&apos;t work: {failed}</p>}

      {tab === "look" && (
        <div className="glass sticky bottom-3 mt-auto flex flex-col gap-2 rounded-[10px] border-card-edge p-2.5 shadow-[0_14px_34px_rgba(0,0,0,.45)]">
          <div className="flex items-center gap-2">
            {startImg ? (
              <button type="button" title="Remove the start image" onClick={() => setStartImg(null)} className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[6px] border border-gold">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/assets/${startImg}`} alt="" className="h-full w-full object-cover" /><span className="absolute right-0.5 top-0 text-[10px] [text-shadow:0_1px_2px_#000]">×</span>
              </button>
            ) : (
              <button type="button" onClick={() => file.current?.click()} className="grid h-12 w-16 shrink-0 place-items-center rounded-[6px] border border-dashed border-card-edge bg-field text-center text-[10px] leading-tight text-mute hover:text-dim">+ start from<br />an image</button>
            )}
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(ev) => {
              const f = ev.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.set("file", f);
              start(async () => { const r = await uploadStart(projectId, entry.id, fd); if ("error" in r) setMsg({ ok: false, text: r.error }); else { setStartImg(r.assetId); router.refresh(); } });
            }} />
            <input value={extra} onChange={(e) => setExtra(e.target.value)} className="input min-w-0 flex-1 text-[12.5px]"
                   placeholder={startImg ? "What to change: same face, hair shorter, darker coat" : kind === "character" ? "Anything to add: three-quarter view, soft window light" : "Anything to add: from the doorway, rain on the glass"} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <label className="flex items-center gap-1 text-mute">Images<select value={count} onChange={(e) => setCount(Number(e.target.value))} className="input py-0.5 text-[12px]">{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></label>
            <span className="text-[11px] text-mute">{look ? "The description above is added automatically." : "Write the description above first."}</span>
            <button type="button" disabled={busy || !look} onClick={() => make("look", extra, { start: startImg, count })} className="btn-primary ml-auto">
              Generate{price(startImg ? (prices.edit != null ? prices.edit * count : null) : prices.look != null ? Math.round((prices.look / 3) * count) : null)}
            </button>
          </div>
        </div>
      )}
      {entry.likeness && <p className="text-[11px] text-mute">Based on a real person ({entry.likeness}). <Link href={`/p/${projectId}/bible/${entry.id}`} className="underline">Release and consent</Link></p>}
    </div>
  );
}
