import { ProcessedEmailActivity } from '@/components/email/processed-email-activity';

export default async function WorkspaceActivityPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Processed emails, categories, and extraction status for this
          workspace.
        </p>
      </div>
      <ProcessedEmailActivity workspaceId={workspaceId} />
    </div>
  );
}
