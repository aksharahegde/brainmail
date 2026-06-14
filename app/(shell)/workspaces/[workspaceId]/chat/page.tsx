import { ChatWorkspace } from '@/components/chat/chat-workspace';

export default async function WorkspaceChatPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="text-sm text-muted-foreground">
          AI chat with streaming responses, session history, and artifact-backed
          answers.
        </p>
      </div>
      <ChatWorkspace workspaceId={workspaceId} />
    </div>
  );
}
