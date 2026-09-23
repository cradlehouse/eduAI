// Consent state is the FIRST thing you see on a consent-bearing entry. Red blocks Generate.
const STYLE: Record<string, string> = {
  not_required: "bg-glass",
  signed: "bg-ok/15 text-ok",
  pending: "bg-gold/25",
  missing: "bg-drift/15 text-drift",
  expired: "bg-drift/15 text-drift",
  revoked: "bg-drift/15 text-drift",
  lane_not_permitted: "bg-gold/25",
};
const LABEL: Record<string, string> = {
  not_required: "no consent needed", signed: "consent signed", pending: "consent pending", missing: "consent missing",
  expired: "consent expired", revoked: "consent revoked", lane_not_permitted: "lane not permitted",
};

export function BibleChip({ state }: { state: string | null }) {
  const s = state ?? "not_required";
  return <span className={`inline-block rounded px-2 py-0.5 text-xs ${STYLE[s] ?? ""}`}>{LABEL[s] ?? s}</span>;
}
