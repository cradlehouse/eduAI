"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { undoScriptChange } from "./script/actions";

export type Change = { id: string; source: string; label: string; scene: number | null; at: string; by: string };
const WHERE: Record<string, string> = { scene: "a scene", cast: "Cast", locations: "Locations", props: "Props", script: "the script" };

// What other pages wrote into the script, newest first. Undo takes the text back out.
export function ScriptChanges({ projectId, changes }: { projectId: string; changes: Change[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  if (!changes.length) return null;
  return (
    <section className="glass rounded-[10px] p-3">
      <div className="text-[12px] font-medium">Added to the script from other pages</div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {changes.map((c) => (
          <li key={c.id} className="flex flex-wrap items-baseline gap-2 border-l-2 border-gold bg-gold-wash px-2 py-1 text-[12px]">
            <span className="min-w-0 flex-1">{c.label}</span>
            <span className="text-[11px] text-gold">added in {c.scene ? `Scene ${c.scene}` : WHERE[c.source] ?? c.source}{c.by ? ` · ${c.by}` : ""} · {new Date(c.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
            <button type="button" disabled={pending} className="text-[11px] text-dim underline hover:text-ink disabled:opacity-40"
                    onClick={() => start(async () => { setErr(null); const r = await undoScriptChange(projectId, c.id); if ("error" in r) setErr(r.error); else router.refresh(); })}>undo</button>
          </li>
        ))}
      </ul>
      {err && <p className="mt-2 text-[12px] text-drift">{err}</p>}
    </section>
  );
}
