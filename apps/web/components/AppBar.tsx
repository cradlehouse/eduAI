import Link from "next/link";
import type { Nav } from "@/lib/auth/nav";

export type Crumb = { href?: string; label: string };

// One bar on every shell: where you are, and how to move between Admin, cohorts and projects.
export function AppBar({ nav, crumbs, area }: { nav: Nav; crumbs: Crumb[]; area: "admin" | "cohort" | "project" }) {
  const seg = (active: boolean) => `pill ${active ? "bg-ink text-paper" : "text-ink hover:bg-line"}`;
  return (
    <header className="flex items-center gap-4 border-b border-line bg-sand px-5 py-2 text-sm">
      <Link href="/" className="display text-base">eduai</Link>
      <nav className="flex items-center gap-1 text-muted">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="opacity-50">/</span>}
            {c.href ? <Link href={c.href} className="text-ink hover:underline">{c.label}</Link> : <span className="text-ink">{c.label}</span>}
          </span>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-1">
        {nav.isAdmin && <Link href="/org" className={seg(area === "admin")}>Admin</Link>}
        {nav.cohorts.length === 1 && <Link href={`/c/${nav.cohorts[0].id}`} className={seg(area === "cohort")}>{nav.cohorts[0].name}</Link>}
        {nav.cohorts.length > 1 && (
          <details className="relative">
            <summary className={`${seg(area === "cohort")} cursor-pointer list-none`}>Cohorts ▾</summary>
            <div className="card absolute right-0 z-10 mt-1 flex min-w-48 flex-col p-1">
              {nav.cohorts.map((c) => <Link key={c.id} href={`/c/${c.id}`} className="rounded-full px-3 py-1 hover:bg-sand">{c.name}</Link>)}
            </div>
          </details>
        )}
        {nav.projects.length === 1 && <Link href={`/p/${nav.projects[0].id}`} className={seg(area === "project")}>{nav.projects[0].title}</Link>}
        {nav.projects.length > 1 && (
          <details className="relative">
            <summary className={`${seg(area === "project")} cursor-pointer list-none`}>Projects ▾</summary>
            <div className="card absolute right-0 z-10 mt-1 flex min-w-48 flex-col p-1">
              {nav.projects.map((p) => <Link key={p.id} href={`/p/${p.id}`} className="rounded-full px-3 py-1 hover:bg-sand">{p.title}</Link>)}
            </div>
          </details>
        )}
      </div>
    </header>
  );
}
