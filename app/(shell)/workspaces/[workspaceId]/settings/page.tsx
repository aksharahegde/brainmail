import { ConnectedAccountsPanel } from '@/components/auth/connected-accounts-panel';

export default function WorkspaceSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Workspace preferences and connected accounts.
        </p>
      </div>
      <ConnectedAccountsPanel />
    </div>
  );
}
