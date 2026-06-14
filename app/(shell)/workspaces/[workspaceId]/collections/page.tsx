import { CollectionSuggestions } from '@/components/collections/collection-suggestions';
import { CollectionsDirectory } from '@/components/collections/collections-directory';
import { BriefingHeader } from '@/components/layout/briefing-header';
import { BriefingPage } from '@/components/layout/briefing-page';
import { BriefingSection } from '@/components/layout/briefing-section';

export default async function WorkspaceCollectionsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <BriefingPage>
      <BriefingHeader
        eyebrow="Semantic groups"
        title="Collections"
        description="AI-managed groups that organize your inbox by meaning, not folders."
      />
      <BriefingSection
        title="Suggested collections"
        description="Recommendations based on patterns in your email."
      >
        <CollectionSuggestions workspaceId={workspaceId} />
      </BriefingSection>
      <CollectionsDirectory workspaceId={workspaceId} />
    </BriefingPage>
  );
}
