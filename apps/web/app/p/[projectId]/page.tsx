import { redirect } from "next/navigation";
export default async function ProjectRoot({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/p/${projectId}/brief`);
}
