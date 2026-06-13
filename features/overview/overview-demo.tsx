'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const chartData = [
  { month: 'Jan', spend: 420 },
  { month: 'Feb', spend: 380 },
  { month: 'Mar', spend: 510 },
  { month: 'Apr', spend: 460 },
  { month: 'May', spend: 590 },
  { month: 'Jun', spend: 540 },
];

type SpendRow = {
  vendor: string;
  category: string;
  amount: number;
};

const tableData: SpendRow[] = [
  { vendor: 'OpenAI', category: 'AI Tools', amount: 120 },
  { vendor: 'Anthropic', category: 'AI Tools', amount: 95 },
  { vendor: 'AWS', category: 'Infrastructure', amount: 240 },
];

const columns: ColumnDef<SpendRow>[] = [
  { accessorKey: 'vendor', header: 'Vendor' },
  { accessorKey: 'category', header: 'Category' },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ getValue }) => `$${getValue<number>()}`,
  },
];

export function OverviewDemo() {
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <div
        data-testid="overview-demo-chart"
        className="rounded-lg border bg-card p-4"
      >
        <h2 className="mb-4 text-sm font-medium">Monthly spend</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="spend"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div
        data-testid="overview-demo-table"
        className="overflow-hidden rounded-lg border bg-card"
      >
        <h2 className="border-b px-4 py-3 text-sm font-medium">
          Recent vendors
        </h2>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-2 text-left font-medium"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
