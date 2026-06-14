'use client';

import { UserMenu } from '@/components/auth/user-menu';
import { GlobalSearchPanel } from '@/components/search/global-search-panel';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { AuthUser } from '@/lib/auth/api';

export function AppHeader({ user }: { user: AuthUser }) {
  return (
    <header
      data-testid="layout-header"
      className="sticky top-0 z-20 flex min-h-16 shrink-0 flex-col gap-4 border-b border-border/60 bg-background/90 px-6 py-4 backdrop-blur-md md:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14"
    >
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <p className="briefing-eyebrow hidden sm:block">AI Email OS</p>
        <UserMenu email={user.email} name={user.name} />
      </div>
      <GlobalSearchPanel />
    </header>
  );
}
