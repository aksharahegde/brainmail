'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useUiStore } from '@/lib/stores/ui-store';

import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div data-testid="layout-app-shell" className="flex min-h-svh w-full">
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <div className="flex flex-1 flex-col p-6">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
