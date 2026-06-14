'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  formatCurrency,
  getSubscription,
  ignoreSubscription,
  listSubscriptions,
} from '@/lib/subscriptions/api';

export function SubscriptionsCenter({ workspaceId }: { workspaceId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['subscriptions', workspaceId],
    queryFn: () => listSubscriptions({ workspaceId }),
  });

  const detailQuery = useQuery({
    queryKey: ['subscription', selectedId],
    queryFn: () => getSubscription(selectedId!),
    enabled: Boolean(selectedId),
  });

  const ignoreMutation = useMutation({
    mutationFn: ignoreSubscription,
    onSuccess: () => {
      setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });

  const subscriptions = listQuery.data?.subscriptions ?? [];
  const summary = listQuery.data?.summary;
  const selected = detailQuery.data?.subscription;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="space-y-4">
        {summary ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Monthly total</p>
              <p className="text-2xl font-semibold">
                {formatCurrency(summary.monthlyTotal)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                Active subscriptions
              </p>
              <p className="text-2xl font-semibold">{summary.activeCount}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                Renewals (45 days)
              </p>
              <p className="text-2xl font-semibold">
                {summary.upcomingRenewals.length}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Duplicate groups</p>
              <p className="text-2xl font-semibold">
                {summary.duplicateGroups.length}
              </p>
            </div>
          </div>
        ) : null}

        {summary && summary.costTrend.duplicateSavingsPotential > 0 ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            Potential savings of{' '}
            {formatCurrency(summary.costTrend.duplicateSavingsPotential)}/mo by
            consolidating duplicate subscriptions.
          </div>
        ) : null}

        <h2 className="text-lg font-medium">Tracked subscriptions</h2>
        {listQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading subscriptions…
          </p>
        ) : subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No subscriptions tracked yet for this workspace.
          </p>
        ) : (
          <ul className="space-y-2">
            {subscriptions.map((subscription) => (
              <li key={subscription.id}>
                <button
                  type="button"
                  data-testid={`subscription-row-${subscription.id}`}
                  onClick={() => setSelectedId(subscription.id)}
                  className="w-full rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {subscription.name ?? 'Subscription'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Renews{' '}
                        {subscription.renewalDate
                          ? new Date(
                              subscription.renewalDate,
                            ).toLocaleDateString()
                          : '—'}
                        {subscription.daysUntilRenewal != null
                          ? ` · in ${subscription.daysUntilRenewal} days`
                          : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(
                          subscription.monthlyCost,
                          subscription.currency ?? 'USD',
                        )}
                        /mo
                      </p>
                      {subscription.duplicateGroupId ? (
                        <p className="text-xs text-amber-600">
                          Possible duplicate
                        </p>
                      ) : null}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Subscription intelligence</h2>
        {!selectedId ? (
          <p className="text-sm text-muted-foreground">
            Select a subscription to review renewal timing, billing period, and
            duplicate signals.
          </p>
        ) : detailQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading details…</p>
        ) : selected ? (
          <div className="space-y-4">
            <div>
              <p className="text-xl font-semibold">
                {selected.name ?? 'Subscription'}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(
                  selected.monthlyCost,
                  selected.currency ?? 'USD',
                )}
                /mo · {selected.billingPeriod ?? 'monthly'} billing
              </p>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Renewal date</dt>
                <dd className="font-medium">
                  {selected.renewalDate
                    ? new Date(selected.renewalDate).toLocaleDateString()
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{selected.status ?? 'active'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-medium">
                  {selected.amount != null
                    ? formatCurrency(
                        selected.amount,
                        selected.currency ?? 'USD',
                      )
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Duplicate group</dt>
                <dd className="font-medium">
                  {selected.duplicateGroupId ? 'Flagged' : 'None'}
                </dd>
              </div>
            </dl>

            {selected.status !== 'ignored' ? (
              <Button
                type="button"
                variant="outline"
                data-testid="subscription-ignore-submit"
                disabled={ignoreMutation.isPending}
                onClick={() => ignoreMutation.mutate(selected.id)}
              >
                {ignoreMutation.isPending ? 'Ignoring…' : 'Ignore subscription'}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                This subscription is ignored and hidden from active totals.
              </p>
            )}
          </div>
        ) : null}

        {summary && summary.upcomingRenewals.length > 0 ? (
          <div className="space-y-2 border-t pt-4">
            <h3 className="font-medium">Upcoming renewals</h3>
            <ul className="space-y-2 text-sm">
              {summary.upcomingRenewals.map((renewal) => (
                <li
                  key={renewal.id}
                  className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                >
                  <span>{renewal.name ?? 'Subscription'}</span>
                  <span className="text-muted-foreground">
                    {renewal.daysUntilRenewal} days
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {summary && summary.duplicateGroups.length > 0 ? (
          <div className="space-y-2 border-t pt-4">
            <h3 className="font-medium">Duplicate detection</h3>
            <ul className="space-y-2 text-sm">
              {summary.duplicateGroups.map((group) => (
                <li
                  key={group.id}
                  className="rounded-md border px-3 py-2"
                  data-testid={`subscription-duplicate-${group.id}`}
                >
                  <p className="font-medium">{group.names.join(' · ')}</p>
                  <p className="text-muted-foreground">
                    Save up to {formatCurrency(group.potentialMonthlySavings)}
                    /mo
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
