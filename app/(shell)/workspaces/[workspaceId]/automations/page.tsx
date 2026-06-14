import { AutomationBuilder } from '@/components/automations/automation-builder';
import { BriefingHeader } from '@/components/layout/briefing-header';
import { BriefingPage } from '@/components/layout/briefing-page';

export default async function WorkspaceAutomationsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <BriefingPage>
      <BriefingHeader
        eyebrow="Decision workspace"
        title="Automations"
        description="Define triggers, conditions, and actions — then let the system handle the routine."
      />
      <AutomationBuilder workspaceId={workspaceId} />
    </BriefingPage>
  );
}
