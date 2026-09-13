import { TokenBar, TokenRing, type Budget } from "./TokenMeter";

// The left column. Labels and the token bar show from the lg breakpoint; below it the same tree is an
// icon rail (no toggle: width decides).
export function Sidebar({ budget, rail, children }: { budget?: Budget | null; rail?: boolean; children: React.ReactNode }) {
  return (
    <aside className={`panel m-3 flex shrink-0 flex-col p-3 ${rail ? "rail w-[68px]" : "w-[68px] lg:w-64"}`}>
      {budget && !rail && (
        <>
          <div className="mb-3 self-center lg:hidden" title={`${budget.spent.toLocaleString()} used · ${(budget.total - budget.spent).toLocaleString()} tokens left`}><TokenRing spent={budget.spent} total={budget.total} size={36} /></div>
          <div className="card mb-3 hidden items-center gap-3 p-3 lg:flex"><TokenRing spent={budget.spent} total={budget.total} size={40} /><div className="min-w-0 flex-1"><TokenBar {...budget} /></div></div>
        </>
      )}
      {children}
    </aside>
  );
}

export function SidebarNote({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 hidden px-3 text-[11px] text-muted lg:block">{children}</div>;
}
