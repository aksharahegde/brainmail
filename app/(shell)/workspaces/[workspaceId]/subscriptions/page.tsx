import { BriefingHeader } from '@/components/layout/briefing-header';
import { BriefingPage } from '@/components/layout/briefing-page';
import { SubscriptionsCenter } from '@/components/subscriptions/subscriptions-center';

export default async function WorkspaceSubscriptionsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <BriefingPage>
      <BriefingHeader
        eyebrow="Recurring commitments"
        title="Subscriptions"
        description="Renewals, duplicates, and recurring spend — surfaced so you can decide what stays."
      />
      <SubscriptionsCenter workspaceId={workspaceId} />
    </BriefingPage>
  );
}
