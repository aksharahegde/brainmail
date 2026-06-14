import { errorResponse } from '../lib/api-response';
import {
  handleAccountsConnect,
  handleAccountsDisconnect,
  handleAccountsList,
  handleAuthCallback,
  handleAuthLogin,
  handleAuthLogout,
  handleAuthMe,
} from './auth';
import { handleSyncStatus, handleSyncTrigger } from './sync';
import { handleGmailWebhook } from './webhooks';
import { handleEmailDetail, handleEmailsList } from './emails';
import { handleEntitiesList, handleEntityDetail } from './entities';
import { handleContactsList, handleContactDetail } from './contacts';
import { handleGraph } from './graph';
import { handleGlobalSearch } from './search';
import {
  handleAgentToolsList,
  handleChatMessage,
  handleChatSessionCreate,
  handleChatSessionDetail,
  handleChatSessionsList,
  handleChatStream,
} from './chat';
import {
  handleArtifactCreate,
  handleArtifactDelete,
  handleArtifactDetail,
  handleArtifactExport,
  handleArtifactShare,
  handleArtifactShared,
  handleArtifactsList,
} from './artifacts';
import {
  handleWorkspaceCreate,
  handleWorkspaceRoutes,
  handleWorkspacesList,
} from './workspaces';
import {
  handleCollectionCreate,
  handleCollectionRoutes,
  handleCollectionSuggestions,
  handleCollectionsList,
} from './collections';
import {
  handleDashboardCreate,
  handleDashboardRoutes,
  handleDashboardTemplates,
  handleDashboardsList,
} from './dashboards';
import {
  handleReportGenerate,
  handleReportRoutes,
  handleReportTypes,
  handleReportsList,
} from './reports';
import {
  handleBriefing,
  handleInsightsGenerate,
  handleInsightsList,
} from './insights';
import {
  handleSubscriptionRoutes,
  handleSubscriptionsList,
} from './subscriptions';
import {
  handleAutomationCreate,
  handleAutomationRoutes,
  handleAutomationTemplates,
  handleAutomationsList,
} from './automations';
import { handleAuditList } from './audit';
import { handleExportCreate } from './export';
import { handleAccountDelete, handleAccountDeletePreview } from './account';
import { enforceRateLimit } from '../lib/rate-limit';
import { resolveSessionUser } from '../lib/session';
import { recordRequestTiming } from '../ops/telemetry';
import { handleOpsMetrics, handleOpsStatus } from './ops';

function withResponseTimingHeader(
  headers: Headers,
  durationMs: number,
): Headers {
  const nextHeaders = new Headers(headers);
  nextHeaders.set('X-Response-Time', `${durationMs}ms`);
  return nextHeaders;
}

export async function handleApiRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  const sessionUser = await resolveSessionUser(env, request);
  const rateLimitResponse = await enforceRateLimit(
    request,
    env,
    pathname,
    sessionUser?.id,
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const startedAt = Date.now();
  const response = await dispatchApiRequest(request, env, pathname);
  const durationMs = Date.now() - startedAt;

  try {
    await recordRequestTiming(env, {
      pathname,
      method: request.method,
      status: response.status,
      durationMs,
      userId: sessionUser?.id,
    });
  } catch {
    // Telemetry should never break API responses.
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: withResponseTimingHeader(response.headers, durationMs),
  });
}

