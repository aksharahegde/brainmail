'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  getGmailSyncStatus,
  getGmailSyncStatusLabel,
  triggerGmailSync,
} from '@/lib/gmail/api';

export function GmailSyncStatusPanel() {
  const queryClient = useQueryClient();
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: accounts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['gmail-sync-status'],
    queryFn: getGmailSyncStatus,
    refetchInterval: (query) => {
      const rows = query.state.data ?? [];
      return rows.some(
        (row) => row.status === 'pending' || row.status === 'syncing',
      )
        ? 3000
        : false;
    },
  });

  async function handleSyncNow(accountId: string) {
    setPendingAccountId(accountId);
    setActionError(null);

    try {
      await triggerGmailSync(accountId);
      await queryClient.invalidateQueries({ queryKey: ['gmail-sync-status'] });
    } catch (syncError) {
      setActionError(
        syncError instanceof Error
          ? syncError.message
          : 'Unable to trigger Gmail sync',
      );
    } finally {
      setPendingAccountId(null);
    }
  }

  const errorMessage =
    actionError ??
    (error instanceof Error
      ? error.message
      : error
        ? 'Unable to load sync status'
        : null);

  return (
    <section className="briefing-card space-y-4">
      <div>
        <h2 className="text-base font-semibold">Gmail sync</h2>
        <p className="text-body-sm text-muted-foreground">
          Import recent messages and keep history ready for processing.
        </p>
      </div>

      {errorMessage ? (
        <p className="text-body-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-body-sm text-muted-foreground">
          Loading sync status…
        </p>
      ) : accounts.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          Connect Gmail to start syncing.
        </p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li
              key={account.accountId}
              data-testid={`gmail-sync-row-${account.accountId}`}
              className="flex items-center justify-between gap-4 rounded-md border px-3 py-2"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {account.email ?? account.provider}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getGmailSyncStatusLabel(account.status)}
                  {account.syncedMessageCount > 0
                    ? ` · ${account.syncedMessageCount} messages`
                    : ''}
                  {account.lastSyncedAt
                    ? ` · Last sync ${new Date(account.lastSyncedAt).toLocaleString()}`
                    : ''}
                </p>
                {account.lastError ? (
                  <p className="text-xs text-destructive">
                    {account.lastError}
                  </p>
                ) : null}
              </div>
              <div data-testid="gmail-sync-trigger-submit">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSyncNow(account.accountId)}
                  disabled={
                    pendingAccountId === account.accountId ||
                    account.status === 'syncing'
                  }
                >
                  {pendingAccountId === account.accountId ||
                  account.status === 'syncing'
                    ? 'Syncing…'
                    : 'Sync now'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
