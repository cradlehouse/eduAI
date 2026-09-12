import { createClient } from "@/lib/supabase/server";
import { ShotCard, type ShotCardData } from "@/components/ShotCard";
import { createScene, createShot, deleteScene, updateScene } from "./actions";

const input = "rounded border border-ink/20 bg-white px-2 py-1 text-sm text-ink dark:border-paper/20";
const btn = "rounded border border-ink/20 px-2 py-1 text-xs hover:bg-ink/5 dark:border-paper/20 dark:hover:bg-paper/10";

export default async function ScenesPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { projectId } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: scenes }, { data: shots }, { data: takes }] = await Promise.all([
    supabase.from("scenes").select("id, position, title, synopsis").eq("project_id", projectId).order("position"),
    supabase.from("shots").select("id, scene_id, position, label, description, duration_target_s, intent, selected_take_id").eq("project_id", projectId).order("position"),
    supabase.from("takes").select("shot_id").eq("project_id", projectId).eq("lifecycle", "live"),
  ]);
  const shotIds = (shots ?? []).map((s) => s.id);
  const { data: linkRows } = shotIds.length ? await supabase.from("shot_bible_entries").select("shot_id").in("shot_id", shotIds) : { data: [] as { shot_id: string }[] };
  const bibleCount = (id: string) => (linkRows ?? []).filter((l) => l.shot_id === id).length;
  const takeCount = (id: string) => (takes ?? []).filter((t) => t.shot_id === id).length;

  return (
    <div className="max-w-5xl">
      <h1 className="mb-1 text-2xl font-semibold">Scenes</h1>
      <p className="mb-6 text-sm opacity-70">A shot is one generation target. Set its intent and link the bible entries it uses before you generate.</p>
      {ok && <p className="mb-4 rounded bg-money/10 p-2 text-sm text-money">{ok}</p>}
      {error && <p className="mb-4 rounded bg-danger/10 p-2 text-sm text-danger">{error}</p>}

      {(scenes ?? []).map((sc) => (
        <section key={sc.id} className="mb-10">
          <form action={updateScene} className="mb-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="scene_id" value={sc.id} />
            <span className="text-xs uppercase tracking-wide opacity-60">Scene {sc.position}</span>
            <input name="title" defaultValue={sc.title} className={`${input} font-medium`} />
            <input name="synopsis" defaultValue={sc.synopsis} placeholder="synopsis" className={`${input} min-w-64 flex-1`} />
            <button className={btn}>Save</button>
            <button formAction={deleteScene} className={`${btn} text-danger`}>Delete scene</button>
          </form>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(shots ?? []).filter((s) => s.scene_id === sc.id).map((s) => (
              <ShotCard key={s.id} projectId={projectId} shot={{ ...s, bibleCount: bibleCount(s.id), takeCount: takeCount(s.id) } as ShotCardData} />
            ))}
            <form action={createShot} className="flex flex-col justify-center gap-2 rounded-lg border border-dashed border-ink/20 p-3 dark:border-paper/20">
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="scene_id" value={sc.id} />
              <input name="label" placeholder="label (auto)" className={input} />
              <input name="description" placeholder="what happens in this shot" className={input} />
              <input name="duration_target_s" type="number" min={1} max={60} placeholder="target seconds" className={input} />
              <button className={btn}>+ Add shot</button>
            </form>
          </div>
        </section>
      ))}

      <form action={createScene} className="flex flex-wrap items-end gap-2 rounded-lg border border-ink/10 p-4 dark:border-paper/15">
        <input type="hidden" name="project_id" value={projectId} />
        <label className="text-sm">New scene<br /><input name="title" placeholder="title" className={input} /></label>
        <label className="text-sm">Synopsis<br /><input name="synopsis" className={`${input} min-w-72`} /></label>
        <button className="rounded bg-ink px-3 py-2 text-sm font-medium text-paper dark:bg-paper dark:text-ink">+ Add scene</button>
      </form>
    </div>
  );
}
