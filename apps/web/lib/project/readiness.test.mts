// Run: pnpm test:script
import { readiness, peopleIn } from "./readiness.ts";
import { parseScript } from "../script/screenplay.ts";
import assert from "node:assert";

const script = `INT. ROSIE'S DINER - NIGHT

ANGIE wipes the counter. BERT watches.

ANGIE
I got the job.

EXT. DINER - NIGHT
bob walks to the door

INT. ROSIE'S DINER KITCHEN - NIGHT

BERT scrapes the grill. MARLA leans in.

MARLA
You let her go?
`;
const E = (id: string, kind: "character" | "location" | "prop", name: string, look = true, extra: Record<string, string | null> = {}) =>
  ({ id, kind, name, reference_asset_id: look ? `a-${id}` : null, voice_asset_id: null, room_tone_asset_id: null, ...extra });

const entries = [
  E("angie", "character", "ANGIE", true, { voice_asset_id: "v" }),
  E("bert", "character", "BERT"),
  E("marla", "character", "MARLA", true),
  E("trucker", "character", "TRUCKER", false),
  E("diner", "location", "ROSIE'S DINER", true, { room_tone_asset_id: "r" }),
  E("ext", "location", "DINER EXTERIOR", true),
  E("kitchen", "location", "KITCHEN", false),
  E("pie", "prop", "PIE", false),
];
const scenes = [
  { id: "s1", position: 1, heading: "INT. ROSIE'S DINER - NIGHT", location_entry_id: "diner" },
  { id: "s2", position: 2, heading: "EXT. DINER - NIGHT", location_entry_id: null },
  { id: "s3", position: 3, heading: "INT. ROSIE'S DINER KITCHEN - NIGHT", location_entry_id: "kitchen" },
];
const links = [{ scene_id: "s1", bible_entry_id: "angie" }, { scene_id: "s1", bible_entry_id: "bert" }, { scene_id: "s3", bible_entry_id: "bert" }];
const shots = [
  { id: "sh1", scene_id: "s1", position: 1, label: "Angie close", selected_take_id: "t" },
  { id: "sh2", scene_id: "s1", position: 2, label: "Bert", selected_take_id: "t" },
];

const r = readiness({ projectId: "p", script, entries, scenes, links, shots });

// People named in capitals in action count; lower-case "bob" doesn't.
assert.deepStrictEqual([...peopleIn(parseScript(script).scenes[2], entries.filter((e) => e.kind === "character"))].sort(), ["BERT", "MARLA"]);

// TRUCKER is in no scene: flagged, but doesn't hold Cast up.
assert.equal(r.entries.trucker.status, "no look yet · in no scene");
assert.equal(r.entries.trucker.needed, false);
// MARLA speaks and has no voice: Cast isn't done, and the badge says why, opening on Voice.
assert.equal(r.entries.marla.status, "no voice yet");
assert.equal(r.entries.marla.tab, "voice");
assert.equal(r.steps.cast, "todo");
// The kitchen has no wide; the exterior isn't in any scene yet, so its missing room tone doesn't count.
assert.equal(r.entries.kitchen.status, "no wide yet");
assert.equal(r.entries.ext.status, "in no scene");
assert.equal(r.steps.locations, "todo");
// Props never hold anything up.
assert.equal(r.steps.props, "");

// Next: pictures first (cast looks, then location wides), then voices. The old Script page said
// "Start with Cast" here, though Cast only lacked a voice and the missing picture was a location.
assert.deepStrictEqual(r.next, { text: "Make the master wide of KITCHEN.", href: "/p/p/locations/kitchen", step: "locations" });

// Scene 1 is done. Scene 2 has no location. Scene 3 is missing MARLA (named in the action, not added).
assert.equal(r.scenes[0].state, "done");
assert.deepStrictEqual(r.scenes[1].missing, ["a location"]);
assert.deepStrictEqual(r.scenes[2].missing, ["MARLA"]);
// The old rule ticked Scenes once every existing shot had a take; scenes 2 and 3 have none, so it isn't done.
assert.equal(r.steps.scenes, "todo");
assert.deepStrictEqual(r.film, { scenes: 3, planned: 1, shots: 2, chosen: 2 });

// Once the pictures and voice exist, Next moves to the scenes in order.
const r2 = readiness({ projectId: "p", script, scenes, links, shots,
  entries: entries.map((e) => ({ ...e, reference_asset_id: e.reference_asset_id ?? "x", voice_asset_id: "v", room_tone_asset_id: "r" })) });
assert.deepStrictEqual(r2.next, { text: "Scene 2: set the location.", href: "/p/p/scenes/s2", step: "scenes" });
// A note (planning anyway, with a reason) counts as ready.
const r3 = readiness({ projectId: "p", script, links, shots, entries: entries.map((e) => ({ ...e, reference_asset_id: "x", voice_asset_id: "v", room_tone_asset_id: "r" })),
  scenes: scenes.map((s) => (s.id === "s2" ? { ...s, plan_note: "Establishing shot, nobody in it yet" } : s)) });
assert.equal(r3.scenes[1].ready, true);
assert.deepStrictEqual(r3.next, { text: "Scene 2: plan the shots.", href: "/p/p/scenes/s2", step: "scenes" });

console.log("readiness: ok");
