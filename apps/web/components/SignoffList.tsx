"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changedHunks, diffLines } from "@/lib/script/diff";
import { decideSignoff, withdrawSignoff } from "@/app/p/[projectId]/signoff/actions";
import type { SignoffItem } from "@/lib/signoff/load";

const STATUS: Record<string, string> = { approved: "signed off", applied: "signed off and added", returned: "sent back", withdrawn: "withdrawn", failed: "couldn't be added" };
const when = (at: string) => new Date(at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// The sign-off queue: what's waiting, who has to sign, what would change (before → after), and the
// buttons for whoever's turn it is. On Home it lists every production; on a production, just that one.
export function SignoffList({ items, title, showProject = false }: { items: SignoffItem[]; title: string; showProject?: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ id: string; text: string; bad?: boolean } | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  if (!items.length) return null;
  const act = (id: string, fn: () => Promise<{ ok: true; message?: string } | { error: string }>) =>
    start(async () => { const r = await fn(); if ("error" in r) setMsg({ id, text: r.error, bad: true }); else { setMsg({ id, text: r.message ?? "Done." }); setBack(null); setNote(""); router.refresh(); } });

  return (
    <section className="rounded-[10px] border border-gold/50 bg-gold-wash p-3 text-[12px]">
      <div className="font-medium text-gold">{title}</div>
      <ul className="mt-1.5 flex flex-col gap-2">
        {items.map((it) => {
          const waiting = it.roles.filter((r) => !it.signed.includes(r));
          const diff = it.kind === "script" && open === it.id ? changedHunks(diffLines(it.before, it.after)) : null;
          return (
            <li key={it.id} className="flex flex-col gap-1 border-t border-gold/20 pt-1.5">
              <div className="flex flex-wrap items-baseline gap-2">
                {showProject && <Link href={`/p/${it.projectId}`} className="text-mute underline">{it.projectTitle}</Link>}
                <span className="min-w-0 flex-1 text-ink">{it.title}</span>
                <span className="text-[11px] text-mute">{it.by ? `${it.mine ? "you" : it.by} · ` : ""}{when(it.at)}</span>
              </div>
              <div className="text-[11px] text-dim">
                {it.status === "pending"
                  ? <>Waiting for {waiting.map((r) => `the ${r}`).join(" and ")}{it.signed.length ? ` · signed by the ${it.signed.join(" and the ")}` : ""}</>
                  : <>{STATUS[it.status] ?? it.status}{it.note ? `: “${it.note}”` : ""}</>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {it.kind === "script" && <button type="button" onClick={() => setOpen(open === it.id ? null : it.id)} className="text-[11px] text-dim underline hover:text-ink">{open === it.id ? "Hide the change" : "See the change"}</button>}
                {it.status === "pending" && it.mineToSign.length > 0 && back !== it.id && <>
                  <button type="button" disabled={busy} className="btn-primary py-0.5 text-[11px]" onClick={() => act(it.id, () => decideSignoff(it.projectId, it.id, true, ""))}>Sign off{it.mineToSign.length ? ` as ${it.mineToSign.join(" and ")}` : ""}</button>
                  <button type="button" disabled={busy} className="btn py-0.5 text-[11px]" onClick={() => setBack(it.id)}>Send back…</button>
                </>}
                {it.status === "pending" && it.mine && <button type="button" disabled={busy} className="text-[11px] text-mute underline" onClick={() => act(it.id, () => withdrawSignoff(it.projectId, it.id))}>Withdraw</button>}
              </div>
              {back === it.id && (
                <div className="flex flex-wrap items-end gap-1.5">
                  <label className="label min-w-60 flex-1">What should they change?
                    <input autoFocus value={note} onChange={(e) => setNote(e.target.value)} className="input mt-0.5 w-full text-[12.5px]" placeholder="Keep Bert's apron clean; it's his first day." />
                  </label>
                  <button type="button" disabled={busy || note.trim().length < 3} className="btn-primary py-1 text-[11px]" onClick={() => act(it.id, () => decideSignoff(it.projectId, it.id, false, note))}>Send back</button>
                  <button type="button" className="btn py-1 text-[11px]" onClick={() => setBack(null)}>Cancel</button>
                </div>
              )}
              {diff && (
                <pre className="mono max-h-60 overflow-auto whitespace-pre-wrap rounded-[7px] border border-glass-edge bg-field p-2 text-[11.5px] leading-[1.45]">
                  {diff.shown.map((l, k) => l.kind === "gap" ? <div key={k} className="text-mute">⋯</div>
                    : <div key={k} className={l.kind === "added" ? "bg-ok/10 text-ok" : l.kind === "removed" ? "bg-drift/10 text-drift line-through" : "text-dim"}>{l.kind === "added" ? "+ " : l.kind === "removed" ? "− " : "  "}{l.text || " "}</div>)}
                </pre>
              )}
              {msg?.id === it.id && <p className={msg.bad ? "text-drift" : "text-ok"}>{msg.text}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
