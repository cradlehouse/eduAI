import { createClient } from "@/lib/supabase/server";
import { setLook } from "./scenes/actions";
import { ScriptStudio } from "./ScriptStudio";
import { ScriptChanges } from "./ScriptChanges";

// Step 1: the script. The film's settings are set once here; everything added on other pages is
// written back into the script and listed underneath, with undo.
export default async function ProjectHome({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const [{ data: project }, { data: entries }, { data: changes }] = await Promise.all([
    supabase.from("projects").select("title, logline, script, look, orgs(looks)").eq("id", projectId).maybeSingle(),
    supabase.from("bible_entries").select("kind, name, appearance, reference_asset_id").eq("project_id", projectId),
    supabase.from("script_changes").select("id, source, label, scene_position, created_at, created_by").eq("project_id", projectId).is("undone_at", null).order("created_at", { ascending: false }).limit(20),
  ]);
  const list = entries ?? [];
  const who = [...new Set((changes ?? []).map((c) => c.created_by).filter((x): x is string => !!x))];
  const { data: people } = who.length ? await supabase.from("users").select("id, email, display_name").in("id", who) : { data: [] as { id: string; email: string; display_name: string | null }[] };
  const nameOf = (id: string | null) => { const u = (people ?? []).find((p) => p.id === id); return u ? (u.display_name || u.email.split("@")[0]) : ""; };
  const looks = (project?.orgs?.looks ?? []) as { key: string; label: string; prompt: string }[];
  const count = (kind: string) => list.filter((e) => e.kind === kind).length;
  const hasScript = !!project?.script?.trim();
  const unlooked = list.filter((e) => (e.kind === "character" || e.kind === "location") && !e.reference_asset_id).length;
  const next = !hasScript ? "Write or paste the script, then break it down."
    : count("character") + count("location") === 0 ? "Break the script down to find the cast and the locations."
    : unlooked > 0 ? `Next: ${unlooked} character${unlooked === 1 ? "" : "s"} or location${unlooked === 1 ? "" : "s"} still need a look. Start with Cast.`
    : "Next: Scenes. Put the people in each scene and plan the shots.";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px]">{project?.title}</h1>
          {project?.logline && <p className="text-[13px] text-dim">{project.logline}</p>}
        </div>
        <form action={setLook} className="glass flex flex-wrap items-center gap-3 rounded-[10px] px-3 py-2 text-[12px]">
          <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="back" value={`/p/${projectId}`} />
          <span className="text-mute">Shape <span className="text-ink">16:9</span></span>
          <label className="flex items-center gap-1.5 text-mute">Look
            <select name="look" defaultValue={project?.look ?? ""} className="input py-1 text-[12px]">
              <option value="">not set</option>{looks.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select></label>
          <span className="text-mute" title="One video engine for the whole film, so every shot matches.">Engine <span className="text-ink">LTX 2.5</span></span>
          <button className="btn py-1 text-[12px]">Set</button>
        </form>
      </div>
      <p className="text-[12px] text-gold">{next}</p>
      <ScriptStudio projectId={projectId} initial={project?.script ?? ""} existing={list.map((e) => ({ kind: e.kind, name: e.name }))} canEdit />
      <ScriptChanges projectId={projectId} changes={(changes ?? []).map((c) => ({ id: c.id, source: c.source, label: c.label, scene: c.scene_position, at: c.created_at, by: nameOf(c.created_by) }))} />
    </div>
  );
}
