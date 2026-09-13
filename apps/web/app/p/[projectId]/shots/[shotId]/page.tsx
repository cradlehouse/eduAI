import { redirect } from "next/navigation";

// The cut console lives on the storyboard now (filmstrip + dock + inspector). Old links still work.
export default async function ShotRedirect({ params }: { params: Promise<{ projectId: string; shotId: string }> }) {
  const { projectId, shotId } = await params;
  redirect(`/p/${projectId}/scenes?cut=${shotId}`);
}
