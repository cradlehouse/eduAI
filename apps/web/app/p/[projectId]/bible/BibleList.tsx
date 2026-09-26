import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BibleChip } from "@/components/BibleChip";
import { createEntry } from "./actions";

type Kind = "character" | "location" | "prop" | "style" | "voice";
const COPY: Record<Kind, { title: string; blurb: string; name: string; who: string; look: string; lookPh: string }> = {
  character: { title: "Cast", blurb: "Everyone in the film. Build each one once: who they are and exactly how they look. That look goes into every shot they're in.",
               name: "MAYA", who: "Who they are", look: "What they look like", lookPh: "woman, 30s, long straight dark hair, round glasses, grey wool coat" },
  location: { title: "Places", blurb: "Every set. Describe it, then make a master wide: every angle of the place is made from that wide so it stays the same place.",
              name: "WAREHOUSE", who: "What it is", look: "What it looks like", lookPh: "empty brick warehouse, one high window, concrete floor, dusk light" },
  prop: { title: "Props", blurb: "Objects the story depends on. Describe them once so they look the same in every shot.",
          name: "RED DUFFEL BAG", who: "What it's for", look: "What it looks like", lookPh: "faded red canvas duffel, black straps, scuffed corners" },
  style: { title: "Style", blurb: "The film's look.", name: "35mm, sodium light", who: "Notes", look: "Look", lookPh: "35mm film grain, sodium streetlight, deep shadows" },
  voice: { title: "Voices", blurb: "Voices need a signed release before use.", name: "Maya's voice", who: "Notes", look: "Sound", lookPh: "low, calm, slight Texas accent" },
};

// One list per kind of bible entry, with where each is used and an add form that says what goes where.
export async function BibleList({ projectId, kind, ok, error }: { projectId: string; kind: Kind; ok?: string; error?: string }) {
  const c = COPY[kind];
  const supabase = await createClient();
  const [{ data: entries }, { data: scenes }, { data: links }] = await Promise.all([
    supabase.from("bible_entry_status").select("id, name, description, likeness_of, requires_consent, consent_state, reference_asset_id").eq("project_id", projectId).eq("kind", kind).order("name"),
    supabase.from("scenes").select("id, position, heading, title, location_entry_id").eq("project_id", projectId).order("position"),
    supabase.from("scene_bible_entries").select("scene_id, bible_entry_id"),
  ]);
  const ids = (entries ?? []).map((e) => e.id).filter((x): x is string => !!x);
  const { data: looks } = ids.length ? await supabase.from("bible_entries").select("id, appearance").in("id", ids) : { data: [] as { id: string; appearance: string }[] };
  const lookOf = new Map((looks ?? []).map((l) => [l.id, l.appearance]));
  const scenesOf = (id: string) => (scenes ?? []).filter((s) => s.location_entry_id === id || (links ?? []).some((l) => l.scene_id === s.id && l.bible_entry_id === id));

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-[22px]">{c.title}</h1>
        <p className="max-w-[70ch] text-[12px] text-dim">{c.blurb}</p>
      </div>
      {ok && <p className="rounded-[6px] bg-ok/10 px-3 py-2 text-[12px] text-ok">{ok}</p>}
      {error && <p className="rounded-[6px] bg-drift/10 px-3 py-2 text-[12px] text-drift">{error}</p>}

      {(entries ?? []).length === 0 && <p className="text-[12px] text-dim">None yet. <Link href={`/p/${projectId}`} className="underline">Break down the script</Link> to find them, or add one below.</p>}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(entries ?? []).map((e) => {
          const look = lookOf.get(e.id!) ?? "";
          const used = scenesOf(e.id!);
          return (
            <li key={e.id}>
              <Link href={`/p/${projectId}/bible/${e.id}`} className="imgcard flex h-full flex-col">
                <div className="relative aspect-video bg-card">
                  {e.reference_asset_id
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={`/api/assets/${e.reference_asset_id}`} alt="" className="h-full w-full object-cover" />
                    : <span className="absolute inset-0 grid place-items-center text-[11px] text-mute">{kind === "location" ? "no master wide yet" : kind === "character" ? "no reference yet" : "no image yet"}</span>}
                  {e.requires_consent && <span className="absolute left-2 top-2"><BibleChip state={e.consent_state} /></span>}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-2.5">
                  <div className="text-[13px] font-medium">{e.name}</div>
                  {look ? <div className="line-clamp-2 text-[11px] text-dim">{look}</div> : <div className="text-[11px] text-gold">Describe how {kind === "character" ? "they look" : "it looks"}</div>}
                  {e.description && <div className="line-clamp-2 text-[11px] text-mute">{e.description}</div>}
                  <div className="mt-auto pt-1 text-[10px] text-mute">{used.length ? `in ${used.map((s) => `scene ${s.position}`).join(", ")}` : "not in any scene yet"}</div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <details className="glass rounded-[10px] p-3">
        <summary className="cursor-pointer select-none text-[12px] font-medium">Add {kind === "character" ? "a character" : kind === "location" ? "a place" : `a ${kind}`}</summary>
        <form action={createEntry} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="kind" value={kind} />
          <label className="label">Name<input name="name" required placeholder={c.name} className="input mt-0.5 w-full" /></label>
          <label className="label">{c.who}<input name="description" className="input mt-0.5 w-full" /></label>
          <label className="label sm:col-span-2">{c.look} <span className="text-mute">(used in every shot)</span><textarea name="appearance" rows={2} placeholder={c.lookPh} className="input mt-0.5 w-full" /></label>
          {kind === "character" && <label className="label sm:col-span-2">Real person it depicts, if any (needs a signed release)<input name="likeness_of" placeholder="leave empty for a made-up character" className="input mt-0.5 w-full" /></label>}
          <button className="btn-primary sm:col-span-2">Add</button>
        </form>
      </details>
    </div>
  );
}
