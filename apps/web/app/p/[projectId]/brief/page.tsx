import { redirect } from "next/navigation";

// The weekly brief lives on the cohort home ("This week"). This route only forwards old links.
export default async function BriefRedirect({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/p/${projectId}/scenes`);
}
