import { notFound, redirect } from "next/navigation";
import { getProject } from "@/lib/projects/data";
import { getNav } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/Shell";
import { SidebarNote } from "@/components/Sidebar";
import { normName, speakersIn } from "@/lib/script/screenplay";

const SECTIONS = { "": "Script", cast: "Cast", locations: "Locations", places: "Locations", props: "Props", bible: "Cast", scenes: "Scenes", shoot: "Scenes", shots: "Scenes", edit: "Edit", members: "Crew" };

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [data, nav] = await Promise.all([getProject(projectId), getNav()]);
  if (!data || !nav) notFound();
  if (!nav.cohorts.some((c) => c.id === data.project.cohort_id) && !data.isMember) redirect("/");
  const { project, budget, isMember } = data;
  const manage = nav.cohorts.find((c) => c.id === project.cohort_id)?.manage ?? false;
  const supabase = await createClient();
  // Sibling projects for the header dropdown: mine in this cohort, or all of them for instructors.
  const [{ data: sib }, { data: entries }, { data: scenes }, { data: proj }] = await Promise.all([
    manage
      ? supabase.from("projects").select("id, title").eq("cohort_id", project.cohort_id).order("title")
      : Promise.resolve({ data: nav.myProjects.filter((p) => p.cohort_id === project.cohort_id).map((p) => ({ id: p.id, title: p.title })) }),
    supabase.from("bible_entries").select("kind, name, reference_asset_id, voice_asset_id").eq("project_id", projectId),
    supabase.from("shots").select("selected_take_id").eq("project_id", projectId),
    supabase.from("projects").select("script").eq("id", projectId).maybeSingle(),
  ]);
  // Each step: done (tick), waiting on something (gold dot), or neither.
  type S = "done" | "todo" | "";
  const of = (k: string) => (entries ?? []).filter((e) => e.kind === k);
  const built = (k: string): S => (of(k).length === 0 ? "" : of(k).every((e) => e.reference_asset_id) ? "done" : "todo");
  const shots = scenes ?? [];
  const speaking = speakersIn(proj?.script ?? "");
  const steps: Record<"script" | "cast" | "locations" | "props" | "scenes" | "edit", S> = {
    script: proj?.script?.trim() && (entries ?? []).length ? "done" : "todo",
    // Cast is done when everyone has a look and everyone with a line has a voice.
    cast: of("character").length === 0 ? "" : of("character").every((e) => e.reference_asset_id && (e.voice_asset_id || !speaking.has(normName(e.name)))) ? "done" : "todo",
    locations: built("location"),
    props: of("prop").length && of("prop").every((e) => e.reference_asset_id) ? "done" : "",
    scenes: shots.length === 0 ? "" : shots.every((s) => s.selected_take_id) ? "done" : "todo",
    edit: "",
  };
  const base = `/p/${projectId}`;
  const cohortName = project.cohorts?.name ?? "Cohort";

  return (
    <Shell nav={nav}
      crumbs={[{ label: nav.org?.name ?? "Imaje", href: "/home", image: nav.org?.mark_url }, { label: cohortName, href: `/c/${project.cohort_id}` },
               { label: project.title, href: base, siblings: (sib ?? []).map((p) => ({ id: p.id, label: p.title, href: `/p/${p.id}` })) }]}
      base={base} sections={SECTIONS} flush
      budget={budget ? { spent: budget.spent_tokens ?? 0, total: budget.total_tokens ?? 0, scope: budget.scope } : null}
      scope={{ cohortId: project.cohort_id, projectId }}
      steps={steps}
      note={!isMember ? <SidebarNote>You&apos;re not on this crew; you&apos;re here as {manage ? "an instructor" : "a viewer"}.</SidebarNote> : null}>
      {children}
    </Shell>
  );
}
