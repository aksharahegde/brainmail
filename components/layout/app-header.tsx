'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';

export function AppHeader() {
  return (
    <header
      data-testid="layout-header"
      className="flex h-14 shrink-0 items-center gap-2 border-b px-4"
    >
      <SidebarTrigger />
      <div className="text-sm font-medium text-muted-foreground">
        AI Email OS
      </div>
    </header>
  );
}
