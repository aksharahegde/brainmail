import type { EmailCategory } from '../processing/types';

export type SystemWorkspaceSeed = {
  id: string;
  name: string;
  description: string;
  workspaceType: string;
  categories: EmailCategory[];
};

export const SYSTEM_WORKSPACES: SystemWorkspaceSeed[] = [
  {
    id: 'startup',
    name: 'Startup',
    description: 'Customers, vendors, revenue, and operating spend.',
    workspaceType: 'Startup',
    categories: ['invoice', 'receipt', 'work', 'meeting', 'job'],
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Bills, invoices, receipts, and subscriptions.',
    workspaceType: 'Finance',
    categories: ['invoice', 'receipt', 'subscription', 'finance', 'purchase'],
  },
  {
    id: 'travel',
    name: 'Travel',
    description: 'Flights, hotels, tickets, and trip expenses.',
    workspaceType: 'Travel',
    categories: ['travel', 'flight', 'hotel'],
  },
  {
    id: 'personal',
    name: 'Personal',
    description: 'Contacts, purchases, trips, and important personal mail.',
    workspaceType: 'Personal',
    categories: ['personal', 'social', 'purchase', 'support'],
  },
  {
    id: 'learning',
    name: 'Learning',
    description: 'Courses, books, newsletters, and training content.',
    workspaceType: 'Learning',
    categories: ['newsletter', 'work', 'meeting'],
  },
];

const workspaceMap = new Map(
  SYSTEM_WORKSPACES.map((workspace) => [workspace.id, workspace]),
);

export function isSystemWorkspaceId(workspaceId: string): boolean {
  return workspaceMap.has(workspaceId);
}

export function getWorkspaceContext(workspaceId: string) {
  return (
    workspaceMap.get(workspaceId) ?? {
      id: workspaceId,
      name: workspaceId,
      description: 'Custom workspace',
      workspaceType: 'Custom',
      categories: [] as EmailCategory[],
    }
  );
}

export function getWorkspaceEmailCategories(
  workspaceId: string,
): EmailCategory[] {
  return getWorkspaceContext(workspaceId).categories;
}
