import { DailyBriefingPage } from '@/components/insights/daily-briefing-page';
import { BriefingPage } from '@/components/layout/briefing-page';

type WorkspaceInsightsPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function WorkspaceInsightsPage({
  params,
}: WorkspaceInsightsPageProps) {
  const { workspaceId } = await params;

  return (
    <BriefingPage>
      <DailyBriefingPage workspaceId={workspaceId} />
    </BriefingPage>
  );
}
