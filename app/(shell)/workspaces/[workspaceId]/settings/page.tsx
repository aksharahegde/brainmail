import { Suspense } from 'react';

import { ConnectedAccountsPanel } from '@/components/auth/connected-accounts-panel';
import { GmailSyncStatusPanel } from '@/components/gmail/gmail-sync-status-panel';
import { BriefingHeader } from '@/components/layout/briefing-header';
import { BriefingPage } from '@/components/layout/briefing-page';
import { AccountDeletionPanel } from '@/components/security/account-deletion-panel';
import { AuditLogPanel } from '@/components/security/audit-log-panel';
import { DataExportPanel } from '@/components/security/data-export-panel';
import { SystemStatusPanel } from '@/components/ops/system-status-panel';

export default function WorkspaceSettingsPage() {
  return (
    <BriefingPage className="space-y-8">
      <BriefingHeader
        eyebrow="Preferences"
        title="Settings"
        description="Connected accounts, sync, security controls, and system health."
      />
      <Suspense
        fallback={
          <p className="text-body-sm text-muted-foreground">
            Loading accounts…
          </p>
        }
      >
        <ConnectedAccountsPanel />
      </Suspense>
      <GmailSyncStatusPanel />
      <SystemStatusPanel />
      <DataExportPanel />
      <AuditLogPanel />
      <AccountDeletionPanel />
    </BriefingPage>
  );
}
