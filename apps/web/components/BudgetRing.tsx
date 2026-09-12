// Tokens, never money: students and instructors see tokens; the money rate is admin-only.
// Colour is always the money token so the ring reads the same everywhere.
export function BudgetRing({ spent, total, scope }: { spent: number; total: number; scope: "project" | "personal" }) {
  const pct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;
  const r = 26, c = 2 * Math.PI * r;
  const fmt = (n: number) => n.toLocaleString();
  return (
    <div className="flex items-center gap-3" aria-label={`${scope} budget: ${fmt(spent)} of ${fmt(total)} tokens used`}>
      <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-money)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 32 32)" />
        <text x="32" y="36" textAnchor="middle" fontSize="12" fill="currentColor">{pct}%</text>
      </svg>
      <div className="text-sm leading-tight">
        <div><span className="font-medium">{fmt(total - spent)}</span> <span className="opacity-60">of {fmt(total)} tokens</span></div>
        <div className="text-xs opacity-60">{scope === "project" ? "project budget" : "your budget"} · left</div>
      </div>
    </div>
  );
}
