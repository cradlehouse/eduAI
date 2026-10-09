// What's done and what's next in a production, worked out once. The step rail, the Script page's
// "Next", the Cast/Locations badges, the scene strip, the Edit page and the cohort "Continue" card all
// read this, so they never disagree. Pure: the caller loads the rows (lib/project/load.ts).

import { normName, parseScript, sceneIndex, type ParsedScene } from "../script/screenplay.ts";

export type Kind = "character" | "location" | "prop";
export type Entry = { id: string; kind: Kind; name: string; reference_asset_id: string | null; voice_asset_id?: string | null; room_tone_asset_id?: string | null };
export type SceneRow = { id: string; position: number; heading: string | null; title?: string | null; location_entry_id: string | null; plan_note?: string | null };
export type Link = { scene_id: string; bible_entry_id: string };
export type ShotRow = { id: string; scene_id: string; position: number; label: string | null; selected_take_id: string | null };
export type Step = "done" | "todo" | "";
export type StepKey = "script" | "cast" | "locations" | "props" | "scenes" | "edit";
export type Next = { text: string; href: string; step: StepKey };

export type EntryState = {
  // Short badge for the list ("no look yet"), empty when nothing is missing.
  status: string;
  // The tab that needs work, so links open on it.
  tab: string;
  // Missing something the film needs (gold). False for props, and for anything in no scene.
  needed: boolean;
  scenes: number[];
};

export type SceneState = {
  id: string;
  position: number;
  heading: string;
  inScript: boolean;
  // What has to be set before planning: "a location", then the names of people the script puts in it.
  missing: string[];
  // Why the student planned anyway (set when they skip the checklist).
  note: string | null;
  ready: boolean;
  shots: number;
  chosen: number;
  state: "done" | "todo";
};

export type Readiness = {
  steps: Record<StepKey, Step>;
  next: Next;
  entries: Record<string, EntryState>;
  scenes: SceneState[];
  film: { scenes: number; planned: number; shots: number; chosen: number };
};

const PATH: Record<Kind, string> = { character: "cast", location: "locations", prop: "props" };

// People the script puts in a scene: everyone with a line, and anyone in the Cast named in capitals
// in the action (screenplays introduce people that way: "BERT scrapes down the grill").
export function peopleIn(scene: ParsedScene | undefined, cast: Entry[]) {
  const names = new Set<string>();
  if (!scene) return names;
  for (const b of scene.blocks) {
    if (b.kind === "dialogue") names.add(b.character);
    else for (const c of cast) {
      const n = normName(c.name);
      if (n && new RegExp(`(^|[^A-Z])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Z]|$)`).test(b.text)) names.add(n);
    }
  }
  return names;
}