async function dispatchApiRequest(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> {
  if (pathname === '/api/v1/auth/login') {
    return handleAuthLogin(request, env);
  }

  if (pathname === '/api/v1/auth/google/callback') {
    return handleAuthCallback(request, env);
  }

  if (pathname === '/api/v1/auth/me') {
    return handleAuthMe(request, env);
  }

  if (pathname === '/api/v1/auth/logout') {
    return handleAuthLogout(request, env);
  }

  if (pathname === '/api/v1/accounts') {
    return handleAccountsList(request, env);
  }

  if (pathname === '/api/v1/accounts/connect') {
    return handleAccountsConnect(request, env);
  }

  const accountMatch = pathname.match(/^\/api\/v1\/accounts\/([^/]+)$/);
  if (accountMatch) {
    return handleAccountsDisconnect(request, env, accountMatch[1]);
  }

  if (pathname === '/api/v1/sync/status') {
    return handleSyncStatus(request, env);
  }

  if (pathname === '/api/v1/sync/trigger') {
    return handleSyncTrigger(request, env);
  }

  if (pathname === '/api/v1/webhooks/gmail') {
    return handleGmailWebhook(request, env);
  }

  if (pathname === '/api/v1/emails') {
    return handleEmailsList(request, env);
  }

  const emailMatch = pathname.match(/^\/api\/v1\/emails\/([^/]+)$/);
  if (emailMatch) {
    return handleEmailDetail(request, env, emailMatch[1]);
  }

  if (pathname === '/api/v1/entities') {
    return handleEntitiesList(request, env);
  }

  const entityMatch = pathname.match(/^\/api\/v1\/entities\/([^/]+)$/);
  if (entityMatch) {
    return handleEntityDetail(request, env, entityMatch[1]);
  }

  if (pathname === '/api/v1/contacts') {
    return handleContactsList(request, env);
  }

  const contactMatch = pathname.match(/^\/api\/v1\/contacts\/([^/]+)$/);
  if (contactMatch) {
    return handleContactDetail(request, env, contactMatch[1]);
  }

  if (pathname === '/api/v1/graph') {
    return handleGraph(request, env);
  }

  if (pathname === '/api/v1/search') {
    return handleGlobalSearch(request, env);
  }

  if (pathname === '/api/v1/workspaces') {
    if (request.method === 'GET') {
      return handleWorkspacesList(request, env);
    }
    if (request.method === 'POST') {
      return handleWorkspaceCreate(request, env);
    }
    return errorResponse('Method not allowed', 405);
  }

  const workspaceSearchMatch = pathname.match(
    /^\/api\/v1\/workspaces\/([^/]+)\/search$/,
  );
  if (workspaceSearchMatch) {
    return handleWorkspaceRoutes(request, env, workspaceSearchMatch[1]);
  }

  const workspaceMatch = pathname.match(/^\/api\/v1\/workspaces\/([^/]+)$/);
  if (workspaceMatch) {
    return handleWorkspaceRoutes(request, env, workspaceMatch[1]);
  }

  if (pathname === '/api/v1/collections/suggestions') {
    return handleCollectionSuggestions(request, env);
  }

  if (pathname === '/api/v1/collections') {
    if (request.method === 'GET') {
      return handleCollectionsList(request, env);
    }
    if (request.method === 'POST') {
      return handleCollectionCreate(request, env);
    }
    return errorResponse('Method not allowed', 405);
  }

  const collectionMemberMatch = pathname.match(
    /^\/api\/v1\/collections\/([^/]+)\/members(?:\/([^/]+))?$/,
  );
  if (collectionMemberMatch) {
    return handleCollectionRoutes(request, env, collectionMemberMatch[1]);
  }

  const collectionSuggestionMatch = pathname.match(
    /^\/api\/v1\/collections\/([^/]+)\/suggestions\/(accept|dismiss)$/,
  );
  if (collectionSuggestionMatch) {
    return handleCollectionRoutes(request, env, collectionSuggestionMatch[1]);
  }

  const collectionMatch = pathname.match(/^\/api\/v1\/collections\/([^/]+)$/);
  if (collectionMatch) {
    return handleCollectionRoutes(request, env, collectionMatch[1]);
  }

  if (pathname === '/api/v1/dashboards/templates') {
    return handleDashboardTemplates(request);
  }

  if (pathname === '/api/v1/dashboards') {
    if (request.method === 'GET') {
      return handleDashboardsList(request, env);
    }
    if (request.method === 'POST') {
      return handleDashboardCreate(request, env);
    }
    return errorResponse('Method not allowed', 405);
  }

  const dashboardRefreshMatch = pathname.match(
    /^\/api\/v1\/dashboards\/([^/]+)\/refresh$/,
  );
  if (dashboardRefreshMatch) {
    return handleDashboardRoutes(request, env, dashboardRefreshMatch[1]);
  }

  const dashboardMatch = pathname.match(/^\/api\/v1\/dashboards\/([^/]+)$/);
  if (dashboardMatch) {
    return handleDashboardRoutes(request, env, dashboardMatch[1]);
  }

  if (pathname === '/api/v1/reports/types') {
    return handleReportTypes(request);
  }

  if (pathname === '/api/v1/reports') {
    if (request.method === 'GET') {
      return handleReportsList(request, env);
    }
    if (request.method === 'POST') {
      return handleReportGenerate(request, env);
    }
    return errorResponse('Method not allowed', 405);
  }

  const reportRefreshMatch = pathname.match(
    /^\/api\/v1\/reports\/([^/]+)\/refresh$/,
  );
  if (reportRefreshMatch) {
    return handleReportRoutes(request, env, reportRefreshMatch[1]);
  }

  const reportMatch = pathname.match(/^\/api\/v1\/reports\/([^/]+)$/);
  if (reportMatch) {
    return handleReportRoutes(request, env, reportMatch[1]);
  }

  if (pathname === '/api/v1/insights') {
    if (request.method === 'GET') {
      return handleInsightsList(request, env);
    }
    if (request.method === 'POST') {
      return handleInsightsGenerate(request, env);
    }
    return errorResponse('Method not allowed', 405);
  }

  if (pathname === '/api/v1/briefing') {
    return handleBriefing(request, env);
  }

  if (pathname === '/api/v1/subscriptions') {
    return handleSubscriptionsList(request, env);
  }

  const subscriptionIgnoreMatch = pathname.match(
    /^\/api\/v1\/subscriptions\/([^/]+)\/ignore$/,
  );
  if (subscriptionIgnoreMatch) {
    return handleSubscriptionRoutes(request, env, subscriptionIgnoreMatch[1]);
  }

  const subscriptionMatch = pathname.match(
    /^\/api\/v1\/subscriptions\/([^/]+)$/,
  );
  if (subscriptionMatch) {
    return handleSubscriptionRoutes(request, env, subscriptionMatch[1]);
  }

  if (pathname === '/api/v1/automations/templates') {
    return handleAutomationTemplates(request);
  }

  if (pathname === '/api/v1/automations') {
    if (request.method === 'GET') {
      return handleAutomationsList(request, env);
    }
    if (request.method === 'POST') {
      return handleAutomationCreate(request, env);
    }
    return errorResponse('Method not allowed', 405);
  }

  const automationRunsMatch = pathname.match(
    /^\/api\/v1\/automations\/([^/]+)\/runs$/,
  );
  if (automationRunsMatch) {
    return handleAutomationRoutes(request, env, automationRunsMatch[1]);
  }

  const automationRunMatch = pathname.match(
    /^\/api\/v1\/automations\/([^/]+)\/run$/,
  );
  if (automationRunMatch) {
    return handleAutomationRoutes(request, env, automationRunMatch[1]);
  }

  const automationMatch = pathname.match(/^\/api\/v1\/automations\/([^/]+)$/);
  if (automationMatch) {
    return handleAutomationRoutes(request, env, automationMatch[1]);
  }

  if (pathname === '/api/v1/chat') {
    return handleChatMessage(request, env);
  }

  if (pathname === '/api/v1/chat/stream') {
    return handleChatStream(request, env);
  }

  if (pathname === '/api/v1/chat/sessions') {
    return handleChatSessionsList(request, env);
  }

  if (pathname === '/api/v1/chat/session') {
    return handleChatSessionCreate(request, env);
  }

  const chatSessionMatch = pathname.match(
    /^\/api\/v1\/chat\/session\/([^/]+)$/,
  );
  if (chatSessionMatch) {
    return handleChatSessionDetail(request, env, chatSessionMatch[1]);
  }

  if (pathname === '/api/v1/agents/tools') {
    return handleAgentToolsList(request, env);
  }

  if (pathname === '/api/v1/artifacts') {
    if (request.method === 'GET') {
      return handleArtifactsList(request, env);
    }
    if (request.method === 'POST') {
      return handleArtifactCreate(request, env);
    }
    return errorResponse('Method not allowed', 405);
  }

  const artifactSharedMatch = pathname.match(
    /^\/api\/v1\/artifacts\/shared\/([^/]+)$/,
  );
  if (artifactSharedMatch) {
    return handleArtifactShared(request, env, artifactSharedMatch[1]);
  }

  const artifactMatch = pathname.match(/^\/api\/v1\/artifacts\/([^/]+)$/);
  if (artifactMatch) {
    const artifactId = artifactMatch[1];
    if (request.method === 'GET') {
      return handleArtifactDetail(request, env, artifactId);
    }
    if (request.method === 'DELETE') {
      return handleArtifactDelete(request, env, artifactId);
    }
    return errorResponse('Method not allowed', 405);
  }

  const artifactShareMatch = pathname.match(
    /^\/api\/v1\/artifacts\/([^/]+)\/share$/,
  );
  if (artifactShareMatch) {
    return handleArtifactShare(request, env, artifactShareMatch[1]);
  }

  const artifactExportMatch = pathname.match(
    /^\/api\/v1\/artifacts\/([^/]+)\/export$/,
  );
  if (artifactExportMatch) {
    return handleArtifactExport(request, env, artifactExportMatch[1]);
  }

  if (pathname === '/api/v1/audit') {
    return handleAuditList(request, env);
  }

  if (pathname === '/api/v1/export') {
    return handleExportCreate(request, env);
  }

  if (pathname === '/api/v1/account/delete') {
    if (request.method === 'GET') {
      return handleAccountDeletePreview(request, env);
    }
    if (request.method === 'DELETE') {
      return handleAccountDelete(request, env);
    }
    return errorResponse('Method not allowed', 405);
  }

  if (pathname === '/api/v1/ops/status') {
    return handleOpsStatus(request, env);
  }

  if (pathname === '/api/v1/ops/metrics') {
    return handleOpsMetrics(request, env);
  }

  return errorResponse('Not found', 404);
}
