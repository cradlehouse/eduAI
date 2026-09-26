import { redirect } from "next/navigation";

// The bible is split by kind now: Cast, Places, Props. Old links land on Cast.
export default async function BiblePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/p/${projectId}/cast`);
}
