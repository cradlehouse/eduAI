"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db/types";
import { addAction, addDialogue, addScene, normName, parseScript, removeSnippet, sceneIndex, setHeading, slugFor, splitLine } from "@/lib/script/screenplay";
import { currentScript, syncScenes, writeScript } from "@/lib/script/sync";
import { planShots, type ShotPlanT } from "@/lib/script/shotplan";

type R = { ok: true } | { error: string };

async function sceneRow(sceneId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("scenes").select("id, org_id, project_id, position, heading, time_of_day, location_entry_id").eq("id", sceneId).maybeSingle();
  return data;
}
// This row's scene in the script (by position, checked against its heading), or null.
const inScript = (text: string, s: { position: number; heading: string | null }) => sceneIndex(text, s.position, s.heading ?? "");
const done = (projectId: string, sceneId: string) => { revalidatePath(`/p/${projectId}/scenes/${sceneId}`); revalidatePath(`/p/${projectId}`, "layout"); };

// Where: the location dropped in. Optionally the scene heading follows (INT. DINER - NIGHT).
export async function setSceneLocation(projectId: string, sceneId: string, entryId: string, rewriteHeading: boolean): Promise<R> {
  const supabase = await createClient();
  const s = await sceneRow(sceneId);
  if (!s) return { error: "Scene not found." };
  const { error } = await supabase.from("scenes").update({ location_entry_id: entryId }).eq("id", sceneId);
  if (error) return { error: error.message };
  if (rewriteHeading) {
    const { data: loc } = await supabase.from("bible_entries").select("name, description").eq("id", entryId).maybeSingle();
    const text = await currentScript(projectId);
    const n = inScript(text, s);
    if (loc && n) {
      const ie = /^EXT/i.test(s.heading) || /\b(outside|exterior)\b/i.test(loc.name) ? "EXT" : "INT";
      const heading = slugFor(loc.name, ie, s.time_of_day || "");
      await writeScript(projectId, setHeading(text, n, heading), { source: "scene", label: `Scene ${n} set in ${loc.name}: ${heading}`, scene: n });
    }
  }
  done(projectId, sceneId);
  return { ok: true };
}

// A new scene from the Scenes screen: written into the script as its heading (INT. BUS STATION - NIGHT)
// after scene N, at an existing location or a new one (which is added to Locations too). Returns the
// new scene so the page can open it.
export async function newScene(projectId: string, input: { after: number; intExt: "INT" | "EXT"; time: string; locationId?: string | null; place?: string }): Promise<{ ok: true; sceneId: string } | { error: string }> {
  const supabase = await createClient();
  const text = await currentScript(projectId);
  const after = Math.max(0, Math.min(input.after, parseScript(text).scenes.length));
  let locationId = input.locationId ?? null;
  if (locationId) {
    const { data: loc } = await supabase.from("bible_entries").select("name").eq("id", locationId).eq("project_id", projectId).maybeSingle();
    if (!loc) return { error: "That location isn't in this project." };
    const heading = slugFor(loc.name, input.intExt, input.time);
    const w = await writeScript(projectId, addScene(text, after, heading), { source: "scene", label: `New scene ${after + 1}: ${heading}`, scene: after + 1 });
    if ("error" in w) return { error: w.error ?? "Couldn't write it into the script." };
  } else {
    const place = input.place?.trim();
    if (!place) return { error: "Pick a location or name a new place." };
    const { addElement } = await import("@/app/p/[projectId]/elements/actions");
    const r = await addElement({ projectId, kind: "location", name: place, appearance: "", after, intExt: input.intExt, time: input.time });
    if ("error" in r) return r;
    locationId = r.id;
  }
  const { data: row } = await supabase.from("scenes").select("id").eq("project_id", projectId).eq("position", after + 1).maybeSingle();
  if (!row) return { error: "The scene was written into the script but didn't appear. Open the Script page to check it." };
  await supabase.from("scenes").update({ location_entry_id: locationId }).eq("id", row.id);
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: true, sceneId: row.id };
}

