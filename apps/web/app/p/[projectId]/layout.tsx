import { notFound, redirect } from "next/navigation";
import { getProject } from "@/lib/projects/data";
import { getNav } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/Shell";
import { SidebarNote } from "@/components/Sidebar";
import { BibleRail, type BibleRow } from "@/components/BibleRail";

const SECTIONS = { "": "Scenes", bible: "Bible", scenes: "Scenes", shoot: "Scenes", shots: "Scenes", members: "Members" };

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [data, nav] = await Promise.all([getProject(projectId), getNav()]);
  if (!data || !nav) notFound();
  if (!nav.cohorts.some((c) => c.id === data.project.cohort_id) && !data.isMember) redirect("/");
  const { project, budget, isMember } = data;
  const manage = nav.cohorts.find((c) => c.id === project.cohort_id)?.manage ?? false;
  const supabase = await createClient();
  // Sibling projects for the header dropdown: mine in this cohort, or all of them for instructors.
  // The bible rail wants every entry plus which cut each is pinned to; the first cut is the default.
  const [{ data: sib }, { data: entries }, { data: shots }, { data: scenes }] = await Promise.all([
    manage
      ? supabase.from("projects").select("id, title").eq("cohort_id", project.cohort_id).order("title")
      : Promise.resolve({ data: nav.myProjects.filter((p) => p.cohort_id === project.cohort_id).map((p) => ({ id: p.id, title: p.title })) }),
    supabase.from("bible_entry_status").select("id, kind, name, reference_asset_id, consent_state, requires_consent").eq("project_id", projectId).order("kind").order("name"),
    supabase.from("shots").select("id, scene_id, position").eq("project_id", projectId).order("position"),
    supabase.from("scenes").select("id, position").eq("project_id", projectId).order("position"),
  ]);
  const shotIds = (shots ?? []).map((s) => s.id);
  const { data: links } = shotIds.length ? await supabase.from("shot_bible_entries").select("shot_id, bible_entry_id").in("shot_id", shotIds) : { data: [] as { shot_id: string; bible_entry_id: string }[] };
  const linksByShot: Record<string, string[]> = {};
  for (const l of links ?? []) (linksByShot[l.shot_id] ??= []).push(l.bible_entry_id);
  const firstScene = (scenes ?? [])[0]?.id;
  const defaultCutId = (shots ?? []).find((s) => s.scene_id === firstScene)?.id ?? (shots ?? [])[0]?.id ?? null;
  const rail = ((entries ?? []).filter((e) => e.id && e.kind && e.name) as BibleRow[]);
  const base = `/p/${projectId}`;
  const cohortName = project.cohorts?.name ?? "Cohort";

  return (
    <Shell nav={nav}
      crumbs={[{ label: nav.org?.name ?? "Imaje", href: "/home", image: nav.org?.mark_url }, { label: cohortName, href: `/c/${project.cohort_id}` },
               { label: project.title, href: base, siblings: (sib ?? []).map((p) => ({ id: p.id, label: p.title, href: `/p/${p.id}` })) }]}
      base={base} sections={SECTIONS} flush
      budget={budget ? { spent: budget.spent_tokens ?? 0, total: budget.total_tokens ?? 0, scope: budget.scope } : null}
      scope={{ cohortId: project.cohort_id, projectId }}
      panel={<BibleRail projectId={projectId} entries={rail} linksByShot={linksByShot} defaultCutId={defaultCutId} />}
      note={!isMember ? <SidebarNote>You&apos;re not on this crew; you&apos;re here as {manage ? "an instructor" : "a viewer"}.</SidebarNote> : null}>
      {children}
    </Shell>
  );
}
