"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { linkBible, unlinkBible } from "@/app/p/[projectId]/scenes/actions";

// The bible rail (docs/DESIGN.md §3): every reusable asset of the project, sectioned, with the ones
// pinned to the current cut in gold. Click the name to open the asset; the pin toggles it on this cut.
export type BibleRow = { id: string; kind: string; name: string; reference_asset_id: string | null; consent_state: string | null; requires_consent: boolean };
const SECTIONS: { kind: string; title: string }[] = [
  { kind: "character", title: "Characters" }, { kind: "location", title: "Environments" }, { kind: "prop", title: "Props" }, { kind: "style", title: "Style" }, { kind: "voice", title: "Voices" },
];

export function BibleRail({ projectId, entries, linksByShot, defaultCutId }: { projectId: string; entries: BibleRow[]; linksByShot: Record<string, string[]>; defaultCutId: string | null }) {
  const cut = useSearchParams().get("cut") ?? defaultCutId;
  const pinned = new Set(cut ? linksByShot[cut] ?? [] : []);
  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col">
      <div className="flex items-baseline justify-between px-1"><span className="text-[12px] font-medium">Bible</span><Link href={`/p/${projectId}/bible`} className="text-[11px] text-mute hover:text-dim">open</Link></div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {SECTIONS.map(({ kind, title }) => {
          const rows = entries.filter((e) => e.kind === kind);
          if (rows.length === 0) return null;
          return (
            <div key={kind}>
              <div className="sect">{title}</div>
              {rows.map((e) => {
                const on = pinned.has(e.id);
                return (
                  <div key={e.id} className={`mb-1 flex items-center gap-2 rounded-[6px] border px-2 py-1.5 transition-colors ${on ? "border-gold bg-gold-wash" : "border-transparent hover:bg-field"}`}>
                    {e.reference_asset_id
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={`/api/assets/${e.reference_asset_id}`} alt="" className="h-[22px] w-[22px] shrink-0 rounded-[5px] object-cover" />
                      : <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[5px] bg-field text-[11px] text-mute">{e.name[0]?.toUpperCase()}</span>}
                    <Link href={`/p/${projectId}/bible/${e.id}`} className="min-w-0 flex-1 truncate text-[12px]" title={e.requires_consent ? `release: ${e.consent_state ?? "none"}` : undefined}>{e.name}</Link>
                    {cut && (
                      <form action={on ? unlinkBible : linkBible}>
                        <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="shot_id" value={cut} /><input type="hidden" name="entry_id" value={e.id} />
                        <button className={`text-[10px] ${on ? "text-gold" : "text-mute hover:text-dim"}`} title={on ? "Unpin from this cut" : "Pin to this cut"}>{on ? "pinned" : "pin"}</button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {entries.length === 0 && <p className="mt-2 px-1 text-[11px] text-mute">Nothing in the bible yet. <Link href={`/p/${projectId}/bible`} className="underline">Add a character or a place.</Link></p>}
      </div>
      <div className="mt-2 px-1 text-[11px] text-mute">Create once. Pin to any cut.</div>
    </div>
  );
}
