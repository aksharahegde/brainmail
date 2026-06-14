import { WorkspaceHome } from '@/components/workspaces/workspace-home';

export default async function WorkspaceOverviewPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return <WorkspaceHome workspaceId={workspaceId} />;
}
