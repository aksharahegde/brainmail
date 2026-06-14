'use client';

import { UserMenu } from '@/components/auth/user-menu';
import { GlobalSearchPanel } from '@/components/search/global-search-panel';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { AuthUser } from '@/lib/auth/api';

export function AppHeader({ user }: { user: AuthUser }) {
  return (
    <header
      data-testid="layout-header"
      className="flex min-h-14 shrink-0 flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center"
    >
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <div className="text-sm font-medium text-muted-foreground">
          AI Email OS
        </div>
        <UserMenu email={user.email} name={user.name} />
      </div>
      <GlobalSearchPanel />
    </header>
  );
}
