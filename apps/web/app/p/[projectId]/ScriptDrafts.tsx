"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changedHunks, diffLines } from "@/lib/script/diff";
import { getDraft, restoreDraft, saveDraft } from "./script/actions";

export type Draft = { id: string; number: number; reason: string; auto: boolean; by: string; at: string };

const when = (at: string) => new Date(at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// Numbered drafts of the script, like a production's revisions. The live script is the working draft;
// "Save as a draft" keeps a copy. Any draft can be compared with now, or gone back to (the current
// script is saved as a draft first, so nothing is lost).
export function ScriptDrafts({ projectId, drafts, current, canEdit }: { projectId: string; drafts: Draft[]; current: string; canEdit: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [naming, setNaming] = useState(false);
  const [open, setOpen] = useState<{ id: string; text: string; number: number } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const working = (drafts[0]?.number ?? 0) + 1;

  const compare = (d: Draft) => start(async () => {
    setErr(null);
    if (open?.id === d.id) { setOpen(null); return; }
    const r = await getDraft(projectId, d.id);
    if ("error" in r) setErr(r.error); else setOpen({ id: d.id, text: r.script, number: r.number });
  });
  const diff = open ? changedHunks(diffLines(open.text, current)) : null;

  return (
    <section className="glass rounded-[10px] p-3 text-[12px]">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-medium">Drafts</span>
        <span className="text-mute">You&apos;re working on Draft {working}.</span>
        {canEdit && !naming && <button type="button" onClick={() => setNaming(true)} className="ml-auto btn py-0.5 text-[11.5px]">Save as Draft {working}</button>}
      </div>
      {naming && (
        <div className="mt-2 flex flex-wrap items-end gap-1.5">
          <label className="label min-w-60 flex-1">What changed in this draft? (optional)
            <input autoFocus value={note} onChange={(e) => setNote(e.target.value)} className="input mt-0.5 w-full text-[12.5px]" placeholder="Bob's scene moved outside" />
          </label>
          <button type="button" disabled={busy} className="btn-primary py-1 text-[11.5px]"
                  onClick={() => start(async () => { setErr(null); const r = await saveDraft(projectId, note); if ("error" in r) setErr(r.error); else { setNaming(false); setNote(""); router.refresh(); } })}>Save draft</button>
          <button type="button" className="btn py-1 text-[11.5px]" onClick={() => setNaming(false)}>Cancel</button>
        </div>
      )}
      {drafts.length === 0 ? (
        <p className="mt-1.5 text-mute">No saved drafts yet. Drafts are also saved by themselves before a breakdown is kept and before going back to an older draft.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {drafts.map((d) => (
            <li key={d.id} className="flex flex-col gap-1 border-t border-glass-edge pt-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-ink">Draft {d.number}</span>
                <span className="min-w-0 flex-1 truncate text-dim">{d.reason}{d.auto ? " (saved by itself)" : ""}</span>
                <span className="text-[11px] text-mute">{d.by ? `${d.by} · ` : ""}{when(d.at)}</span>
                <button type="button" disabled={busy} onClick={() => compare(d)} className="text-[11px] text-dim underline hover:text-ink">{open?.id === d.id ? "Hide" : "Compare with now"}</button>
                {canEdit && <button type="button" disabled={busy} onClick={() => setConfirm(d.id)} className="text-[11px] text-dim underline hover:text-ink">Go back to this draft</button>}
              </div>
              {confirm === d.id && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-[7px] bg-gold-wash px-2 py-1">
                  <span className="text-ink">Go back to Draft {d.number}? The script as it is now is saved as a draft first, so nothing is lost.</span>
                  <button type="button" disabled={busy} className="btn-primary py-0.5 text-[11px]"
                          onClick={() => start(async () => { setErr(null); const r = await restoreDraft(projectId, d.id); if ("error" in r) setErr(r.error); else { setConfirm(null); setOpen(null); router.refresh(); } })}>Go back</button>
                  <button type="button" className="btn py-0.5 text-[11px]" onClick={() => setConfirm(null)}>Cancel</button>
                </div>
              )}
              {open?.id === d.id && diff && (
                <div className="rounded-[7px] border border-glass-edge bg-field p-2">
                  <div className="mb-1 text-[11px] text-mute">Draft {open.number} → now: {diff.added} line{diff.added === 1 ? "" : "s"} added, {diff.removed} removed{diff.added + diff.removed === 0 ? " (no changes)" : ""}</div>
                  <pre className="mono max-h-72 overflow-auto whitespace-pre-wrap text-[11.5px] leading-[1.45]">
                    {diff.shown.map((l, k) => l.kind === "gap" ? <div key={k} className="text-mute">⋯</div>
                      : <div key={k} className={l.kind === "added" ? "bg-ok/10 text-ok" : l.kind === "removed" ? "bg-drift/10 text-drift line-through" : "text-dim"}>{l.kind === "added" ? "+ " : l.kind === "removed" ? "− " : "  "}{l.text || " "}</div>)}
                  </pre>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {err && <p className="mt-2 text-drift">{err}</p>}
    </section>
  );
}
