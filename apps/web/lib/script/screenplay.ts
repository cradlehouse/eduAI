// The script as structure: scenes (from sluglines) holding blocks (action, dialogue). Enough of
// Fountain to find a character's lines in a scene and to write new things into the right place.
// Every edit returns the new text and the exact snippet inserted, so the change can be listed and undone.

export type Block =
  | { kind: "action"; text: string; start: number; end: number }
  | { kind: "dialogue"; character: string; parenthetical: string; text: string; start: number; end: number };

export type ParsedScene = { index: number; heading: string; timeOfDay: string; start: number; end: number; blocks: Block[] };
export type Parsed = { scenes: ParsedScene[]; preambleEnd: number };

const SLUG = /^(?:\.(?!\.)|(?:INT|EXT|EST|INT\.?\/EXT|I\/E)[.\s])/i;
const CUE = /^[A-Z0-9][A-Z0-9 .'\-#&]*(?:\s*\([^)]*\))?\s*\^?$/;

export const isSlug = (line: string) => SLUG.test(line.trim());
const isCue = (line: string) => {
  const t = line.trim();
  return t.length > 0 && t.length <= 40 && CUE.test(t) && /[A-Z]/.test(t) && !isSlug(t) && !/^(FADE|CUT|DISSOLVE|SMASH)\b/.test(t) && !t.endsWith(":");
};
export const normName = (s: string) => s.replace(/\(.*?\)/g, "").replace(/\^/g, "").trim().toUpperCase().replace(/\s+/g, " ");
export const normHeading = (s: string) => s.trim().replace(/^\./, "").toUpperCase().replace(/[–—]/g, "-").replace(/\s+/g, " ");
export const timeOf = (heading: string) => (normHeading(heading).split(/\s-\s/).slice(1).join(" - ") || "").trim();

// Split into paragraphs (runs of non-blank lines) with their character offsets.
function paragraphs(text: string) {
  const out: { lines: string[]; start: number; end: number }[] = [];
  const re = /[^\n]*(?:\n|$)/g;
  let cur: { lines: string[]; start: number; end: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && m[0] !== "") {
    const line = m[0].replace(/\n$/, "");
    if (line.trim() === "") { if (cur) { out.push(cur); cur = null; } }
    else if (!cur) cur = { lines: [line], start: m.index, end: m.index + line.length };
    else { cur.lines.push(line); cur.end = m.index + line.length; }
    if (re.lastIndex >= text.length) break;
  }
  if (cur) out.push(cur);
  return out;
}

export function parseScript(text: string): Parsed {
  const scenes: ParsedScene[] = [];
  let preambleEnd = text.length;
  for (const p of paragraphs(text)) {
    const first = p.lines[0];
    if (isSlug(first)) {
      if (!scenes.length) preambleEnd = p.start;
      const heading = first.trim().replace(/^\./, "");
      scenes.push({ index: scenes.length + 1, heading, timeOfDay: timeOf(heading), start: p.start, end: p.end, blocks: [] });
      // Lines under the slug in the same paragraph are action.
      if (p.lines.length > 1) {
        const s = p.start + first.length + 1;
        scenes.at(-1)!.blocks.push({ kind: "action", text: p.lines.slice(1).join("\n"), start: s, end: p.end });
      }
      continue;
    }
    const scene = scenes.at(-1);
    if (!scene) continue;
    scene.end = p.end;
    if (p.lines.length > 1 && isCue(first)) {
      const body = p.lines.slice(1);
      const paren = body[0]?.trim().startsWith("(") ? body.shift()!.trim() : "";
      scene.blocks.push({ kind: "dialogue", character: normName(first), parenthetical: paren, text: body.map((l) => l.trim()).join(" "), start: p.start, end: p.end });
    } else {
      scene.blocks.push({ kind: "action", text: p.lines.join("\n"), start: p.start, end: p.end });
    }
  }
  return { scenes, preambleEnd };
}

export const linesFor = (scene: ParsedScene, name: string) =>
  scene.blocks.filter((b): b is Extract<Block, { kind: "dialogue" }> => b.kind === "dialogue" && b.character === normName(name));

// Everyone with at least one line anywhere in the script (normalised names).
export const speakersIn = (text: string) =>
  new Set(parseScript(text).scenes.flatMap((sc) => sc.blocks.flatMap((b) => (b.kind === "dialogue" ? [b.character] : []))));

// Who speaks or is named in a scene (names in capitals in action count, as screenplays introduce people).
export function namesIn(scene: ParsedScene) {
  const names = new Set<string>();
  for (const b of scene.blocks) if (b.kind === "dialogue") names.add(b.character);
  return [...names];
}

export type Edit = { text: string; snippet: string; at: number };

// Insert a paragraph at an offset, keeping exactly one blank line either side.
function insertAt(text: string, at: number, para: string): Edit {
  const before = text.slice(0, at).replace(/\s*$/, "");
  const after = text.slice(at).replace(/^\s*/, "");
  const snippet = para.trim();
  const joined = [before, snippet, after].filter((x) => x.length).join("\n\n");
  const pos = before.length ? before.length + 2 : 0;
  return { text: joined.replace(/\s*$/, "\n"), snippet, at: pos };
}

const dialoguePara = (name: string, line: string, paren = "") => [normName(name), paren ? (paren.startsWith("(") ? paren : `(${paren})`) : "", line.trim()].filter(Boolean).join("\n");

// Where inside a scene: after block N (0-based), or at the end ("end") or right under the heading ("top").
function offsetIn(scene: ParsedScene, after: number | "end" | "top") {
  if (after === "top") return scene.start + scene.heading.length + 1;
  if (after === "end" || !scene.blocks[after]) return scene.end;
  return scene.blocks[after].end;
}

export function addDialogue(text: string, sceneIndex: number, after: number | "end" | "top", name: string, line: string, paren = ""): Edit {
  const scene = parseScript(text).scenes[sceneIndex - 1];
  if (!scene) throw new Error(`No scene ${sceneIndex} in the script.`);
  return insertAt(text, offsetIn(scene, after), dialoguePara(name, line, paren));
}

export function addAction(text: string, sceneIndex: number, after: number | "end" | "top", action: string): Edit {
  const scene = parseScript(text).scenes[sceneIndex - 1];
  if (!scene) throw new Error(`No scene ${sceneIndex} in the script.`);
  return insertAt(text, offsetIn(scene, after), action);
}

// A new scene after scene N (0 = before the first scene; past the end = at the end).
export function addScene(text: string, afterScene: number, heading: string, action = ""): Edit {
  const { scenes, preambleEnd } = parseScript(text);
  const at = afterScene <= 0 ? (scenes[0]?.start ?? preambleEnd) : (scenes[afterScene - 1]?.end ?? text.length);
  const slug = normHeading(heading).replace(/^(INT|EXT|EST)(?!\.)\s/, "$1. ");
  return insertAt(text, at, [slug, action.trim()].filter(Boolean).join("\n\n"));
}

export function setHeading(text: string, sceneIndex: number, heading: string): Edit {
  const scene = parseScript(text).scenes[sceneIndex - 1];
  if (!scene) throw new Error(`No scene ${sceneIndex} in the script.`);
  const slug = normHeading(heading);
  const lineEnd = scene.start + text.slice(scene.start).split("\n")[0].length;
  return { text: text.slice(0, scene.start) + slug + text.slice(lineEnd), snippet: slug, at: scene.start };
}

// Undo: take the first exact copy of the snippet out, and the blank line it brought with it.
export function removeSnippet(text: string, snippet: string): string | null {
  const i = text.indexOf(snippet);
  if (i < 0) return null;
  const before = text.slice(0, i).replace(/\s*$/, "");
  const after = text.slice(i + snippet.length).replace(/^\s*/, "");
  return [before, after].filter((x) => x.length).join("\n\n").replace(/\s*$/, "\n");
}

// Scene heading for a location name: "Diner inside" + "NIGHT" → "INT. DINER - NIGHT".
export function slugFor(name: string, intExt: "INT" | "EXT", time: string) {
  const place = name.replace(/\b(inside|interior|outside|exterior)\b/gi, "").trim().toUpperCase() || name.toUpperCase();
  return `${intExt}. ${place}${time ? ` - ${time.toUpperCase()}` : ""}`;
}
