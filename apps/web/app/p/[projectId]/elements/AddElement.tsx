"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addElement } from "./actions";

type Kind = "character" | "location" | "prop";
const NOUN: Record<Kind, string> = { character: "character", location: "location", prop: "prop" };

// Add a character, location or prop from its own page. It is written into the script where the
// student says it goes; "not in the script yet" is fine too.
export function AddElement({ projectId, kind, scenes }: { projectId: string; kind: Kind; scenes: { position: number; heading: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState(""); const [look, setLook] = useState(""); const [who, setWho] = useState("");
  const [scene, setScene] = useState<string>(""); const [line, setLine] = useState("");
  const [mode, setMode] = useState<"new" | "existing" | "none">(scenes.length ? "new" : "new");
  const [after, setAfter] = useState<string>(String(scenes.length)); const [intExt, setIntExt] = useState<"INT" | "EXT">("INT"); const [time, setTime] = useState("NIGHT");

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="mt-1 rounded-[7px] border border-dashed border-card-edge p-1.5 text-left text-[12px] text-gold hover:bg-field">+ Add a {NOUN[kind]}</button>;

  function save() {
    setErr(null);
    start(async () => {
      const r = await addElement({
        projectId, kind, name, appearance: look, description: who,
        scene: kind === "location" ? (mode === "existing" && scene ? Number(scene) : null) : scene ? Number(scene) : null,
        after: kind === "location" && mode === "new" ? Number(after) : null,
        intExt, time, line,
      });
      if ("error" in r) setErr(r.error); else { setOpen(false); router.push(r.href); router.refresh(); }
    });
  }
  const sel = "input mt-0.5 w-full py-1 text-[12px]";
  return (
    <div className="mt-1 flex flex-col gap-2 rounded-[8px] border border-gold bg-[#181a1f] p-2 text-[12px]">
      <div className="font-medium">New {NOUN[kind]}</div>
      <label className="label">Name<input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={sel} placeholder={kind === "character" ? "BARTENDER" : kind === "location" ? "Bus station" : "Red duffel bag"} /></label>
      {kind === "character" && <label className="label">Who they are<input value={who} onChange={(e) => setWho(e.target.value)} className={sel} placeholder="50s, runs the bar" /></label>}
      <label className="label">What {kind === "character" ? "they look" : "it looks"} like<textarea rows={2} value={look} onChange={(e) => setLook(e.target.value)} className={sel} placeholder={kind === "character" ? "man, 50s, white apron, rolled sleeves, grey stubble" : kind === "location" ? "empty bus station at night, strip lights, plastic seats" : "faded red canvas duffel, black straps"} /></label>

      <div className="border-t border-glass-edge pt-2 text-[11px] text-mute">Where does it go in the script?</div>
      {kind === "location" ? (
        <>
          <label className="flex items-center gap-1.5"><input type="radio" checked={mode === "new"} onChange={() => setMode("new")} />A new scene</label>
          {mode === "new" && (
            <div className="grid grid-cols-3 gap-1.5 pl-5">
              <select value={intExt} onChange={(e) => setIntExt(e.target.value as "INT" | "EXT")} className={sel}><option value="INT">Inside</option><option value="EXT">Outside</option></select>
              <select value={time} onChange={(e) => setTime(e.target.value)} className={sel}>{["DAY", "NIGHT", "DAWN", "DUSK", "CONTINUOUS"].map((t) => <option key={t}>{t}</option>)}</select>
              <select value={after} onChange={(e) => setAfter(e.target.value)} className={sel}>
                <option value="0">at the start</option>{scenes.map((s) => <option key={s.position} value={s.position}>after scene {s.position}</option>)}
              </select>
            </div>
          )}
          {scenes.length > 0 && <label className="flex items-center gap-1.5"><input type="radio" checked={mode === "existing"} onChange={() => setMode("existing")} />An existing scene happens here</label>}
          {mode === "existing" && <select value={scene} onChange={(e) => setScene(e.target.value)} className={`${sel} ml-5 w-auto`}><option value="">pick a scene</option>{scenes.map((s) => <option key={s.position} value={s.position}>{s.position}. {s.heading}</option>)}</select>}
          <label className="flex items-center gap-1.5"><input type="radio" checked={mode === "none"} onChange={() => setMode("none")} />Not in the script yet</label>
        </>
      ) : (
        <>
          <select value={scene} onChange={(e) => setScene(e.target.value)} className={sel}>
            <option value="">Not in the script yet</option>{scenes.map((s) => <option key={s.position} value={s.position}>Scene {s.position}: {s.heading}</option>)}
          </select>
          {kind === "character" && scene && <label className="label">Their line (optional)<input value={line} onChange={(e) => setLine(e.target.value)} className={sel} placeholder="What'll it be?" /></label>}
        </>
      )}
      {err && <p className="text-drift">{err}</p>}
      <div className="flex gap-1.5">
        <button type="button" disabled={busy || !name.trim() || (kind === "location" && mode === "existing" && !scene)} onClick={save} className="btn-primary py-1 text-[12px]">{busy ? "Adding…" : "Add"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn py-1 text-[12px]">Cancel</button>
      </div>
      {(scene || (kind === "location" && mode !== "none")) && <p className="text-[10.5px] text-gold">It&apos;s written into the script too. Undo it from the Script page.</p>}
    </div>
  );
}
