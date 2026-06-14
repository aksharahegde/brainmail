import { createDb } from '@brainmail/db';
import {
  artifacts,
  companies,
  contacts,
  emails,
  entities,
  workspaces,
} from '@brainmail/db/schema';
import { and, desc, eq, like, or } from 'drizzle-orm';

import { generateEmbedding } from '../processing/ai';
import type {
  GlobalSearchResult,
  SearchArtifactResult,
  SearchContactResult,
  SearchEmailResult,
  SearchEntityResult,
  SearchMode,
  SearchVendorResult,
  SearchWorkspaceResult,
} from './types';

const DEFAULT_LIMIT = 10;

function parseMode(value: string | null): SearchMode {
  if (value === 'keyword' || value === 'vector' || value === 'hybrid') {
    return value;
  }
  return 'hybrid';
}

function keywordScore(index: number): number {
  return Math.max(0.35, 1 - index * 0.05);
}

async function searchEmailsKeyword(
  env: Env,
  userId: string,
  query: string,
  limit: number,
): Promise<SearchEmailResult[]> {
  const db = createDb(env.DB);
  const pattern = `%${query}%`;
  const rows = await db
    .select({
      id: emails.id,
      subject: emails.subject,
      sender: emails.sender,
      snippet: emails.snippet,
      category: emails.category,
      receivedAt: emails.receivedAt,
    })
    .from(emails)
    .where(
      and(
        eq(emails.userId, userId),
        or(
          like(emails.subject, pattern),
          like(emails.sender, pattern),
          like(emails.snippet, pattern),
          like(emails.bodyText, pattern),
        )!,
      ),
    )
    .orderBy(desc(emails.receivedAt))
    .limit(limit);

  return rows.map((row, index) => ({
    ...row,
    score: keywordScore(index),
    source: 'keyword' as const,
  }));
}

async function searchEmailsVector(
  env: Env,
  userId: string,
  query: string,
  limit: number,
): Promise<SearchEmailResult[]> {
  if (!env.AI || !env.EMBEDDINGS) {
    return [];
  }

  const vector = await generateEmbedding(env, query);
  if (!vector) {
    return [];
  }

  const matches = await env.EMBEDDINGS.query(vector, {
    topK: limit,
    returnMetadata: 'all',
    filter: { userId },
  });

  if (!matches.matches.length) {
    return [];
  }

  const emailIds = matches.matches
    .map((match) => {
      const metadata = match.metadata ?? {};
      return typeof metadata.emailId === 'string' ? metadata.emailId : null;
    })
    .filter((value): value is string => Boolean(value));

  if (!emailIds.length) {
    return [];
  }

  const db = createDb(env.DB);
  const rows = await db
    .select({
      id: emails.id,
      subject: emails.subject,
      sender: emails.sender,
      snippet: emails.snippet,
      category: emails.category,
      receivedAt: emails.receivedAt,
    })
    .from(emails)
    .where(and(eq(emails.userId, userId)));

  const emailById = new Map(rows.map((row) => [row.id, row]));
  const results: SearchEmailResult[] = [];

  for (const match of matches.matches) {
    const metadata = match.metadata ?? {};
    const emailId =
      typeof metadata.emailId === 'string' ? metadata.emailId : null;
    if (!emailId) {
      continue;
    }

    const row = emailById.get(emailId);
    if (!row) {
      continue;
    }

    results.push({
      ...row,
      score: match.score ?? 0.5,
      source: 'vector',
    });
  }

  return results.slice(0, limit);
}

function mergeEmailResults(
  keywordResults: SearchEmailResult[],
  vectorResults: SearchEmailResult[],
  limit: number,
): SearchEmailResult[] {
  const merged = new Map<string, SearchEmailResult>();

  for (const result of keywordResults) {
    merged.set(result.id, result);
  }

  for (const result of vectorResults) {
    const existing = merged.get(result.id);
    if (existing) {
      merged.set(result.id, {
        ...existing,
        score: Math.max(existing.score, result.score) + 0.1,
        source: 'hybrid',
      });
      continue;
    }

    merged.set(result.id, result);
  }

  return [...merged.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

async function searchEntitiesKeyword(
  env: Env,
  userId: string,
  query: string,
  limit: number,
): Promise<SearchEntityResult[]> {
  const db = createDb(env.DB);
  const pattern = `%${query}%`;
  const rows = await db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.userId, userId),
        or(like(entities.entityType, pattern), like(entities.data, pattern))!,
      ),
    )
    .orderBy(desc(entities.createdAt))
    .limit(limit);

  const results: SearchEntityResult[] = rows.map((row, index) => {
    const data = row.data ?? {};
    const label =
      (typeof data.name === 'string' && data.name) ||
      (typeof data.vendor === 'string' && data.vendor) ||
      row.entityType;

    return {
      id: row.id,
      type: row.entityType,
      label,
      summary: row.sourceId,
      score: keywordScore(index),
    };
  });

  if (results.length >= limit) {
    return results;
  }

  const companyRows = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.userId, userId),
        or(like(companies.name, pattern), like(companies.domain, pattern))!,
      ),
    )
    .limit(limit);

  for (const [index, row] of companyRows.entries()) {
    results.push({
      id: row.id,
      type: 'company',
      label: row.name ?? row.domain ?? 'Company',
      summary: row.domain,
      score: keywordScore(index),
    });
  }

  return results.slice(0, limit);
}

