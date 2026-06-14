export const WORKSPACES = [
  { id: 'startup', name: 'Startup' },
  { id: 'finance', name: 'Finance' },
  { id: 'travel', name: 'Travel' },
  { id: 'personal', name: 'Personal' },
  { id: 'learning', name: 'Learning' },
] as const;

export type WorkspaceId = (typeof WORKSPACES)[number]['id'];

export const DEFAULT_WORKSPACE_ID: WorkspaceId = 'startup';

export const WORKSPACE_NAV = [
  { slug: 'overview', label: 'Overview', testId: 'workspace-nav-overview' },
  { slug: 'chat', label: 'Chat', testId: 'workspace-nav-chat' },
  {
    slug: 'generative-ui',
    label: 'Generative UI',
    testId: 'workspace-nav-generative-ui',
  },
  { slug: 'activity', label: 'Activity', testId: 'workspace-nav-activity' },
  {
    slug: 'collections',
    label: 'Collections',
    testId: 'workspace-nav-collections',
  },
  {
    slug: 'dashboards',
    label: 'Dashboards',
    testId: 'workspace-nav-dashboards',
  },
  { slug: 'reports', label: 'Reports', testId: 'workspace-nav-reports' },
  { slug: 'contacts', label: 'Contacts', testId: 'workspace-nav-contacts' },
  { slug: 'insights', label: 'Insights', testId: 'workspace-nav-insights' },
  {
    slug: 'automations',
    label: 'Automations',
    testId: 'workspace-nav-automations',
  },
  { slug: 'settings', label: 'Settings', testId: 'workspace-nav-settings' },
] as const;

export type WorkspaceNavSlug = (typeof WORKSPACE_NAV)[number]['slug'];

export function workspacePath(
  workspaceId: string,
  section: WorkspaceNavSlug = 'overview',
) {
  return `/workspaces/${workspaceId}/${section}`;
}
