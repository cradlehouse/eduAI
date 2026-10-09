// Is a name from a new breakdown the same thing as something already in the production? Exact names
// match outright; otherwise the words are compared ignoring INT./EXT., "exterior", possessives, plurals
// and filler, so "RAG" ↔ "RAG / CLOTH (counter wipe)", "EXT. DINER" ↔ "DINER EXTERIOR" and
// "INT. ROSIE'S DINER" ↔ "ROSIE'S DINER" are offered as the same one. The student confirms; nothing is
// merged silently.

const FILLER = new Set(["THE", "A", "AN", "OF", "AT", "IN", "ON", "AND", "INT", "EXT", "INTERIOR", "EXTERIOR", "INSIDE", "OUTSIDE", "I", "E"]);

export const exactKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function nameWords(name: string) {
  return new Set(
    name.toUpperCase().replace(/['’]S\b/g, "").split(/[^A-Z0-9]+/)
      .filter((w) => w && !FILLER.has(w))
      .map((w) => (w.length > 3 && w.endsWith("S") && !w.endsWith("SS") ? w.slice(0, -1) : w)),
  );
}

// strong: one name's words all appear in the other (offered as "same one" by default). Weak: some words
// shared (props and locations only), offered but defaulting to "new".
export type Match = { name: string; exact: boolean; score: number; strong: boolean };

export function likelyMatch(kind: string, name: string, existing: { kind: string; name: string }[]): Match | null {
  const same = existing.filter((e) => e.kind === kind);
  const exact = same.find((e) => exactKey(e.name) === exactKey(name));
  if (exact) return { name: exact.name, exact: true, score: 1, strong: true };
  const a = nameWords(name);
  if (!a.size) return null;
  let best: Match | null = null;
  for (const e of same) {
    const b = nameWords(e.name);
    if (!b.size) continue;
    const shared = [...a].filter((w) => b.has(w)).length;
    if (shared === 0) continue;
    // One name's words all appear in the other's: the same thing written longer or shorter.
    const strong = shared === a.size || shared === b.size;
    if (!strong && kind === "character") continue;
    const score = shared / Math.max(a.size, b.size) + (strong ? 1 : 0);
    if (!best || score > best.score) best = { name: e.name, exact: false, score, strong };
  }
  return best;
}