async function searchContactsKeyword(
  env: Env,
  userId: string,
  query: string,
  limit: number,
): Promise<SearchContactResult[]> {
  const db = createDb(env.DB);
  const pattern = `%${query}%`;
  const rows = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.userId, userId),
        or(like(contacts.name, pattern), like(contacts.email, pattern))!,
      ),
    )
    .orderBy(desc(contacts.lastSeen))
    .limit(limit);

  return rows.map((row, index) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    score: keywordScore(index),
  }));
}

async function searchVendorsKeyword(
  env: Env,
  userId: string,
  query: string,
  limit: number,
): Promise<SearchVendorResult[]> {
  const db = createDb(env.DB);
  const pattern = `%${query}%`;
  const rows = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.userId, userId),
        or(like(companies.name, pattern), like(companies.domain, pattern))!,
      ),
    )
    .orderBy(desc(companies.createdAt))
    .limit(limit);

  return rows.map((row, index) => ({
    id: row.id,
    name: row.name,
    domain: row.domain,
    score: keywordScore(index),
  }));
}

async function searchWorkspacesKeyword(
  env: Env,
  userId: string,
  query: string,
  limit: number,
): Promise<SearchWorkspaceResult[]> {
  const db = createDb(env.DB);
  const pattern = `%${query}%`;
  const rows = await db
    .select()
    .from(workspaces)
    .where(
      and(
        eq(workspaces.userId, userId),
        or(
          like(workspaces.name, pattern),
          like(workspaces.description, pattern),
          like(workspaces.workspaceType, pattern),
        )!,
      ),
    )
    .orderBy(desc(workspaces.createdAt))
    .limit(limit);

  return rows.map((row, index) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    workspaceType: row.workspaceType,
    score: keywordScore(index),
  }));
}

async function searchArtifactsKeyword(
  env: Env,
  userId: string,
  query: string,
  limit: number,
): Promise<SearchArtifactResult[]> {
  const db = createDb(env.DB);
  const pattern = `%${query}%`;
  const rows = await db
    .select()
    .from(artifacts)
    .where(
      and(
        eq(artifacts.userId, userId),
        or(
          like(artifacts.title, pattern),
          like(artifacts.artifactType, pattern),
        )!,
      ),
    )
    .orderBy(desc(artifacts.createdAt))
    .limit(limit);

  return rows.map((row, index) => ({
    id: row.id,
    title: row.title,
    artifactType: row.artifactType,
    score: keywordScore(index),
  }));
}

export async function runGlobalSearch(
  env: Env,
  userId: string,
  query: string,
  mode: SearchMode,
  limit = DEFAULT_LIMIT,
): Promise<GlobalSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      query: '',
      mode,
      emails: [],
      entities: [],
      contacts: [],
      vendors: [],
      artifacts: [],
      workspaces: [],
    };
  }

  const keywordEmails = await searchEmailsKeyword(env, userId, trimmed, limit);
  const vectorEmails = await searchEmailsVector(env, userId, trimmed, limit);

  let emailsResults: SearchEmailResult[] = [];
  if (mode === 'keyword') {
    emailsResults = keywordEmails;
  } else if (mode === 'vector') {
    emailsResults = vectorEmails;
  } else {
    emailsResults = mergeEmailResults(keywordEmails, vectorEmails, limit);
  }

  const [
    entityResults,
    contactResults,
    vendorResults,
    artifactResults,
    workspaceResults,
  ] = await Promise.all([
    searchEntitiesKeyword(env, userId, trimmed, limit),
    searchContactsKeyword(env, userId, trimmed, limit),
    searchVendorsKeyword(env, userId, trimmed, limit),
    searchArtifactsKeyword(env, userId, trimmed, limit),
    searchWorkspacesKeyword(env, userId, trimmed, limit),
  ]);

  return {
    query: trimmed,
    mode,
    emails: emailsResults,
    entities: entityResults,
    contacts: contactResults,
    vendors: vendorResults,
    artifacts: artifactResults,
    workspaces: workspaceResults,
  };
}

export function parseSearchMode(value: string | null): SearchMode {
  return parseMode(value);
}

export function parseSearchLimit(value: string | null): number {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(25, Math.max(1, Math.floor(parsed)));
}
