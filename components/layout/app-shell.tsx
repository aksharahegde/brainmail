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
      <div
        data-testid="layout-app-shell"
        className="flex min-h-svh w-full bg-background"
      >
        <AppSidebar />
        <SidebarInset className="bg-background">
          <AppHeader user={user} />
          <div className="flex flex-1 flex-col px-6 py-10 md:px-10 lg:px-14">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
