import Link from "next/link";

export type ShotCardData = {
  id: string; label: string; description: string; duration_target_s: number | null;
  intent: unknown; selected_take_id: string | null; bibleCount: number; takeCount: number;
};

function intentComplete(intent: unknown): boolean {
  const i = (intent ?? {}) as Record<string, unknown>;
  return !!(i.objective && i.continuity && i.camera_language);
}

// Storyboard grid unit. Shows what the console will need before Generate: intent, bible links, takes.
export function ShotCard({ projectId, shot }: { projectId: string; shot: ShotCardData }) {
  const ready = intentComplete(shot.intent);
  return (
    <Link href={`/p/${projectId}/shots/${shot.id}`} className="block rounded-lg border border-ink/10 p-3 hover:bg-ink/5 dark:border-paper/15 dark:hover:bg-paper/10">
      <div className="mb-2 flex h-24 items-center justify-center rounded bg-ink/5 text-xs opacity-60 dark:bg-paper/10">
        {shot.selected_take_id ? "selected take" : shot.takeCount > 0 ? `${shot.takeCount} take(s)` : "no takes yet"}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="font-medium">{shot.label || "untitled"}</span>
        {shot.duration_target_s != null && <span className="text-xs opacity-60">{shot.duration_target_s}s</span>}
      </div>
      {shot.description && <p className="mt-1 line-clamp-2 text-xs opacity-70">{shot.description}</p>}
      <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
        <span className={`rounded px-1.5 py-0.5 ${ready ? "bg-money/15 text-money" : "bg-accent/20"}`}>{ready ? "intent set" : "intent incomplete"}</span>
        <span className="rounded bg-ink/5 px-1.5 py-0.5 dark:bg-paper/10">{shot.bibleCount} bible</span>
      </div>
    </Link>
  );
}
