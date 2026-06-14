import { createDb } from '@brainmail/db';
import {
  artifacts,
  automations,
  collections,
  contacts,
  dashboards,
  emails,
  reports,
  subscriptions,
  users,
  workspaces,
} from '@brainmail/db/schema';
import { eq } from 'drizzle-orm';

import { writeAuditLog } from '../audit/service';

export type UserExportBundle = {
  exportedAt: string;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    timezone: string | null;
  };
  workspaces: Array<Record<string, unknown>>;
  emails: Array<Record<string, unknown>>;
  collections: Array<Record<string, unknown>>;
  dashboards: Array<Record<string, unknown>>;
  reports: Array<Record<string, unknown>>;
  automations: Array<Record<string, unknown>>;
  artifacts: Array<Record<string, unknown>>;
  contacts: Array<Record<string, unknown>>;
  subscriptions: Array<Record<string, unknown>>;
};

export async function buildUserDataExport(
  env: Env,
  userId: string,
): Promise<UserExportBundle> {
  const db = createDb(env.DB);

  const [
    userRows,
    workspaceRows,
    emailRows,
    collectionRows,
    dashboardRows,
    reportRows,
    automationRows,
    artifactRows,
    contactRows,
    subscriptionRows,
  ] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(workspaces).where(eq(workspaces.userId, userId)),
    db
      .select({
        id: emails.id,
        subject: emails.subject,
        sender: emails.sender,
        category: emails.category,
        receivedAt: emails.receivedAt,
      })
      .from(emails)
      .where(eq(emails.userId, userId)),
    db.select().from(collections).where(eq(collections.userId, userId)),
    db.select().from(dashboards).where(eq(dashboards.userId, userId)),
    db.select().from(reports).where(eq(reports.userId, userId)),
    db.select().from(automations).where(eq(automations.userId, userId)),
    db.select().from(artifacts).where(eq(artifacts.userId, userId)),
    db.select().from(contacts).where(eq(contacts.userId, userId)),
    db.select().from(subscriptions).where(eq(subscriptions.userId, userId)),
  ]);

  const user = userRows[0];
  if (!user) {
    throw new Error('User not found');
  }

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
    },
    workspaces: workspaceRows as Array<Record<string, unknown>>,
    emails: emailRows as Array<Record<string, unknown>>,
    collections: collectionRows as Array<Record<string, unknown>>,
    dashboards: dashboardRows as Array<Record<string, unknown>>,
    reports: reportRows as Array<Record<string, unknown>>,
    automations: automationRows as Array<Record<string, unknown>>,
    artifacts: artifactRows as Array<Record<string, unknown>>,
    contacts: contactRows as Array<Record<string, unknown>>,
    subscriptions: subscriptionRows as Array<Record<string, unknown>>,
  };
}

export async function exportUserData(
  env: Env,
  userId: string,
  format: 'json' | 'csv',
): Promise<{ contentType: string; body: string; filename: string }> {
  await writeAuditLog(env, {
    userId,
    action: 'export.requested',
    payload: { format },
  });

  const bundle = await buildUserDataExport(env, userId);

  await writeAuditLog(env, {
    userId,
    action: 'export.completed',
    payload: {
      format,
      counts: {
        workspaces: bundle.workspaces.length,
        emails: bundle.emails.length,
        collections: bundle.collections.length,
        dashboards: bundle.dashboards.length,
        reports: bundle.reports.length,
        automations: bundle.automations.length,
        artifacts: bundle.artifacts.length,
        contacts: bundle.contacts.length,
        subscriptions: bundle.subscriptions.length,
      },
    },
  });

  const filename = `brainmail_export_${userId}_${Date.now()}`;

  if (format === 'json') {
    return {
      contentType: 'application/json',
      body: JSON.stringify(bundle, null, 2),
      filename: `${filename}.json`,
    };
  }

  const rows: string[][] = [['section', 'id', 'payload']];
  const appendRows = (
    section: string,
    items: Array<Record<string, unknown>>,
  ) => {
    for (const item of items) {
      rows.push([section, String(item.id ?? ''), JSON.stringify(item)]);
    }
  };

  appendRows('workspace', bundle.workspaces);
  appendRows('email', bundle.emails);
  appendRows('collection', bundle.collections);
  appendRows('dashboard', bundle.dashboards);
  appendRows('report', bundle.reports);
  appendRows('automation', bundle.automations);
  appendRows('artifact', bundle.artifacts);
  appendRows('contact', bundle.contacts);
  appendRows('subscription', bundle.subscriptions);

  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(','),
    )
    .join('\n');

  return {
    contentType: 'text/csv',
    body,
    filename: `${filename}.csv`,
  };
}
