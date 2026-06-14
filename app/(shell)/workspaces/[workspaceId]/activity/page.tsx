import { ProcessedEmailActivity } from '@/components/email/processed-email-activity';
import { BriefingHeader } from '@/components/layout/briefing-header';
import { BriefingPage } from '@/components/layout/briefing-page';

export default async function WorkspaceActivityPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <BriefingPage>
      <BriefingHeader
        eyebrow="Signal log"
        title="Activity"
        description="Processed emails, categories, and extraction status for this workspace."
      />
      <ProcessedEmailActivity workspaceId={workspaceId} />
    </BriefingPage>
  );
}
