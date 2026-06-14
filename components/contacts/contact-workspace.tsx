'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import {
  formatScore,
  getContactProfile,
  listContacts,
} from '@/lib/contacts/api';

export function ContactWorkspace({ workspaceId }: { workspaceId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['contacts', workspaceId],
    queryFn: () => listContacts({ workspaceId }),
  });

  const profileQuery = useQuery({
    queryKey: ['contact-profile', selectedId, workspaceId],
    queryFn: () => getContactProfile(selectedId!, workspaceId),
    enabled: Boolean(selectedId),
  });

  const contacts = listQuery.data?.contacts ?? [];
  const summary = listQuery.data?.summary;
  const profile = profileQuery.data;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        {summary ? (
          <div className="briefing-card ai-accent-bg space-y-2">
            <p className="briefing-eyebrow ai-accent">Relationship pulse</p>
            <p className="text-body text-foreground/90">
              {summary.totalContacts} contacts tracked with an average
              relationship score of{' '}
              {formatScore(summary.averageRelationshipScore)}.
              {summary.followUpCount > 0
                ? ` ${summary.followUpCount} follow-ups need your attention.`
                : ' No follow-ups are overdue.'}
              {` ${summary.communicationAnalytics.activeContactsLast30Days} were active in the last 30 days.`}
            </p>
          </div>
        ) : null}

        <h2 className="briefing-section-title">Contacts</h2>
        {listQuery.isLoading ? (
          <p className="text-body-sm text-muted-foreground">Loading contacts…</p>
        ) : contacts.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No contacts tracked yet for this workspace.
          </p>
        ) : (
          <ul className="space-y-2">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <button
                  type="button"
                  data-testid={`contact-row-${contact.id}`}
                  onClick={() => setSelectedId(contact.id)}
                  className="briefing-list-item w-full text-left transition-colors hover:border-border"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {contact.name ?? contact.email ?? 'Contact'}
                      </p>
                      <p className="text-body-sm text-muted-foreground">
                        {contact.email ?? 'No email'}
                        {contact.daysSinceLastContact != null
                          ? ` · ${contact.daysSinceLastContact} days ago`
                          : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatScore(contact.relationshipScore)}
                      </p>
                      {contact.followUpPriority ? (
                        <p className="text-xs capitalize text-amber-600">
                          {contact.followUpPriority} follow-up
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

      <section className="briefing-card space-y-4">
        <h2 className="briefing-section-title">Contact profile</h2>
        {!selectedId ? (
          <p className="text-body-sm text-muted-foreground">
            Select a contact to review relationship score, communication
            analytics, and follow-up reminders.
          </p>
        ) : profileQuery.isLoading ? (
          <p className="text-body-sm text-muted-foreground">Loading profile…</p>
        ) : profile ? (
          <div className="space-y-4">
            <div>
              <p className="text-xl font-semibold">
                {profile.contact.name ?? profile.contact.email ?? 'Contact'}
              </p>
              <p className="text-body-sm text-muted-foreground">
                Relationship score{' '}
                {formatScore(profile.contact.relationshipScore)}
                {profile.contact.interactionCount != null
                  ? ` · ${profile.contact.interactionCount} interactions`
                  : ''}
              </p>
            </div>

            {profile.followUpReminder ? (
              <div
                className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"
                data-testid="contact-follow-up-reminder"
              >
                <p className="font-medium">Follow-up reminder</p>
                <p className="text-muted-foreground">
                  {profile.followUpReminder.reason} (
                  {profile.followUpReminder.daysSinceLastContact} days since
                  last contact)
                </p>
              </div>
            ) : null}

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Emails (30 days)</dt>
                <dd className="font-medium">
                  {profile.analytics.emailsLast30Days}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Emails (7 days)</dt>
                <dd className="font-medium">
                  {profile.analytics.emailsLast7Days}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Communication trend</dt>
                <dd className="font-medium capitalize">
                  {profile.analytics.trend}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Avg. gap (days)</dt>
                <dd className="font-medium">
                  {profile.analytics.averageGapDays ?? '—'}
                </dd>
              </div>
            </dl>

            {profile.activity.length > 0 ? (
              <div className="space-y-2 border-t pt-4">
                <h3 className="font-medium">Recent communication</h3>
                <ul className="space-y-2 text-sm">
                  {profile.activity.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-md bg-muted/40 px-3 py-2"
                      data-testid={`contact-activity-${item.id}`}
                    >
                      <p className="font-medium">
                        {item.subject ?? 'No subject'}
                      </p>
                      <p className="text-muted-foreground">
                        {item.receivedAt
                          ? new Date(item.receivedAt).toLocaleString()
                          : '—'}
                        {item.category ? ` · ${item.category}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {summary && summary.followUpReminders.length > 0 ? (
          <div className="space-y-2 border-t pt-4">
            <h3 className="font-medium">Follow-up queue</h3>
            <ul className="space-y-2 text-sm">
              {summary.followUpReminders.map((reminder) => (
                <li
                  key={reminder.contactId}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                  data-testid={`contact-follow-up-${reminder.contactId}`}
                >
                  <span>{reminder.name ?? reminder.email ?? 'Contact'}</span>
                  <span className="capitalize text-muted-foreground">
                    {reminder.priority}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
