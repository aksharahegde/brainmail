import { ChatWorkspace } from '@/components/chat/chat-workspace';
import { BriefingHeader } from '@/components/layout/briefing-header';
import { BriefingPage } from '@/components/layout/briefing-page';

export default async function WorkspaceChatPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <BriefingPage>
      <BriefingHeader
        eyebrow="AI Conversation"
        title="Briefing"
        description="Collaborate with your executive assistant. Responses arrive as structured reports, not chat bubbles."
      />
      <ChatWorkspace workspaceId={workspaceId} />
    </BriefingPage>
  );
}
