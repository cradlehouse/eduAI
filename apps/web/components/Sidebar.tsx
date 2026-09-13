"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { TokenBar, TokenRing, type Budget } from "./TokenMeter";

// The left menu: expanded (icons + labels) or an icon rail, remembered per browser. Rows read the
// state through context so the layouts stay plain server components.
const Collapsed = createContext(false);
export const useCollapsed = () => useContext(Collapsed);

export function Sidebar({ budget, title, children }: { budget?: Budget | null; title: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { try { setCollapsed(localStorage.getItem("eduai.sidebar") === "rail"); } catch { /* no storage */ } }, []);
  const toggle = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem("eduai.sidebar", n ? "rail" : "open"); } catch { /* ignore */ } return n; });
  return (
    <Collapsed.Provider value={collapsed}>
      <aside className={`panel m-3 flex shrink-0 flex-col p-3 ${collapsed ? "w-[68px]" : "w-60"}`}>
        <button type="button" onClick={toggle} aria-label={collapsed ? "Expand menu" : "Collapse menu"} title={collapsed ? "Expand menu" : "Collapse menu"}
                className={`mb-2 rounded-full p-1.5 text-muted hover:bg-card ${collapsed ? "self-center" : "self-end"}`}>
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        {budget && (collapsed
          ? <div className="mb-3 self-center" title={`${budget.spent.toLocaleString()} used · ${(budget.total - budget.spent).toLocaleString()} tokens left`}><TokenRing spent={budget.spent} total={budget.total} size={36} /></div>
          : <div className="card mb-3 flex items-center gap-3 p-3"><TokenRing spent={budget.spent} total={budget.total} size={40} /><div className="min-w-0 flex-1"><TokenBar {...budget} /></div></div>)}
        {!collapsed && <div className="display mb-1 px-3 text-sm">{title}</div>}
        {children}
      </aside>
    </Collapsed.Provider>
  );
}

// Small print that only makes sense with labels showing (hidden in the rail).
export function SidebarNote({ children }: { children: React.ReactNode }) {
  const collapsed = useCollapsed();
  if (collapsed) return null;
  return <div className="mt-3 px-3 text-[11px] text-muted">{children}</div>;
}
