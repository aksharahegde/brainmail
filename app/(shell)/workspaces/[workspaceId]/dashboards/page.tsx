import { DashboardsDirectory } from '@/components/dashboards/dashboards-directory';
import { BriefingHeader } from '@/components/layout/briefing-header';
import { BriefingPage } from '@/components/layout/briefing-page';

export default async function WorkspaceDashboardsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <BriefingPage>
      <BriefingHeader
        eyebrow="Curated views"
        title="Dashboards"
        description="Focused narratives on what matters — not metric grids."
      />
      <DashboardsDirectory workspaceId={workspaceId} />
    </BriefingPage>
  );
}
