import { GenerativeUiPreview } from '@/components/generative-ui/generative-ui-preview';
import { BriefingHeader } from '@/components/layout/briefing-header';
import { BriefingPage } from '@/components/layout/briefing-page';

export default async function WorkspaceGenerativeUiPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <BriefingPage>
      <BriefingHeader
        eyebrow="Artifact workspace"
        title="Generative UI"
        description={`Structured document blocks for workspace ${workspaceId}. Presentation is planned by the backend UI agent.`}
      />
      <GenerativeUiPreview />
    </BriefingPage>
  );
}
