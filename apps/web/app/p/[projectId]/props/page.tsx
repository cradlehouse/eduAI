import { BibleList } from "../bible/BibleList";

export default async function Page({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { projectId } = await params;
  const { ok, error } = await searchParams;
  return <BibleList projectId={projectId} kind="prop" ok={ok} error={error} />;
}
