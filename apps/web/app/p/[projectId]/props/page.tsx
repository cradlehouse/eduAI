import { ElementPage } from "../elements/ElementPage";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ElementPage projectId={projectId} kind="prop" />;
}