// A scene that exists here but not in the script (made before everything wrote into the script): write
// its heading in at its place, so its lines, people and shots have somewhere to live.
export async function sceneIntoScript(projectId: string, sceneId: string): Promise<R> {
  const s = await sceneRow(sceneId);
  if (!s) return { error: "Scene not found." };
  const text = await currentScript(projectId);
  // Already there under another wording: the next sync folds this copy into that scene.
  if (inScript(text, s)) { await syncScenes(projectId, text); done(projectId, sceneId); return { ok: true }; }
  const n = parseScript(text).scenes.length;
  const heading = s.heading || `INT. SCENE ${s.position} - DAY`;
  const w = await writeScript(projectId, addScene(text, n, heading), { source: "scene", label: `Scene ${n + 1} written into the script: ${heading}`, scene: n + 1 });
  if ("error" in w) return { error: w.error ?? "Couldn't write it into the script." };
  done(projectId, sceneId);
  return { ok: true };
}

// An empty scene that isn't in the script (a leftover): remove it. Anything with shots is kept.
export async function removeStrayScene(projectId: string, sceneId: string): Promise<{ ok: true } | { error: string }> {
  const s = await sceneRow(sceneId);
  if (!s) return { error: "Scene not found." };
  if (inScript(await currentScript(projectId), s)) return { error: "This scene is in the script; take it out there." };
  const supabase = await createClient();
  const { count } = await supabase.from("shots").select("id", { count: "exact", head: true }).eq("scene_id", sceneId);
  if (count) return { error: "This scene has shots, so it's kept." };
  const { error } = await supabase.from("scenes").delete().eq("id", sceneId);
  if (error) return { error: error.message };
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: true };
}

export async function addToScene(projectId: string, sceneId: string, entryId: string): Promise<R> {
  const supabase = await createClient();
  const s = await sceneRow(sceneId);
  if (!s) return { error: "Scene not found." };
  const { error } = await supabase.from("scene_bible_entries").upsert({ org_id: s.org_id, scene_id: sceneId, bible_entry_id: entryId }, { onConflict: "scene_id,bible_entry_id", ignoreDuplicates: true });
  if (error) return { error: error.message };
  done(projectId, sceneId);
  return { ok: true };
}

export async function removeFromScene(projectId: string, sceneId: string, entryId: string): Promise<R> {
  const supabase = await createClient();
  const s = await sceneRow(sceneId);
  if (!s) return { error: "Scene not found." };
  if (s.location_entry_id === entryId) await supabase.from("scenes").update({ location_entry_id: null }).eq("id", sceneId);
  await supabase.from("scene_bible_entries").delete().eq("scene_id", sceneId).eq("bible_entry_id", entryId);
  done(projectId, sceneId);
  return { ok: true };
}

// The pop-up after dropping someone in: keep their lines, cut the unticked ones from the script.
export async function cutLines(projectId: string, sceneId: string, texts: string[]): Promise<R> {
  const s = await sceneRow(sceneId);
  if (!s) return { error: "Scene not found." };
  let text = await currentScript(projectId);
  for (const t of texts) {
    const n = inScript(text, s);
    const scene = n ? parseScript(text).scenes[n - 1] : undefined;
    const b = scene?.blocks.find((x) => text.slice(x.start, x.end) === t);
    if (!b) continue;
    const next = removeSnippet(text, t);
    if (next) {
      await writeScript(projectId, { text: next, snippet: "", at: b.start }, { source: "scene", label: `Cut from Scene ${n}: ${t.replace(/\s+/g, " ").slice(0, 80)}`, scene: n });
      text = next;
    }
  }
  done(projectId, sceneId);
  return { ok: true };
}

