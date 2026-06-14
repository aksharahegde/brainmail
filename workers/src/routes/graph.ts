import { createDb } from '@brainmail/db';
import {
  companies,
  contacts,
  entityRelationships,
  invoices,
  receipts,
  subscriptions,
  trips,
} from '@brainmail/db/schema';
import { desc, eq } from 'drizzle-orm';

import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';

type GraphNode = {
  id: string;
  type: string;
  label: string;
  metadata: Record<string, unknown>;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  confidence: number | null;
};

function nodeKey(type: string, id: string): string {
  return `${type}:${id}`;
}

export async function handleGraph(
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

  const db = createDb(env.DB);
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  function addNode(
    type: string,
    id: string,
    label: string,
    metadata: Record<string, unknown> = {},
  ) {
    const key = nodeKey(type, id);
    if (!nodes.has(key)) {
      nodes.set(key, { id: key, type, label, metadata });
    }
  }

  const companyRows = await db
    .select()
    .from(companies)
    .where(eq(companies.userId, authResult.id))
    .orderBy(desc(companies.createdAt))
    .limit(40);

  for (const row of companyRows) {
    addNode('company', row.id, row.name ?? row.domain ?? 'Company', {
      domain: row.domain,
    });
  }

  const contactRows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.userId, authResult.id))
    .orderBy(desc(contacts.lastSeen))
    .limit(40);

  for (const row of contactRows) {
    addNode('contact', row.id, row.name ?? row.email ?? 'Contact', {
      email: row.email,
      interactionCount: row.interactionCount,
    });
  }

  const invoiceRows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, authResult.id))
    .limit(40);

  for (const row of invoiceRows) {
    addNode('invoice', row.id, row.invoiceNumber ?? 'Invoice', {
      amount: row.amount,
      currency: row.currency,
    });
  }

  const receiptRows = await db
    .select()
    .from(receipts)
    .where(eq(receipts.userId, authResult.id))
    .limit(40);

  for (const row of receiptRows) {
    addNode('receipt', row.id, 'Receipt', {
      amount: row.amount,
      currency: row.currency,
    });
  }

  const subscriptionRows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, authResult.id))
    .limit(40);

  for (const row of subscriptionRows) {
    addNode('subscription', row.id, row.name ?? 'Subscription', {
      amount: row.amount,
      status: row.status,
    });
  }

  const tripRows = await db
    .select()
    .from(trips)
    .where(eq(trips.userId, authResult.id))
    .limit(40);

  for (const row of tripRows) {
    addNode('trip', row.id, row.title ?? 'Trip', {
      destination: row.destination,
    });
  }

  const relationshipRows = await db
    .select()
    .from(entityRelationships)
    .where(eq(entityRelationships.userId, authResult.id))
    .orderBy(desc(entityRelationships.createdAt))
    .limit(200);

  for (const row of relationshipRows) {
    const source = nodeKey(row.sourceType, row.sourceId);
    const target = nodeKey(row.targetType, row.targetId);
    addNode(row.sourceType, row.sourceId, row.sourceType);
    addNode(row.targetType, row.targetId, row.targetType);

    edges.push({
      id: row.id,
      source,
      target,
      type: row.relationshipType,
      label: row.relationshipType.replace(/_/g, ' '),
      confidence: row.confidence,
    });
  }

  return successResponse({
    nodes: [...nodes.values()],
    edges,
    stats: {
      nodeCount: nodes.size,
      edgeCount: edges.length,
    },
  });
}
