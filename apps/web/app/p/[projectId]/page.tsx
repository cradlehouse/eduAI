import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ScriptStudio } from "./ScriptStudio";

// The project starts from its script. Above it, the production at a glance: what exists and what's next.
export default async function ProjectHome({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const [{ data: project }, { data: entries }, { data: scenes }, { data: shots }] = await Promise.all([
    supabase.from("projects").select("title, logline, script").eq("id", projectId).maybeSingle(),
    supabase.from("bible_entries").select("kind, name, appearance, reference_asset_id").eq("project_id", projectId),
    supabase.from("scenes").select("id").eq("project_id", projectId),
    supabase.from("shots").select("id, selected_take_id").eq("project_id", projectId),
  ]);
  const list = entries ?? [];
  const count = (kind: string) => list.filter((e) => e.kind === kind).length;
  const unlooked = list.filter((e) => (e.kind === "character" || e.kind === "location") && !e.appearance).length;
  const unbuilt = list.filter((e) => e.kind === "location" && !e.reference_asset_id).length;
  const chosen = (shots ?? []).filter((s) => s.selected_take_id).length;
  const hasScript = !!project?.script?.trim();
  const next = !hasScript ? "Write or paste the script, then break it down."
    : count("character") + count("location") === 0 ? "Break the script down to find the cast and the places."
    : unlooked > 0 ? `${unlooked} character${unlooked === 1 ? "" : "s"} or place${unlooked === 1 ? "" : "s"} still need a description of how they look.`
    : unbuilt > 0 ? `${unbuilt} place${unbuilt === 1 ? "" : "s"} still need a master wide.`
    : "Shoot scene by scene.";
  const stage = (href: string, label: string, detail: string) => (
    <Link href={href} className="glass flex min-w-[130px] flex-1 flex-col rounded-[10px] px-3 py-2 hover:border-card-edge">
      <span className="text-[12px] font-medium">{label}</span><span className="text-[11px] text-dim">{detail}</span>
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[22px]">{project?.title}</h1>
        {project?.logline && <p className="text-[13px] text-dim">{project.logline}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {stage(`/p/${projectId}`, "1 · Script", hasScript ? "written" : "not started")}
        {stage(`/p/${projectId}/cast`, "2 · Cast", `${count("character")} characters`)}
        {stage(`/p/${projectId}/places`, "3 · Places", `${count("location")} places`)}
        {stage(`/p/${projectId}/props`, "Props", `${count("prop")} props`)}
        {stage(`/p/${projectId}/scenes`, "4 · Scenes", `${(scenes ?? []).length} scenes · ${chosen}/${(shots ?? []).length} cuts chosen`)}
      </div>
      <p className="text-[12px]"><span className="text-mute">Next · </span><span className="text-gold">{next}</span></p>
      <ScriptStudio projectId={projectId} initial={project?.script ?? ""} existing={list.map((e) => ({ kind: e.kind, name: e.name }))} canEdit />
    </div>
  );
}
