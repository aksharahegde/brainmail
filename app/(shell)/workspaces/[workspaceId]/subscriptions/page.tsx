import { SubscriptionsCenter } from '@/components/subscriptions/subscriptions-center';

export default async function WorkspaceSubscriptionsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Subscription center
        </h1>
        <p className="text-sm text-muted-foreground">
          Track renewals, detect duplicates, and analyze recurring spend for
          this workspace.
        </p>
      </div>
      <SubscriptionsCenter workspaceId={workspaceId} />
    </div>
  );
}
