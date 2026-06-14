import { createDb } from '@brainmail/db';
import {
  artifacts,
  collections,
  dashboards,
  emails,
  insights,
  reports,
  workspaceEntities,
  workspaces,
} from '@brainmail/db/schema';
import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';

import { createId } from '../lib/crypto';
import {
  getWorkspaceContext,
  getWorkspaceEmailCategories,
  isSystemWorkspaceId,
  SYSTEM_WORKSPACES,
} from './context';

export type WorkspaceRecord = {
  id: string;
  userId: string;
  name: string | null;
  description: string | null;
  workspaceType: string | null;
  createdAt: string | null;
};

function serializeWorkspace(
  row: typeof workspaces.$inferSelect,
): WorkspaceRecord {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    workspaceType: row.workspaceType,
    createdAt: row.createdAt,
  };
}

export async function ensureSystemWorkspaces(
  env: Env,
  userId: string,
): Promise<void> {
  const db = createDb(env.DB);

  for (const workspace of SYSTEM_WORKSPACES) {
    await db
      .insert(workspaces)
      .values({
        id: workspace.id,
        userId,
        name: workspace.name,
        description: workspace.description,
        workspaceType: workspace.workspaceType,
      })
      .onConflictDoNothing();
  }
}

export async function listWorkspaces(
  env: Env,
  userId: string,
): Promise<WorkspaceRecord[]> {
  await ensureSystemWorkspaces(env, userId);

  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.userId, userId))
    .orderBy(desc(workspaces.createdAt));

  return rows.map(serializeWorkspace);
}

export async function getWorkspaceForUser(
  env: Env,
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRecord | null> {
  await ensureSystemWorkspaces(env, userId);

  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)))
    .limit(1);

  const row = rows[0];
  return row ? serializeWorkspace(row) : null;
}

