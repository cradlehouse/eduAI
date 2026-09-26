// Run: pnpm test:script (node strips the types; no test framework needed).
import { parseScript, linesFor, addDialogue, addScene, addAction, removeSnippet, setHeading, slugFor } from "./screenplay.ts";
import assert from "node:assert";
const s = `TITLE: Last Call

INT. ROSIE'S DINER – NIGHT

Rain on the window. ANGIE (20s, waitress) wipes the counter.

ANGIE
I got the job. In Tulsa.

BERT
(quietly)
Then go. Before I talk you out of it.

She crosses to him.

EXT. ROSIE'S DINER - NIGHT
Neon buzzes.

ANGIE (V.O.)
Goodbye, Rosie's.
`;
const p = parseScript(s);
assert.equal(p.scenes.length, 2);
assert.equal(p.scenes[0].timeOfDay, "NIGHT");
assert.equal(p.scenes[0].blocks.length, 4, JSON.stringify(p.scenes[0].blocks));
assert.equal(linesFor(p.scenes[0], "Bert")[0].text, "Then go. Before I talk you out of it.");
assert.equal(linesFor(p.scenes[0], "Bert")[0].parenthetical, "(quietly)");
assert.equal(linesFor(p.scenes[1], "angie").length, 1);
assert.equal(p.scenes[1].blocks[0].kind, "action");
const e = addDialogue(s, 1, 0, "Bartender", "What'll it be?");
const p2 = parseScript(e.text);
assert.equal(p2.scenes[0].blocks[1].kind, "dialogue");
const b1 = p2.scenes[0].blocks[1];
assert.equal(b1.kind === "dialogue" ? b1.character : "", "BARTENDER");
assert.equal(removeSnippet(e.text, e.snippet), s.replace(/\n*$/, "\n"));
const n = addScene(s, 1, "INT. BUS STATION - DAY", "Angie waits.");
assert.equal(parseScript(n.text).scenes[1].heading, "INT. BUS STATION - DAY");
assert.equal(parseScript(n.text).scenes.length, 3);
const end = addAction(s, 2, "end", "The PIE sits on the counter.");
assert.ok(end.text.trim().endsWith("The PIE sits on the counter."));
assert.equal(parseScript(setHeading(s, 2, "EXT. ROSIE'S DINER - DAWN").text).scenes[1].timeOfDay, "DAWN");
assert.equal(slugFor("Diner inside", "INT", "night"), "INT. DINER - NIGHT");
console.log("all ok");
