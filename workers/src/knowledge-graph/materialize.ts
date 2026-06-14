import { createDb } from '@brainmail/db';
import {
  companies,
  contacts,
  entityRelationships,
  entities,
  invoices,
  receipts,
  relationships,
  subscriptions,
  tripEvents,
  trips,
} from '@brainmail/db/schema';
import { and, eq, sql } from 'drizzle-orm';

import { createId } from '../lib/crypto';
import type { ExtractedEntity } from '../processing/types';

type MaterializeContext = {
  userId: string;
  emailId: string;
  receivedAt: string | null;
  category: string | null;
};

type CompanyRef = {
  id: string;
  name: string | null;
  domain: string | null;
};

type ContactRef = {
  id: string;
  email: string | null;
  companyId: string | null;
};

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function domainFromEmail(email: string): string | null {
  const domain = email.split('@')[1]?.trim().toLowerCase();
  return domain || null;
}

function companyNameFromDomain(domain: string): string {
  const label = domain.split('.')[0] ?? domain;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

async function upsertCompany(
  env: Env,
  context: MaterializeContext,
  input: {
    name?: string | null;
    domain?: string | null;
    confidence?: number | null;
  },
): Promise<CompanyRef | null> {
  const domain = input.domain?.trim().toLowerCase() ?? null;
  const name =
    input.name?.trim() || (domain ? companyNameFromDomain(domain) : null);
  if (!name && !domain) {
    return null;
  }

  const db = createDb(env.DB);
  const filters = [eq(companies.userId, context.userId)];
  if (domain) {
    filters.push(eq(companies.domain, domain));
  } else if (name) {
    filters.push(eq(companies.name, name));
  }

  const existing = await db
    .select()
    .from(companies)
    .where(and(...filters))
    .limit(1);

  if (existing[0]) {
    const updates: Partial<typeof companies.$inferInsert> = {};
    if (!existing[0].name && name) {
      updates.name = name;
    }
    if (!existing[0].domain && domain) {
      updates.domain = domain;
    }
    if (Object.keys(updates).length > 0) {
      await db
        .update(companies)
        .set(updates)
        .where(eq(companies.id, existing[0].id));
    }
    return {
      id: existing[0].id,
      name: existing[0].name ?? name,
      domain: existing[0].domain ?? domain,
    };
  }

  const id = createId('company');
  await db.insert(companies).values({
    id,
    userId: context.userId,
    name,
    domain,
    metadata: input.confidence ? { confidence: input.confidence } : null,
  });

  return { id, name, domain };
}

async function upsertContact(
  env: Env,
  context: MaterializeContext,
  input: {
    name?: string | null;
    email?: string | null;
    companyId?: string | null;
    confidence?: number | null;
  },
): Promise<ContactRef | null> {
  const email = input.email ? normalizeEmail(input.email) : null;
  const name = input.name?.trim() || email;
  if (!email && !name) {
    return null;
  }

  const db = createDb(env.DB);
  let existing = email
    ? await db
        .select()
        .from(contacts)
        .where(
          and(eq(contacts.userId, context.userId), eq(contacts.email, email)),
        )
        .limit(1)
    : [];

  if (!existing[0] && name) {
    existing = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, context.userId), eq(contacts.name, name)))
      .limit(1);
  }

  const interactionAt = context.receivedAt ?? new Date().toISOString();

  if (existing[0]) {
    const nextCount = (existing[0].interactionCount ?? 0) + 1;
    await db
      .update(contacts)
      .set({
        name: existing[0].name ?? name,
        email: existing[0].email ?? email,
        companyId: existing[0].companyId ?? input.companyId ?? null,
        firstSeen: existing[0].firstSeen ?? interactionAt,
        lastSeen: interactionAt,
        interactionCount: nextCount,
      })
      .where(eq(contacts.id, existing[0].id));

    await upsertContactRelationship(env, context, existing[0].id, nextCount);
    return {
      id: existing[0].id,
      email: existing[0].email ?? email,
      companyId: existing[0].companyId ?? input.companyId ?? null,
    };
  }

  const id = createId('contact');
  await db.insert(contacts).values({
    id,
    userId: context.userId,
    name,
    email,
    companyId: input.companyId ?? null,
    firstSeen: interactionAt,
    lastSeen: interactionAt,
    interactionCount: 1,
  });

  await upsertContactRelationship(env, context, id, 1);
  return { id, email, companyId: input.companyId ?? null };
}

