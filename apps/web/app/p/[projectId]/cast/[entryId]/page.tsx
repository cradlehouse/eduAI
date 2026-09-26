import { ElementPage } from "../../elements/ElementPage";

export default async function Page({ params, searchParams }: { params: Promise<{ projectId: string; entryId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ projectId, entryId }, { tab }] = await Promise.all([params, searchParams]);
  return <ElementPage projectId={projectId} kind="character" entryId={entryId} tab={tab} />;
}
