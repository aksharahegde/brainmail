import { createDb } from '@brainmail/db';
import {
  companies,
  contacts,
  entities,
  invoices,
  receipts,
  subscriptions,
  trips,
} from '@brainmail/db/schema';
import { and, desc, eq, like, or } from 'drizzle-orm';

import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';

const ENTITY_TYPES = [
  'company',
  'contact',
  'invoice',
  'receipt',
  'subscription',
  'trip',
  'entity',
] as const;

type EntityListType = (typeof ENTITY_TYPES)[number];

function isEntityListType(value: string | null): value is EntityListType {
  return !!value && ENTITY_TYPES.includes(value as EntityListType);
}

export async function handleEntitiesList(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const query = url.searchParams.get('q')?.trim();

  if (type && !isEntityListType(type)) {
    return errorResponse('Invalid entity type', 400);
  }

  const db = createDb(env.DB);
  const items: Array<{
    id: string;
    type: string;
    label: string;
    summary: string | null;
    confidence: number | null;
    sourceId: string | null;
    createdAt: string | null;
  }> = [];

  const selectedType = type ?? 'entity';

  if (selectedType === 'entity' || selectedType === 'company') {
    const filters = [eq(companies.userId, authResult.id)];
    if (query) {
      const pattern = `%${query}%`;
      filters.push(
        or(like(companies.name, pattern), like(companies.domain, pattern))!,
      );
    }

    const rows = await db
      .select()
      .from(companies)
      .where(and(...filters))
      .orderBy(desc(companies.createdAt))
      .limit(50);

    for (const row of rows) {
      items.push({
        id: row.id,
        type: 'company',
        label: row.name ?? row.domain ?? 'Unknown company',
        summary: row.domain,
        confidence: null,
        sourceId: null,
        createdAt: row.createdAt,
      });
    }
  }

  if (selectedType === 'entity' || selectedType === 'contact') {
    const filters = [eq(contacts.userId, authResult.id)];
    if (query) {
      const pattern = `%${query}%`;
      filters.push(
        or(like(contacts.name, pattern), like(contacts.email, pattern))!,
      );
    }

    const rows = await db
      .select()
      .from(contacts)
      .where(and(...filters))
      .orderBy(desc(contacts.lastSeen))
      .limit(50);

    for (const row of rows) {
      items.push({
        id: row.id,
        type: 'contact',
        label: row.name ?? row.email ?? 'Unknown contact',
        summary: row.email,
        confidence: null,
        sourceId: null,
        createdAt: row.lastSeen,
      });
    }
  }

  if (selectedType === 'entity' || selectedType === 'invoice') {
    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, authResult.id))
      .orderBy(desc(invoices.invoiceDate))
      .limit(50);

    for (const row of rows) {
      items.push({
        id: row.id,
        type: 'invoice',
        label: row.invoiceNumber ?? `Invoice ${row.id.slice(-6)}`,
        summary:
          row.amount != null ? `${row.currency ?? 'USD'} ${row.amount}` : null,
        confidence: row.confidence,
        sourceId: row.sourceId,
        createdAt: row.invoiceDate,
      });
    }
  }

  if (selectedType === 'entity' || selectedType === 'receipt') {
    const rows = await db
      .select()
      .from(receipts)
      .where(eq(receipts.userId, authResult.id))
      .orderBy(desc(receipts.receiptDate))
      .limit(50);

    for (const row of rows) {
      items.push({
        id: row.id,
        type: 'receipt',
        label: `Receipt ${row.id.slice(-6)}`,
        summary:
          row.amount != null ? `${row.currency ?? 'USD'} ${row.amount}` : null,
        confidence: null,
        sourceId: row.sourceId,
        createdAt: row.receiptDate,
      });
    }
  }

  if (selectedType === 'entity' || selectedType === 'subscription') {
    const rows = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, authResult.id))
      .orderBy(desc(subscriptions.renewalDate))
      .limit(50);

    for (const row of rows) {
      items.push({
        id: row.id,
        type: 'subscription',
        label: row.name ?? 'Subscription',
        summary:
          row.amount != null
            ? `${row.currency ?? 'USD'} ${row.amount}/${row.billingPeriod ?? 'period'}`
            : row.status,
        confidence: null,
        sourceId: row.sourceId,
        createdAt: row.renewalDate,
      });
    }
  }

  if (selectedType === 'entity' || selectedType === 'trip') {
    const rows = await db
      .select()
      .from(trips)
      .where(eq(trips.userId, authResult.id))
      .orderBy(desc(trips.startDate))
      .limit(50);

    for (const row of rows) {
      items.push({
        id: row.id,
        type: 'trip',
        label: row.title ?? 'Trip',
        summary: row.destination,
        confidence: null,
        sourceId: null,
        createdAt: row.startDate,
      });
    }
  }

  if (selectedType === 'entity') {
    const filters = [eq(entities.userId, authResult.id)];
    if (query) {
      filters.push(like(entities.entityType, `%${query}%`));
    }

    const rows = await db
      .select()
      .from(entities)
      .where(and(...filters))
      .orderBy(desc(entities.createdAt))
      .limit(50);

    for (const row of rows) {
      const data = row.data ?? {};
      const label =
        (typeof data.name === 'string' && data.name) ||
        (typeof data.vendor === 'string' && data.vendor) ||
        row.entityType;

      items.push({
        id: row.id,
        type: row.entityType,
        label,
        summary: row.sourceId,
        confidence: row.confidence,
        sourceId: row.sourceId,
        createdAt: row.createdAt,
      });
    }
  }

  return successResponse({
    entities: items,
    type: selectedType,
    total: items.length,
  });
}

export async function handleEntityDetail(
  request: Request,
  env: Env,
  entityId: string,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const db = createDb(env.DB);

  if (type === 'company') {
    const rows = await db
      .select()
      .from(companies)
      .where(
        and(eq(companies.id, entityId), eq(companies.userId, authResult.id)),
      )
      .limit(1);
    if (!rows[0]) {
      return errorResponse('Entity not found', 404);
    }
    return successResponse({ type: 'company', entity: rows[0] });
  }

  if (type === 'contact') {
    const rows = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, entityId), eq(contacts.userId, authResult.id)))
      .limit(1);
    if (!rows[0]) {
      return errorResponse('Entity not found', 404);
    }
    return successResponse({ type: 'contact', entity: rows[0] });
  }

  const rows = await db
    .select()
    .from(entities)
    .where(and(eq(entities.id, entityId), eq(entities.userId, authResult.id)))
    .limit(1);

  if (!rows[0]) {
    return errorResponse('Entity not found', 404);
  }

  return successResponse({ type: rows[0].entityType, entity: rows[0] });
}
