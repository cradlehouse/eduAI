import { redirect } from "next/navigation";
import { SceneStrip } from "./SceneStrip";
import { stripData } from "./strip";

// Step 5: straight into a scene (the first one with work left), like Cast and Locations; the strip on
// each scene lists them all and adds new ones. With no scenes yet, this is where the first one is added.
export default async function ScenesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { scenes, locations } = await stripData(projectId);
  if (scenes.length) redirect(`/p/${projectId}/scenes/${(scenes.find((s) => s.state !== "done") ?? scenes[0]).id}`);
  return (
    <div className="flex max-w-5xl flex-col gap-3">
      <div>
        <h1 className="text-[20px]">Scenes</h1>
        <p className="text-[12px] text-dim">No scenes yet. Add one here, or write the script: every heading like INT. DINER – NIGHT becomes a scene.</p>
      </div>
      <SceneStrip projectId={projectId} scenes={scenes} current={null} locations={locations} />
    </div>
  );
}
