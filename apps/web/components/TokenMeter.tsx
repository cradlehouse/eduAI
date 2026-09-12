// Tokens, never money. Students and instructors see tokens; the money rate is admin-only.
// A small ring shows how much is used; the bar underneath shows used vs left at a glance.
export type Budget = { spent: number; total: number; scope: "project" | "personal" };

export function TokenRing({ spent, total, size = 34 }: { spent: number; total: number; size?: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;
  const r = (size - 6) / 2, c = 2 * Math.PI * r, mid = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${pct}% of tokens used`}>
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--color-money)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform={`rotate(-90 ${mid} ${mid})`} />
      <text x={mid} y={mid + 3.5} textAnchor="middle" fontSize="9" fontWeight="600" fill="currentColor">{pct}%</text>
    </svg>
  );
}

export function TokenBar({ spent, total, scope }: Budget) {
  const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;
  const fmt = (n: number) => n.toLocaleString();
  return (
    <div className="text-xs" aria-label={`${scope} budget: ${fmt(spent)} of ${fmt(total)} tokens used`}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-money" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-muted">
        <span><span className="font-medium text-ink">{fmt(spent)}</span> used</span>
        <span><span className="font-medium text-ink">{fmt(total - spent)}</span> left</span>
      </div>
      <div className="text-[10px] text-muted">{fmt(total)} tokens · {scope === "project" ? "project budget" : "your budget"}</div>
    </div>
  );
}
