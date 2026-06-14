export type DatabaseHealth = {
  ready: boolean;
  tableCount: number;
  seeded: boolean;
};

export async function getDatabaseHealth(env: Env): Promise<DatabaseHealth> {
  if (!env.DB) {
    return { ready: false, tableCount: 0, seeded: false };
  }

  try {
    const tableCountRow = await env.DB.prepare(
      `SELECT COUNT(*) AS count
       FROM sqlite_master
       WHERE type = 'table'
         AND name NOT LIKE 'sqlite_%'
         AND name NOT LIKE '_cf_%'
         AND name NOT LIKE 'd1_%'`,
    ).first<{ count: number }>();

    const tableCount = Number(tableCountRow?.count ?? 0);
    const ready = tableCount >= 34;

    if (!ready) {
      return { ready: false, tableCount, seeded: false };
    }

    const userCountRow = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM users',
    ).first<{ count: number }>();
    const seeded = Number(userCountRow?.count ?? 0) > 0;

    return { ready, tableCount, seeded };
  } catch {
    return { ready: false, tableCount: 0, seeded: false };
  }
}
