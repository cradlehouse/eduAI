import Link from "next/link";
import type { Nav } from "@/lib/auth/nav";
import { signOut } from "@/app/welcome/actions";

// The role menus that stay with an instructor/admin wherever they go, including inside the
// student view. Compact: small headings, one line per link.
export function RoleMenus({ nav, cohortId, hide }: { nav: Nav; cohortId?: string | null; hide?: "admin" | "cohort" }) {
  const cohort = cohortId ? nav.cohorts.find((c) => c.id === cohortId) : null;
  const showCohort = hide !== "cohort" && (cohort || nav.cohorts.length > 0);
  const showAdmin = hide !== "admin" && nav.isAdmin;
  if (!showCohort && !showAdmin) return null;
  const link = "block rounded-full px-3 py-0.5 text-xs hover:bg-card";
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
      {showCohort && (
        <div>
          <div className="label mb-1">Instructor</div>
          {cohort ? (
            <>
              <Link href={`/c/${cohort.id}`} className={link}>{cohort.name}</Link>
              <Link href={`/c/${cohort.id}/projects`} className={link}>Projects</Link>
            </>
          ) : nav.cohorts.slice(0, 4).map((c) => <Link key={c.id} href={`/c/${c.id}`} className={link}>{c.name}</Link>)}
        </div>
      )}
      {showAdmin && (
        <div>
          <div className="label mb-1">Admin</div>
          <Link href="/org" className={link}>Organisation</Link>
          <Link href="/org/people" className={link}>People</Link>
          <Link href="/org/cohorts" className={link}>Cohorts</Link>
        </div>
      )}
    </div>
  );
}

// Bottom-left of every rail: who you are, as what, and sign out. Small on purpose.
export function MeUnit({ nav }: { nav: Nav }) {
  const role = nav.isAdmin ? "admin" : nav.isInstructor ? "instructor" : "apprentice";
  const initial = (nav.email[0] ?? "?").toUpperCase();
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
      <span className="display flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs text-paper">{initial}</span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[11px]">{nav.email}</div>
        <div className="text-[10px] text-muted">{role}</div>
      </div>
      <form action={signOut}><button type="submit" className="text-[10px] text-muted underline" title="Sign out">out</button></form>
    </div>
  );
}
