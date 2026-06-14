import { createDb } from '@brainmail/db';
import { contacts, emails, relationships } from '@brainmail/db/schema';
import { and, desc, eq, inArray, like, or } from 'drizzle-orm';

import { getWorkspaceEmailCategories } from '../workspaces/context';
import type {
  CommunicationAnalytics,
  ContactProfile,
  ContactSummaryRecord,
  CrmSummary,
  FollowUpReminder,
} from './types';

const FOLLOW_UP_HIGH_DAYS = 21;
const FOLLOW_UP_MEDIUM_DAYS = 14;
const FOLLOW_UP_LOW_DAYS = 7;

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/<([^>]+)>/);
  const email = (match?.[1] ?? value).trim().toLowerCase();
  return email.includes('@') ? email : null;
}

function daysSince(dateValue: string | null): number | null {
  if (!dateValue) {
    return null;
  }

  const parsed = Date.parse(dateValue);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24));
}

function deriveRelationshipScore(
  storedScore: number | null | undefined,
  interactionCount: number | null | undefined,
): number {
  if (storedScore != null && Number.isFinite(storedScore)) {
    return Math.max(0, Math.min(1, storedScore));
  }

  const interactions = interactionCount ?? 0;
  return Math.max(0, Math.min(1, interactions / 20));
}

function resolveFollowUpPriority(
  daysSinceLastContact: number | null,
  relationshipScore: number,
): ContactSummaryRecord['followUpPriority'] {
  if (daysSinceLastContact == null) {
    return null;
  }

  if (
    daysSinceLastContact >= FOLLOW_UP_HIGH_DAYS &&
    relationshipScore >= 0.55
  ) {
    return 'high';
  }

  if (daysSinceLastContact >= FOLLOW_UP_MEDIUM_DAYS) {
    return 'medium';
  }

  if (daysSinceLastContact >= FOLLOW_UP_LOW_DAYS && relationshipScore >= 0.45) {
    return 'low';
  }

  return null;
}

function buildFollowUpReminder(
  contact: ContactSummaryRecord,
): FollowUpReminder | null {
  const priority = contact.followUpPriority;
  const daysSinceLastContact = contact.daysSinceLastContact;

  if (!priority || daysSinceLastContact == null) {
    return null;
  }

  const reason =
    priority === 'high'
      ? 'High-value contact with no recent communication'
      : priority === 'medium'
        ? 'No contact in two weeks'
        : 'Relationship may need a check-in';

  return {
    contactId: contact.id,
    name: contact.name,
    email: contact.email,
    daysSinceLastContact,
    priority,
    reason,
    relationshipScore: contact.relationshipScore,
  };
}

async function collectWorkspaceEmails(
  env: Env,
  userId: string,
  workspaceId?: string | null,
) {
  const db = createDb(env.DB);
  const filters = [eq(emails.userId, userId)];

  if (workspaceId) {
    const categories = getWorkspaceEmailCategories(workspaceId);
    if (categories.length > 0) {
      filters.push(inArray(emails.category, categories));
    }
  }

  return db
    .select({
      id: emails.id,
      subject: emails.subject,
      sender: emails.sender,
      recipients: emails.recipients,
      receivedAt: emails.receivedAt,
      category: emails.category,
    })
    .from(emails)
    .where(and(...filters))
    .orderBy(desc(emails.receivedAt));
}

function buildWorkspaceAddressSet(
  emailRows: Awaited<ReturnType<typeof collectWorkspaceEmails>>,
): Set<string> {
  const addresses = new Set<string>();

  for (const row of emailRows) {
    const sender = normalizeEmail(row.sender);
    if (sender) {
      addresses.add(sender);
    }

    if (Array.isArray(row.recipients)) {
      for (const recipient of row.recipients) {
        const normalized = normalizeEmail(recipient);
        if (normalized) {
          addresses.add(normalized);
        }
      }
    }
  }

  return addresses;
}

async function listContactRows(
  env: Env,
  userId: string,
  filters?: { workspaceId?: string | null; query?: string },
) {
  const db = createDb(env.DB);
  const conditions = [eq(contacts.userId, userId)];

  if (filters?.query) {
    const pattern = `%${filters.query}%`;
    conditions.push(
      or(like(contacts.name, pattern), like(contacts.email, pattern))!,
    );
  }

  const rows = await db
    .select()
    .from(contacts)
    .where(and(...conditions))
    .orderBy(desc(contacts.lastSeen));

  if (!filters?.workspaceId) {
    return rows;
  }

  const emailRows = await collectWorkspaceEmails(
    env,
    userId,
    filters.workspaceId,
  );
  const addresses = buildWorkspaceAddressSet(emailRows);

  if (addresses.size === 0) {
    return rows;
  }

  return rows.filter((row) => {
    const email = normalizeEmail(row.email);
    return email ? addresses.has(email) : false;
  });
}

function enrichContact(
  row: typeof contacts.$inferSelect,
  relationshipScore: number | null | undefined,
): ContactSummaryRecord {
  const score = deriveRelationshipScore(
    relationshipScore,
    row.interactionCount,
  );
  const daysSinceLastContact = daysSince(row.lastSeen);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    companyId: row.companyId,
    firstSeen: row.firstSeen,
    lastSeen: row.lastSeen,
    interactionCount: row.interactionCount,
    relationshipScore: score,
    daysSinceLastContact,
    followUpPriority: resolveFollowUpPriority(daysSinceLastContact, score),
  };
}

