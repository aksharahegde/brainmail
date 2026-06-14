'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deleteAccount, previewAccountDeletion } from '@/lib/security/api';

export function AccountDeletionPanel() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const previewQuery = useQuery({
    queryKey: ['account-deletion-preview'],
    queryFn: previewAccountDeletion,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      router.push('/login');
    },
  });

  const preview = previewQuery.data?.preview;
  const expectedEmail = preview?.email ?? '';

  return (
    <section className="briefing-card space-y-4 border-destructive/30">
      <div>
        <h2 className="briefing-section-title text-destructive">
          Delete account
        </h2>
        <p className="text-body-sm text-muted-foreground">
          Permanently delete your account, sessions, emails, files, and
          embeddings. This cannot be undone.
        </p>
      </div>

      {previewQuery.isLoading ? (
        <p className="text-body-sm text-muted-foreground">Loading preview…</p>
      ) : preview ? (
        <div className="rounded-md bg-muted/40 p-3 text-sm">
          <p>
            {preview.counts.emails} emails, {preview.counts.workspaces}{' '}
            workspaces, {preview.counts.artifacts} artifacts,{' '}
            {preview.counts.accounts} connected accounts.
          </p>
        </div>
      ) : null}

      <div className="space-y-2" data-testid="security-account-delete-input">
        <label className="text-sm" htmlFor="account-delete-confirmation">
          Type your account email to confirm deletion
        </label>
        <Input
          id="account-delete-confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={expectedEmail || 'your@email.com'}
        />
      </div>

      <div data-testid="security-account-delete-submit">
        <Button
          type="button"
          variant="outline"
          disabled={
            deleteMutation.isPending ||
            !confirmation ||
            confirmation.trim().toLowerCase() !==
              expectedEmail.trim().toLowerCase()
          }
          onClick={() => deleteMutation.mutate(confirmation)}
        >
          {deleteMutation.isPending
            ? 'Deleting…'
            : 'Delete account permanently'}
        </Button>
      </div>

      {deleteMutation.error ? (
        <p className="text-body-sm text-destructive">
          {deleteMutation.error instanceof Error
            ? deleteMutation.error.message
            : 'Deletion failed'}
        </p>
      ) : null}
    </section>
  );
}
