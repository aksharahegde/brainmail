import { CollectionSuggestions } from '@/components/collections/collection-suggestions';
import { CollectionsDirectory } from '@/components/collections/collections-directory';

export default async function WorkspaceCollectionsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
        <p className="text-sm text-muted-foreground">
          AI-managed semantic groups for this workspace.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">AI suggestions</h2>
        <CollectionSuggestions workspaceId={workspaceId} />
      </section>

      <CollectionsDirectory workspaceId={workspaceId} />
    </div>
  );
}
