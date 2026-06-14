import { ContactWorkspace } from '@/components/contacts/contact-workspace';
import { EntityExplorer } from '@/components/knowledge-graph/entity-explorer';
import { RelationshipGraphPanel } from '@/components/knowledge-graph/relationship-graph';

export default async function WorkspaceContactsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Contact workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Relationship intelligence with profiles, scores, follow-up reminders,
          and communication analytics.
        </p>
      </div>
      <ContactWorkspace workspaceId={workspaceId} />
      <div className="space-y-6 border-t pt-8">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Knowledge graph
          </h2>
          <p className="text-sm text-muted-foreground">
            Explore extracted entities and relationships across your email data.
          </p>
        </div>
        <RelationshipGraphPanel />
        <EntityExplorer />
      </div>
    </div>
  );
}
