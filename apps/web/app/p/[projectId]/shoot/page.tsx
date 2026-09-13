import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/projects/data";
import { createClient } from "@/lib/supabase/server";

const LAYERS = ["background", "character", "merged", "dialogue", "sfx"] as const;

// Production: every cut with what has been generated per layer; each opens its console.
export default async function ShootPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const data = await getProject(projectId);
  if (!data) notFound();
  const supabase = await createClient();
  const [{ data: scenes }, { data: shots }, { data: takes }, { data: jobs }] = await Promise.all([
    supabase.from("scenes").select("id, position, title").eq("project_id", projectId).order("position"),
    supabase.from("shots").select("id, scene_id, position, label, description, intent, selected_take_id").eq("project_id", projectId).order("position"),
    supabase.from("takes").select("shot_id, layer").eq("project_id", projectId).eq("lifecycle", "live"),
    supabase.from("job_tokens").select("job_id, shot_id, layer, lane, status, estimated_tokens, actual_tokens, created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(10),
  ]);
  const count = (shotId: string, layer: string) => (takes ?? []).filter((t) => t.shot_id === shotId && t.layer === layer).length;
  const intentOk = (i: unknown) => { const x = (i ?? {}) as Record<string, unknown>; return !!(x.objective && x.continuity && x.camera_language); };

  return (
    <div className="max-w-5xl">
      <h1 className="display mb-1 text-2xl">Shoot</h1>
      <p className="mb-6 text-sm text-muted">Each cut has its own console: generate takes by layer, compare three, choose one. Cuts need their storyboard notes first.</p>
      {(scenes ?? []).length === 0 && <p className="text-sm text-muted">No cuts yet. Start in the <Link href={`/p/${projectId}/scenes`} className="underline">Storyboard</Link>.</p>}
      {(scenes ?? []).map((sc) => (
        <section key={sc.id} className="card mb-6 p-4" style={{ borderRadius: 22 }}>
          <div className="label mb-2">Scene {sc.position} · {sc.title}</div>
          <table className="w-full text-sm">
            <thead><tr className="label text-left"><th className="py-1">Cut</th><th>Action</th>{LAYERS.map((l) => <th key={l} className="text-center">{l}</th>)}<th></th></tr></thead>
            <tbody>
              {(shots ?? []).filter((s) => s.scene_id === sc.id).map((s) => (
                <tr key={s.id} className="border-t border-line">
                  <td className="mono py-2">{s.label}</td>
                  <td className="max-w-xs truncate">{s.description || <span className="text-muted">—</span>}</td>
                  {LAYERS.map((l) => { const n = count(s.id, l); return <td key={l} className={`text-center ${n ? "" : "text-muted"}`}>{n || "·"}</td>; })}
                  <td className="text-right">
                    {intentOk(s.intent)
                      ? <Link href={`/p/${projectId}/scenes?cut=${s.id}`} className="btn">Open console</Link>
                      : <Link href={`/p/${projectId}/scenes?cut=${s.id}`} className="text-xs text-explore underline">notes incomplete</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <section className="panel p-4">
        <div className="label mb-2">Recent generations</div>
        {(jobs ?? []).length === 0 ? <p className="text-sm text-muted">Nothing generated yet.</p> : (
          <ul className="text-sm">{(jobs ?? []).map((j) => <li key={j.job_id}>{j.created_at ? new Date(j.created_at).toLocaleString() : ""} · {(shots ?? []).find((s) => s.id === j.shot_id)?.label ?? "?"} · {j.layer} · {j.lane} · {j.status} · {(j.actual_tokens ?? j.estimated_tokens ?? 0).toLocaleString()} tk</li>)}</ul>
        )}
      </section>
    </div>
  );
}
