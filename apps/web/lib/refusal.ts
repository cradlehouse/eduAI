// A job's error text, read for the student. The orchestrator writes prompt-gate refusals as
// "prompt gate: <category>. <reason>" plus, for other people's IP, "\nMake it your own: <suggestion>"
// (services/orchestrator/orchestrator/gate.py, GateDecision.release_message).

export type Failure =
  | { refused: true; ip: boolean; category: string; reason: string; suggestion: string }
  | { refused: false; text: string };

const IP_FALLBACK: Record<string, string> = {
  ip_character: "That character belongs to someone else.",
  ip_brand: "That brand or logo belongs to someone else.",
  ip_famous_person: "That's a real, famous person.",
  ip_artist_style: "That's a living artist's style.",
};

export function readFailure(error: string | null | undefined): Failure {
  const text = (error ?? "").trim();
  const m = /^prompt gate: ([a-z_]+)\.\s*([\s\S]*)$/.exec(text);
  if (!m) return { refused: false, text: text || "It didn't work." };
  const [, category, rest] = m;
  const [reason, suggestion = ""] = rest.split(/\nMake it your own:\s*/);
  const ip = category.startsWith("ip_");
  return { refused: true, ip, category, reason: reason.trim() || IP_FALLBACK[category] || "This one can't be made here.", suggestion: suggestion.trim() };
}
