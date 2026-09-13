import { redirect } from "next/navigation";

// Shoot showed the same cuts and counts as the Scenes filmstrip. Killed; old links forward.
export default async function ShootRedirect({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/p/${projectId}/scenes`);
}
