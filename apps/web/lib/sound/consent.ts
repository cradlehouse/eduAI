// The state of a real person's voice from the newest release that covers voice work (lane
// voice_likeness): withdrawing revokes it, and a new signed release after that is new consent.
// The orchestrator applies the same rule (db.speaker_voices) before converting any lines.
export function voiceState(newest: { state: string; expires_at: string | null } | undefined): "signed" | "revoked" | "expired" | "missing" {
  if (!newest) return "missing";
  if (newest.state === "revoked") return "revoked";
  if (newest.state === "signed") return !newest.expires_at || new Date(newest.expires_at) > new Date() ? "signed" : "expired";
  return "missing";
}
