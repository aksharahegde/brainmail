import { AutomationBuilder } from '@/components/automations/automation-builder';

export default async function WorkspaceAutomationsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Automations</h1>
        <p className="text-sm text-muted-foreground">
          Build workflow automations with triggers, conditions, and actions for
          this workspace.
        </p>
      </div>
      <AutomationBuilder workspaceId={workspaceId} />
    </div>
  );
}
