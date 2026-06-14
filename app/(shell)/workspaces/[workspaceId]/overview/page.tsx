import { ChatWorkspaceLink } from '@/components/chat/chat-workspace';
import { OverviewDemo } from '@/features/overview/overview-demo';

export default async function WorkspaceOverviewPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-2 text-muted-foreground">
          Workspace summary and key metrics. Use chat for agent conversations.
        </p>
        <div className="mt-3">
          <ChatWorkspaceLink workspaceId={workspaceId} />
        </div>
      </div>
      <OverviewDemo />
    </div>
  );
}
