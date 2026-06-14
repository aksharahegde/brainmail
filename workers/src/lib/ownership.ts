import { createDb } from '@brainmail/db';
import { workspaces } from '@brainmail/db/schema';
import { and, eq } from 'drizzle-orm';

export class OwnershipError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'OwnershipError';
  }
}

export async function requireWorkspaceOwnership(
  env: Env,
  userId: string,
  workspaceId: string,
): Promise<void> {
  const db = createDb(env.DB);
  const row = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)))
    .limit(1);

  if (!row[0]) {
    throw new OwnershipError();
  }
}

export function assertUserId(
  resourceUserId: string | null | undefined,
  userId: string,
): void {
  if (!resourceUserId || resourceUserId !== userId) {
    throw new OwnershipError();
  }
}
