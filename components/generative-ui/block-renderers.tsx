'use client';

import type { ComponentType } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Button } from '@/components/ui/button';
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  formatCurrency,
} from '@/lib/generative-ui/utils';

type BlockProps = {
  data: Record<string, unknown>;
};

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

function BlockShell({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border/80 bg-card p-4 shadow-[var(--shadow-card)]">
      {title ? <h3 className="mb-3 text-sm font-medium">{title}</h3> : null}
      {children}
    </div>
  );
}

export function MarkdownBlock({ data }: BlockProps) {
  const content = asString(data.content);
  if (!content) {
    return null;
  }

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {content.split('\n').map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  );
}

export function TextBlock({ data }: BlockProps) {
  return (
    <BlockShell title={asString(data.title)}>
      <p className="text-sm">{asString(data.value)}</p>
    </BlockShell>
  );
}

export function KpiBlock({ data }: BlockProps) {
  return (
    <div className="rounded-md border px-4 py-3">
      <p className="text-xs text-muted-foreground">{asString(data.title)}</p>
      <p className="text-2xl font-semibold tracking-tight">
        {asString(data.value)}
      </p>
      {data.delta ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {asString(data.delta)}
        </p>
      ) : null}
    </div>
  );
}

export function MetricGridBlock({ data }: BlockProps) {
  const metrics = asArray<{ title?: string; value?: string }>(data.metrics);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric, index) => (
        <div key={index} className="rounded-md border px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {asString(metric.title)}
          </p>
          <p className="text-lg font-semibold">{asString(metric.value)}</p>
        </div>
      ))}
    </div>
  );
}

