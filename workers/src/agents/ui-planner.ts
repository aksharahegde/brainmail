import { createId } from '../lib/crypto';
import type { AgentRunResult, UIAction, UIBlock } from './types';

function blockId(prefix: string): string {
  return createId(prefix);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export function planUiResponse(result: AgentRunResult): {
  blocks: UIBlock[];
  actions: UIAction[];
} {
  const blocks: UIBlock[] = [
    {
      id: blockId('block'),
      type: 'markdown',
      data: {
        content: result.summary,
      },
    },
    {
      id: blockId('block'),
      type: 'text',
      data: {
        title: 'Agent route',
        value: `${result.agent} · ${result.plan.intent}`,
      },
    },
  ];

  const actions: UIAction[] = [];

  if (result.agent === 'search') {
    const emailOutput = result.toolCalls.find(
      (call) => call.tool === 'search_emails',
    )?.output;
    const emails = asArray<{
      id: string;
      subject: string | null;
      sender: string | null;
      snippet: string | null;
      category: string | null;
    }>(emailOutput);

    if (emails.length > 0) {
      blocks.push({
        id: blockId('block'),
        type: 'email_list',
        data: {
          emails: emails.map((email) => ({
            id: email.id,
            subject: email.subject,
            sender: email.sender,
            snippet: email.snippet,
            category: email.category,
          })),
        },
      });
    }

    const entityOutput = result.toolCalls.find(
      (call) => call.tool === 'search_entities',
    )?.output;
    if (entityOutput && typeof entityOutput === 'object') {
      const entities = asArray<{
        id: string;
        label: string;
        type: string;
        summary: string | null;
      }>((entityOutput as { entities?: unknown }).entities);

      if (entities.length > 0) {
        blocks.push({
          id: blockId('block'),
          type: 'table',
          data: {
            title: 'Matching entities',
            columns: ['Type', 'Label', 'Summary'],
            rows: entities.map((entity) => [
              entity.type,
              entity.label,
              entity.summary ?? '',
            ]),
          },
        });
      }
    }
  }

  if (result.agent === 'analytics') {
    const spending = result.toolCalls.find(
      (call) => call.tool === 'aggregate_spending',
    )?.output;

    if (spending && typeof spending === 'object') {
      const data = spending as {
        combinedTotal?: number;
        invoiceTotal?: number;
        receiptTotal?: number;
        vendor?: string;
      };

      blocks.push({
        id: blockId('block'),
        type: 'kpi',
        data: {
          title: 'Combined spend',
          value: `$${(data.combinedTotal ?? 0).toFixed(2)}`,
        },
      });

      blocks.push({
        id: blockId('block'),
        type: 'metric_grid',
        data: {
          metrics: [
            {
              title: 'Invoices',
              value: `$${(data.invoiceTotal ?? 0).toFixed(2)}`,
            },
            {
              title: 'Receipts',
              value: `$${(data.receiptTotal ?? 0).toFixed(2)}`,
            },
          ],
        },
      });
    }

    const invoiceOutput = result.toolCalls.find(
      (call) => call.tool === 'search_invoices',
    )?.output;
    const invoices = asArray<{
      id: string;
      invoiceNumber: string | null;
      amount: number | null;
      currency: string | null;
      invoiceDate: string | null;
    }>(invoiceOutput);

    if (invoices.length > 0) {
      const chartPoints = invoices
        .filter((invoice) => invoice.invoiceDate)
        .slice(0, 8)
        .map((invoice) => ({
          label: invoice.invoiceDate?.slice(0, 10) ?? 'Unknown',
          value: invoice.amount ?? 0,
        }));

      if (chartPoints.length > 1) {
        blocks.push({
          id: blockId('block'),
          type: 'line_chart',
          data: {
            title: 'Invoice spend trend',
            points: chartPoints,
          },
        });
      }

      if (spending && typeof spending === 'object') {
        const vendorData = spending as {
          vendor?: string;
          combinedTotal?: number;
        };
        if (vendorData.vendor) {
          blocks.push({
            id: blockId('block'),
            type: 'vendor_profile',
            data: {
              name: vendorData.vendor,
              spend: vendorData.combinedTotal ?? 0,
              invoiceCount: invoices.length,
              trend: chartPoints.length > 1 ? 'tracked' : 'limited data',
              recentInvoices: invoices.slice(0, 3).map((invoice) => ({
                invoiceNumber: invoice.invoiceNumber,
                amount: invoice.amount,
                currency: invoice.currency,
              })),
            },
          });
        }
      }

      blocks.push({
        id: blockId('block'),
        type: 'invoice_table',
        data: {
          invoices: invoices.map((invoice) => ({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.amount,
            currency: invoice.currency,
            invoiceDate: invoice.invoiceDate,
          })),
        },
      });
    }
  }

  if (result.agent === 'automation') {
    const automationOutput = result.toolCalls.find(
      (call) => call.tool === 'list_automations',
    )?.output;
    const automations = asArray<{ id: string; name: string | null }>(
      automationOutput,
    );

    blocks.push({
      id: blockId('block'),
      type: 'automation_preview',
      data: {
        message: result.plan.intent,
        existingAutomations: automations,
        status: 'preview_only',
      },
    });

    actions.push({
      id: blockId('action'),
      label: 'Review automation plan',
      type: 'automation_preview',
    });
  }

  if (result.agent === 'action') {
    const preview = result.toolCalls.find(
      (call) => call.tool === 'preview_action',
    )?.output;

    blocks.push({
      id: blockId('block'),
      type: 'confirmation',
      data: {
        title: 'Action preview',
        message: 'Destructive actions require confirmation before execution.',
        preview,
      },
    });

    actions.push({
      id: blockId('action'),
      label: 'Confirm action',
      type: 'confirmation',
    });
  }

  if (result.agent === 'insight') {
    const insightOutput = result.toolCalls.find(
      (call) => call.tool === 'list_insights',
    )?.output;
    const insights = asArray<{
      id: string;
      insightType: string | null;
      payload: Record<string, unknown> | null;
    }>(insightOutput);

    if (insights.length > 0) {
      for (const insight of insights.slice(0, 3)) {
        blocks.push({
          id: blockId('block'),
          type: 'insight_card',
          data: {
            insightType: insight.insightType,
            payload: insight.payload,
          },
        });
      }
    } else {
      blocks.push({
        id: blockId('block'),
        type: 'suggestion_card',
        data: {
          title: 'No stored insights yet',
          message:
            'Connect Gmail, process email, and run analytics queries to populate insights.',
        },
      });
    }
  }

  if (actions.length > 0) {
    blocks.push({
      id: blockId('block'),
      type: 'action_group',
      data: {
        actions: actions.map((action) => ({
          id: action.id,
          label: action.label,
          type: action.type,
        })),
      },
    });
  }

  return { blocks, actions };
}
