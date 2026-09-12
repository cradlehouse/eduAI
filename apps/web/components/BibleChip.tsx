// Consent state is the FIRST thing you see on a consent-bearing entry. Red blocks Generate.
const STYLE: Record<string, string> = {
  not_required: "bg-ink/5 dark:bg-paper/10",
  signed: "bg-money/15 text-money",
  pending: "bg-accent/20",
  missing: "bg-danger/15 text-danger",
  expired: "bg-danger/15 text-danger",
  revoked: "bg-danger/15 text-danger",
  lane_not_permitted: "bg-accent/20",
};
const LABEL: Record<string, string> = {
  not_required: "no consent needed", signed: "consent signed", pending: "consent pending", missing: "consent missing",
  expired: "consent expired", revoked: "consent revoked", lane_not_permitted: "lane not permitted",
};

export function BibleChip({ state }: { state: string | null }) {
  const s = state ?? "not_required";
  return <span className={`inline-block rounded px-2 py-0.5 text-xs ${STYLE[s] ?? ""}`}>{LABEL[s] ?? s}</span>;
}
