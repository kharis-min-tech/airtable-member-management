import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AirtableClient, QueryService, CacheService, CACHE_KEYS, DEFAULT_TTL } from '../services';

/**
 * Handles dashboard and query requests from the frontend
 * Provides KPIs, attendance data, member journeys, and admin views
 * 
 * Requirements: 15.1-15.7, 16.1-16.6, 17.1-17.6, 18.1-18.7, 19.1-19.7
 */

// Initialize services
const airtableClient = new AirtableClient({
  baseId: process.env.AIRTABLE_BASE_ID || '',
  apiKey: process.env.AIRTABLE_API_KEY || '',
  rateLimitPerSecond: 5,
});

const queryService = new QueryService(airtableClient, {
  attendanceThreshold: parseInt(process.env.ATTENDANCE_THRESHOLD || '85', 10),
});

const cacheService = new CacheService(
  process.env.CACHE_TABLE_NAME || 'ChurchCache'
);

function successResponse(data: unknown): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  };
}

function errorResponse(statusCode: number, message: string, details?: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString(),
    }),
  };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const path = event.path;
    const queryParams = event.queryStringParameters || {};
    const forceRefresh = queryParams.refresh === 'true';

    if (path.includes('/dashboard/kpis')) {
      return await handleServiceKPIs(queryParams, forceRefresh);
    }
    if (path.includes('/dashboard/evangelism')) {
      return await handleEvangelismStats(queryParams, forceRefresh);
    }
    if (path.includes('/dashboard/follow-up-summary')) {
      return await handleFollowUpSummary(forceRefresh);
    }
    if (path.includes('/dashboard/follow-up-comments')) {
      return await handleFollowUpComments(queryParams);
    }
    if (path.includes('/attendance/breakdown')) {
      return await handleAttendanceBreakdown(queryParams, forceRefresh);
    }
    if (path.includes('/attendance/department')) {
      return await handleDepartmentAttendance(queryParams, forceRefresh);
    }
    if (path.includes('/attendance/compare')) {
      return await handleServiceComparison(queryParams, forceRefresh);
    }
    if (path.includes('/member/journey')) {
      return await handleMemberJourney(queryParams, forceRefresh);
    }
    if (path.includes('/member/search')) {
      return await handleMemberSearch(queryParams);
    }
    if (path.includes('/admin/todays-followups')) {
      return await handleTodaysFollowUps(forceRefresh);
    }
    if (path.includes('/admin/new-first-timers')) {
      return await handleNewFirstTimers(queryParams, forceRefresh);
    }
    if (path.includes('/admin/incomplete-evangelism')) {
      return await handleIncompleteEvangelism(forceRefresh);
    }
    if (path.includes('/admin/unassigned-members')) {
      return await handleUnassignedMembers(forceRefresh);
    }
    if (path.includes('/admin/visited-members')) {
      return await handleVisitedMembers(forceRefresh);
    }
    if (path.includes('/admin/department-rosters')) {
      return await handleDepartmentRosters(forceRefresh);
    }
    if (path.includes('/admin/attendance-by-department')) {
      return await handleAttendanceByDepartment(queryParams, forceRefresh);
    }

    return errorResponse(404, 'Route not found', { path });
  } catch (error) {
    console.error('Error processing query:', error);
    return errorResponse(500, 'Internal server error', error instanceof Error ? error.message : 'Unknown error');
  }
};


type QueryParams = Record<string, string | undefined>;

async function handleServiceKPIs(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const serviceId = params.serviceId;
  if (!serviceId) return errorResponse(400, 'serviceId is required');

  const cacheKey = CACHE_KEYS.SERVICE_KPIS(serviceId);
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata<Record<string, unknown>>(cacheKey);
    if (cached) return successResponse({ ...cached.data, cached: true, cachedAt: cached.lastUpdated });
  }

  const data = await queryService.getServiceKPIs(serviceId);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse({ ...data, cached: false });
}

async function handleEvangelismStats(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const period = (params.period as 'week' | 'month') || 'week';
  const cacheKey = CACHE_KEYS.EVANGELISM_STATS(period);

  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata<Record<string, unknown>>(cacheKey);
    if (cached) return successResponse({ ...cached.data, cached: true, cachedAt: cached.lastUpdated });
  }

  const data = await queryService.getEvangelismStats(period);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse({ ...data, cached: false });
}

async function handleFollowUpSummary(forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const cacheKey = 'follow-up:summary';
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata<Record<string, unknown>>(cacheKey);
    if (cached) return successResponse({ ...cached.data, cached: true, cachedAt: cached.lastUpdated });
  }

  const data = await queryService.getFollowUpSummary();
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse({ ...data, cached: false });
}

