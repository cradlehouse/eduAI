"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ShotPlanT } from "@/lib/script/shotplan";
import { addLine, addToScene, cutLines, editBlock, keepShots, newCharacterInScene, proposeShots, removeFromScene, sceneIntoScript, setSceneLocation } from "./actions";

export type Asset = { id: string; name: string; kind: "character" | "location" | "prop"; image: string | null; look: string; inScene: boolean };
export type SceneBlock = { i: number; kind: "action" | "dialogue"; who: string; text: string; raw: string };
type Scene = { id: string; position: number; heading: string; locationId: string | null; inScript: boolean };
type Pop =
  | { type: "lines"; asset: Asset }
  | { type: "location"; asset: Asset }
  | { type: "newChar" }
  | null;

const FRAMING: Record<string, string> = { wide: "Wide", medium: "Medium", close: "Close-up", over_shoulder: "Over the shoulder", two_shot: "Two-shot", insert: "Insert" };
const MOTION: Record<string, string> = { static: "static", dolly_in: "push in", dolly_out: "pull out", dolly_left: "track left", dolly_right: "track right", jib_up: "rise", jib_down: "lower", focus_shift: "focus shift" };
const norm = (s: string) => s.replace(/\(.*?\)/g, "").trim().toUpperCase();

// The Scene step: drag a location into Where and people into Who. Dropping a person shows their lines
// in this scene (from the script); a new person can be added with a line, which goes into the script.
export function SceneBoard({ projectId, scene, assets, blocks, shots }: { projectId: string; scene: Scene; assets: Asset[]; blocks: SceneBlock[]; shots: { id: string; label: string; chosen: boolean }[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [pop, setPop] = useState<Pop>(null);
  const [over, setOver] = useState<string | null>(null);
  const [plan, setPlan] = useState<ShotPlanT | null>(null);
  const [planning, setPlanning] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [newLine, setNewLine] = useState<{ who: string; text: string; kind: "dialogue" | "action" }>({ who: "", text: "", kind: "dialogue" });

  const loc = assets.find((a) => a.id === scene.locationId) ?? null;
  const people = assets.filter((a) => a.kind === "character" && a.inScene);
  const props = assets.filter((a) => a.kind === "prop" && a.inScene);
  // Speakers in the script who aren't in Cast yet still count as being in the scene.
  const speakers = [...new Set(blocks.filter((b) => b.kind === "dialogue").map((b) => b.who))];
  const run = (fn: () => Promise<{ ok: true } | { error: string }>, after?: () => void) =>
    start(async () => { setErr(null); const r = await fn(); if ("error" in r) setErr(r.error); else { after?.(); router.refresh(); } });

  function dropped(a: Asset) {
    if (a.kind === "location") setPop({ type: "location", asset: a });
    else if (a.kind === "character") run(() => addToScene(projectId, scene.id, a.id), () => setPop({ type: "lines", asset: a }));
    else run(() => addToScene(projectId, scene.id, a.id));
  }
  const dropZone = (key: string, accept: Asset["kind"]) => ({
    onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes(`imaje/${accept}`)) { e.preventDefault(); setOver(key); } },
    onDragLeave: () => setOver(null),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData(`imaje/${accept}`); const a = assets.find((x) => x.id === id); if (a) dropped(a); },
  });
  const thumb = (a: Asset, cls: string) => a.image
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={`/api/assets/${a.image}`} alt="" className={`${cls} object-cover`} />
    : <span className={`${cls} grid place-items-center border border-dashed border-card-edge bg-field text-[9px] text-mute`}>no look</span>;

  const group = (kind: Asset["kind"], title: string) => (
    <div className="flex flex-col gap-1">
      <div className="px-1 pt-1 text-[10.5px] text-mute">{title}</div>
      {assets.filter((a) => a.kind === kind).map((a) => (
        <div key={a.id} draggable onDragStart={(e) => { e.dataTransfer.setData(`imaje/${kind}`, a.id); e.dataTransfer.effectAllowed = "copy"; }}
             className={`flex cursor-grab items-center gap-2 rounded-[7px] border p-1 text-[12px] active:cursor-grabbing ${a.inScene ? "border-glass-edge text-dim" : "border-transparent hover:border-card-edge"}`}>
          {thumb(a, "h-7 w-10 shrink-0 rounded-[5px]")}
          <span className="min-w-0 flex-1 truncate">{a.name}</span>
          {a.inScene ? <span className="text-[10px] text-mute">in scene</span>
            : <button type="button" title={`Add ${a.name} to this scene`} onClick={() => dropped(a)} className="rounded px-1 text-[13px] text-gold hover:bg-field">+</button>}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <aside className="glass flex w-full shrink-0 flex-col gap-1 rounded-[10px] p-2 lg:w-[220px]">
        <div className="flex justify-between px-1 text-[10.5px] text-mute"><span>ASSETS</span><span>drag in, or +</span></div>
        {group("character", "Cast")}
        <button type="button" onClick={() => setPop({ type: "newChar" })} className="rounded-[7px] border border-dashed border-card-edge p-1.5 text-left text-[12px] text-gold hover:bg-field">+ new character</button>
        {group("location", "Locations")}
        {group("prop", "Props")}
        <Link href={`/p/${projectId}/cast`} className="mt-1 px-1 text-[11px] text-mute underline hover:text-dim">Build looks on the Cast and Locations pages</Link>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mono text-[16px]">{scene.position}. {scene.heading}</h1>
          {!scene.inScript && <span className="text-[11px] text-drift">not in the script</span>}
          {!scene.inScript && <button type="button" disabled={busy} className="rounded-[5px] bg-gold px-2 py-0.5 text-[11px] font-medium text-[#1a1408]"
            onClick={() => start(async () => { setErr(null); const r = await sceneIntoScript(projectId, scene.id); if ("error" in r) setErr(r.error); else router.refresh(); })}>Put it in the script</button>}
          <span className="ml-auto" />
          {shots.length > 0 && <Link href={`/p/${projectId}/scenes/${scene.id}/shots/${shots[0].id}`} className="btn">Shots ({shots.filter((s) => s.chosen).length}/{shots.length} chosen) →</Link>}
          <button type="button" disabled={planning || busy || !blocks.length} onClick={() => { setPlanning(true); setErr(null); start(async () => { const r = await proposeShots(projectId, scene.id); setPlanning(false); if ("error" in r) setErr(r.error ?? "Planning failed."); else setPlan(r.plan); }); }}
                  className="btn-primary">{planning ? "Planning…" : shots.length ? "Plan more shots" : "Plan the shots →"}</button>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(180px,1.2fr)_2fr_1fr]">
          <div {...dropZone("where", "location")} className={`flex min-h-[64px] items-center gap-2 rounded-[8px] border p-2 text-[12px] ${loc ? "border-gold bg-gold-wash" : "border-dashed border-card-edge"} ${over === "where" ? "ring-2 ring-gold" : ""}`}>
            {loc ? <>{thumb(loc, "h-11 w-16 shrink-0 rounded-[5px]")}<span className="min-w-0 flex-1"><span className="block text-[10.5px] text-mute">Where</span>{loc.name}</span>
              <button type="button" onClick={() => run(() => removeFromScene(projectId, scene.id, loc.id))} className="text-mute hover:text-ink" title="Remove">×</button></>
              : <span className="w-full text-center text-mute">Where? Drop a location here</span>}
          </div>
          <div {...dropZone("who", "character")} className={`flex min-h-[64px] flex-wrap items-center gap-1.5 rounded-[8px] border border-dashed border-card-edge p-2 text-[12px] ${over === "who" ? "ring-2 ring-gold" : ""}`}>
            <span className="w-full text-[10.5px] text-mute">Who</span>
            {people.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5 rounded-full border border-gold bg-gold-wash py-0.5 pl-0.5 pr-2">
                {thumb(p, "h-6 w-6 rounded-full")}<button type="button" onClick={() => setPop({ type: "lines", asset: p })} className="hover:underline" title="Their lines">{p.name}</button>
                <button type="button" onClick={() => run(() => removeFromScene(projectId, scene.id, p.id))} className="text-mute hover:text-ink">×</button>
              </span>
            ))}
            {speakers.filter((s) => !people.some((p) => norm(p.name) === s)).map((s) => <span key={s} className="rounded-full border border-dashed border-card-edge px-2 py-0.5 text-[11px] text-mute" title="Speaks in the script but isn't in Cast yet">{s}?</span>)}
            {!people.length && !speakers.length && <span className="text-mute">Drop people here</span>}
          </div>
          <div {...dropZone("props", "prop")} className={`flex min-h-[64px] flex-wrap items-center gap-1.5 rounded-[8px] border border-dashed border-card-edge p-2 text-[12px] ${over === "props" ? "ring-2 ring-gold" : ""}`}>
            <span className="w-full text-[10.5px] text-mute">Props</span>
            {props.map((p) => <span key={p.id} className="pill py-0 text-[11px]">{p.name} <button type="button" onClick={() => run(() => removeFromScene(projectId, scene.id, p.id))} className="text-mute">×</button></span>)}
            {!props.length && <span className="text-mute">+ drop a prop</span>}
          </div>
        </div>

        <section className="glass rounded-[10px] p-3">
          <div className="text-[11px] text-mute">What happens <span className="text-mute">(the script&apos;s own lines; edits here update the script)</span></div>
          <ol className="mt-1.5 flex flex-col">
            {blocks.map((b) => (
              <li key={b.i} className="grid grid-cols-[84px_1fr] gap-2 border-t border-glass-edge py-1.5 text-[12.5px]">
                <span className={b.kind === "dialogue" ? "text-[11.5px] text-gold" : "text-[11px] text-mute"}>{b.kind === "dialogue" ? b.who : "action"}</span>
                {editing === b.i ? (
                  <span className="flex flex-col gap-1">
                    <textarea autoFocus rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} className="input w-full text-[12.5px]" />
                    <span className="flex gap-1.5">
                      <button type="button" className="btn-primary py-0.5 text-[11px]" disabled={busy} onClick={() => {
                        // A line keeps its cue (and parenthetical); only the words change.
                        const ls = b.raw.split("\n");
                        const head = b.kind === "dialogue" ? [ls[0], ...(ls[1]?.trim().startsWith("(") ? [ls[1]] : [])].join("\n") + "\n" : "";
                        run(() => editBlock(projectId, scene.id, b.raw, head + draft.trim()), () => setEditing(null));
                      }}>Save</button>
                      <button type="button" className="btn py-0.5 text-[11px]" onClick={() => setEditing(null)}>Cancel</button>
                    </span>
                  </span>
                ) : (
                  <button type="button" onClick={() => { setEditing(b.i); setDraft(b.text); }} className="whitespace-pre-wrap text-left hover:text-gold" title="Edit">{b.text}</button>
                )}
              </li>
            ))}
            <li className="grid grid-cols-[84px_1fr] gap-2 border-t border-glass-edge py-1.5 text-[12px]">
              <select value={newLine.kind === "action" ? "__action" : newLine.who} onChange={(e) => setNewLine((l) => (e.target.value === "__action" ? { ...l, kind: "action" } : { ...l, kind: "dialogue", who: e.target.value }))} className="input py-0.5 text-[11px]">
                <option value="">who?</option>
                {[...new Set([...people.map((p) => norm(p.name)), ...speakers])].map((n) => <option key={n} value={n}>{n}</option>)}
                <option value="__action">action</option>
              </select>
              <span className="flex gap-1.5">
                <input value={newLine.text} onChange={(e) => setNewLine((l) => ({ ...l, text: e.target.value }))} placeholder={newLine.kind === "action" ? "She crosses to him." : "+ a line"} className="input min-w-0 flex-1 py-0.5 text-[12px]" />
                <button type="button" disabled={busy || !newLine.text.trim() || (newLine.kind === "dialogue" && !newLine.who)} className="btn py-0.5 text-[11px]"
                        onClick={() => run(() => addLine(projectId, scene.id, { who: newLine.who, text: newLine.text, after: "end", kind: newLine.kind }), () => setNewLine({ who: newLine.who, text: "", kind: newLine.kind }))}>Add</button>
              </span>
            </li>
          </ol>
          {!blocks.length && <p className="mt-2 text-[12px] text-dim">This scene has no lines yet. Add action and dialogue above, or write it on the Script page.</p>}
        </section>

        {plan && (
          <section className="glass rounded-[10px] border-gold p-3">
            <div className="flex items-baseline gap-2"><span className="text-[12px] font-medium text-gold">Suggested shots</span><span className="text-[11px] text-mute">{plan.note}</span></div>
            <ol className="mt-2 flex flex-col gap-1.5">
              {plan.shots.map((s, i) => (
                <li key={i} className="grid grid-cols-[22px_150px_1fr_auto] items-start gap-2 rounded-[8px] border border-glass-edge p-2 text-[12px]">
                  <span className="text-mute">{i + 1}</span>
                  <span><span className="block">{s.label}</span><span className="text-[10.5px] text-mute">{FRAMING[s.framing]} · {MOTION[s.camera_motion]} · {s.seconds}s</span></span>
                  <span className="text-dim">{s.description}{s.lines.length > 0 && <span className="block text-[11px] text-gold">{s.lines.map((li) => blocks[li]).filter(Boolean).map((b) => `${b.who}: "${b.text}"`).join(" · ")}</span>}</span>
                  <button type="button" onClick={() => setPlan((p) => p && ({ ...p, shots: p.shots.filter((_, j) => j !== i) }))} className="text-mute hover:text-ink" title="Drop this shot">×</button>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={busy || !plan.shots.length} className="btn-primary" onClick={() => start(async () => { const r = await keepShots(projectId, scene.id, plan.shots); if ("error" in r) setErr(r.error); else { setPlan(null); if (r.first) router.push(`/p/${projectId}/scenes/${scene.id}/shots/${r.first}`); } })}>Keep these shots →</button>
              <button type="button" className="btn" onClick={() => setPlan(null)}>Discard</button>
            </div>
          </section>
        )}
        {err && <p className="text-[12px] text-drift">{err}</p>}

        {pop?.type === "lines" && <LinesPop projectId={projectId} sceneId={scene.id} person={pop.asset} blocks={blocks} onClose={() => setPop(null)} />}
        {pop?.type === "location" && <LocationPop projectId={projectId} sceneId={scene.id} loc={pop.asset} heading={scene.heading} onClose={() => setPop(null)} />}
        {pop?.type === "newChar" && <NewCharPop projectId={projectId} sceneId={scene.id} blocks={blocks} onClose={() => setPop(null)} />}
      </div>
    </div>
  );
}

const popCls = "absolute right-0 top-12 z-20 w-[360px] max-w-full rounded-[10px] border border-gold bg-[#181a1f] p-3 text-[12px] shadow-[0_18px_40px_rgba(0,0,0,.6)]";
const afterLabel = (b: SceneBlock) => (b.kind === "dialogue" ? `${b.who}: "${b.text.slice(0, 40)}${b.text.length > 40 ? "…" : ""}"` : b.text.slice(0, 50));

function AfterSelect({ blocks, value, onChange }: { blocks: SceneBlock[]; value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input mt-0.5 w-full py-1 text-[12px]">
      <option value="top">At the start of the scene</option>
      {blocks.map((b) => <option key={b.i} value={String(b.i)}>After: {afterLabel(b)}</option>)}
      <option value="end">At the end</option>
    </select>
  );
}
const toAfter = (v: string): number | "end" | "top" => (v === "end" || v === "top" ? v : Number(v));

function LinesPop({ projectId, sceneId, person, blocks, onClose }: { projectId: string; sceneId: string; person: Asset; blocks: SceneBlock[]; onClose: () => void }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const mine = blocks.filter((b) => b.kind === "dialogue" && b.who === norm(person.name));
  const [keep, setKeep] = useState<Record<number, boolean>>({});
  const [line, setLine] = useState(""); const [after, setAfter] = useState("end");
  const [err, setErr] = useState<string | null>(null);
  const first = person.name.split(" ")[0];
  function save() {
    start(async () => {
      const cut = mine.filter((b) => keep[b.i] === false).map((b) => b.raw);
      // Add first (block numbers are from before any cut), then cut.
      if (line.trim()) { const r = await addLine(projectId, sceneId, { who: person.name, text: line, after: toAfter(after), kind: "dialogue" }); if ("error" in r) return setErr(r.error); }
      if (cut.length) { const r = await cutLines(projectId, sceneId, cut); if ("error" in r) return setErr(r.error); }
      onClose(); router.refresh();
    });
  }
  return (
    <div className={popCls}>
      <div className="font-medium">{first}&apos;s lines in this scene</div>
      <div className="mt-0.5 text-[11px] text-mute">From the script. Untick a line to cut it from this scene.</div>
      {mine.map((b) => {
        const prev = blocks[b.i - 1];
        return (
          <label key={b.i} className="mt-1.5 flex items-start gap-2 rounded-[6px] border border-glass-edge p-2">
            <input type="checkbox" checked={keep[b.i] !== false} onChange={(e) => setKeep((k) => ({ ...k, [b.i]: e.target.checked }))} className="mt-0.5 accent-[#F2B441]" />
            <span>{prev && <span className="block text-[10.5px] text-mute">after {afterLabel(prev)}</span>}{b.text}</span>
          </label>
        );
      })}
      {!mine.length && <p className="mt-1.5 text-dim">{first} doesn&apos;t speak in this scene yet.</p>}
      <div className="mt-2 border-t border-glass-edge pt-2">
        <label className="label">Give {first} {mine.length ? "another" : "a"} line<input value={line} onChange={(e) => setLine(e.target.value)} className="input mt-0.5 w-full py-1 text-[12px]" placeholder="optional" /></label>
        {line && <label className="label mt-1 block">Where it goes<AfterSelect blocks={blocks} value={after} onChange={setAfter} /></label>}
      </div>
      {err && <p className="mt-1 text-drift">{err}</p>}
      <div className="mt-2 flex gap-1.5"><button type="button" disabled={busy} onClick={save} className="btn-primary py-1 text-[12px]">Keep these</button><button type="button" onClick={onClose} className="btn py-1 text-[12px]">Close</button></div>
    </div>
  );
}

function LocationPop({ projectId, sceneId, loc, heading, onClose }: { projectId: string; sceneId: string; loc: Asset; heading: string; onClose: () => void }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [rename, setRename] = useState(true);
  return (
    <div className={popCls}>
      <div className="font-medium">Set this scene in {loc.name}?</div>
      <label className="mt-2 flex items-start gap-2"><input type="checkbox" checked={rename} onChange={(e) => setRename(e.target.checked)} className="mt-0.5 accent-[#F2B441]" />
        <span>Change the scene heading in the script to match<span className="block text-[11px] text-mute">now: {heading}</span></span></label>
      <div className="mt-2 flex gap-1.5">
        <button type="button" disabled={busy} className="btn-primary py-1 text-[12px]" onClick={() => start(async () => { await setSceneLocation(projectId, sceneId, loc.id, rename); onClose(); router.refresh(); })}>Set location</button>
        <button type="button" onClick={onClose} className="btn py-1 text-[12px]">Cancel</button>
      </div>
    </div>
  );
}

function NewCharPop({ projectId, sceneId, blocks, onClose }: { projectId: string; sceneId: string; blocks: SceneBlock[]; onClose: () => void }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [f, setF] = useState({ name: "", look: "", who: "", line: "" });
  const [after, setAfter] = useState(blocks.length ? String(blocks.length - 1) : "end");
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <div className={popCls}>
      <div className="font-medium">New character in this scene</div>
      <label className="label mt-2 block">Name<input autoFocus value={f.name} onChange={set("name")} className="input mt-0.5 w-full py-1 text-[12px]" placeholder="BARTENDER" /></label>
      <label className="label mt-1.5 block">What they look like <span className="text-mute">(quick; finish it on the Cast page)</span><textarea rows={2} value={f.look} onChange={set("look")} className="input mt-0.5 w-full py-1 text-[12px]" placeholder="man, 50s, white apron, rolled sleeves, grey stubble" /></label>
      <label className="label mt-1.5 block">Their line<input value={f.line} onChange={set("line")} className="input mt-0.5 w-full py-1 text-[12px]" placeholder="What'll it be?" /></label>
      {f.line && <label className="label mt-1.5 block">Where it goes in the scene<AfterSelect blocks={blocks} value={after} onChange={setAfter} /></label>}
      <p className="mt-2 text-[11px] text-gold">Adds {f.name ? f.name.toUpperCase() : "them"} to Cast{f.line ? " and writes the line into the script" : ""}.</p>
      {err && <p className="mt-1 text-drift">{err}</p>}
      <div className="mt-2 flex gap-1.5">
        <button type="button" disabled={busy || !f.name.trim()} className="btn-primary py-1 text-[12px]" onClick={() => start(async () => { const r = await newCharacterInScene(projectId, sceneId, { ...f, after: toAfter(after) }); if ("error" in r) setErr(r.error); else { onClose(); router.refresh(); } })}>Add to scene</button>
        <button type="button" onClick={onClose} className="btn py-1 text-[12px]">Cancel</button>
      </div>
    </div>
  );
}
