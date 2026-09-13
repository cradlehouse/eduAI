import { redirect } from "next/navigation";

// Old handoff route. Forwards to Scenes.
export default async function ModuleRedirect({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/p/${projectId}/scenes`);
}
