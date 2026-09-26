import { redirect } from "next/navigation";

// Places was renamed Locations; old links still land.
export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/p/${projectId}/locations`);
}
