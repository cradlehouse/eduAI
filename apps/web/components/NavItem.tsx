"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Building2, CalendarDays, Clapperboard, Film, GraduationCap, Home, KeyRound, LayoutGrid, UserRound, Users } from "lucide-react";

// Icons are named, not passed as components: the tree is a server component and a function prop
// cannot cross into this client row. Add a name here to use it.
const ICONS = { BookOpen, Building2, CalendarDays, Clapperboard, Film, GraduationCap, Home, KeyRound, LayoutGrid, UserRound, Users };
export type IconName = keyof typeof ICONS;

// One row of the tree. depth indents; below the lg breakpoint the sidebar is an icon rail, so the
// label hides and the title carries it.
export function NavItem({ href, exact, mark, icon, depth = 0, children }: { href: string; exact?: boolean; mark?: string; icon?: IconName; depth?: number; children: React.ReactNode }) {
  const Icon = icon ? ICONS[icon] : null;
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  const label = typeof children === "string" ? children : undefined;
  return (
    <Link href={href} title={label} className={`flex items-center justify-between rounded-full py-1 pr-3 text-sm lg:pl-3 ${active ? "bg-ink text-paper" : "hover:bg-card"}`}
          style={{ paddingLeft: undefined }}>
      <span className="flex min-w-0 items-center gap-2 pl-3 lg:pl-0" style={{ marginLeft: depth * 14 }}>
        {Icon ? <Icon size={16} strokeWidth={1.75} className="shrink-0 opacity-80" aria-hidden /> : <span className="inline-block h-4 w-4 shrink-0 text-center text-xs opacity-50">·</span>}
        <span className="nav-label hidden truncate lg:inline">{children}</span>
      </span>
      {mark && <span className={`nav-mark ml-2 hidden shrink-0 text-[10px] lg:inline ${active ? "text-paper/70" : "text-muted"}`}>{mark}</span>}
    </Link>
  );
}
export function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-3"><div className="nav-title label mb-1 hidden px-3 lg:block">{title}</div><div className="nav-rule my-2 border-t border-line lg:hidden" />{children}</div>;
}
