'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  connectAccount,
  disconnectAccount,
  listConnectedAccounts,
} from '@/lib/auth/api';

export function ConnectedAccountsPanel() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const connectSuccess = searchParams.get('connected') === 'true';
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!connectSuccess) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
  }, [connectSuccess, queryClient]);

  const {
    data: accounts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['connected-accounts'],
    queryFn: listConnectedAccounts,
  });

  async function handleConnect() {
    setIsConnecting(true);
    setActionError(null);

    try {
      const url = await connectAccount('gmail');
      window.location.assign(url);
    } catch (connectError) {
      setActionError(
        connectError instanceof Error
          ? connectError.message
          : 'Unable to connect Gmail',
      );
      setIsConnecting(false);
    }
  }

  async function handleDisconnect(accountId: string) {
    setPendingAccountId(accountId);
    setActionError(null);

    try {
      await disconnectAccount(accountId);
      await queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
    } catch (disconnectError) {
      setActionError(
        disconnectError instanceof Error
          ? disconnectError.message
          : 'Unable to disconnect account',
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
        ? 'Unable to load accounts'
        : null);

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Connected accounts</h2>
          <p className="text-sm text-muted-foreground">
            Link Gmail to import and sync messages.
          </p>
        </div>
        <Button
          data-testid="auth-gmail-connect-submit"
          type="button"
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? 'Redirecting…' : 'Connect Gmail'}
        </Button>
      </div>

      {connectSuccess ? (
        <p
          data-testid="auth-gmail-connect-success"
          className="text-sm text-emerald-600"
          role="status"
        >
          Gmail connected successfully.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading accounts…</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No linked accounts yet.</p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li
              key={account.id}
              data-testid={`auth-account-row-${account.id}`}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium capitalize">
                  {account.provider}
                </p>
                <p className="text-xs text-muted-foreground">
                  {account.email ?? account.providerAccountId}
                </p>
              </div>
              <div data-testid="auth-gmail-disconnect-submit">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect(account.id)}
                  disabled={pendingAccountId === account.id}
                >
                  {pendingAccountId === account.id ? 'Removing…' : 'Disconnect'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
