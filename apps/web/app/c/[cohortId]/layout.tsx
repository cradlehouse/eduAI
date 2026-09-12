import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { getNav } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/server";
import { MeUnit, RoleMenus } from "@/components/RailExtras";

const NAV = [
  { seg: "", label: "Cohort" },
  { seg: "projects", label: "Projects" },
  { seg: "review", label: "Review queue", soon: "Phase 2" },
  { seg: "budgets", label: "Budgets", soon: "Phase 2" },
  { seg: "release", label: "Release", soon: "Phase 3" },
  { seg: "integrity", label: "Integrity", soon: "Phase 2" },
  { seg: "evidence", label: "Evidence", soon: "Phase 4" },
];

export default async function CohortLayout({ children, params }: { children: React.ReactNode; params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const nav = await getNav();
  if (!nav) redirect("/login");
  const supabase = await createClient();
  const { data: cohort } = await supabase.from("cohorts").select("id, name").eq("id", cohortId).maybeSingle();
  if (!cohort) notFound();
  const canManage = nav.isAdmin || nav.cohorts.some((c) => c.id === cohortId);
  if (!canManage) redirect("/");   // students don't get the instructor shell

  return (
    <div className="flex min-h-screen flex-col">
      <AppBar nav={nav} area="cohort" crumbs={[{ label: "Cohorts", href: nav.isAdmin ? "/org/cohorts" : undefined }, { label: cohort.name }]} />
      <div className="flex flex-1">
        <aside className="panel m-3 flex w-56 shrink-0 flex-col p-4">
          <div className="mb-4">
            <div className="label">Instructor</div>
            <div className="display">{cohort.name}</div>
          </div>
          <nav className="flex flex-col gap-1 text-sm">
            {NAV.map((n) => n.soon
              ? <span key={n.seg} className="rounded-full px-3 py-1 opacity-40">{n.label} <span className="text-xs">{n.soon}</span></span>
              : <Link key={n.seg} href={`/c/${cohortId}${n.seg ? `/${n.seg}` : ""}`} className="rounded-full px-3 py-1 hover:bg-card">{n.label}</Link>)}
          </nav>
          <RoleMenus nav={nav} cohortId={cohortId} hide="cohort" />
          <div className="mt-auto"><MeUnit nav={nav} /></div>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
