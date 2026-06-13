'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { AuthUser } from '@/lib/auth/api';
import { useUiStore } from '@/lib/stores/ui-store';

import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: AuthUser;
}) {
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div data-testid="layout-app-shell" className="flex min-h-svh w-full">
        <AppSidebar />
        <SidebarInset>
          <AppHeader user={user} />
          <div className="flex flex-1 flex-col p-6">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