export function readiness(input: { projectId: string; script: string; entries: Entry[]; scenes: SceneRow[]; links: Link[]; shots: ShotRow[] }): Readiness {
  const { projectId, script, entries, links, shots } = input;
  const base = `/p/${projectId}`;
  const parsed = parseScript(script).scenes;
  const cast = entries.filter((e) => e.kind === "character");
  const scenesSorted = [...input.scenes].sort((a, b) => a.position - b.position);

  const sceneInfo = scenesSorted.map((s) => {
    const n = sceneIndex(script, s.position, s.heading ?? "");
    const ps = n ? parsed[n - 1] : undefined;
    const linked = new Set(links.filter((l) => l.scene_id === s.id).map((l) => l.bible_entry_id));
    if (s.location_entry_id) linked.add(s.location_entry_id);
    return { row: s, ps, linked, named: peopleIn(ps, cast) };
  });

  // Which scenes each entry is in: linked, set as the location, or (for a character) named by the script.
  const scenesOf = (e: Entry) => sceneInfo.filter((x) => x.linked.has(e.id) || (e.kind === "character" && x.named.has(normName(e.name)))).map((x) => x.row.position);
  const speaking = new Set(parsed.flatMap((sc) => sc.blocks.flatMap((b) => (b.kind === "dialogue" ? [b.character] : []))));

  const entryStates: Record<string, EntryState> = {};
  for (const e of entries) {
    const inScenes = scenesOf(e);
    const used = inScenes.length > 0;
    let status = "", tab = "look";
    if (!e.reference_asset_id) status = e.kind === "location" ? "no wide yet" : "no look yet";
    else if (e.kind === "character" && !e.voice_asset_id && speaking.has(normName(e.name))) { status = "no voice yet"; tab = "voice"; }
    else if (e.kind === "location" && used && !e.room_tone_asset_id) { status = "no room tone"; tab = "room"; }
    if (!used && e.kind !== "prop") status = status ? `${status} · in no scene` : "in no scene";
    entryStates[e.id] = { status, tab, needed: used && e.kind !== "prop" && !!status, scenes: inScenes };
  }

  const sceneStates: SceneState[] = sceneInfo.map(({ row, ps, linked, named }) => {
    const missing: string[] = [];
    if (!row.location_entry_id) missing.push("a location");
    for (const n of named) {
      const c = cast.find((x) => normName(x.name) === n);
      if (!c || !linked.has(c.id)) missing.push(n);
    }
    const sh = shots.filter((x) => x.scene_id === row.id);
    const chosen = sh.filter((x) => x.selected_take_id).length;
    const ready = missing.length === 0 || !!row.plan_note;
    return {
      id: row.id, position: row.position, heading: ps?.heading || row.heading || row.title || `Scene ${row.position}`,
      inScript: !!ps, missing, note: row.plan_note ?? null, ready, shots: sh.length, chosen,
      state: ready && sh.length > 0 && chosen === sh.length ? "done" : "todo",
    };
  });

  const usedOf = (k: Kind) => entries.filter((e) => e.kind === k && entryStates[e.id].scenes.length > 0);
  const allOk = (list: Entry[]): Step => (list.length === 0 ? "" : list.every((e) => !entryStates[e.id].status) ? "done" : "todo");
  const props = entries.filter((e) => e.kind === "prop");
  const steps: Record<StepKey, Step> = {
    script: script.trim() && entries.length ? "done" : "todo",
    cast: allOk(usedOf("character")),
    locations: allOk(usedOf("location")),
    props: props.length && props.every((e) => e.reference_asset_id) ? "done" : "",
    scenes: sceneStates.length === 0 ? "" : sceneStates.every((s) => s.state === "done") ? "done" : "todo",
    edit: "",
  };

  const next = ((): Next => {
    if (!script.trim()) return { text: "Write or paste the script, then break it down.", href: base, step: "script" };
    if (!entries.some((e) => e.kind === "character" || e.kind === "location"))
      return { text: "Break the script down to find the cast and the locations.", href: base, step: "script" };
    const first = (k: Kind, test: (s: EntryState) => boolean) => usedOf(k).find((e) => test(entryStates[e.id]));
    const look = first("character", (s) => s.status.startsWith("no look"));
    if (look) return { text: `Make ${look.name}'s look.`, href: `${base}/cast/${look.id}`, step: "cast" };
    const wide = first("location", (s) => s.status.startsWith("no wide"));
    if (wide) return { text: `Make the master wide of ${wide.name}.`, href: `${base}/locations/${wide.id}`, step: "locations" };
    const voice = first("character", (s) => s.tab === "voice");
    if (voice) return { text: `Choose ${voice.name}'s voice.`, href: `${base}/cast/${voice.id}?tab=voice`, step: "cast" };
    const tone = first("location", (s) => s.tab === "room");
    if (tone) return { text: `Make the room tone for ${tone.name}.`, href: `${base}/locations/${tone.id}?tab=room`, step: "locations" };
    for (const s of sceneStates) {
      const href = `${base}/scenes/${s.id}`;
      if (!s.ready) return { text: `Scene ${s.position}: ${s.missing[0] === "a location" ? "set the location" : `add ${s.missing.join(", ")}`}.`, href, step: "scenes" };
      if (!s.shots) return { text: `Scene ${s.position}: plan the shots.`, href, step: "scenes" };
      const open = shots.filter((x) => x.scene_id === s.id && !x.selected_take_id).sort((a, b) => a.position - b.position)[0];
      if (open) return { text: `Scene ${s.position}: finish shot ${s.position}.${open.position}${open.label ? ` (${open.label})` : ""}.`, href: `${href}/shots/${open.id}`, step: "scenes" };
    }
    return { text: "Every shot has a take. Watch it through on Edit.", href: `${base}/edit`, step: "edit" };
  })();

  return {
    steps, next, entries: entryStates, scenes: sceneStates,
    film: { scenes: sceneStates.length, planned: sceneStates.filter((s) => s.shots > 0).length, shots: shots.length, chosen: shots.filter((s) => s.selected_take_id).length },
  };
}

export const entryHref = (projectId: string, e: Pick<Entry, "id" | "kind">, s?: EntryState) =>
  `/p/${projectId}/${PATH[e.kind]}/${e.id}${s && s.tab !== "look" ? `?tab=${s.tab}` : ""}`;
