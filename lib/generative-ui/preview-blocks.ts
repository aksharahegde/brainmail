import type { UIBlock } from '@/lib/generative-ui/types';

export const generativeUiPreviewBlocks: UIBlock[] = [
  {
    id: 'preview_markdown',
    type: 'markdown',
    data: { content: 'Generative UI renders backend-selected blocks only.' },
  },
  {
    id: 'preview_kpi',
    type: 'kpi',
    data: {
      title: 'Monthly spend',
      value: '$1,240.00',
      delta: '+8% vs last month',
    },
  },
  {
    id: 'preview_metric_grid',
    type: 'metric_grid',
    data: {
      metrics: [
        { title: 'Invoices', value: '$820' },
        { title: 'Receipts', value: '$420' },
        { title: 'Subscriptions', value: '$96' },
      ],
    },
  },
  {
    id: 'preview_line_chart',
    type: 'line_chart',
    data: {
      title: 'Spend trend',
      points: [
        { label: 'Jan', value: 420 },
        { label: 'Feb', value: 380 },
        { label: 'Mar', value: 510 },
      ],
    },
  },
  {
    id: 'preview_bar_chart',
    type: 'bar_chart',
    data: {
      title: 'Vendor breakdown',
      points: [
        { label: 'OpenAI', value: 120 },
        { label: 'AWS', value: 240 },
        { label: 'Notion', value: 48 },
      ],
    },
  },
  {
    id: 'preview_pie_chart',
    type: 'pie_chart',
    data: {
      title: 'Category mix',
      slices: [
        { label: 'AI Tools', value: 35 },
        { label: 'Infra', value: 45 },
        { label: 'SaaS', value: 20 },
      ],
    },
  },
  {
    id: 'preview_invoice_table',
    type: 'invoice_table',
    data: {
      invoices: [
        {
          id: 'inv_1',
          invoiceNumber: 'INV-1001',
          amount: 120,
          currency: 'USD',
          invoiceDate: '2026-05-01',
        },
      ],
    },
  },
  {
    id: 'preview_email_list',
    type: 'email_list',
    data: {
      emails: [
        {
          id: 'email_1',
          subject: 'Your OpenAI receipt',
          sender: 'billing@openai.com',
          snippet: 'Thanks for your payment.',
          category: 'Receipt',
        },
      ],
    },
  },
  {
    id: 'preview_workspace_summary',
    type: 'workspace_summary',
    data: {
      name: 'Startup workspace',
      description: 'Finance, vendors, and inbox intelligence.',
      kpis: [
        { title: 'Unread', value: '12' },
        { title: 'Spend MTD', value: '$1.2k' },
      ],
      recentActivity: [
        { title: 'OpenAI invoice processed', timestamp: 'Today' },
      ],
    },
  },
  {
    id: 'preview_collection_summary',
    type: 'collection_summary',
    data: {
      name: 'AI vendor receipts',
      emailCount: 42,
      description: 'Semantic collection for AI tooling spend.',
    },
  },
  {
    id: 'preview_vendor_profile',
    type: 'vendor_profile',
    data: {
      name: 'OpenAI',
      spend: 540,
      invoiceCount: 6,
      trend: 'up 12%',
      recentInvoices: [
        { invoiceNumber: 'INV-1001', amount: 120, currency: 'USD' },
      ],
    },
  },
  {
    id: 'preview_subscription_card',
    type: 'subscription_card',
    data: {
      name: 'Notion Plus',
      cost: 16,
      renewalDate: '2026-07-01',
      status: 'active',
    },
  },
  {
    id: 'preview_contact_card',
    type: 'contact_card',
    data: {
      name: 'Alex Kim',
      email: 'alex@rydsta.com',
      company: 'Rydsta',
      lastContact: '2026-05-28',
    },
  },
  {
    id: 'preview_timeline',
    type: 'timeline',
    data: {
      title: 'Vendor timeline',
      events: [
        {
          date: '2026-05-01',
          title: 'First invoice',
          description: 'Onboarding',
        },
        { date: '2026-05-15', title: 'Renewal notice' },
      ],
    },
  },
  {
    id: 'preview_daily_briefing',
    type: 'daily_briefing',
    data: {
      date: '2026-06-14',
      highlights: ['3 invoices due this week', '2 subscription renewals'],
      priorities: ['Review OpenAI spend', 'Archive stale promos'],
    },
  },
  {
    id: 'preview_inbox_health',
    type: 'inbox_health',
    data: {
      score: 82,
      issues: [
        { label: 'Unread backlog', severity: 'medium' },
        { label: 'Missing filters for promos', severity: 'low' },
      ],
    },
  },
  {
    id: 'preview_confirmation',
    type: 'confirmation',
    data: {
      title: 'Archive 14 emails',
      message: 'This action can be undone within 30 days.',
      preview: { query: 'from:newsletter older_than:90d' },
    },
  },
  {
    id: 'preview_action_group',
    type: 'action_group',
    data: {
      actions: [
        { id: 'export_csv', label: 'Export CSV', type: 'export_csv' },
        { id: 'create_filter', label: 'Create filter', type: 'create_filter' },
      ],
    },
  },
];
