"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BreakdownT } from "@/lib/script/breakdown";
import { applyBreakdown, runBreakdown, saveScript } from "./script/actions";

type Existing = { kind: string; name: string };
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

// The script, and its breakdown. Paste or write the script; "Break it down" asks for the cast, places,
// props and scenes; the student edits what came back (especially how each character looks) and keeps it.
export function ScriptStudio({ projectId, initial, existing, canEdit }: { projectId: string; initial: string; existing: Existing[]; canEdit: boolean }) {
  const router = useRouter();
  const [script, setScript] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [b, setB] = useState<BreakdownT | null>(null);
  const [keep, setKeep] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [phase, setPhase] = useState<"idle" | "reading" | "saving">("idle");
  const have = new Set(existing.map((e) => `${e.kind}:${norm(e.name)}`));
  const k = (kind: string, name: string) => `${kind}:${norm(name)}`;
  const on = (key: string) => keep[key] !== false;

  function save() {
    setMsg(null);
    start(async () => { const r = await saveScript(projectId, script); if ("error" in r) setMsg({ kind: "error", text: r.error }); else { setDirty(false); setMsg({ kind: "ok", text: "Script saved." }); } });
  }
  function breakdown() {
    setMsg(null); setPhase("reading");
    start(async () => {
      const r = await runBreakdown(projectId, script);
      setPhase("idle"); setDirty(false);
      if ("error" in r && r.error) { setMsg({ kind: "error", text: r.error }); return; }
      if ("breakdown" in r) { setB(r.breakdown); setKeep({}); }
    });
  }
  function apply() {
    if (!b) return;
    const kept: BreakdownT = {
      ...b,
      characters: b.characters.filter((c) => on(k("character", c.name))),
      locations: b.locations.filter((l) => on(k("location", l.name))),
      props: b.props.filter((p) => on(k("prop", p.name))),
    };
    setMsg(null); setPhase("saving");
    start(async () => {
      const r = await applyBreakdown(projectId, kept);
      setPhase("idle");
      if ("error" in r) { setMsg({ kind: "error", text: r.error }); return; }
      setMsg({ kind: "ok", text: `${r.summary} Next: give every character a look and every place a master wide.` });
      setB(null); router.refresh();
    });
  }
  const edit = <T extends "characters" | "locations" | "props">(list: T, i: number, field: string, v: string) =>
    setB((cur) => cur && ({ ...cur, [list]: cur[list].map((row, j) => (j === i ? { ...row, [field]: v } : row)) }));

  const tick = (key: string, label: string) => (
    <label className="flex items-center gap-1.5 text-[12px]">
      <input type="checkbox" checked={on(key)} onChange={(e) => setKeep((m) => ({ ...m, [key]: e.target.checked }))} />
      <span className="font-medium">{label}</span>
      {have.has(key) && <span className="text-[10px] text-mute">already in the bible · blanks get filled</span>}
    </label>
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="glass flex flex-col rounded-[10px] p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] font-medium">Script</span>
          <span className="text-[11px] text-mute">sluglines like INT. WAREHOUSE – NIGHT help the breakdown</span>
        </div>
        <textarea value={script} onChange={(e) => { setScript(e.target.value); setDirty(true); }} readOnly={!canEdit} spellCheck
                  placeholder={"INT. WAREHOUSE – NIGHT\n\nRain on the roof. MAYA (30s) steps through the loading door…\n\nMAYA\nIs anyone in here?"}
                  className="input mono mt-2 min-h-[60vh] flex-1 resize-y text-[12px] leading-relaxed" />
        {canEdit && (
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={save} disabled={pending || !dirty} className="btn disabled:opacity-40">Save</button>
            <button type="button" onClick={breakdown} disabled={pending || script.trim().length < 40} className="btn-primary disabled:opacity-40">
              {phase === "reading" ? "Reading the script…" : "Break it down"}
            </button>
            <span className="text-[11px] text-mute">Finds the characters, places, props and scenes. You check it before anything is kept.</span>
          </div>
        )}
        {msg && <p className={`mt-2 text-[12px] ${msg.kind === "ok" ? "text-ok" : "text-drift"}`}>{msg.text}</p>}
      </div>

      <div className="flex flex-col gap-3">
        {!b && (
          <div className="glass rounded-[10px] p-4 text-[12px] text-dim">
            <div className="text-[12px] font-medium text-ink">How this works</div>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>Write or paste the script on the left.</li>
              <li><b className="text-ink">Break it down.</b> You get the cast, the places, the props and the scenes it found.</li>
              <li>Describe how each character looks and what each place looks like. That description is used in every shot they appear in.</li>
              <li>Keep it. Then build each character and place once (Cast, Places), and shoot scene by scene.</li>
            </ol>
          </div>
        )}
        {b && (
          <>
            {b.questions.length > 0 && (
              <div className="glass rounded-[10px] border-gold p-3">
                <div className="text-[12px] font-medium text-gold">The script leaves these to you</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px]">{b.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
              </div>
            )}
            <section className="glass rounded-[10px] p-3">
              <div className="text-[12px] font-medium">Cast <span className="font-normal text-mute">· {b.characters.length}</span></div>
              <div className="mt-2 flex flex-col gap-3">
                {b.characters.map((c, i) => (
                  <div key={i} className="rounded-[8px] border border-glass-edge p-2">
                    <div className="flex items-center justify-between">{tick(k("character", c.name), c.name)}<span className="text-[10px] text-mute">{c.importance} · scenes {c.scenes.join(", ")}</span></div>
                    <label className="label mt-1 block">Who they are<textarea rows={2} value={c.who} onChange={(e) => edit("characters", i, "who", e.target.value)} className="input mt-0.5 w-full" /></label>
                    <label className="label mt-1 block">What they look like <span className="text-mute">(used in every shot)</span>
                      <textarea rows={2} value={c.appearance} onChange={(e) => edit("characters", i, "appearance", e.target.value)} className={`input mt-0.5 w-full ${c.appearance ? "" : "border-gold"}`}
                                placeholder="woman, 30s, long straight dark hair, round glasses, grey wool coat, tired eyes" /></label>
                  </div>
                ))}
              </div>
            </section>
            <section className="glass rounded-[10px] p-3">
              <div className="text-[12px] font-medium">Places <span className="font-normal text-mute">· {b.locations.length}</span></div>
              <div className="mt-2 flex flex-col gap-3">
                {b.locations.map((l, i) => (
                  <div key={i} className="rounded-[8px] border border-glass-edge p-2">
                    <div className="flex items-center justify-between">{tick(k("location", l.name), `${l.int_ext}. ${l.name}`)}<span className="text-[10px] text-mute">{l.times.join(", ")} · scenes {l.scenes.join(", ")}</span></div>
                    <label className="label mt-1 block">What it looks like
                      <textarea rows={2} value={l.appearance} onChange={(e) => edit("locations", i, "appearance", e.target.value)} className={`input mt-0.5 w-full ${l.appearance ? "" : "border-gold"}`}
                                placeholder="empty brick warehouse, one high window, concrete floor, dusk light" /></label>
                  </div>
                ))}
              </div>
            </section>
            {b.props.length > 0 && (
              <section className="glass rounded-[10px] p-3">
                <div className="text-[12px] font-medium">Props <span className="font-normal text-mute">· {b.props.length}</span></div>
                <div className="mt-2 flex flex-col gap-2">
                  {b.props.map((p, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">{tick(k("prop", p.name), p.name)}<span className="text-[10px] text-mute">scenes {p.scenes.join(", ")}</span></div>
                      <input value={p.appearance} onChange={(e) => edit("props", i, "appearance", e.target.value)} className="input w-full" placeholder="what it looks like" />
                    </div>
                  ))}
                </div>
              </section>
            )}
            <section className="glass rounded-[10px] p-3">
              <div className="text-[12px] font-medium">Scenes <span className="font-normal text-mute">· {b.scenes.length}</span></div>
              <ol className="mt-2 flex flex-col gap-2 text-[12px]">
                {b.scenes.map((s) => (
                  <li key={s.number} className="border-t border-glass-edge pt-2">
                    <div className="mono text-[11px] text-dim">{s.number}. {s.heading}</div>
                    <div>{s.synopsis}</div>
                    <div className="mt-0.5 text-[11px] text-mute">{[...s.characters, ...s.props].join(" · ") || "no cast"}</div>
                  </li>
                ))}
              </ol>
            </section>
            <div className="sticky bottom-3 flex items-center gap-2 rounded-[10px] bg-bg-deep/90 p-2">
              <button type="button" onClick={apply} disabled={pending} className="btn-primary disabled:opacity-40">{phase === "saving" ? "Keeping…" : "Keep this breakdown"}</button>
              <button type="button" onClick={() => setB(null)} disabled={pending} className="btn">Discard</button>
              <span className="text-[11px] text-mute">Unticked items are skipped. Existing entries are never overwritten.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
