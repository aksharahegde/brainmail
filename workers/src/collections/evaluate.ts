import { createDb } from '@brainmail/db';
import {
  collectionMembers,
  collections,
  emails,
  entities,
} from '@brainmail/db/schema';
import { and, eq, notInArray, sql } from 'drizzle-orm';

import { createId } from '../lib/crypto';
import { getWorkspaceEmailCategories } from '../workspaces/context';

const ENTITY_TYPE_LABELS: Record<string, string> = {
  invoice: 'Invoices',
  receipt: 'Receipts',
  subscription: 'Subscriptions',
  flight: 'Flights',
  hotel: 'Hotels',
  company: 'Companies',
  person: 'Contacts',
  meeting: 'Meetings',
  task: 'Tasks',
};

const COLLECTION_ENTITY_MATCHERS: Record<string, string[]> = {
  'ai expenses': ['invoice', 'receipt'],
  subscriptions: ['subscription'],
  customers: ['company', 'person'],
  vendors: ['company', 'invoice'],
  travel: ['flight', 'hotel'],
  meetings: ['meeting'],
};

function normalizeName(name: string | null | undefined): string {
  return (name ?? '').trim().toLowerCase();
}

function getEntityMatchers(collectionName: string | null): string[] {
  const normalized = normalizeName(collectionName);
  if (COLLECTION_ENTITY_MATCHERS[normalized]) {
    return COLLECTION_ENTITY_MATCHERS[normalized];
  }

  for (const [key, matchers] of Object.entries(COLLECTION_ENTITY_MATCHERS)) {
    if (normalized.includes(key)) {
      return matchers;
    }
  }

  return [];
}

function entityMatchesCollection(
  entityType: string,
  collectionName: string | null,
): boolean {
  const matchers = getEntityMatchers(collectionName);
  return matchers.includes(entityType);
}

function inferWorkspaceForEmail(category: string | null): string | null {
  if (!category) {
    return null;
  }

  const financeCategories = [
    'invoice',
    'receipt',
    'subscription',
    'finance',
    'purchase',
  ];
  const travelCategories = ['travel', 'flight', 'hotel'];
  const startupCategories = ['work', 'meeting', 'job'];

  if (financeCategories.includes(category)) {
    return 'finance';
  }
  if (travelCategories.includes(category)) {
    return 'travel';
  }
  if (startupCategories.includes(category)) {
    return 'startup';
  }
  if (category === 'personal' || category === 'social') {
    return 'personal';
  }
  if (category === 'newsletter') {
    return 'learning';
  }

  return null;
}

async function addEntityToCollection(
  env: Env,
  collectionId: string,
  entityId: string,
  addedBy: 'ai' | 'user' | 'system',
): Promise<void> {
  const db = createDb(env.DB);
  await db
    .insert(collectionMembers)
    .values({
      collectionId,
      entityId,
      addedBy,
    })
    .onConflictDoNothing();
}

export async function evaluateEmailCollections(
  env: Env,
  input: { userId: string; emailId: string },
): Promise<void> {
  const db = createDb(env.DB);
  const emailRows = await db
    .select({
      id: emails.id,
      category: emails.category,
    })
    .from(emails)
    .where(and(eq(emails.id, input.emailId), eq(emails.userId, input.userId)))
    .limit(1);

  const email = emailRows[0];
  if (!email) {
    return;
  }

  const entityRows = await db
    .select({
      id: entities.id,
      entityType: entities.entityType,
    })
    .from(entities)
    .where(
      and(
        eq(entities.userId, input.userId),
        eq(entities.sourceId, input.emailId),
      ),
    );

  if (entityRows.length === 0) {
    return;
  }

  const workspaceId = inferWorkspaceForEmail(email.category);
  const activeCollections = await db
    .select()
    .from(collections)
    .where(
      and(
        eq(collections.userId, input.userId),
        eq(collections.status, 'active'),
      ),
    );

  for (const collection of activeCollections) {
    if (
      collection.workspaceId &&
      workspaceId &&
      collection.workspaceId !== workspaceId
    ) {
      continue;
    }

    if (collection.workspaceId && workspaceId) {
      const categories = getWorkspaceEmailCategories(collection.workspaceId);
      if (
        categories.length > 0 &&
        email.category &&
        !categories.includes(email.category as (typeof categories)[number])
      ) {
        continue;
      }
    }

    for (const entity of entityRows) {
      if (entityMatchesCollection(entity.entityType, collection.name)) {
        await addEntityToCollection(env, collection.id, entity.id, 'ai');
      }
    }
  }

  await discoverCollectionSuggestions(env, input.userId, workspaceId);
}

export async function discoverCollectionSuggestions(
  env: Env,
  userId: string,
  workspaceId: string | null,
): Promise<void> {
  const db = createDb(env.DB);

  const memberRows = await db
    .select({ entityId: collectionMembers.entityId })
    .from(collectionMembers)
    .innerJoin(collections, eq(collections.id, collectionMembers.collectionId))
    .where(eq(collections.userId, userId));

  const assignedEntityIds = memberRows.map((row) => row.entityId);

  const entityFilters = [eq(entities.userId, userId)];
  if (assignedEntityIds.length > 0) {
    entityFilters.push(notInArray(entities.id, assignedEntityIds));
  }

  const unassignedEntities = await db
    .select({
      id: entities.id,
      entityType: entities.entityType,
    })
    .from(entities)
    .where(and(...entityFilters));

  const counts = new Map<string, number>();
  for (const entity of unassignedEntities) {
    counts.set(entity.entityType, (counts.get(entity.entityType) ?? 0) + 1);
  }

  for (const [entityType, count] of counts.entries()) {
    if (count < 2) {
      continue;
    }

    const label = ENTITY_TYPE_LABELS[entityType] ?? `${entityType} items`;
    const existingSuggestion = await db
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          eq(collections.userId, userId),
          eq(collections.status, 'suggested'),
          eq(collections.name, label),
          workspaceId
            ? eq(collections.workspaceId, workspaceId)
            : sql`${collections.workspaceId} IS NULL`,
        ),
      )
      .limit(1);

    if (existingSuggestion[0]) {
      continue;
    }

    await db.insert(collections).values({
      id: createId('collection'),
      userId,
      workspaceId,
      name: label,
      description: `AI discovered ${count} ${entityType} entities that could be grouped together.`,
      collectionType: 'ai_generated',
      status: 'suggested',
    });
  }
}
