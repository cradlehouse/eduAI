"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setScriptSignoff } from "../signoff/actions";

const OPTIONS: { label: string; roles: string[] }[] = [
  { label: "Anyone on the crew can change it", roles: [] },
  { label: "The writer signs off", roles: ["writer"] },
  { label: "The writer and the director sign off", roles: ["writer", "director"] },
];

// Who signs script changes on this production. Starts open; the educator can choose any option, the
// crew can only choose a stricter one.
export function SignoffSetting({ projectId, current, manage }: { projectId: string; current: string[]; manage: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const key = (r: string[]) => [...r].sort().join("+");
  const now = key(current);
  return (
    <section className="card mb-4 p-4 text-sm">
      <div className="font-semibold">Script changes</div>
      <p className="mt-0.5 text-xs text-dim">Who has to sign off before a change goes into the script. Starts open; {manage ? "you can set any of these." : "you can make it stricter; only your educator can loosen it."}</p>
      <div className="mt-2 flex flex-col gap-1">
        {OPTIONS.map((o) => {
          const looser = !current.every((r) => o.roles.includes(r));
          return (
            <label key={o.label} className={`flex items-center gap-2 text-xs ${!manage && looser ? "text-mute" : ""}`}>
              <input type="radio" name="signoff" checked={key(o.roles) === now} disabled={busy || (!manage && looser)}
                     onChange={() => start(async () => { const r = await setScriptSignoff(projectId, o.roles); setMsg("error" in r ? { text: r.error, bad: true } : { text: r.message ?? "Saved." }); router.refresh(); })} />
              {o.label}
            </label>
          );
        })}
      </div>
      {current.length > 0 && <p className="mt-2 text-xs text-dim">If nobody on the crew is the {current.join(" or ")}, your educator signs instead, so nothing gets stuck.</p>}
      {msg && <p className={`mt-1 text-xs ${msg.bad ? "text-drift" : "text-ok"}`}>{msg.text}</p>}
    </section>
  );
}
