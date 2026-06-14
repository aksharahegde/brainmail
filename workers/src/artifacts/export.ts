import type { UIBlock } from '../agents/types';

type ExportRow = string[];

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowsToCsv(rows: ExportRow[]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

function extractTableRows(block: UIBlock): ExportRow[] {
  const columns = Array.isArray(block.data.columns)
    ? (block.data.columns as string[])
    : [];
  const rows = Array.isArray(block.data.rows)
    ? (block.data.rows as string[][])
    : [];

  if (columns.length > 0) {
    return [columns, ...rows];
  }

  return rows;
}

function extractInvoiceRows(block: UIBlock): ExportRow[] {
  const invoices = Array.isArray(block.data.invoices)
    ? (block.data.invoices as Array<Record<string, unknown>>)
    : [];

  const header = ['id', 'invoiceNumber', 'invoiceDate', 'amount', 'currency'];
  const rows = invoices.map((invoice) =>
    header.map((key) => String(invoice[key] ?? '')),
  );

  return [header, ...rows];
}

function extractEmailRows(block: UIBlock): ExportRow[] {
  const emails = Array.isArray(block.data.emails)
    ? (block.data.emails as Array<Record<string, unknown>>)
    : [];

  const header = ['id', 'subject', 'sender', 'category'];
  const rows = emails.map((email) =>
    header.map((key) => String(email[key] ?? '')),
  );

  return [header, ...rows];
}

function extractChartRows(block: UIBlock): ExportRow[] {
  const points = Array.isArray(block.data.points)
    ? (block.data.points as Array<{ label?: string; value?: number }>)
    : Array.isArray(block.data.slices)
      ? (block.data.slices as Array<{ label?: string; value?: number }>)
      : [];

  return [
    ['label', 'value'],
    ...points.map((point) => [
      String(point.label ?? ''),
      String(point.value ?? ''),
    ]),
  ];
}

export function exportArtifactPayload(
  artifactType: string | null,
  payload: Record<string, unknown> | null,
  format: 'json' | 'csv',
): { contentType: string; body: string; filename: string } {
  const safePayload = payload ?? {};
  const type = artifactType ?? 'artifact';
  const baseName = `${type}_${Date.now()}`;

  if (format === 'json') {
    return {
      contentType: 'application/json',
      body: JSON.stringify(safePayload, null, 2),
      filename: `${baseName}.json`,
    };
  }

  const blocks = Array.isArray(safePayload.blocks)
    ? (safePayload.blocks as UIBlock[])
    : [];
  const rows: ExportRow[] = [];

  for (const block of blocks) {
    if (block.type === 'table') {
      rows.push(...extractTableRows(block));
      rows.push([]);
      continue;
    }

    if (block.type === 'invoice_table') {
      rows.push(...extractInvoiceRows(block));
      rows.push([]);
      continue;
    }

    if (block.type === 'email_list') {
      rows.push(...extractEmailRows(block));
      rows.push([]);
      continue;
    }

    if (
      block.type === 'line_chart' ||
      block.type === 'bar_chart' ||
      block.type === 'pie_chart'
    ) {
      rows.push([block.type]);
      rows.push(...extractChartRows(block));
      rows.push([]);
    }
  }

  if (rows.length === 0) {
    rows.push(['key', 'value']);
    for (const [key, value] of Object.entries(safePayload)) {
      rows.push([key, JSON.stringify(value)]);
    }
  }

  return {
    contentType: 'text/csv',
    body: rowsToCsv(rows.filter((row) => row.length > 0)),
    filename: `${baseName}.csv`,
  };
}