export async function getWorkspaceDetail(
  env: Env,
  userId: string,
  workspaceId: string,
) {
  const workspace = await getWorkspaceForUser(env, userId, workspaceId);
  if (!workspace) {
    return null;
  }

  const db = createDb(env.DB);
  const categories = getWorkspaceEmailCategories(workspaceId);
  const emailFilters = [eq(emails.userId, userId)];

  if (categories.length > 0) {
    emailFilters.push(inArray(emails.category, categories));
  }

  const [
    emailCountRow,
    artifactCountRow,
    entityCountRow,
    collectionCountRow,
    dashboardCountRow,
    reportCountRow,
    insightCountRow,
    recentEmails,
    recentArtifacts,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(emails)
      .where(and(...emailFilters)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(artifacts)
      .where(
        and(
          eq(artifacts.userId, userId),
          eq(artifacts.workspaceId, workspaceId),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(workspaceEntities)
      .where(eq(workspaceEntities.workspaceId, workspaceId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(collections)
      .where(
        and(
          eq(collections.userId, userId),
          eq(collections.workspaceId, workspaceId),
          eq(collections.status, 'active'),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(dashboards)
      .where(
        and(
          eq(dashboards.userId, userId),
          eq(dashboards.workspaceId, workspaceId),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(reports)
      .where(
        and(eq(reports.userId, userId), eq(reports.workspaceId, workspaceId)),
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(insights)
      .where(
        and(eq(insights.userId, userId), eq(insights.workspaceId, workspaceId)),
      ),
    db
      .select({
        id: emails.id,
        subject: emails.subject,
        sender: emails.sender,
        category: emails.category,
        receivedAt: emails.receivedAt,
      })
      .from(emails)
      .where(and(...emailFilters))
      .orderBy(desc(emails.receivedAt), desc(emails.createdAt))
      .limit(5),
    db
      .select({
        id: artifacts.id,
        title: artifacts.title,
        artifactType: artifacts.artifactType,
        createdAt: artifacts.createdAt,
      })
      .from(artifacts)
      .where(
        and(
          eq(artifacts.userId, userId),
          eq(artifacts.workspaceId, workspaceId),
        ),
      )
      .orderBy(desc(artifacts.createdAt))
      .limit(5),
  ]);

  const context = getWorkspaceContext(workspaceId);

  return {
    workspace,
    context: {
      categories: context.categories,
      workspaceType: context.workspaceType,
    },
    stats: {
      emails: emailCountRow[0]?.count ?? 0,
      artifacts: artifactCountRow[0]?.count ?? 0,
      entities: entityCountRow[0]?.count ?? 0,
      collections: collectionCountRow[0]?.count ?? 0,
      dashboards: dashboardCountRow[0]?.count ?? 0,
      reports: reportCountRow[0]?.count ?? 0,
      insights: insightCountRow[0]?.count ?? 0,
    },
    recentEmails,
    recentArtifacts,
  };
}

export async function createWorkspace(
  env: Env,
  userId: string,
  input: { name: string; description?: string; workspaceType?: string },
): Promise<WorkspaceRecord> {
  const db = createDb(env.DB);
  const id = createId('workspace');

  await db.insert(workspaces).values({
    id,
    userId,
    name: input.name,
    description: input.description ?? null,
    workspaceType: input.workspaceType ?? 'Custom',
  });

  const created = await getWorkspaceForUser(env, userId, id);
  if (!created) {
    throw new Error('Failed to create workspace');
  }

  return created;
}

export async function updateWorkspace(
  env: Env,
  userId: string,
  workspaceId: string,
  input: { name?: string; description?: string; workspaceType?: string },
): Promise<WorkspaceRecord | null> {
  const existing = await getWorkspaceForUser(env, userId, workspaceId);
  if (!existing) {
    return null;
  }

  const db = createDb(env.DB);
  await db
    .update(workspaces)
    .set({
      name: input.name ?? existing.name,
      description:
        input.description !== undefined
          ? input.description
          : existing.description,
      workspaceType: input.workspaceType ?? existing.workspaceType,
    })
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)));

  return getWorkspaceForUser(env, userId, workspaceId);
}

export async function deleteWorkspace(
  env: Env,
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  if (isSystemWorkspaceId(workspaceId)) {
    return false;
  }

  const existing = await getWorkspaceForUser(env, userId, workspaceId);
  if (!existing) {
    return false;
  }

  const db = createDb(env.DB);
  await db
    .delete(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)));

  return true;
}

export async function runWorkspaceSearch(
  env: Env,
  userId: string,
  workspaceId: string,
  query: string,
  limit = 10,
) {
  const workspace = await getWorkspaceForUser(env, userId, workspaceId);
  if (!workspace) {
    return null;
  }

  const db = createDb(env.DB);
  const pattern = `%${query}%`;
  const categories = getWorkspaceEmailCategories(workspaceId);

  const emailFilters = [
    eq(emails.userId, userId),
    or(
      like(emails.subject, pattern),
      like(emails.sender, pattern),
      like(emails.snippet, pattern),
    )!,
  ];

  if (categories.length > 0) {
    emailFilters.push(inArray(emails.category, categories));
  }

  const [emailResults, artifactResults] = await Promise.all([
    db
      .select({
        id: emails.id,
        subject: emails.subject,
        sender: emails.sender,
        category: emails.category,
        receivedAt: emails.receivedAt,
      })
      .from(emails)
      .where(and(...emailFilters))
      .orderBy(desc(emails.receivedAt))
      .limit(limit),
    db
      .select({
        id: artifacts.id,
        title: artifacts.title,
        artifactType: artifacts.artifactType,
        createdAt: artifacts.createdAt,
      })
      .from(artifacts)
      .where(
        and(
          eq(artifacts.userId, userId),
          eq(artifacts.workspaceId, workspaceId),
          or(
            like(artifacts.title, pattern),
            like(artifacts.artifactType, pattern),
          )!,
        ),
      )
      .orderBy(desc(artifacts.createdAt))
      .limit(limit),
  ]);

  return {
    workspaceId,
    query,
    emails: emailResults,
    artifacts: artifactResults,
  };
}
