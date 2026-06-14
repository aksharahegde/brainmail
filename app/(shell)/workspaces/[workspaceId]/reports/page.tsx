import { ArtifactLibrary } from '@/components/artifacts/artifact-library';

export default async function WorkspaceReportsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Saved reports, charts, and dashboards for this workspace. Share links
          or export JSON and CSV.
        </p>
      </div>
      <ArtifactLibrary workspaceId={workspaceId} />
    </div>
  );
}