export function TableBlock({ data }: BlockProps) {
  const columns = asArray<string>(data.columns);
  const rows = asArray<string[]>(data.rows);

  return (
    <BlockShell title={asString(data.title)}>
      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-sm">
          {columns.length > 0 ? (
            <thead className="border-b bg-muted/50">
              <tr>
                {columns.map((column, index) => (
                  <th key={index} className="px-3 py-2 text-left font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BlockShell>
  );
}

export function InvoiceTableBlock({ data }: BlockProps) {
  const invoices = asArray<{
    id?: string;
    invoiceNumber?: string | null;
    amount?: number | null;
    currency?: string | null;
    invoiceDate?: string | null;
  }>(data.invoices);

  return (
    <BlockShell title={asString(data.title, 'Invoices')}>
      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Number</th>
              <th className="px-3 py-2 text-left font-medium">Date</th>
              <th className="px-3 py-2 text-left font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice, index) => (
              <tr key={invoice.id ?? index} className="border-t">
                <td className="px-3 py-2">{invoice.invoiceNumber ?? '—'}</td>
                <td className="px-3 py-2">{invoice.invoiceDate ?? '—'}</td>
                <td className="px-3 py-2">
                  {formatCurrency(invoice.amount, invoice.currency ?? 'USD')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BlockShell>
  );
}

export function EmailListBlock({ data }: BlockProps) {
  const emails = asArray<{
    id?: string;
    subject?: string | null;
    sender?: string | null;
    snippet?: string | null;
    category?: string | null;
  }>(data.emails);

  return (
    <BlockShell title={asString(data.title, 'Emails')}>
      <ul className="space-y-2">
        {emails.map((email, index) => (
          <li
            key={email.id ?? index}
            className="rounded-md bg-muted/40 px-3 py-2 text-sm"
          >
            <p className="font-medium">{email.subject ?? 'No subject'}</p>
            <p className="text-xs text-muted-foreground">
              {email.sender ?? 'Unknown sender'}
              {email.category ? ` · ${email.category}` : ''}
            </p>
            {email.snippet ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {email.snippet}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </BlockShell>
  );
}

function normalizeChartPoints(data: Record<string, unknown>) {
  const points = asArray<{ label?: string; value?: number }>(data.points);
  return points.map((point, index) => ({
    label: asString(point.label, `Item ${index + 1}`),
    value: asNumber(point.value),
  }));
}

export function LineChartBlock({ data }: BlockProps) {
  const chartData = normalizeChartPoints(data);

  return (
    <BlockShell title={asString(data.title)}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke={CHART_COLORS[0]}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </BlockShell>
  );
}

export function BarChartBlock({ data }: BlockProps) {
  const chartData = normalizeChartPoints(data);

  return (
    <BlockShell title={asString(data.title)}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </BlockShell>
  );
}

export function PieChartBlock({ data }: BlockProps) {
  const slices = asArray<{ label?: string; value?: number }>(
    data.slices ?? data.points,
  ).map((slice, index) => ({
    label: asString(slice.label, `Slice ${index + 1}`),
    value: asNumber(slice.value),
  }));

  return (
    <BlockShell title={asString(data.title)}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {slices.map((_, index) => (
                <Cell
                  key={index}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </BlockShell>
  );
}

export function WorkspaceSummaryBlock({ data }: BlockProps) {
  const kpis = asArray<{ title?: string; value?: string }>(data.kpis);
  const activity = asArray<{ title?: string; timestamp?: string }>(
    data.recentActivity,
  );

  return (
    <BlockShell title={asString(data.name, 'Workspace')}>
      {data.description ? (
        <p className="mb-3 text-sm text-muted-foreground">
          {asString(data.description)}
        </p>
      ) : null}
      {kpis.length > 0 ? (
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          {kpis.map((kpi, index) => (
            <div key={index} className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {asString(kpi.title)}
              </p>
              <p className="font-semibold">{asString(kpi.value)}</p>
            </div>
          ))}
        </div>
      ) : null}
      {activity.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {activity.map((item, index) => (
            <li key={index} className="rounded-md bg-muted/40 px-3 py-2">
              <p>{asString(item.title)}</p>
              {item.timestamp ? (
                <p className="text-xs text-muted-foreground">
                  {item.timestamp}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </BlockShell>
  );
}

export function CollectionSummaryBlock({ data }: BlockProps) {
  return (
    <BlockShell title={asString(data.name, 'Collection')}>
      <div className="space-y-2 text-sm">
        {data.emailCount != null ? (
          <p>
            <span className="text-muted-foreground">Emails:</span>{' '}
            {String(data.emailCount)}
          </p>
        ) : null}
        {data.description ? (
          <p className="text-muted-foreground">{asString(data.description)}</p>
        ) : null}
      </div>
    </BlockShell>
  );
}

export function VendorProfileBlock({ data }: BlockProps) {
  const recentInvoices = asArray<{
    invoiceNumber?: string | null;
    amount?: number | null;
    currency?: string | null;
  }>(data.recentInvoices);

  return (
    <BlockShell title={asString(data.name, 'Vendor')}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border px-3 py-2">
          <p className="text-xs text-muted-foreground">Spend</p>
          <p className="font-semibold">
            {formatCurrency(
              asNumber(data.spend),
              asString(data.currency, 'USD'),
            )}
          </p>
        </div>
        <div className="rounded-md border px-3 py-2">
          <p className="text-xs text-muted-foreground">Invoices</p>
          <p className="font-semibold">{String(data.invoiceCount ?? '—')}</p>
        </div>
        <div className="rounded-md border px-3 py-2">
          <p className="text-xs text-muted-foreground">Trend</p>
          <p className="font-semibold">{asString(data.trend, '—')}</p>
        </div>
      </div>
      {recentInvoices.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm">
          {recentInvoices.map((invoice, index) => (
            <li key={index} className="text-muted-foreground">
              {invoice.invoiceNumber ?? 'Invoice'} ·{' '}
              {formatCurrency(invoice.amount, invoice.currency ?? 'USD')}
            </li>
          ))}
        </ul>
      ) : null}
    </BlockShell>
  );
}

export function SubscriptionCardBlock({ data }: BlockProps) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border/80 bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{asString(data.name, 'Subscription')}</p>
          <p className="text-sm text-muted-foreground">
            Renews {asString(data.renewalDate, '—')}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold">
            {formatCurrency(
              asNumber(data.cost),
              asString(data.currency, 'USD'),
            )}
          </p>
          <p className="text-xs uppercase text-muted-foreground">
            {asString(data.status, 'active')}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ContactCardBlock({ data }: BlockProps) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border/80 bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="font-medium">{asString(data.name, 'Contact')}</p>
      {data.email ? (
        <p className="text-sm text-muted-foreground">{asString(data.email)}</p>
      ) : null}
      {data.company ? (
        <p className="text-sm text-muted-foreground">
          {asString(data.company)}
        </p>
      ) : null}
      {data.lastContact ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Last contact: {asString(data.lastContact)}
        </p>
      ) : null}
    </div>
  );
}

export function TimelineBlock({ data }: BlockProps) {
  const events = asArray<{
    date?: string;
    title?: string;
    description?: string;
  }>(data.events);

  return (
    <BlockShell title={asString(data.title, 'Timeline')}>
      <ol className="space-y-3 border-l pl-4">
        {events.map((event, index) => (
          <li key={index} className="relative">
            <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
            <p className="text-xs text-muted-foreground">
              {asString(event.date)}
            </p>
            <p className="text-sm font-medium">{asString(event.title)}</p>
            {event.description ? (
              <p className="text-sm text-muted-foreground">
                {event.description}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </BlockShell>
  );
}

export function DailyBriefingBlock({ data }: BlockProps) {
  const highlights = asArray<string>(data.highlights);
  const priorities = asArray<string>(data.priorities);

  return (
    <BlockShell title={asString(data.title, 'Daily briefing')}>
      <p className="mb-3 text-xs text-muted-foreground">
        {asString(data.date, new Date().toDateString())}
      </p>
      {highlights.length > 0 ? (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            Highlights
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {highlights.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {priorities.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            Priorities
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {priorities.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </BlockShell>
  );
}

export function InboxHealthBlock({ data }: BlockProps) {
  const issues = asArray<{ label?: string; severity?: string }>(data.issues);
  const score = asNumber(data.score);

  return (
    <BlockShell title={asString(data.title, 'Inbox health')}>
      <p className="mb-3 text-3xl font-semibold">{score}/100</p>
      <ul className="space-y-2 text-sm">
        {issues.map((issue, index) => (
          <li
            key={index}
            className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
          >
            <span>{asString(issue.label)}</span>
            <span className="text-xs uppercase text-muted-foreground">
              {asString(issue.severity, 'info')}
            </span>
          </li>
        ))}
      </ul>
    </BlockShell>
  );
}

export function ActionGroupBlock({ data }: BlockProps) {
  const actions = asArray<{
    id?: string;
    label?: string;
    type?: string;
    dangerous?: boolean;
  }>(data.actions);

  return (
    <div
      data-testid="generative-ui-action-group"
      className="flex flex-wrap gap-2"
    >
      {actions.map((action, index) => (
        <div
          key={action.id ?? index}
          data-testid={`generative-ui-action-${action.id ?? index}`}
        >
          <Button
            type="button"
            size="sm"
            variant={action.dangerous ? 'destructive' : 'outline'}
          >
            {asString(action.label, 'Action')}
          </Button>
        </div>
      ))}
    </div>
  );
}

export function ConfirmationBlock({ data }: BlockProps) {
  const preview = asRecord(data.preview);

  return (
    <div
      data-testid="generative-ui-confirmation"
      className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4"
    >
      <p className="font-medium">{asString(data.title, 'Confirm action')}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {asString(data.message)}
      </p>
      {Object.keys(preview).length > 0 ? (
        <pre className="mt-3 overflow-x-auto rounded-md bg-muted/40 p-3 text-xs">
          {JSON.stringify(preview, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

export function InsightCardBlock({ data }: BlockProps) {
  const payload = asRecord(data.payload);
  const title =
    asString(data.title) ||
    asString(payload.title, asString(data.insightType, 'Insight'));
  const message = asString(payload.message) || asString(payload.summary);

  return (
    <BlockShell title={title}>
      {message ? (
        <p className="mb-3 text-sm text-muted-foreground">{message}</p>
      ) : null}
      {Object.keys(payload).length > 0 ? (
        <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-xs">
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">No insight payload.</p>
      )}
    </BlockShell>
  );
}

export function SuggestionCardBlock({ data }: BlockProps) {
  return (
    <BlockShell title={asString(data.title, 'Suggestion')}>
      <p className="text-sm text-muted-foreground">{asString(data.message)}</p>
    </BlockShell>
  );
}

export function AutomationPreviewBlock({ data }: BlockProps) {
  const automations = asArray<{ id?: string; name?: string | null }>(
    data.existingAutomations,
  );

  return (
    <BlockShell title="Automation preview">
      <p className="text-sm">{asString(data.message)}</p>
      {automations.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {automations.map((automation, index) => (
            <li key={automation.id ?? index}>
              {automation.name ?? automation.id}
            </li>
          ))}
        </ul>
      ) : null}
    </BlockShell>
  );
}

export function UnknownBlockFallback({
  data,
  type,
}: BlockProps & { type: string }) {
  return (
    <div className="rounded-md border border-dashed p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        Unknown block: {type}
      </p>
      <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export const blockRegistry: Record<string, ComponentType<BlockProps>> = {
  markdown: MarkdownBlock,
  text: TextBlock,
  kpi: KpiBlock,
  metric_grid: MetricGridBlock,
  table: TableBlock,
  invoice_table: InvoiceTableBlock,
  email_list: EmailListBlock,
  line_chart: LineChartBlock,
  bar_chart: BarChartBlock,
  pie_chart: PieChartBlock,
  workspace_summary: WorkspaceSummaryBlock,
  collection_summary: CollectionSummaryBlock,
  vendor_profile: VendorProfileBlock,
  subscription_card: SubscriptionCardBlock,
  contact_card: ContactCardBlock,
  timeline: TimelineBlock,
  daily_briefing: DailyBriefingBlock,
  inbox_health: InboxHealthBlock,
  action_group: ActionGroupBlock,
  confirmation: ConfirmationBlock,
  insight_card: InsightCardBlock,
  suggestion_card: SuggestionCardBlock,
  automation_preview: AutomationPreviewBlock,
};

export const registeredBlockTypes = Object.keys(blockRegistry);

export function isRegisteredBlockType(type: string): boolean {
  return type in blockRegistry;
}
