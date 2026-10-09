// Line-by-line comparison of two drafts of a script (longest common subsequence). Scripts are a few
// hundred lines, so the plain O(n·m) table is fine.

export type DiffLine = { kind: "same" | "added" | "removed"; text: string };

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.replace(/\s+$/, "").split("\n");
  const b = after.replace(/\s+$/, "").split("\n");
  const n = a.length, m = b.length;
  const t: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ kind: "same", text: a[i] }); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) out.push({ kind: "removed", text: a[i++] });
    else out.push({ kind: "added", text: b[j++] });
  }
  while (i < n) out.push({ kind: "removed", text: a[i++] });
  while (j < m) out.push({ kind: "added", text: b[j++] });
  return out;
}

// Only the changed lines with a little context, and how many lines changed each way.
export function changedHunks(lines: DiffLine[], context = 2) {
  const keep = new Set<number>();
  lines.forEach((l, k) => { if (l.kind !== "same") for (let x = k - context; x <= k + context; x++) keep.add(x); });
  const shown: (DiffLine | { kind: "gap" })[] = [];
  let last = -2;
  lines.forEach((l, k) => { if (keep.has(k)) { if (k > last + 1 && shown.length) shown.push({ kind: "gap" }); shown.push(l); last = k; } });
  return { shown, added: lines.filter((l) => l.kind === "added").length, removed: lines.filter((l) => l.kind === "removed").length };
}
