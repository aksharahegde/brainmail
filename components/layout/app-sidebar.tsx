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
    <Sidebar data-testid="layout-sidebar" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link
          href="/workspaces"
          className="font-semibold tracking-tight text-sidebar-foreground"
        >
          BrainMail
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((workspace) => (
                <SidebarMenuItem key={workspace.id}>
                  <SidebarMenuButton
                    isActive={activeWorkspaceId === workspace.id}
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
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {WORKSPACE_NAV.map((item) => {
                const href = workspacePath(activeWorkspaceId, item.slug);
                const isActive = pathname === href;

                return (
                  <SidebarMenuItem key={item.slug}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={
                        <Link
                          href={href}
                          data-testid={item.testId}
                          className={cn(isActive && 'font-medium')}
                        />
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
