"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { newScene } from "./[sceneId]/actions";

export type StripScene = { id: string; position: number; heading: string; state: "done" | "todo" | "" };

// Every scene in script order along the top of the Scenes screen, the open one highlighted, and
// "+ Add a scene" at the end. A scene is added by writing its heading into the script.
export function SceneStrip({ projectId, scenes, current, locations }: { projectId: string; scenes: StripScene[]; current: string | null; locations: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(scenes.length === 0);
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [where, setWhere] = useState<string>(locations[0]?.id ?? "new");
  const [place, setPlace] = useState("");
  const [intExt, setIntExt] = useState<"INT" | "EXT">("INT");
  const [time, setTime] = useState("NIGHT");
  const [after, setAfter] = useState(String(scenes.length));
  const sel = "input py-1 text-[12px]";

  function save() {
    setErr(null);
    start(async () => {
      const r = await newScene(projectId, { after: Number(after), intExt, time, locationId: where === "new" ? null : where, place });
      if ("error" in r) { setErr(r.error); return; }
      setOpen(false); setPlace("");
      router.push(`/p/${projectId}/scenes/${r.sceneId}`); router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <nav className="flex flex-wrap items-center gap-1.5 text-[12px]">
        {scenes.map((s) => (
          <Link key={s.id} href={`/p/${projectId}/scenes/${s.id}`} title={s.heading}
                className={`mono flex max-w-[260px] items-center gap-1.5 rounded-full border px-3 py-1 ${s.id === current ? "border-gold text-ink" : "border-card-edge text-dim hover:text-ink"}`}>
            <span className="truncate">{s.position}. {s.heading}</span>
            {s.state === "done" ? <span className="text-ok">✓</span> : s.state === "todo" ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" /> : null}
          </Link>
        ))}
        {!open && <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-dashed border-card-edge px-3 py-1 text-gold hover:bg-field">+ Add a scene</button>}
      </nav>
      {open && (
        <div className="glass flex flex-wrap items-end gap-2 rounded-[10px] p-2.5 text-[12px]">
          <label className="label">Where
            <select value={where} onChange={(e) => setWhere(e.target.value)} className={`${sel} mt-0.5 block`}>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              <option value="new">A new place…</option>
            </select>
          </label>
          {where === "new" && <label className="label">New place<input autoFocus value={place} onChange={(e) => setPlace(e.target.value)} className={`${sel} mt-0.5 block`} placeholder="Bus station" /></label>}
          <label className="label">Inside or out<select value={intExt} onChange={(e) => setIntExt(e.target.value as "INT" | "EXT")} className={`${sel} mt-0.5 block`}><option value="INT">Inside</option><option value="EXT">Outside</option></select></label>
          <label className="label">When<select value={time} onChange={(e) => setTime(e.target.value)} className={`${sel} mt-0.5 block`}>{["DAY", "NIGHT", "DAWN", "DUSK", "CONTINUOUS"].map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="label">Goes
            <select value={after} onChange={(e) => setAfter(e.target.value)} className={`${sel} mt-0.5 block`}>
              <option value="0">at the start</option>{scenes.map((s) => <option key={s.id} value={s.position}>after scene {s.position}</option>)}
            </select>
          </label>
          <button type="button" className="btn-primary py-1" disabled={busy || (where === "new" && !place.trim())} onClick={save}>{busy ? "Adding…" : "Add scene"}</button>
          {scenes.length > 0 && <button type="button" className="btn py-1" onClick={() => setOpen(false)}>Cancel</button>}
          <p className="w-full text-[10.5px] text-mute">It&apos;s written into the script as a scene heading; undo it from the Script page. Then drop the people in and plan the shots.</p>
          {err && <p className="w-full text-drift">{err}</p>}
        </div>
      )}
    </div>
  );
}
