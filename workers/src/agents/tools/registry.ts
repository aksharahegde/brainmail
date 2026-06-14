import { createDb } from '@brainmail/db';
import {
  automations,
  insights,
  invoices,
  receipts,
} from '@brainmail/db/schema';
import { and, eq, like, or, sql } from 'drizzle-orm';

import { runGlobalSearch } from '../../search/service';
import type { AgentContext, AgentType, ToolDefinition } from '../types';

function extractQuery(message: string, input: Record<string, unknown>): string {
  if (typeof input.query === 'string' && input.query.trim()) {
    return input.query.trim();
  }

  return message.trim();
}

function extractVendor(
  message: string,
  input: Record<string, unknown>,
): string | null {
  if (typeof input.vendor === 'string' && input.vendor.trim()) {
    return input.vendor.trim();
  }

  const quoted = message.match(/"([^"]+)"/)?.[1];
  if (quoted) {
    return quoted;
  }

  const vendorMatch = message.match(
    /\b(?:from|with|for)\s+([A-Za-z][A-Za-z0-9._-]{1,40})/i,
  );
  return vendorMatch?.[1] ?? null;
}

export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    name: 'search_emails',
    description: 'Search processed emails by keyword or semantic similarity.',
    agents: ['search', 'analytics', 'insight'],
    async execute(env, context, input) {
      const query = extractQuery(context.message, input);
      const mode =
        input.mode === 'keyword' ||
        input.mode === 'vector' ||
        input.mode === 'hybrid'
          ? input.mode
          : 'hybrid';
      const results = await runGlobalSearch(
        env,
        context.userId,
        query,
        mode,
        8,
      );
      return results.emails;
    },
  },
  {
    name: 'search_entities',
    description: 'Search knowledge graph entities and vendors.',
    agents: ['search', 'analytics', 'insight'],
    async execute(env, context, input) {
      const query = extractQuery(context.message, input);
      const results = await runGlobalSearch(
        env,
        context.userId,
        query,
        'keyword',
        8,
      );
      return {
        entities: results.entities,
        vendors: results.vendors,
        contacts: results.contacts,
      };
    },
  },
  {
    name: 'search_invoices',
    description: 'Search invoice records and amounts.',
    agents: ['search', 'analytics'],
    async execute(env, context, input) {
      const db = createDb(env.DB);
      const query = extractQuery(context.message, input);
      const vendor = extractVendor(context.message, input);
      const filters = [eq(invoices.userId, context.userId)];

      if (vendor) {
        const pattern = `%${vendor}%`;
        filters.push(
          or(
            like(invoices.invoiceNumber, pattern),
            like(invoices.currency, pattern),
          )!,
        );
      } else if (query) {
        const pattern = `%${query}%`;
        filters.push(like(invoices.invoiceNumber, pattern));
      }

      const rows = await db
        .select()
        .from(invoices)
        .where(and(...filters))
        .limit(20);

      return rows;
    },
  },
  {
    name: 'aggregate_spending',
    description: 'Aggregate invoice and receipt spend for a vendor or query.',
    agents: ['analytics', 'insight'],
    async execute(env, context, input) {
      const db = createDb(env.DB);
      const vendor = extractVendor(context.message, input);
      const query = extractQuery(context.message, input);
      const pattern = vendor ? `%${vendor}%` : query ? `%${query}%` : '%';

      const invoiceTotals = await db
        .select({
          total: sql<number>`coalesce(sum(${invoices.amount}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.userId, context.userId),
            or(
              like(invoices.invoiceNumber, pattern),
              like(invoices.currency, pattern),
            )!,
          ),
        );

      const receiptTotals = await db
        .select({
          total: sql<number>`coalesce(sum(${receipts.amount}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(receipts)
        .where(
          and(
            eq(receipts.userId, context.userId),
            or(like(receipts.currency, pattern))!,
          ),
        );

      return {
        vendor: vendor ?? query,
        invoiceTotal: invoiceTotals[0]?.total ?? 0,
        invoiceCount: invoiceTotals[0]?.count ?? 0,
        receiptTotal: receiptTotals[0]?.total ?? 0,
        receiptCount: receiptTotals[0]?.count ?? 0,
        combinedTotal:
          (invoiceTotals[0]?.total ?? 0) + (receiptTotals[0]?.total ?? 0),
      };
    },
  },
  {
    name: 'list_automations',
    description: 'List configured automations for the user.',
    agents: ['automation'],
    async execute(env, context) {
      const db = createDb(env.DB);
      return db
        .select()
        .from(automations)
        .where(eq(automations.userId, context.userId))
        .limit(20);
    },
  },
  {
    name: 'list_insights',
    description: 'List generated insights for the user.',
    agents: ['insight'],
    async execute(env, context) {
      const db = createDb(env.DB);
      return db
        .select()
        .from(insights)
        .where(eq(insights.userId, context.userId))
        .limit(20);
    },
  },
  {
    name: 'preview_action',
    description:
      'Preview a destructive or mutating action without executing it.',
    agents: ['action'],
    async execute(_env, context, input) {
      const actionType =
        typeof input.action === 'string' ? input.action : 'unknown_action';
      return {
        action: actionType,
        message: context.message,
        status: 'preview_only',
        requiresConfirmation: true,
      };
    },
  },
];

export function getToolsForAgent(agent: AgentType): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => tool.agents.includes(agent));
}

export function getToolByName(name: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.name === name);
}

export async function executeTool(
  env: Env,
  context: AgentContext,
  toolName: string,
  input: Record<string, unknown> = {},
) {
  const tool = getToolByName(toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  const output = await tool.execute(env, context, input);
  return {
    tool: toolName,
    input,
    output,
  };
}

export function listRegisteredTools(): Array<{
  name: string;
  description: string;
  agents: AgentType[];
}> {
  return TOOL_REGISTRY.map((tool) => ({
    name: tool.name,
    description: tool.description,
    agents: tool.agents,
  }));
}
