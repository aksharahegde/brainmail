import { EntityExplorer } from '@/components/knowledge-graph/entity-explorer';
import { RelationshipGraphPanel } from '@/components/knowledge-graph/relationship-graph';

export default function WorkspaceContactsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Knowledge Graph
        </h1>
        <p className="text-sm text-muted-foreground">
          Explore extracted companies, contacts, finance records, travel, and
          their relationships.
        </p>
      </div>
      <RelationshipGraphPanel />
      <EntityExplorer />
    </div>
  );
}