// A line (or an action) written into the scene after block N; the script is the master copy. The scene
// is found by its heading as well as its number, so the line can't land in the scene next door; the
// speaker is the Cast's own spelling of the name; and a line typed with its stage direction around the
// quote (bob opens the door and shouts "when were you going to tell me") is written as an action, then
// the line, as a screenplay has it.
export async function addLine(projectId: string, sceneId: string, input: { who?: string; text: string; after: number | "end" | "top"; kind: "dialogue" | "action" }): Promise<R> {
  const s = await sceneRow(sceneId);
  if (!s) return { error: "Scene not found." };
  let text = await currentScript(projectId);
  const n = inScript(text, s);
  if (!n) return { error: "This scene isn't in the script yet. Use \"Put it in the script\" at the top first." };
  let who = input.who ? normName(input.who) : "";
  if (who) {
    const supabase = await createClient();
    const { data: cast } = await supabase.from("bible_entries").select("name").eq("project_id", projectId).eq("kind", "character");
    who = (cast ?? []).map((c) => normName(c.name)).find((c) => c === who) ?? who;
  }
  const split = input.kind === "dialogue" && who ? splitLine(who, input.text) : null;
  let ed;
  if (split) {
    const a = addAction(text, n, input.after, split.action);
    text = a.text;
    const blocks = parseScript(text).scenes[n - 1].blocks;
    const at = blocks.findIndex((b) => b.kind === "action" && b.text === split.action);
    const d = addDialogue(text, n, at >= 0 ? at : "end", who, split.line, split.paren);
    ed = { text: d.text, snippet: `${a.snippet}\n\n${d.snippet}`, at: a.at };
  } else {
    ed = input.kind === "dialogue" && who ? addDialogue(text, n, input.after, who, input.text) : addAction(text, n, input.after, input.text);
  }
  const label = split ? `${who}: "${split.line}" (with "${split.action}")` : input.kind === "dialogue" ? `${who}: "${input.text.trim()}"` : input.text.trim().slice(0, 90);
  const r = await writeScript(projectId, ed, { source: "scene", label, scene: n });
  if ("error" in r) return { error: r.error ?? "Could not write the script." };
  done(projectId, sceneId);
  return { ok: true };
}

// Edit one block of the scene in place (the text of an action or a line).
export async function editBlock(projectId: string, sceneId: string, original: string, next: string): Promise<R> {
  const s = await sceneRow(sceneId);
  if (!s) return { error: "Scene not found." };
  const text = await currentScript(projectId);
  const i = text.indexOf(original);
  if (i < 0) return { error: "That line changed in the script. Reload and try again." };
  const updated = text.slice(0, i) + next + text.slice(i + original.length);
  const r = await writeScript(projectId, { text: updated, snippet: next, at: i }, { source: "scene", label: `Edited in Scene ${inScript(text, s) ?? s.position}: ${next.replace(/\s+/g, " ").slice(0, 80)}`, scene: inScript(text, s) ?? s.position });
  if ("error" in r) return { error: r.error ?? "Could not write the script." };
  done(projectId, sceneId);
  return { ok: true };
}

// "+ new character" from the drawer: a person, their quick look and their line, all at once. They go to
// Cast (needing a proper look) and their line goes into the script where the student put it.
export async function newCharacterInScene(projectId: string, sceneId: string, input: { name: string; look: string; who: string; line: string; after: number | "end" | "top" }): Promise<R> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const s = await sceneRow(sceneId);
  if (!s || !user) return { error: "Scene not found." };
  const name = normName(input.name);
  if (!name) return { error: "Give them a name." };
  // Someone already in the Cast under that name is the same person, not a second one.
  const { data: existing } = await supabase.from("bible_entries").select("id").eq("project_id", projectId).eq("kind", "character").eq("name", name).maybeSingle();
  const { data: row, error } = existing ? { data: existing, error: null } : await supabase.from("bible_entries").insert({
    org_id: s.org_id, project_id: projectId, kind: "character", name, appearance: input.look.trim(), description: input.who.trim(),
    likeness_of: null, requires_consent: false, created_by: user.id,
  }).select("id").single();
  if (error || !row) return { error: error?.message ?? "Could not add them." };
  await supabase.from("scene_bible_entries").upsert({ org_id: s.org_id, scene_id: sceneId, bible_entry_id: row.id }, { onConflict: "scene_id,bible_entry_id", ignoreDuplicates: true });
  if (input.line.trim()) {
    const text = await currentScript(projectId);
    const n = inScript(text, s);
    if (n) {
      await writeScript(projectId, addDialogue(text, n, input.after, name, input.line), { source: "scene", label: `New character ${name}: "${input.line.trim()}"`, scene: n });
    }
  }
  done(projectId, sceneId);
  return { ok: true };
}

