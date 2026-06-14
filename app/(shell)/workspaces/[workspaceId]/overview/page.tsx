import { AgentChatPanel } from '@/components/chat/agent-chat-panel';
import { OverviewDemo } from '@/features/overview/overview-demo';

export default function WorkspaceOverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-2 text-muted-foreground">
          Workspace summary, agent chat, and key metrics.
        </p>
      </div>
      <AgentChatPanel />
      <OverviewDemo />
    </div>
  );
}
