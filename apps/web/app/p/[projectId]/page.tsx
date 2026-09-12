import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectStub({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("title, logline, cohorts(name)").eq("id", projectId).maybeSingle();
  if (!project) notFound();
  return (
    <Card title={project.title}>
      <p className="mb-2 text-sm opacity-80">{project.logline}</p>
      <p className="text-sm">Cohort: {project.cohorts?.name}</p>
      <p className="mt-4 text-xs opacity-60">Student shell (rail, budget ring, module brief) arrives in P1-05.</p>
    </Card>
  );
}
