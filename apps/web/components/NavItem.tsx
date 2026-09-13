"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCollapsed } from "./Sidebar";

import { ArrowLeft, BookMarked, BookOpen, Building2, CalendarDays, Clapperboard, Coins, Cpu, FileText, Film, GraduationCap, Home, KeyRound,
         LayoutGrid, ListChecks, PackageCheck, Scissors, Send, Settings, UserRound, Users, Video } from "lucide-react";

// Icons are named, not passed as components: layouts are server components and a function prop
// cannot cross into this client component. Add a name here to use it in a sidebar.
const ICONS = { ArrowLeft, BookMarked, BookOpen, Building2, CalendarDays, Clapperboard, Coins, Cpu, FileText, Film, GraduationCap, Home, KeyRound,
                LayoutGrid, ListChecks, PackageCheck, Scissors, Send, Settings, UserRound, Users, Video };
export type IconName = keyof typeof ICONS;

// Sidebar rows: optional icon (lucide, 16px, inherits colour) + label + a small right-hand mark.
export function NavItem({ href, exact, mark, icon, children }: { href: string; exact?: boolean; mark?: string; icon?: IconName; children: React.ReactNode }) {
  const Icon = icon ? ICONS[icon] : null;
  const collapsed = useCollapsed();
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  if (collapsed) {
    const label = typeof children === "string" ? children : undefined;
    return (
      <Link href={href} title={label} aria-label={label} className={`mx-auto my-0.5 grid h-9 w-9 place-items-center rounded-full ${active ? "bg-ink text-paper" : "hover:bg-card"}`}>
        {Icon ? <Icon size={18} strokeWidth={1.75} aria-hidden /> : <span className="display text-xs">{label?.[0] ?? "•"}</span>}
      </Link>
    );
  }
  return (
    <Link href={href} className={`flex items-center justify-between rounded-full px-3 py-1 text-sm ${active ? "bg-ink text-paper" : "hover:bg-card"}`}>
      <span className="flex min-w-0 items-center gap-2">{Icon && <Icon size={16} strokeWidth={1.75} className="shrink-0 opacity-80" aria-hidden />}<span className="truncate">{children}</span></span>
      {mark && <span className={`ml-2 shrink-0 text-[10px] ${active ? "text-paper/70" : "text-muted"}`}>{mark}</span>}
    </Link>
  );
}
export function NavSoon({ label, when, icon }: { label: string; when: string; icon?: IconName }) {
  const Icon = icon ? ICONS[icon] : null;
  const collapsed = useCollapsed();
  if (collapsed) return <span title={`${label} · ${when}`} className="mx-auto my-0.5 grid h-9 w-9 place-items-center rounded-full opacity-40">{Icon ? <Icon size={18} strokeWidth={1.75} aria-hidden /> : "·"}</span>;
  return (
    <span className="flex items-center justify-between rounded-full px-3 py-1 text-sm opacity-40">
      <span className="flex items-center gap-2">{Icon && <Icon size={16} strokeWidth={1.75} className="shrink-0" aria-hidden />}<span>{label}</span></span>
      <span className="text-[10px]">{when}</span>
    </span>
  );
}
export function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const collapsed = useCollapsed();
  if (collapsed) return <div className="mt-2 border-t border-line pt-2" title={title}>{children}</div>;
  return <div className="mt-3"><div className="label mb-1 px-3">{title}</div>{children}</div>;
}