export async function proposeShots(projectId: string, sceneId: string) {
  const supabase = await createClient();
  const s = await sceneRow(sceneId);
  if (!s) return { error: "Scene not found." } as const;
  const script = await currentScript(projectId);
  const sn = inScript(script, s);
  const scene = sn ? parseScript(script).scenes[sn - 1] : undefined;
  if (!scene) return { error: "This scene isn't in the script yet." } as const;
  const [{ data: loc }, { data: links }] = await Promise.all([
    s.location_entry_id ? supabase.from("bible_entries").select("name, appearance").eq("id", s.location_entry_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("scene_bible_entries").select("bible_entries(name, kind)").eq("scene_id", sceneId),
  ]);
  const cast = (links ?? []).map((l) => l.bible_entries).filter((e) => e?.kind === "character").map((e) => e!.name);
  return planShots({
    heading: scene.heading, location: loc ? `${loc.name}: ${loc.appearance}` : scene.heading, cast,
    blocks: scene.blocks.map((b, i) => ({ i, kind: b.kind, who: b.kind === "dialogue" ? b.character : undefined, text: b.text })),
  });
}

// Keep the plan: one shots row per planned shot, carrying its framing, move, lines and who's in it.
export async function keepShots(projectId: string, sceneId: string, plan: ShotPlanT["shots"]): Promise<{ ok: true; first: string | null } | { error: string }> {
  const supabase = await createClient();
  const s = await sceneRow(sceneId);
  if (!s) return { error: "Scene not found." };
  const script = await currentScript(projectId);
  const sn = inScript(script, s);
  const scene = sn ? parseScript(script).scenes[sn - 1] : undefined;
  const [{ data: last }, { data: people }] = await Promise.all([
    supabase.from("shots").select("position").eq("scene_id", sceneId).order("position", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("bible_entries").select("id, name, kind").eq("project_id", projectId),
  ]);
  let pos = last?.position ?? 0;
  let first: string | null = null;
  for (const p of plan) {
    pos += 1;
    const lines = p.lines.map((i) => scene?.blocks[i]).filter((b) => b && b.kind === "dialogue").map((b) => ({ who: (b as { character: string }).character, text: b!.text }));
    const intent: Json = { framing: p.framing, camera_motion: p.camera_motion, speaker: p.speaker ? normName(p.speaker) : "", lines, on: p.on.map(normName) };
    const { data: row, error } = await supabase.from("shots").insert({
      org_id: s.org_id, project_id: projectId, scene_id: sceneId, position: pos, label: p.label, description: p.description, duration_target_s: p.seconds, intent,
    }).select("id").single();
    if (error || !row) return { error: error?.message ?? "Could not save the shots." };
    first ??= row.id;
    // Who's in the shot: the location plus the people on screen (their looks go into the frame).
    const onIds = (people ?? []).filter((e) => e.kind === "character" && p.on.map(normName).includes(normName(e.name))).map((e) => e.id);
    const pins = [s.location_entry_id, ...onIds].filter((x): x is string => !!x);
    if (pins.length) await supabase.from("shot_bible_entries").insert(pins.map((id) => ({ org_id: s.org_id, shot_id: row.id, bible_entry_id: id })));
  }
  done(projectId, sceneId);
  return { ok: true, first };
}
