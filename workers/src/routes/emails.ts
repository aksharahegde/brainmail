import { createDb } from '@brainmail/db';
import { emails, entities } from '@brainmail/db/schema';
import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';

import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import { getWorkspaceEmailCategories } from '../workspaces/context';

function serializeEmail(row: typeof emails.$inferSelect) {
  return {
    id: row.id,
    subject: row.subject,
    sender: row.sender,
    snippet: row.snippet,
    category: row.category,
    classificationConfidence: row.classificationConfidence,
    processingStatus: row.processingStatus,
    processingError: row.processingError,
    processedAt: row.processedAt,
    receivedAt: row.receivedAt,
    createdAt: row.createdAt,
  };
}

export async function handleEmailsList(
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
  const query = url.searchParams.get('q')?.trim();
  const workspaceId = url.searchParams.get('workspaceId')?.trim();
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const pageSize = 25;
  const offset = (page - 1) * pageSize;

  const db = createDb(env.DB);
  const filters = [eq(emails.userId, authResult.id)];

  if (workspaceId) {
    const categories = getWorkspaceEmailCategories(workspaceId);
    if (categories.length > 0) {
      filters.push(inArray(emails.category, categories));
    }
  }

  if (query) {
    const pattern = `%${query}%`;
    filters.push(
      or(
        like(emails.subject, pattern),
        like(emails.sender, pattern),
        like(emails.snippet, pattern),
        like(emails.bodyText, pattern),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(emails)
    .where(and(...filters))
    .orderBy(desc(emails.receivedAt), desc(emails.createdAt))
    .limit(pageSize)
    .offset(offset);

  const countRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(emails)
    .where(and(...filters));

  return successResponse({
    emails: rows.map(serializeEmail),
    page,
    pageSize,
    total: countRows[0]?.count ?? 0,
  });
}

export async function handleEmailDetail(
  request: Request,
  env: Env,
  emailId: string,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const db = createDb(env.DB);
  const emailRows = await db
    .select()
    .from(emails)
    .where(and(eq(emails.id, emailId), eq(emails.userId, authResult.id)))
    .limit(1);

  const email = emailRows[0];
  if (!email) {
    return errorResponse('Email not found', 404);
  }

  const entityRows = await db
    .select({
      id: entities.id,
      entityType: entities.entityType,
      confidence: entities.confidence,
      data: entities.data,
      createdAt: entities.createdAt,
    })
    .from(entities)
    .where(
      and(eq(entities.userId, authResult.id), eq(entities.sourceId, emailId)),
    );

  return successResponse({
    email: {
      ...serializeEmail(email),
      bodyText: email.bodyText,
      recipients: email.recipients,
      cc: email.cc,
      bcc: email.bcc,
    },
    entities: entityRows,
  });
}
