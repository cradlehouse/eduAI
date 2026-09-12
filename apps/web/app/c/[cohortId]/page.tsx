import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import { createClient } from "@/lib/supabase/server";

export default async function CohortStub({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const supabase = await createClient();
  const { data: cohort } = await supabase.from("cohorts").select("name, starts_on, projects(id, title)").eq("id", cohortId).maybeSingle();
  if (!cohort) notFound();
  return (
    <Card title={cohort.name}>
      <p className="mb-2 text-sm">Starts {cohort.starts_on ?? "TBD"}. {cohort.projects.length} project(s).</p>
      <p className="mt-4 text-xs opacity-60">Instructor shell (cohort grid, review queue, budgets) arrives in Phase 2.</p>
    </Card>
  );
}
