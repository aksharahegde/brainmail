import { ArtifactLibrary } from '@/components/artifacts/artifact-library';
import { ReportsDirectory } from '@/components/reports/reports-directory';

export default async function WorkspaceReportsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Scheduled and on-demand reports for this workspace, plus saved
          artifacts from chat.
        </p>
      </div>

      <ReportsDirectory workspaceId={workspaceId} />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Saved artifacts</h2>
        <ArtifactLibrary workspaceId={workspaceId} />
      </section>
    </div>
  );
}
