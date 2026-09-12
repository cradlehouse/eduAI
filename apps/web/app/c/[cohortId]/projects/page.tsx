import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function CohortProjects({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const supabase = await createClient();
  const { data: projects } = await supabase.from("projects").select("id, title, logline, project_members(role, users(email, display_name))").eq("cohort_id", cohortId).order("created_at");
  return (
    <div className="max-w-3xl">
      <h1 className="display mb-1 text-2xl">Projects</h1>
      <p className="mb-6 text-sm text-muted">Open any project in the student view. A banner reminds you that you are viewing as an instructor.</p>
      <ul className="flex flex-col gap-3">
        {(projects ?? []).map((p) => (
          <li key={p.id} className="card p-4">
            <Link href={`/p/${p.id}`} className="display text-lg hover:underline">{p.title}</Link>
            {p.logline && <p className="text-sm text-muted">{p.logline}</p>}
            <p className="mt-2 text-xs text-muted">Crew: {p.project_members.map((m) => `${m.users?.display_name ?? m.users?.email} (${m.role})`).join(", ") || "nobody yet"}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