async function upsertContactRelationship(
  env: Env,
  context: MaterializeContext,
  contactId: string,
  interactionCount: number,
) {
  const db = createDb(env.DB);
  const score = Math.min(1, 0.35 + interactionCount * 0.08);
  const interactionAt = context.receivedAt ?? new Date().toISOString();

  const existing = await db
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.userId, context.userId),
        eq(relationships.contactId, contactId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(relationships)
      .set({
        relationshipScore: score,
        lastInteraction: interactionAt,
        metadata: { interactionCount },
      })
      .where(eq(relationships.id, existing[0].id));
    return;
  }

  await db.insert(relationships).values({
    id: createId('relationship'),
    userId: context.userId,
    contactId,
    relationshipScore: score,
    lastInteraction: interactionAt,
    metadata: { interactionCount },
  });
}

async function ensureRelationship(
  env: Env,
  context: MaterializeContext,
  input: {
    sourceType: string;
    sourceId: string;
    targetType: string;
    targetId: string;
    relationshipType: string;
    confidence?: number | null;
    metadata?: Record<string, unknown>;
  },
) {
  const db = createDb(env.DB);
  const existing = await db
    .select({ id: entityRelationships.id })
    .from(entityRelationships)
    .where(
      and(
        eq(entityRelationships.userId, context.userId),
        eq(entityRelationships.sourceType, input.sourceType),
        eq(entityRelationships.sourceId, input.sourceId),
        eq(entityRelationships.targetType, input.targetType),
        eq(entityRelationships.targetId, input.targetId),
        eq(entityRelationships.relationshipType, input.relationshipType),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return;
  }

  await db.insert(entityRelationships).values({
    id: createId('edge'),
    userId: context.userId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    targetType: input.targetType,
    targetId: input.targetId,
    relationshipType: input.relationshipType,
    emailId: context.emailId,
    confidence: input.confidence ?? null,
    metadata: input.metadata ?? null,
  });
}

async function resolveCompanyFromVendor(
  env: Env,
  context: MaterializeContext,
  vendor: string | null,
  confidence: number | null,
): Promise<CompanyRef | null> {
  if (!vendor) {
    return null;
  }

  const domain = vendor.includes('@')
    ? domainFromEmail(vendor)
    : vendor.includes('.')
      ? vendor.toLowerCase()
      : null;

  return upsertCompany(env, context, {
    name: vendor,
    domain,
    confidence,
  });
}

async function materializeCompany(
  env: Env,
  context: MaterializeContext,
  entity: ExtractedEntity,
): Promise<CompanyRef | null> {
  return upsertCompany(env, context, {
    name: asString(entity.data.name) ?? asString(entity.data.vendor),
    domain: asString(entity.data.domain),
    confidence: entity.confidence,
  });
}

async function materializeContact(
  env: Env,
  context: MaterializeContext,
  entity: ExtractedEntity,
  companyByDomain: Map<string, string>,
): Promise<ContactRef | null> {
  const email = asString(entity.data.email);
  const domain = email ? domainFromEmail(email) : null;
  const companyId = domain ? (companyByDomain.get(domain) ?? null) : null;

  return upsertContact(env, context, {
    name: asString(entity.data.name),
    email,
    companyId,
    confidence: entity.confidence,
  });
}

async function materializeInvoice(
  env: Env,
  context: MaterializeContext,
  entity: ExtractedEntity,
  company: CompanyRef | null,
) {
  const db = createDb(env.DB);
  const existing = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, context.userId),
        eq(invoices.sourceId, context.emailId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const id = createId('invoice');
  await db.insert(invoices).values({
    id,
    userId: context.userId,
    companyId: company?.id ?? null,
    sourceId: context.emailId,
    invoiceNumber: asString(entity.data.invoiceNumber),
    amount: asNumber(entity.data.amount),
    currency: asString(entity.data.currency) ?? 'USD',
    invoiceDate: asString(entity.data.invoiceDate),
    dueDate: asString(entity.data.dueDate),
    confidence: entity.confidence,
  });

  if (company) {
    await ensureRelationship(env, context, {
      sourceType: 'invoice',
      sourceId: id,
      targetType: 'company',
      targetId: company.id,
      relationshipType: 'issued_by',
      confidence: entity.confidence,
    });
    await ensureRelationship(env, context, {
      sourceType: 'company',
      sourceId: company.id,
      targetType: 'invoice',
      targetId: id,
      relationshipType: 'has_invoice',
      confidence: entity.confidence,
    });
  }

  return id;
}

async function materializeReceipt(
  env: Env,
  context: MaterializeContext,
  entity: ExtractedEntity,
  company: CompanyRef | null,
) {
  const db = createDb(env.DB);
  const existing = await db
    .select({ id: receipts.id })
    .from(receipts)
    .where(
      and(
        eq(receipts.userId, context.userId),
        eq(receipts.sourceId, context.emailId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const id = createId('receipt');
  await db.insert(receipts).values({
    id,
    userId: context.userId,
    companyId: company?.id ?? null,
    sourceId: context.emailId,
    amount: asNumber(entity.data.amount),
    currency: asString(entity.data.currency) ?? 'USD',
    receiptDate: asString(entity.data.receiptDate),
  });

  if (company) {
    await ensureRelationship(env, context, {
      sourceType: 'receipt',
      sourceId: id,
      targetType: 'company',
      targetId: company.id,
      relationshipType: 'issued_by',
      confidence: entity.confidence,
    });
  }

  return id;
}

async function materializeSubscription(
  env: Env,
  context: MaterializeContext,
  entity: ExtractedEntity,
  company: CompanyRef | null,
) {
  const db = createDb(env.DB);
  const existing = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, context.userId),
        eq(subscriptions.sourceId, context.emailId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const id = createId('subscription');
  await db.insert(subscriptions).values({
    id,
    userId: context.userId,
    companyId: company?.id ?? null,
    sourceId: context.emailId,
    name:
      asString(entity.data.name) ??
      asString(entity.data.vendor) ??
      company?.name,
    amount: asNumber(entity.data.amount),
    currency: asString(entity.data.currency) ?? 'USD',
    billingPeriod: asString(entity.data.billingPeriod),
    renewalDate: asString(entity.data.renewalDate),
    status: asString(entity.data.status) ?? 'active',
  });

  if (company) {
    await ensureRelationship(env, context, {
      sourceType: 'subscription',
      sourceId: id,
      targetType: 'company',
      targetId: company.id,
      relationshipType: 'billed_by',
      confidence: entity.confidence,
    });
    await ensureRelationship(env, context, {
      sourceType: 'company',
      sourceId: company.id,
      targetType: 'subscription',
      targetId: id,
      relationshipType: 'has_subscription',
      confidence: entity.confidence,
    });
  }

  return id;
}

async function ensureTripForEmail(
  env: Env,
  context: MaterializeContext,
  title: string,
  destination: string | null,
) {
  const db = createDb(env.DB);
  const existing = await db
    .select()
    .from(trips)
    .where(and(eq(trips.userId, context.userId), eq(trips.title, title)))
    .limit(1);

  if (existing[0]) {
    if (!existing[0].destination && destination) {
      await db
        .update(trips)
        .set({ destination })
        .where(eq(trips.id, existing[0].id));
    }
    return existing[0].id;
  }

  const id = createId('trip');
  await db.insert(trips).values({
    id,
    userId: context.userId,
    title,
    destination,
    startDate: asString(context.receivedAt),
    metadata: { sourceEmailId: context.emailId },
  });

  return id;
}

async function materializeTripEntity(
  env: Env,
  context: MaterializeContext,
  entity: ExtractedEntity,
) {
  const destination =
    asString(entity.data.destination) ??
    asString(entity.data.city) ??
    asString(entity.data.location);
  const flight = asString(entity.data.flight);
  const hotel = asString(entity.data.hotel);
  const title =
    destination ?? flight ?? hotel ?? asString(entity.data.title) ?? 'Travel';

  const tripId = await ensureTripForEmail(env, context, title, destination);

  const db = createDb(env.DB);
  const eventId = createId('trip_event');
  await db.insert(tripEvents).values({
    id: eventId,
    tripId,
    eventType: entity.entityType,
    entityId: context.emailId,
    occurredAt: context.receivedAt,
  });

  await ensureRelationship(env, context, {
    sourceType: 'trip',
    sourceId: tripId,
    targetType: 'email',
    targetId: context.emailId,
    relationshipType: 'includes_event',
    confidence: entity.confidence,
    metadata: {
      eventType: entity.entityType,
      flight,
      hotel,
      destination,
    },
  });

  return tripId;
}

export async function materializeKnowledgeGraph(
  env: Env,
  context: MaterializeContext,
  extracted: ExtractedEntity[],
) {
  const companyByDomain = new Map<string, string>();
  const companyRefs = new Map<string, CompanyRef>();
  const contactRefs: ContactRef[] = [];

  for (const entity of extracted) {
    if (entity.entityType !== 'company') {
      continue;
    }

    const company = await materializeCompany(env, context, entity);
    if (!company) {
      continue;
    }

    companyRefs.set(company.id, company);
    if (company.domain) {
      companyByDomain.set(company.domain, company.id);
    }
  }

  for (const entity of extracted) {
    if (entity.entityType !== 'contact') {
      continue;
    }

    const contact = await materializeContact(
      env,
      context,
      entity,
      companyByDomain,
    );
    if (!contact) {
      continue;
    }

    contactRefs.push(contact);

    if (contact.companyId) {
      await ensureRelationship(env, context, {
        sourceType: 'contact',
        sourceId: contact.id,
        targetType: 'company',
        targetId: contact.companyId,
        relationshipType: 'works_at',
        confidence: entity.confidence,
      });
    }
  }

  for (const entity of extracted) {
    const vendor =
      asString(entity.data.vendor) ?? asString(entity.data.company) ?? null;
    const company =
      (vendor
        ? await resolveCompanyFromVendor(
            env,
            context,
            vendor,
            entity.confidence,
          )
        : null) ??
      [...companyRefs.values()][0] ??
      null;

    if (company?.domain) {
      companyByDomain.set(company.domain, company.id);
      companyRefs.set(company.id, company);
    }

    if (entity.entityType === 'invoice') {
      await materializeInvoice(env, context, entity, company);
    }

    if (entity.entityType === 'receipt') {
      await materializeReceipt(env, context, entity, company);
    }

    if (entity.entityType === 'subscription') {
      await materializeSubscription(env, context, entity, company);
    }

    if (
      entity.entityType === 'trip' ||
      entity.entityType === 'flight' ||
      entity.entityType === 'hotel' ||
      entity.entityType === 'travel'
    ) {
      await materializeTripEntity(env, context, entity);
    }
  }

  const db = createDb(env.DB);
  await db
    .update(entities)
    .set({ updatedAt: sql`(datetime('now'))` })
    .where(
      and(
        eq(entities.userId, context.userId),
        eq(entities.sourceId, context.emailId),
      ),
    );
}
