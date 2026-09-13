import { notFound, redirect } from "next/navigation";
import { getNav } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/Shell";

const SECTIONS = { "": "Home", team: "Team", projects: "Projects", schedule: "Schedule" };

export default async function CohortLayout({ children, params }: { children: React.ReactNode; params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const nav = await getNav();
  if (!nav) redirect("/login");
  const me = nav.cohorts.find((c) => c.id === cohortId);
  if (!me) notFound();
  const supabase = await createClient();
  const [{ data: cohort }, { data: personal }] = await Promise.all([
    supabase.from("cohorts").select("id, name").eq("id", cohortId).maybeSingle(),
    supabase.from("personal_tokens").select("total_tokens, spent_tokens").eq("cohort_id", cohortId).eq("user_id", nav.userId).maybeSingle(),
  ]);
  if (!cohort) notFound();
  const base = `/c/${cohortId}`;
  const siblings = nav.cohorts.map((c) => ({ id: c.id, label: c.name, href: `/c/${c.id}` }));

  return (
    <Shell nav={nav}
      crumbs={[{ label: nav.org?.name ?? "Imaje", href: "/home", image: nav.org?.mark_url }, { label: cohort.name, href: base, siblings }]}
      base={base} sections={SECTIONS}
      budget={personal ? { spent: personal.spent_tokens ?? 0, total: personal.total_tokens ?? 0, scope: "personal" } : null}
      scope={{ cohortId }}>
      {children}
    </Shell>
  );
}
