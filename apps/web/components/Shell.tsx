import Link from "next/link";
import type { Nav } from "@/lib/auth/nav";
import { Crumb, type CrumbSeg } from "./Crumb";
import type { Budget } from "./TokenMeter";
import { Sidebar } from "./Sidebar";
import { signOut } from "@/app/welcome/actions";
import { SessionGuard } from "./SessionGuard";

// Global header (breadcrumb = scope switcher, avatar menu top right) + a sidebar: the token meter on top,
// then the current scope's sections passed in by the layout.
export function Shell({ nav, crumbs, base, sections, sidebarTitle, sidebar, budget, children }: {
  nav: Nav; crumbs: CrumbSeg[]; base?: string; sections?: Record<string, string>; sidebarTitle: string;
  sidebar: React.ReactNode; budget?: Budget | null; children: React.ReactNode;
}) {
  const role = nav.isAdmin ? "admin" : nav.isInstructor ? "instructor" : "apprentice";
  const name = nav.email.split("@")[0];
  return (
    <div className="flex min-h-screen flex-col">
      <SessionGuard userId={nav.userId} />
      <header className="flex items-center gap-4 border-b border-line bg-card px-4 py-2">
        <Link href="/" className="display text-base">eduai</Link>
        <Crumb segs={crumbs} base={base} sections={sections} />
        <details className="relative ml-auto">
          <summary className="display flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full bg-ink text-xs text-paper">{(name[0] ?? "?").toUpperCase()}</summary>
          <div className="card absolute right-0 z-20 mt-1 flex min-w-56 flex-col p-2 text-sm">
            <div className="px-2 py-1 text-xs text-muted">{nav.email}<br />{role} · {nav.org?.name}</div>
            <Link href="/home" className="rounded-full px-2 py-1 hover:bg-sand">Home</Link>
            {nav.isAdmin && <Link href="/org" className="rounded-full px-2 py-1 hover:bg-sand">Organisation</Link>}
            <Link href="/account" className="rounded-full px-2 py-1 hover:bg-sand">Account</Link>
            <form action={signOut}><button className="w-full rounded-full px-2 py-1 text-left hover:bg-sand" type="submit">Sign out</button></form>
          </div>
        </details>
      </header>
      <div className="flex flex-1">
        <Sidebar budget={budget} title={sidebarTitle}>{sidebar}</Sidebar>
        <main className="min-w-0 flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
