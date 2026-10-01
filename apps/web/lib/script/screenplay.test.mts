// Run: pnpm test:script (node strips the types; no test framework needed).
import { parseScript, linesFor, addDialogue, addScene, addAction, removeSnippet, setHeading, slugFor, sceneKey, sameScene, sceneIndex, splitLine } from "./screenplay.ts";
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

// The same scene written different ways is one scene; a different place or time is not.
assert.ok(sameScene("ext. of diner night", "EXT. DINER - NIGHT"));
assert.ok(sameScene("EXT. DINER EXTERIOR – NIGHT", "EXT. DINER - NIGHT"));
assert.ok(sameScene("int. rosie's diner - night", "INT. ROSIE'S DINER – NIGHT"));
assert.ok(!sameScene("INT. DINER - NIGHT", "EXT. DINER - NIGHT"));
assert.ok(!sameScene("EXT. DINER - NIGHT", "EXT. DINER - DAY"));
assert.ok(!sameScene("EXT. BUS STATION - NIGHT", "EXT. DINER - NIGHT"));
assert.equal(sceneKey("ext. of diner night"), "EXT|DINER|NIGHT");
console.log("sceneKey ok");

// A row finds its own scene in the script, even when its number is off.
const two = "INT. ROSIE'S DINER - NIGHT\n\nHi.\n\next. of diner night\n\nBob walks.\n";
assert.equal(sceneIndex(two, 2, "EXT. DINER - NIGHT"), 2);
assert.equal(sceneIndex(two, 3, "EXT. DINER - NIGHT"), 2);
assert.equal(sceneIndex(two, 1, "EXT. DINER - NIGHT"), 2);
assert.equal(sceneIndex(two, 3, "EXT. BUS STATION - DAY"), null);
// Action and speech typed together are split.
assert.deepEqual(splitLine("BOB", 'bob walks to the door pulls it open then shouts "when were you going to tell me"'),
  { action: "BOB walks to the door pulls it open.", line: "When were you going to tell me?", paren: "(shouting)" });
assert.equal(splitLine("BOB", "I'm leaving."), null);
console.log("sceneIndex + splitLine ok");
