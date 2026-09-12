"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavItem({ href, exact, mark, children }: { href: string; exact?: boolean; mark?: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} className={`flex items-center justify-between rounded-full px-3 py-1 text-sm ${active ? "bg-ink text-paper" : "hover:bg-card"}`}>
      <span>{children}</span>
      {mark && <span className={`text-[10px] ${active ? "text-paper/70" : "text-muted"}`}>{mark}</span>}
    </Link>
  );
}
export function NavSoon({ label, when }: { label: string; when: string }) {
  return <span className="flex items-center justify-between rounded-full px-3 py-1 text-sm opacity-40"><span>{label}</span><span className="text-[10px]">{when}</span></span>;
}
export function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-3"><div className="label mb-1 px-3">{title}</div>{children}</div>;
}