async function handleFollowUpComments(params: QueryParams): Promise<APIGatewayProxyResult> {
  const startDate = params.startDate ? new Date(params.startDate) : undefined;
  const endDate = params.endDate ? new Date(params.endDate) : undefined;
  const data = await queryService.getFollowUpComments(startDate, endDate);
  return successResponse(data);
}

async function handleAttendanceBreakdown(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const serviceId = params.serviceId;
  if (!serviceId) return errorResponse(400, 'serviceId is required');

  const cacheKey = `attendance:breakdown:${serviceId}`;
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata<Record<string, unknown>>(cacheKey);
    if (cached) return successResponse({ ...cached.data, cached: true, cachedAt: cached.lastUpdated });
  }

  const data = await queryService.getServiceAttendanceBreakdown(serviceId);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse({ ...data, cached: false });
}

async function handleDepartmentAttendance(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const serviceId = params.serviceId;
  if (!serviceId) return errorResponse(400, 'serviceId is required');

  const cacheKey = `attendance:department:${serviceId}`;
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse({ data: cached.data, cached: true, cachedAt: cached.lastUpdated });
  }

  const data = await queryService.getDepartmentAttendance(serviceId);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse({ data, cached: false });
}

async function handleServiceComparison(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const serviceAId = params.serviceA;
  const serviceBId = params.serviceB;
  if (!serviceAId || !serviceBId) return errorResponse(400, 'Both serviceA and serviceB are required');

  const cacheKey = `attendance:compare:${serviceAId}:${serviceBId}`;
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata<Record<string, unknown>>(cacheKey);
    if (cached) return successResponse({ ...cached.data, cached: true, cachedAt: cached.lastUpdated });
  }

  const data = await queryService.compareTwoServices(serviceAId, serviceBId);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse({ ...data, cached: false });
}

async function handleMemberJourney(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const memberId = params.memberId;
  if (!memberId) return errorResponse(400, 'memberId is required');

  const cacheKey = CACHE_KEYS.MEMBER_JOURNEY(memberId);
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata<Record<string, unknown>>(cacheKey);
    if (cached) return successResponse({ ...cached.data, cached: true, cachedAt: cached.lastUpdated });
  }

  const data = await queryService.getMemberJourney(memberId);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse({ ...data, cached: false });
}

async function handleMemberSearch(params: QueryParams): Promise<APIGatewayProxyResult> {
  const query = params.q || params.query;
  if (!query) return errorResponse(400, 'Search query (q or query) is required');
  const data = await queryService.searchMembers(query);
  return successResponse(data);
}

async function handleTodaysFollowUps(forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const cacheKey = 'admin:todays-followups';
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse({ data: cached.data, cached: true, cachedAt: cached.lastUpdated });
  }

  const data = await queryService.getTodaysFollowUps();
  await cacheService.set(cacheKey, data, 300);
  return successResponse({ data, cached: false });
}

async function handleNewFirstTimers(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const days = parseInt(params.days || '30', 10);
  const cacheKey = `admin:new-first-timers:${days}`;

  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse({ data: cached.data, cached: true, cachedAt: cached.lastUpdated });
  }

  const data = await queryService.getNewFirstTimers(days);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse({ data, cached: false });
}

async function handleIncompleteEvangelism(forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const cacheKey = 'admin:incomplete-evangelism';
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse({ data: cached.data, cached: true, cachedAt: cached.lastUpdated });
  }

  const data = await queryService.getIncompleteEvangelismRecords();
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse({ data, cached: false });
}

async function handleUnassignedMembers(forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const cacheKey = 'admin:unassigned-members';
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse({ data: cached.data, cached: true, cachedAt: cached.lastUpdated });
  }

  const data = await queryService.getUnassignedMembers();
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse({ data, cached: false });
}

async function handleVisitedMembers(forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const cacheKey = 'admin:visited-members';
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse({ data: cached.data, cached: true, cachedAt: cached.lastUpdated });
  }

  const data = await queryService.getVisitedMembers();
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse({ data, cached: false });
}

async function handleDepartmentRosters(forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const cacheKey = 'admin:department-rosters';
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse({ data: cached.data, cached: true, cachedAt: cached.lastUpdated });
  }

  const data = await queryService.getDepartmentRosters();
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse({ data, cached: false });
}

async function handleAttendanceByDepartment(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const serviceId = params.serviceId;
  if (!serviceId) return errorResponse(400, 'serviceId is required');

  const cacheKey = `admin:attendance-by-dept:${serviceId}`;
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata<Record<string, unknown>>(cacheKey);
    if (cached) return successResponse({ ...cached.data, cached: true, cachedAt: cached.lastUpdated });
  }

  const data = await queryService.getAttendanceByServiceGroupedByDepartment(serviceId);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse({ ...data, cached: false });
}
