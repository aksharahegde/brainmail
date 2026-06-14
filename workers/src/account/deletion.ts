import { createDb } from '@brainmail/db';
import {
  accounts,
  artifacts,
  attachments,
  auditLogs,
  automations,
  automationRuns,
  chatMessages,
  chatSessions,
  collections,
  collectionMembers,
  companies,
  contacts,
  dashboards,
  emails,
  emailThreads,
  embeddings,
  entities,
  entityRelationships,
  filters,
  gmailSyncStates,
  insights,
  invoices,
  oauthStates,
  receipts,
  relationships,
  reports,
  sessionState,
  sessions,
  sources,
  subscriptions,
  tripEvents,
  trips,
  userRules,
  users,
  workspaceEntities,
  workspaces,
} from '@brainmail/db/schema';
import { eq, inArray } from 'drizzle-orm';

import { writeAuditLog } from '../audit/service';
import { revokeAllUserSessions } from '../lib/session';

export type AccountDeletionPreview = {
  userId: string;
  email: string | null;
  counts: {
    emails: number;
    workspaces: number;
    artifacts: number;
    automations: number;
    collections: number;
    accounts: number;
    embeddings: number;
  };
};

async function countForUser(
  env: Env,
  userId: string,
  tableName: string,
): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM ${tableName} WHERE user_id = ?`,
  )
    .bind(userId)
    .first<{ count: number }>();

  return row?.count ?? 0;
}

export async function previewAccountDeletion(
  env: Env,
  userId: string,
): Promise<AccountDeletionPreview | null> {
  const db = createDb(env.DB);
  const user = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]) {
    return null;
  }

  const [
    emailsCount,
    workspacesCount,
    artifactsCount,
    automationsCount,
    collectionsCount,
    accountsCount,
    embeddingsCount,
  ] = await Promise.all([
    countForUser(env, userId, 'emails'),
    countForUser(env, userId, 'workspaces'),
    countForUser(env, userId, 'artifacts'),
    countForUser(env, userId, 'automations'),
    countForUser(env, userId, 'collections'),
    countForUser(env, userId, 'accounts'),
    countForUser(env, userId, 'embeddings'),
  ]);

  await writeAuditLog(env, {
    userId,
    action: 'account.deletion_previewed',
    payload: {
      emails: emailsCount,
      workspaces: workspacesCount,
    },
  });

  return {
    userId,
    email: user[0].email,
    counts: {
      emails: emailsCount,
      workspaces: workspacesCount,
      artifacts: artifactsCount,
      automations: automationsCount,
      collections: collectionsCount,
      accounts: accountsCount,
      embeddings: embeddingsCount,
    },
  };
}

async function deleteUserVectors(env: Env, userId: string): Promise<void> {
  if (!env.EMBEDDINGS) {
    return;
  }

  const db = createDb(env.DB);
  const rows = await db
    .select({ vectorId: embeddings.vectorId })
    .from(embeddings)
    .where(eq(embeddings.userId, userId));

  const vectorIds = rows
    .map((row) => row.vectorId)
    .filter((value): value is string => Boolean(value));

  if (vectorIds.length === 0) {
    return;
  }

  await env.EMBEDDINGS.deleteByIds(vectorIds);
}

async function deleteUserFiles(env: Env, userId: string): Promise<void> {
  if (!env.ATTACHMENTS) {
    return;
  }

  const db = createDb(env.DB);
  const emailRows = await db
    .select({ rawPath: emails.rawPath })
    .from(emails)
    .where(eq(emails.userId, userId));

  const emailIds = await db
    .select({ id: emails.id })
    .from(emails)
    .where(eq(emails.userId, userId));

  const ids = emailIds.map((row) => row.id);
  const attachmentRows =
    ids.length > 0
      ? await db
          .select({ r2Path: attachments.r2Path })
          .from(attachments)
          .where(inArray(attachments.emailId, ids))
      : [];

  const paths = new Set<string>();
  for (const row of emailRows) {
    if (row.rawPath) {
      paths.add(row.rawPath);
    }
  }
  for (const row of attachmentRows) {
    if (row.r2Path) {
      paths.add(row.r2Path);
    }
  }

  await Promise.all(
    [...paths].map(async (path) => {
      try {
        await env.ATTACHMENTS.delete(path);
      } catch {
        // Best-effort cleanup for missing objects.
      }
    }),
  );
}

export async function deleteUserAccount(
  env: Env,
  userId: string,
  confirmation: string,
): Promise<{ deleted: boolean }> {
  const db = createDb(env.DB);
  const user = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]) {
    throw new Error('User not found');
  }

  const expected = user[0].email ?? 'DELETE';
  if (confirmation.trim().toLowerCase() !== expected.trim().toLowerCase()) {
    throw new Error('Confirmation does not match account email');
  }

  await revokeAllUserSessions(env, userId);
  await deleteUserVectors(env, userId);
  await deleteUserFiles(env, userId);

  const automationIds = (
    await db
      .select({ id: automations.id })
      .from(automations)
      .where(eq(automations.userId, userId))
  ).map((row) => row.id);

  if (automationIds.length > 0) {
    await db
      .delete(automationRuns)
      .where(inArray(automationRuns.automationId, automationIds));
  }

  const sessionIds = (
    await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
  ).map((row) => row.id);

  if (sessionIds.length > 0) {
    await db
      .delete(chatMessages)
      .where(inArray(chatMessages.sessionId, sessionIds));
    await db
      .delete(sessionState)
      .where(inArray(sessionState.sessionId, sessionIds));
  }

  const emailIdRows = await db
    .select({ id: emails.id })
    .from(emails)
    .where(eq(emails.userId, userId));
  const emailIds = emailIdRows.map((row) => row.id);

  if (emailIds.length > 0) {
    await db.delete(attachments).where(inArray(attachments.emailId, emailIds));
  }

  const collectionIds = (
    await db
      .select({ id: collections.id })
      .from(collections)
      .where(eq(collections.userId, userId))
  ).map((row) => row.id);

  if (collectionIds.length > 0) {
    await db
      .delete(collectionMembers)
      .where(inArray(collectionMembers.collectionId, collectionIds));
  }

  const workspaceIds = (
    await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.userId, userId))
  ).map((row) => row.id);

  if (workspaceIds.length > 0) {
    await db
      .delete(workspaceEntities)
      .where(inArray(workspaceEntities.workspaceId, workspaceIds));
  }

  const accountIds = (
    await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, userId))
  ).map((row) => row.id);

  if (accountIds.length > 0) {
    await db
      .delete(gmailSyncStates)
      .where(inArray(gmailSyncStates.accountId, accountIds));
  }

  const tripIds = (
    await db
      .select({ id: trips.id })
      .from(trips)
      .where(eq(trips.userId, userId))
  ).map((row) => row.id);

  if (tripIds.length > 0) {
    await db.delete(tripEvents).where(inArray(tripEvents.tripId, tripIds));
  }

  await db.delete(emails).where(eq(emails.userId, userId));
  await db.delete(emailThreads).where(eq(emailThreads.userId, userId));
  await db.delete(sources).where(eq(sources.userId, userId));
  await db.delete(entities).where(eq(entities.userId, userId));
  await db
    .delete(entityRelationships)
    .where(eq(entityRelationships.userId, userId));
  await db.delete(invoices).where(eq(invoices.userId, userId));
  await db.delete(receipts).where(eq(receipts.userId, userId));
  await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
  await db.delete(trips).where(eq(trips.userId, userId));
  await db.delete(companies).where(eq(companies.userId, userId));
  await db.delete(contacts).where(eq(contacts.userId, userId));
  await db.delete(relationships).where(eq(relationships.userId, userId));
  await db.delete(collections).where(eq(collections.userId, userId));
  await db.delete(dashboards).where(eq(dashboards.userId, userId));
  await db.delete(reports).where(eq(reports.userId, userId));
  await db.delete(artifacts).where(eq(artifacts.userId, userId));
  await db.delete(automations).where(eq(automations.userId, userId));
  await db.delete(filters).where(eq(filters.userId, userId));
  await db.delete(chatSessions).where(eq(chatSessions.userId, userId));
  await db.delete(workspaces).where(eq(workspaces.userId, userId));
  await db.delete(insights).where(eq(insights.userId, userId));
  await db.delete(userRules).where(eq(userRules.userId, userId));
  await db.delete(embeddings).where(eq(embeddings.userId, userId));
  await db.delete(auditLogs).where(eq(auditLogs.userId, userId));
  await db.delete(gmailSyncStates).where(eq(gmailSyncStates.userId, userId));
  await db.delete(accounts).where(eq(accounts.userId, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.delete(oauthStates).where(eq(oauthStates.userId, userId));
  await db.delete(users).where(eq(users.id, userId));

  return { deleted: true };
}
