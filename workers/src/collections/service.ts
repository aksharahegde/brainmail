import { createDb } from '@brainmail/db';
import { collectionMembers, collections, entities } from '@brainmail/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';

import { createId } from '../lib/crypto';
import type { CollectionRecord } from './types';

function serializeCollection(
  row: typeof collections.$inferSelect,
): CollectionRecord {
  return {
    id: row.id,
    userId: row.userId,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description,
    collectionType: row.collectionType,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listCollections(
  env: Env,
  userId: string,
  filters?: {
    workspaceId?: string | null;
    status?: string | null;
    collectionType?: string | null;
  },
): Promise<Array<CollectionRecord & { memberCount: number }>> {
  const db = createDb(env.DB);
  const conditions = [eq(collections.userId, userId)];

  if (filters?.workspaceId) {
    conditions.push(eq(collections.workspaceId, filters.workspaceId));
  }
  if (filters?.status) {
    conditions.push(eq(collections.status, filters.status));
  }
  if (filters?.collectionType) {
    conditions.push(eq(collections.collectionType, filters.collectionType));
  }

  const rows = await db
    .select({
      collection: collections,
      memberCount: sql<number>`count(${collectionMembers.entityId})`,
    })
    .from(collections)
    .leftJoin(
      collectionMembers,
      eq(collectionMembers.collectionId, collections.id),
    )
    .where(and(...conditions))
    .groupBy(collections.id)
    .orderBy(desc(collections.updatedAt), desc(collections.createdAt));

  return rows.map((row) => ({
    ...serializeCollection(row.collection),
    memberCount: row.memberCount ?? 0,
  }));
}

export async function getCollectionForUser(
  env: Env,
  userId: string,
  collectionId: string,
): Promise<CollectionRecord | null> {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(collections)
    .where(
      and(eq(collections.id, collectionId), eq(collections.userId, userId)),
    )
    .limit(1);

  const row = rows[0];
  return row ? serializeCollection(row) : null;
}

export async function getCollectionDetail(
  env: Env,
  userId: string,
  collectionId: string,
) {
  const collection = await getCollectionForUser(env, userId, collectionId);
  if (!collection) {
    return null;
  }

  const db = createDb(env.DB);
  const [memberCountRow, members] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(collectionMembers)
      .where(eq(collectionMembers.collectionId, collectionId)),
    db
      .select({
        entityId: collectionMembers.entityId,
        addedBy: collectionMembers.addedBy,
        createdAt: collectionMembers.createdAt,
        entityType: entities.entityType,
        confidence: entities.confidence,
        sourceId: entities.sourceId,
      })
      .from(collectionMembers)
      .innerJoin(entities, eq(entities.id, collectionMembers.entityId))
      .where(eq(collectionMembers.collectionId, collectionId))
      .orderBy(desc(collectionMembers.createdAt))
      .limit(25),
  ]);

  return {
    collection,
    memberCount: memberCountRow[0]?.count ?? 0,
    members,
  };
}

export async function createCollection(
  env: Env,
  userId: string,
  input: {
    name: string;
    description?: string;
    workspaceId?: string;
    collectionType?: string;
  },
): Promise<CollectionRecord> {
  const db = createDb(env.DB);
  const id = createId('collection');
  const now = new Date().toISOString();

  await db.insert(collections).values({
    id,
    userId,
    workspaceId: input.workspaceId ?? null,
    name: input.name,
    description: input.description ?? null,
    collectionType: input.collectionType ?? 'user',
    status: 'active',
    updatedAt: now,
  });

  const created = await getCollectionForUser(env, userId, id);
  if (!created) {
    throw new Error('Failed to create collection');
  }

  return created;
}

export async function updateCollection(
  env: Env,
  userId: string,
  collectionId: string,
  input: {
    name?: string;
    description?: string;
    workspaceId?: string;
    status?: string;
  },
): Promise<CollectionRecord | null> {
  const existing = await getCollectionForUser(env, userId, collectionId);
  if (!existing) {
    return null;
  }

  const db = createDb(env.DB);
  await db
    .update(collections)
    .set({
      name: input.name ?? existing.name,
      description:
        input.description !== undefined
          ? input.description
          : existing.description,
      workspaceId: input.workspaceId ?? existing.workspaceId,
      status: input.status ?? existing.status,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(eq(collections.id, collectionId), eq(collections.userId, userId)),
    );

  return getCollectionForUser(env, userId, collectionId);
}

export async function deleteCollection(
  env: Env,
  userId: string,
  collectionId: string,
): Promise<boolean> {
  const existing = await getCollectionForUser(env, userId, collectionId);
  if (!existing) {
    return false;
  }

  if (existing.collectionType === 'system') {
    return false;
  }

  const db = createDb(env.DB);
  await db
    .delete(collectionMembers)
    .where(eq(collectionMembers.collectionId, collectionId));
  await db
    .delete(collections)
    .where(
      and(eq(collections.id, collectionId), eq(collections.userId, userId)),
    );

  return true;
}

export async function addCollectionMember(
  env: Env,
  userId: string,
  collectionId: string,
  entityId: string,
): Promise<boolean> {
  const collection = await getCollectionForUser(env, userId, collectionId);
  if (!collection) {
    return false;
  }

  const db = createDb(env.DB);
  const entityRows = await db
    .select({ id: entities.id })
    .from(entities)
    .where(and(eq(entities.id, entityId), eq(entities.userId, userId)))
    .limit(1);

  if (!entityRows[0]) {
    return false;
  }

  await db
    .insert(collectionMembers)
    .values({
      collectionId,
      entityId,
      addedBy: 'user',
    })
    .onConflictDoNothing();

  await db
    .update(collections)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(collections.id, collectionId));

  return true;
}

export async function removeCollectionMember(
  env: Env,
  userId: string,
  collectionId: string,
  entityId: string,
): Promise<boolean> {
  const collection = await getCollectionForUser(env, userId, collectionId);
  if (!collection) {
    return false;
  }

  const db = createDb(env.DB);
  await db
    .delete(collectionMembers)
    .where(
      and(
        eq(collectionMembers.collectionId, collectionId),
        eq(collectionMembers.entityId, entityId),
      ),
    );

  await db
    .update(collections)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(collections.id, collectionId));

  return true;
}

export async function listCollectionSuggestions(
  env: Env,
  userId: string,
  workspaceId?: string | null,
): Promise<CollectionRecord[]> {
  const rows = await listCollections(env, userId, {
    workspaceId,
    status: 'suggested',
  });

  return rows.map(
    ({
      id,
      userId,
      workspaceId: wsId,
      name,
      description,
      collectionType,
      status,
      createdAt,
      updatedAt,
    }) => ({
      id,
      userId,
      workspaceId: wsId,
      name,
      description,
      collectionType,
      status,
      createdAt,
      updatedAt,
    }),
  );
}

export async function acceptCollectionSuggestion(
  env: Env,
  userId: string,
  collectionId: string,
): Promise<CollectionRecord | null> {
  const collection = await getCollectionForUser(env, userId, collectionId);
  if (!collection || collection.status !== 'suggested') {
    return null;
  }

  return updateCollection(env, userId, collectionId, { status: 'active' });
}

export async function dismissCollectionSuggestion(
  env: Env,
  userId: string,
  collectionId: string,
): Promise<boolean> {
  const collection = await getCollectionForUser(env, userId, collectionId);
  if (!collection || collection.status !== 'suggested') {
    return false;
  }

  const db = createDb(env.DB);
  await db
    .delete(collections)
    .where(
      and(eq(collections.id, collectionId), eq(collections.userId, userId)),
    );

  return true;
}
