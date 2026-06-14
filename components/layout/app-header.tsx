'use client';

import { UserMenu } from '@/components/auth/user-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { AuthUser } from '@/lib/auth/api';

export function AppHeader({ user }: { user: AuthUser }) {
  return (
    <header
      data-testid="layout-header"
      className="flex h-14 shrink-0 items-center gap-2 border-b px-4"
    >
      <SidebarTrigger />
      <div className="text-sm font-medium text-muted-foreground">
        AI Email OS
      </div>
      <UserMenu email={user.email} name={user.name} />
    </header>
  );
}