function buildCommunicationAnalytics(
  activityRows: Array<{
    receivedAt: string | null;
  }>,
): CommunicationAnalytics {
  const now = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;
  const timestamps = activityRows
    .map((row) => (row.receivedAt ? Date.parse(row.receivedAt) : NaN))
    .filter((value) => !Number.isNaN(value))
    .sort((left, right) => left - right);

  const emailsLast30Days = timestamps.filter(
    (value) => now - value <= 30 * dayMs,
  ).length;
  const emailsLast7Days = timestamps.filter(
    (value) => now - value <= 7 * dayMs,
  ).length;

  let averageGapDays: number | null = null;
  if (timestamps.length > 1) {
    const gaps: number[] = [];
    for (let index = 1; index < timestamps.length; index += 1) {
      gaps.push((timestamps[index] - timestamps[index - 1]) / dayMs);
    }
    averageGapDays = Math.round(
      gaps.reduce((total, gap) => total + gap, 0) / gaps.length,
    );
  }

  let trend: CommunicationAnalytics['trend'] = 'stable';
  if (emailsLast7Days > 0 && emailsLast30Days > emailsLast7Days * 2) {
    trend = 'increasing';
  } else if (emailsLast30Days > 0 && emailsLast7Days === 0) {
    trend = 'declining';
  }

  return {
    totalEmails: timestamps.length,
    emailsLast30Days,
    emailsLast7Days,
    averageGapDays,
    lastInboundAt:
      timestamps.length > 0
        ? new Date(timestamps[timestamps.length - 1]).toISOString()
        : null,
    trend,
  };
}

function buildCrmSummary(contactItems: ContactSummaryRecord[]): CrmSummary {
  const followUpReminders = contactItems
    .map((contact) => buildFollowUpReminder(contact))
    .filter((reminder): reminder is FollowUpReminder => reminder !== null)
    .sort((left, right) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const weightDiff =
        priorityWeight[right.priority] - priorityWeight[left.priority];
      if (weightDiff !== 0) {
        return weightDiff;
      }
      return right.daysSinceLastContact - left.daysSinceLastContact;
    });

  const averageRelationshipScore =
    contactItems.length > 0
      ? contactItems.reduce(
          (total, item) => total + item.relationshipScore,
          0,
        ) / contactItems.length
      : 0;

  const activeContactsLast30Days = contactItems.filter(
    (contact) =>
      contact.daysSinceLastContact != null &&
      contact.daysSinceLastContact <= 30,
  ).length;

  const emailsLast30Days = contactItems.reduce(
    (total, contact) => total + (contact.interactionCount ?? 0),
    0,
  );

  return {
    totalContacts: contactItems.length,
    averageRelationshipScore,
    followUpCount: followUpReminders.length,
    followUpReminders: followUpReminders.slice(0, 10),
    communicationAnalytics: {
      emailsLast30Days,
      activeContactsLast30Days,
      averageEmailsPerContact:
        contactItems.length > 0 ? emailsLast30Days / contactItems.length : 0,
    },
  };
}

export async function listContacts(
  env: Env,
  userId: string,
  filters?: { workspaceId?: string | null; query?: string },
): Promise<{ contacts: ContactSummaryRecord[]; summary: CrmSummary }> {
  const rows = await listContactRows(env, userId, filters);
  const db = createDb(env.DB);
  const relationshipRows = await db
    .select()
    .from(relationships)
    .where(eq(relationships.userId, userId));

  const scoreByContact = new Map(
    relationshipRows.map((row) => [row.contactId, row.relationshipScore]),
  );

  const contactItems = rows.map((row) =>
    enrichContact(row, scoreByContact.get(row.id)),
  );

  return {
    contacts: contactItems,
    summary: buildCrmSummary(contactItems),
  };
}

export async function getContactProfile(
  env: Env,
  userId: string,
  contactId: string,
  workspaceId?: string | null,
): Promise<ContactProfile | null> {
  const db = createDb(env.DB);
  const contactRows = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
    .limit(1);

  const contactRow = contactRows[0];
  if (!contactRow) {
    return null;
  }

  const relationshipRows = await db
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.userId, userId),
        eq(relationships.contactId, contactId),
      ),
    )
    .limit(1);

  const relationship = relationshipRows[0] ?? null;
  const contact = enrichContact(contactRow, relationship?.relationshipScore);

  const emailRows = await collectWorkspaceEmails(env, userId, workspaceId);
  const contactEmail = normalizeEmail(contact.email);

  const activity = contactEmail
    ? emailRows
        .filter((row) => {
          const sender = normalizeEmail(row.sender);
          if (sender === contactEmail) {
            return true;
          }

          if (Array.isArray(row.recipients)) {
            return row.recipients.some(
              (recipient) => normalizeEmail(recipient) === contactEmail,
            );
          }

          return false;
        })
        .slice(0, 12)
        .map((row) => ({
          id: row.id,
          subject: row.subject,
          sender: row.sender,
          receivedAt: row.receivedAt,
          category: row.category,
        }))
    : [];

  return {
    contact,
    relationship: relationship
      ? {
          id: relationship.id,
          relationshipScore: relationship.relationshipScore,
          lastInteraction: relationship.lastInteraction,
          metadata:
            (relationship.metadata as Record<string, unknown> | null) ?? null,
        }
      : null,
    activity,
    analytics: buildCommunicationAnalytics(activity),
    followUpReminder: buildFollowUpReminder(contact),
  };
}

export async function countWorkspaceContacts(
  env: Env,
  userId: string,
  workspaceId: string,
): Promise<number> {
  const rows = await listContactRows(env, userId, { workspaceId });
  return rows.length;
}
