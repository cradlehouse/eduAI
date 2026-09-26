"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Clapperboard, FileText, Film, GraduationCap, Package, UserRound, Users } from "lucide-react";
import { TokenRing, type Budget } from "./TokenMeter";

// The film's steps, in order, as one icon column: Script → Cast → Locations → Props → Scenes → Edit.
// A gold dot means that step has something waiting; a tick means it's done. Crew and the way back to
// the cohort sit at the bottom with the budget. Phones get the same steps as a row.
export type StepState = "done" | "todo" | "";
export type Steps = { script: StepState; cast: StepState; locations: StepState; props: StepState; scenes: StepState; edit: StepState };

const STEPS = [
  { key: "script", label: "Script", path: "", Icon: FileText },
  { key: "cast", label: "Cast", path: "cast", Icon: UserRound },
  { key: "locations", label: "Locations", path: "locations", Icon: Building2 },
  { key: "props", label: "Props", path: "props", Icon: Package },
  { key: "scenes", label: "Scenes", path: "scenes", Icon: Clapperboard },
  { key: "edit", label: "Edit", path: "edit", Icon: Film },
] as const;

function Step({ href, label, active, state, Icon, row }: { href: string; label: string; active: boolean; state: StepState; Icon: typeof FileText; row?: boolean }) {
  return (
    <Link href={href} title={label} aria-current={active ? "page" : undefined}
          className={`relative flex shrink-0 flex-col items-center gap-1 rounded-[8px] text-[10px] transition-colors ${row ? "w-14 py-1.5" : "w-[52px] py-2"} ${active ? "bg-field text-gold" : state === "done" ? "text-ink hover:bg-field" : "text-dim hover:bg-field"}`}>
      {state === "todo" && <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-gold" aria-label="needs something" />}
      {state === "done" && <span className="absolute right-1.5 top-0.5 text-[9px] text-ok" aria-label="done">✓</span>}
      <Icon size={18} strokeWidth={1.6} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}

export function StepRail({ base, steps, budget, cohortHref, row }: { base: string; steps: Steps; budget?: Budget | null; cohortHref: string; row?: boolean }) {
  const path = usePathname();
  const rest = path.startsWith(base) ? path.slice(base.length).replace(/^\//, "") : "";
  const first = rest.split("/")[0] ?? "";
  const isActive = (p: string) => (p === "" ? first === "" : first === p || (p === "scenes" && ["shots", "shoot"].includes(first)));
  const items = STEPS.map((s) => <Step key={s.key} href={s.path ? `${base}/${s.path}` : base} label={s.label} Icon={s.Icon} state={steps[s.key]} active={isActive(s.path)} row={row} />);
  if (row) return <nav aria-label="Film steps" className="flex gap-1 overflow-x-auto">{items}</nav>;
  return (
    <nav aria-label="Film steps" className="panel m-3 mr-0 flex w-[68px] shrink-0 flex-col items-center gap-1 px-2 py-3">
      {items}
      <div className="flex-1" />
      <Step href={`${base}/members`} label="Crew" Icon={Users} state="" active={first === "members"} />
      <Step href={cohortHref} label="Cohort" Icon={GraduationCap} state="" active={false} />
      {budget && <div className="mt-2" title={`${budget.spent.toLocaleString()} of ${budget.total.toLocaleString()} tokens used`}><TokenRing spent={budget.spent} total={budget.total} size={34} /></div>}
    </nav>
  );
}
