import Link from "next/link";
import type { Nav } from "@/lib/auth/nav";
import { Crumb, type CrumbSeg } from "./Crumb";
import type { Budget } from "./TokenMeter";
import { Sidebar } from "./Sidebar";
import { AppTree, type Scope } from "./AppTree";
import { ProjectPanel } from "./ProjectPanel";
import { signOut } from "@/app/welcome/actions";
import { SessionGuard } from "./SessionGuard";

// Global header (breadcrumb = scope switcher, avatar menu top right) + the one app tree on the left,
// opened along the current scope. Layouts only say where they are. `panel` is extra content for the
// project slide-out (the bible rail); `flush` lets a page own the whole canvas.
export function Shell({ nav, crumbs, base, sections, scope = {}, note, budget, panel, flush, children }: {
  nav: Nav; crumbs: CrumbSeg[]; base?: string; sections?: Record<string, string>; scope?: Scope;
  note?: React.ReactNode; budget?: Budget | null; panel?: React.ReactNode; flush?: boolean; children: React.ReactNode;
}) {
  const role = nav.isAdmin ? "admin" : nav.isInstructor ? "instructor" : "apprentice";
  const name = nav.email.split("@")[0];
  return (
    <div className="flex min-h-screen flex-col">
      <SessionGuard userId={nav.userId} />
      <header className="glass m-3 mb-0 flex items-center gap-4 rounded-[10px] px-4 py-2">
        <Link href="/" className="display text-[15px]">Imaje</Link>
        <Crumb segs={crumbs} base={base} sections={sections} />
        <details className="relative ml-auto">
          <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full bg-field text-xs text-ink">{(name[0] ?? "?").toUpperCase()}</summary>
          <div className="card absolute right-0 z-20 mt-1 flex min-w-56 flex-col p-2 text-sm">
            <div className="px-2 py-1 text-xs text-dim">{nav.email}<br />{role} · {nav.org?.name}</div>
            <Link href="/home" className="rounded-[6px] px-2 py-1 hover:bg-field">Home</Link>
            {nav.isAdmin && <Link href="/org" className="rounded-[6px] px-2 py-1 hover:bg-field">Organisation</Link>}
            <Link href="/account" className="rounded-[6px] px-2 py-1 hover:bg-field">Account</Link>
            <form action={signOut}><button className="w-full rounded-[6px] px-2 py-1 text-left hover:bg-field" type="submit">Sign out</button></form>
          </div>
        </details>
      </header>
      <div className="flex flex-1">
        {scope.projectId && scope.cohortId ? (
          <>
            <Sidebar rail><AppTree nav={nav} scope={scope} /></Sidebar>
            <ProjectPanel nav={nav} cohortId={scope.cohortId} projectId={scope.projectId} budget={budget} note={note}>{panel}</ProjectPanel>
          </>
        ) : (
          <Sidebar budget={budget}><AppTree nav={nav} scope={scope} />{note}</Sidebar>
        )}
        <main className={`min-w-0 flex-1 ${flush ? "canvas my-3 mr-3 rounded-[10px] border border-glass-edge p-5" : "p-8"}`}>{children}</main>
      </div>
    </div>
  );
}
