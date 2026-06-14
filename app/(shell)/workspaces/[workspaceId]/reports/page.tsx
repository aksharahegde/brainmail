import { ArtifactLibrary } from '@/components/artifacts/artifact-library';
import { BriefingHeader } from '@/components/layout/briefing-header';
import { BriefingPage } from '@/components/layout/briefing-page';
import { BriefingSection } from '@/components/layout/briefing-section';
import { ReportsDirectory } from '@/components/reports/reports-directory';

export default async function WorkspaceReportsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <BriefingPage>
      <BriefingHeader
        eyebrow="Artifact workspace"
        title="Reports"
        description="Scheduled and on-demand reports, plus saved outputs from prior conversations."
      />
      <ReportsDirectory workspaceId={workspaceId} />
      <BriefingSection title="Saved artifacts">
        <ArtifactLibrary workspaceId={workspaceId} />
      </BriefingSection>
    </BriefingPage>
  );
}
