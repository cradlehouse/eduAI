import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { priceOf } from "@/lib/elements/routes";
import { JobWatcher } from "@/app/p/[projectId]/scenes/JobWatcher";
import { AddElement } from "./AddElement";
import { Studio, type Result } from "./Studio";

type Kind = "character" | "location" | "prop";
const PATH: Record<Kind, string> = { character: "cast", location: "locations", prop: "props" };
const TITLE: Record<Kind, string> = { character: "Cast", location: "Locations", prop: "Props" };
export const TABS: Record<Kind, { key: string; label: string }[]> = {
  character: [{ key: "look", label: "Look" }, { key: "turnaround", label: "Turnaround" }, { key: "voice", label: "Voice" }],
  location: [{ key: "look", label: "Master wide" }, { key: "angle", label: "Angles" }, { key: "time", label: "Times of day" }, { key: "room", label: "Room tone" }],
  prop: [{ key: "look", label: "Look" }],
};

// Cast, Locations and Props: one element at a time. The list of them on the left, the chosen one's
// steps as tabs, and a prompt bar that only makes pictures (or sounds) of this one element.
export async function ElementPage({ projectId, kind, entryId, tab }: { projectId: string; kind: Kind; entryId?: string; tab?: string }) {
  const supabase = await createClient();
  const [{ data: list }, { data: scenes }, { data: links }] = await Promise.all([
    supabase.from("bible_entries").select("id, name, appearance, reference_asset_id, voice_asset_id, room_tone_asset_id").eq("project_id", projectId).eq("kind", kind).order("created_at"),
    supabase.from("scenes").select("id, position, heading, location_entry_id").eq("project_id", projectId).order("position"),
    supabase.from("scene_bible_entries").select("scene_id, bible_entry_id"),
  ]);
  const entries = list ?? [];
  const base = `/p/${projectId}/${PATH[kind]}`;
  const sceneList = (scenes ?? []).map((s) => ({ position: s.position, heading: s.heading || `Scene ${s.position}` }));
  const scenesOf = (id: string) => (scenes ?? []).filter((s) => s.location_entry_id === id || (links ?? []).some((l) => l.scene_id === s.id && l.bible_entry_id === id)).map((s) => s.position);
  const status = (e: (typeof entries)[number]) =>
    !e.reference_asset_id ? (kind === "location" ? "no wide yet" : "no look yet")
    : kind === "character" && !e.voice_asset_id ? "no voice yet"
    : kind === "location" && !e.room_tone_asset_id ? "no room tone" : "";

  // Straight to the next one that needs work (or the first): one element at a time.
  if (!entryId && entries.length) redirect(`${base}/${(entries.find((x) => status(x)) ?? entries[0]).id}`);
  const e = entryId ? entries.find((x) => x.id === entryId) : undefined;
  if (entryId && !e) notFound();

  const listCol = (
    <aside className="glass flex w-full shrink-0 flex-col gap-1 rounded-[10px] p-2 md:w-[210px]">
      <div className="flex items-center justify-between px-1.5 pb-1 pt-0.5 text-[11px] text-mute"><span>{TITLE[kind]} · {entries.length}</span></div>
      {entries.map((x) => {
        const st = status(x);
        return (
          <Link key={x.id} href={`${base}/${x.id}`} className={`flex items-center gap-2 rounded-[7px] p-1.5 text-[12.5px] ${x.id === entryId ? "bg-field text-ink outline outline-1 outline-card-edge" : "text-dim hover:bg-field"}`}>
            {x.reference_asset_id
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={`/api/assets/${x.reference_asset_id}`} alt="" className="h-8 w-8 shrink-0 rounded-[6px] object-cover" />
              : <span className="h-8 w-8 shrink-0 rounded-[6px] border border-dashed border-card-edge bg-field" />}
            <span className="min-w-0 flex-1 truncate">{x.name}</span>
            {st ? <span className="shrink-0 text-[10px] text-gold">{st}</span> : <span className="shrink-0 text-[10px] text-ok">✓</span>}
          </Link>
        );
      })}
      <AddElement projectId={projectId} kind={kind} scenes={sceneList} />
    </aside>
  );

  if (!e) {
    return (
      <div className="flex flex-col gap-3 md:flex-row">
        {listCol}
        <div className="flex-1 p-2 text-[12px] text-dim">
          <h1 className="text-[20px] text-ink">{TITLE[kind]}</h1>
          <p className="mt-1 max-w-[62ch]">
            {kind === "character" && "Everyone in the film. Build each person once: how they look, how they look from every side, and how they sound. That goes into every shot they're in."}
            {kind === "location" && "Every location, inside or out. Build each once: a master wide, the angles your scenes need (made from the wide, so it stays the same place), times of day, and its room tone."}
            {kind === "prop" && "Objects the story depends on. Describe each once so it looks the same in every shot. Optional: most films have one or two."}
          </p>
          <p className="mt-3">{entries.length ? "Pick one on the left." : <>None yet. <Link href={`/p/${projectId}`} className="underline">Break down the script</Link> to find them, or add one on the left.</>}</p>
        </div>
      </div>
    );
  }

  const [{ data: rows }, { data: jobs }, { data: detail }] = await Promise.all([
    supabase.from("bible_entry_assets").select("id, asset_id, role, label, params, created_at, job_id, assets(mime, kind)").eq("bible_entry_id", e.id).eq("lifecycle", "live").order("created_at", { ascending: false }),
    supabase.from("job_tokens").select("job_id, entry_role, status, error, created_at").eq("bible_entry_id", e.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("bible_entries").select("description, likeness_of, requires_consent").eq("id", e.id).maybeSingle(),
  ]);
  const tabs = TABS[kind];
  const current = tabs.find((t) => t.key === tab)?.key ?? "look";
  const results: Result[] = (rows ?? []).map((r) => ({ id: r.id, assetId: r.asset_id, role: r.role, label: r.label, at: r.created_at, jobId: r.job_id, audio: (r.assets as { kind?: string } | null)?.kind === "audio" }));
  const open = (jobs ?? []).filter((j) => ["queued", "claimed", "submitted", "running"].includes(j.status ?? ""));
  // Only the newest job's failure is news; older ones were followed by something that worked.
  const failed = (jobs ?? []).slice(0, 1).filter((j) => ["failed", "rejected", "timed_out"].includes(j.status ?? ""));
  const n = 3;
  const prices = {
    look: await priceOf(projectId, "image", { prompt: "x", num_images: n }),
    edit: await priceOf(projectId, "edit", { prompt: "x", references: ["x"], num_images: 1 }),
    angle: kind === "location" ? await priceOf(projectId, "angle", { num_images: 1 }) : null,
    voice: kind === "character" ? await priceOf(projectId, "voice", { text: "Hi, I'm here. This is how I sound." }) : null,
    room: kind === "location" ? await priceOf(projectId, "room", { prompt: "x" }) : null,
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <JobWatcher active={open.length > 0} />
      {listCol}
      <Studio projectId={projectId} kind={kind} base={base} tab={current} tabs={tabs}
              entry={{ id: e.id, name: e.name, appearance: e.appearance, description: detail?.description ?? "", reference: e.reference_asset_id, voice: e.voice_asset_id, room: e.room_tone_asset_id, likeness: detail?.likeness_of ?? null }}
              scenes={scenesOf(e.id)} results={results}
              pending={open.map((j) => ({ role: j.entry_role ?? "", status: j.status ?? "" }))}
              failed={failed.map((j) => j.error ?? "It didn't work.")[0] ?? null}
              prices={prices} />
    </div>
  );
}
