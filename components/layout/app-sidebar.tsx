'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  DEFAULT_WORKSPACE_ID,
  WORKSPACES,
  WORKSPACE_NAV,
  workspacePath,
} from '@/lib/navigation';
import { listWorkspaces } from '@/lib/workspaces/api';
import { cn } from '@/lib/utils';

function getWorkspaceIdFromPath(pathname: string) {
  const match = pathname.match(/^\/workspaces\/([^/]+)/);
  return match?.[1] ?? DEFAULT_WORKSPACE_ID;
}

export function AppSidebar() {
  const pathname = usePathname();
  const activeWorkspaceId = getWorkspaceIdFromPath(pathname);

  const { data } = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  });

  const workspaceItems =
    data?.workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name ?? workspace.id,
    })) ?? WORKSPACES;

  return (
    <Sidebar
      data-testid="layout-sidebar"
      collapsible="icon"
      className="border-r border-border/60 bg-sidebar"
    >
      <SidebarHeader className="border-b border-sidebar-border/60 px-5 py-5">
        <Link
          href="/workspaces"
          className="text-body-sm font-medium tracking-tight text-sidebar-foreground transition-colors hover:text-foreground"
        >
          BrainMail
        </Link>
      </SidebarHeader>
      <SidebarContent className="gap-6 px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="briefing-eyebrow px-3">
            Workspaces
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((workspace) => (
                <SidebarMenuItem key={workspace.id}>
                  <SidebarMenuButton
                    isActive={activeWorkspaceId === workspace.id}
                    className="rounded-[10px] text-body-sm text-sidebar-foreground/80 hover:text-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground"
                    render={
                      <Link
                        href={workspacePath(workspace.id)}
                        data-testid={`workspace-link-${workspace.id}`}
                      />
                    }
                  >
                    {workspace.name}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="briefing-eyebrow px-3">
            Journey
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {WORKSPACE_NAV.map((item) => {
                const href = workspacePath(activeWorkspaceId, item.slug);
                const isActive = pathname === href;

                return (
                  <SidebarMenuItem key={item.slug}>
                    <SidebarMenuButton
                      isActive={isActive}
                      className={cn(
                        'rounded-[10px] text-body-sm text-sidebar-foreground/70 hover:text-foreground',
                        'data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground',
                        isActive && 'font-medium',
                      )}
                      render={
                        <Link href={href} data-testid={item.testId} />
                      }
                    >
                      {item.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
