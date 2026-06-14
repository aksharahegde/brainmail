import { DashboardsDirectory } from '@/components/dashboards/dashboards-directory';

export default async function WorkspaceDashboardsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboards</h1>
        <p className="text-sm text-muted-foreground">
          Visual analytics and KPI dashboards for this workspace.
        </p>
      </div>
      <DashboardsDirectory workspaceId={workspaceId} />
    </div>
  );
}
