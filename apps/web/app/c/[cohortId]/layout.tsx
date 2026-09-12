import { notFound, redirect } from "next/navigation";
import { getNav } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";

export default async function CohortLayout({ children, params }: { children: React.ReactNode; params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const nav = await getNav();
  if (!nav) redirect("/login");
  const supabase = await createClient();
  const { data: cohort } = await supabase.from("cohorts").select("id").eq("id", cohortId).maybeSingle();
  if (!cohort) notFound();
  if (!(nav.isAdmin || nav.cohorts.some((c) => c.id === cohortId))) redirect("/");
  return (
    <div className="flex min-h-screen">
      <Sidebar nav={nav} ctx={{ cohortId }} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
