import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Step 5: the scenes, in script order. Each card says where it is, who's in it, and how far the shots
// have got; open one to put the people in it and plan its shots.
export default async function ScenesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const [{ data: scenes }, { data: shots }, { data: links }, { data: entries }] = await Promise.all([
    supabase.from("scenes").select("id, position, heading, title, location_entry_id, script_excerpt").eq("project_id", projectId).order("position"),
    supabase.from("shots").select("id, scene_id, selected_take_id").eq("project_id", projectId),
    supabase.from("scene_bible_entries").select("scene_id, bible_entry_id"),
    supabase.from("bible_entries").select("id, name, kind, reference_asset_id").eq("project_id", projectId),
  ]);
  const byId = new Map((entries ?? []).map((e) => [e.id, e]));
  const list = scenes ?? [];
  return (
    <div className="flex max-w-5xl flex-col gap-3">
      <div>
        <h1 className="text-[20px]">Scenes</h1>
        <p className="text-[12px] text-dim">In script order. Open a scene to put the location and the people in it, check what happens, and plan the shots.</p>
      </div>
      {!list.length && <p className="text-[12px] text-dim">No scenes yet. <Link href={`/p/${projectId}`} className="underline">Write the script</Link>: every heading like INT. DINER – NIGHT becomes a scene.</p>}
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {list.map((s) => {
          const loc = s.location_entry_id ? byId.get(s.location_entry_id) : null;
          const people = (links ?? []).filter((l) => l.scene_id === s.id).map((l) => byId.get(l.bible_entry_id)).filter((e) => e?.kind === "character");
          const sh = (shots ?? []).filter((x) => x.scene_id === s.id);
          const chosen = sh.filter((x) => x.selected_take_id).length;
          return (
            <li key={s.id}>
              <Link href={`/p/${projectId}/scenes/${s.id}`} className="glass flex gap-3 rounded-[10px] p-2.5 hover:border-card-edge">
                <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-[6px] border border-card-edge bg-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {loc?.reference_asset_id ? <img src={`/api/assets/${loc.reference_asset_id}`} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-[10px] text-mute">no location</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mono truncate text-[12px]">{s.position}. {s.heading || s.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {people.map((p) => <span key={p!.id} className="pill py-0 text-[10.5px]">{p!.name}</span>)}
                    {!people.length && <span className="text-[11px] text-mute">nobody in it yet</span>}
                  </div>
                  <div className={`mt-1 text-[11px] ${sh.length && chosen === sh.length ? "text-ok" : sh.length ? "text-gold" : "text-mute"}`}>
                    {sh.length ? `${chosen} of ${sh.length} shots chosen` : "shots not planned yet"}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
