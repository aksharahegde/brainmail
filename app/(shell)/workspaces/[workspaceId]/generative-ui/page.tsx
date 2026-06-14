import { GenerativeUiPreview } from '@/components/generative-ui/generative-ui-preview';

export default async function WorkspaceGenerativeUiPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Generative UI</h1>
        <p className="text-sm text-muted-foreground">
          Block registry preview for workspace {workspaceId}. All presentation
          decisions come from the backend UI planner.
        </p>
      </div>
      <GenerativeUiPreview />
    </div>
  );
}
