import { createDb } from '@brainmail/db';
import { contacts, emails, relationships } from '@brainmail/db/schema';
import { and, desc, eq, like, or } from 'drizzle-orm';

import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';

export async function handleContactsList(
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
  const db = createDb(env.DB);
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
    .limit(100);

  const relationshipRows = await db
    .select()
    .from(relationships)
    .where(eq(relationships.userId, authResult.id));

  const scoreByContact = new Map(
    relationshipRows.map((row) => [row.contactId, row.relationshipScore]),
  );

  return successResponse({
    contacts: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      companyId: row.companyId,
      firstSeen: row.firstSeen,
      lastSeen: row.lastSeen,
      interactionCount: row.interactionCount,
      relationshipScore: scoreByContact.get(row.id) ?? null,
    })),
    total: rows.length,
  });
}

export async function handleContactDetail(
  request: Request,
  env: Env,
  contactId: string,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const db = createDb(env.DB);
  const contactRows = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, authResult.id)))
    .limit(1);

  const contact = contactRows[0];
  if (!contact) {
    return errorResponse('Contact not found', 404);
  }

  const relationshipRows = await db
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.userId, authResult.id),
        eq(relationships.contactId, contactId),
      ),
    )
    .limit(1);

  const activityRows = contact.email
    ? await db
        .select({
          id: emails.id,
          subject: emails.subject,
          sender: emails.sender,
          receivedAt: emails.receivedAt,
          category: emails.category,
        })
        .from(emails)
        .where(
          and(
            eq(emails.userId, authResult.id),
            like(emails.sender, `%${contact.email}%`),
          ),
        )
        .orderBy(desc(emails.receivedAt))
        .limit(10)
    : [];

  return successResponse({
    contact,
    relationship: relationshipRows[0] ?? null,
    activity: activityRows,
  });
}
