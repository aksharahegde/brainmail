import { ContactWorkspace } from '@/components/contacts/contact-workspace';
import { EntityExplorer } from '@/components/knowledge-graph/entity-explorer';
import { RelationshipGraphPanel } from '@/components/knowledge-graph/relationship-graph';
import { BriefingHeader } from '@/components/layout/briefing-header';
import { BriefingPage } from '@/components/layout/briefing-page';
import { BriefingSection } from '@/components/layout/briefing-section';

export default async function WorkspaceContactsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <BriefingPage>
      <BriefingHeader
        eyebrow="Relationship workspace"
        title="Contacts"
        description="Profiles, follow-up reminders, and communication context — curated, not catalogued."
      />
      <ContactWorkspace workspaceId={workspaceId} />
      <BriefingSection
        title="Knowledge graph"
        description="Entities and relationships extracted from your email data."
      >
        <RelationshipGraphPanel />
        <EntityExplorer />
      </BriefingSection>
    </BriefingPage>
  );
}
