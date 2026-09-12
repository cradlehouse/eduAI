"use client";
import { useRouter } from "next/navigation";

export function ProjectSwitcher({ current, projects }: { current: string; projects: { id: string; title: string; cohorts: { name: string } | null }[] }) {
  const router = useRouter();
  if (projects.length <= 1) {
    const p = projects[0];
    return <div className="text-sm"><div className="font-semibold">{p?.title}</div><div className="text-xs opacity-60">{p?.cohorts?.name}</div></div>;
  }
  return (
    <select
      aria-label="Project"
      value={current}
      onChange={(e) => router.push(`/p/${e.target.value}`)}
      className="w-full rounded border border-ink/20 bg-white px-2 py-1 text-sm text-ink dark:border-paper/20"
    >
      {projects.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.cohorts?.name}</option>)}
    </select>
  );
}
