import { createDb } from '@brainmail/db';
import { artifacts } from '@brainmail/db/schema';
import { and, desc, eq } from 'drizzle-orm';

import type { UIBlock } from '../agents/types';
import { createId, createOAuthState } from '../lib/crypto';
import { exportArtifactPayload } from './export';
import {
  isArtifactType,
  type ArtifactRecord,
  type ArtifactType,
  type SaveArtifactInput,
} from './types';

const SHARE_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function serializeArtifact(row: typeof artifacts.$inferSelect): ArtifactRecord {
  return {
    id: row.id,
    userId: row.userId,
    workspaceId: row.workspaceId,
    artifactType: row.artifactType,
    title: row.title,
    payload: row.payload,
    createdBy: row.createdBy,
    shareToken: row.shareToken,
    sharedAt: row.sharedAt,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  };
}

export function inferArtifactType(
  blocks: UIBlock[],
  fallback: string,
): ArtifactType {
  const blockTypes = blocks.map((block) => block.type);

  if (
    blockTypes.some((type) =>
      ['line_chart', 'bar_chart', 'pie_chart'].includes(type),
    )
  ) {
    return 'chart';
  }

  if (
    blockTypes.some((type) =>
      ['workspace_summary', 'metric_grid', 'dashboard_card'].includes(type),
    )
  ) {
    return 'dashboard';
  }

  if (
    blockTypes.some((type) =>
      [
        'table',
        'invoice_table',
        'timeline',
        'daily_briefing',
        'vendor_profile',
      ].includes(type),
    )
  ) {
    return 'report';
  }

  if (isArtifactType(fallback)) {
    return fallback;
  }

  return 'report';
}

export async function listArtifacts(
  env: Env,
  userId: string,
  filters?: { artifactType?: string | null; workspaceId?: string | null },
): Promise<ArtifactRecord[]> {
  const db = createDb(env.DB);
  const conditions = [eq(artifacts.userId, userId)];

  if (filters?.artifactType) {
    conditions.push(eq(artifacts.artifactType, filters.artifactType));
  }

  if (filters?.workspaceId) {
    conditions.push(eq(artifacts.workspaceId, filters.workspaceId));
  }

  const rows = await db
    .select()
    .from(artifacts)
    .where(and(...conditions))
    .orderBy(desc(artifacts.createdAt))
    .limit(100);

  return rows.map(serializeArtifact);
}

export async function getArtifactForUser(
  env: Env,
  userId: string,
  artifactId: string,
): Promise<ArtifactRecord | null> {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(artifacts)
    .where(and(eq(artifacts.id, artifactId), eq(artifacts.userId, userId)))
    .limit(1);

  const row = rows[0];
  return row ? serializeArtifact(row) : null;
}

export async function createArtifact(
  env: Env,
  userId: string,
  input: SaveArtifactInput,
): Promise<ArtifactRecord> {
  const db = createDb(env.DB);
  const id = createId('artifact');
  const now = new Date().toISOString();

  await db.insert(artifacts).values({
    id,
    userId,
    workspaceId: input.workspaceId ?? null,
    artifactType: input.artifactType,
    title: input.title,
    payload: input.payload,
    createdBy: input.createdBy ?? 'user',
    updatedAt: now,
  });

  const created = await getArtifactForUser(env, userId, id);
  if (!created) {
    throw new Error('Failed to create artifact');
  }

  return created;
}

export async function deleteArtifact(
  env: Env,
  userId: string,
  artifactId: string,
): Promise<boolean> {
  const existing = await getArtifactForUser(env, userId, artifactId);
  if (!existing) {
    return false;
  }

  const db = createDb(env.DB);
  await db
    .delete(artifacts)
    .where(and(eq(artifacts.id, artifactId), eq(artifacts.userId, userId)));

  return true;
}

export async function shareArtifact(
  env: Env,
  userId: string,
  artifactId: string,
): Promise<{ shareToken: string; sharedAt: string } | null> {
  const db = createDb(env.DB);
  const existing = await getArtifactForUser(env, userId, artifactId);
  if (!existing) {
    return null;
  }

  const shareToken = existing.shareToken ?? createOAuthState();
  const sharedAt = new Date().toISOString();

  await db
    .update(artifacts)
    .set({
      shareToken,
      sharedAt,
      updatedAt: sharedAt,
    })
    .where(and(eq(artifacts.id, artifactId), eq(artifacts.userId, userId)));

  return { shareToken, sharedAt };
}

export async function getSharedArtifact(
  env: Env,
  shareToken: string,
): Promise<Pick<
  ArtifactRecord,
  'id' | 'artifactType' | 'title' | 'payload' | 'sharedAt'
> | null> {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(artifacts)
    .where(eq(artifacts.shareToken, shareToken))
    .limit(1);

  const row = rows[0];
  if (!row || !row.shareToken || !row.sharedAt) {
    return null;
  }

  if (Date.now() - new Date(row.sharedAt).getTime() > SHARE_LINK_TTL_MS) {
    return null;
  }

  return {
    id: row.id,
    artifactType: row.artifactType,
    title: row.title,
    payload: row.payload,
    sharedAt: row.sharedAt,
  };
}

export function buildArtifactExport(
  artifact: ArtifactRecord,
  format: 'json' | 'csv',
) {
  return exportArtifactPayload(artifact.artifactType, artifact.payload, format);
}
