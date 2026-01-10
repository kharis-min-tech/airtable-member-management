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
    const type = queryParams.type;

    // Route based on path and type parameter
    if (path.includes('/query/dashboard') || path.includes('/dashboard')) {
      if (type === 'kpis' || path.includes('/kpis')) {
        return await handleServiceKPIs(queryParams, forceRefresh);
      }
      if (type === 'evangelism' || path.includes('/evangelism')) {
        return await handleEvangelismStats(queryParams, forceRefresh);
      }
      if (type === 'follow-up-summary' || path.includes('/follow-up-summary')) {
        return await handleFollowUpSummary(forceRefresh);
      }
      if (type === 'follow-up-comments' || path.includes('/follow-up-comments')) {
        return await handleFollowUpComments(queryParams);
      }
      if (type === 'services' || type === 'service') {
        return await handleServices(queryParams, forceRefresh);
      }
      // Default dashboard - return services list
      return await handleServices(queryParams, forceRefresh);
    }

    if (path.includes('/query/attendance') || path.includes('/attendance')) {
      if (type === 'breakdown' || path.includes('/breakdown')) {
        return await handleAttendanceBreakdown(queryParams, forceRefresh);
      }
      if (type === 'departments' || path.includes('/department')) {
        return await handleDepartmentAttendance(queryParams, forceRefresh);
      }
      if (type === 'compare' || path.includes('/compare')) {
        return await handleServiceComparison(queryParams, forceRefresh);
      }
      if (type === 'attendees') {
        return await handleServiceAttendees(queryParams, forceRefresh);
      }
      if (type === 'attendees-by-category') {
        return await handleAttendeesByCategory(queryParams, forceRefresh);
      }
      // Default - return breakdown
      return await handleAttendanceBreakdown(queryParams, forceRefresh);
    }

    if (path.includes('/query/members') || path.includes('/member')) {
      if (type === 'search' || path.includes('/search')) {
        return await handleMemberSearch(queryParams);
      }
      if (type === 'byId' && queryParams.memberId) {
        return await handleMemberById(queryParams, forceRefresh);
      }
      // Default - search
      return await handleMemberSearch(queryParams);
    }

    if (path.includes('/query/journey') || path.includes('/journey')) {
      return await handleMemberJourney(queryParams, forceRefresh);
    }

    if (path.includes('/query/follow-up') || path.includes('/follow-up')) {
      if (type === 'due-today' || path.includes('/due-today')) {
        return await handleTodaysFollowUps(forceRefresh);
      }
      if (type === 'by-volunteer' || path.includes('/volunteer')) {
        return await handleFollowUpByVolunteer(queryParams, forceRefresh);
      }
      if (type === 'unassigned' || path.includes('/unassigned')) {
        return await handleUnassignedMembers(forceRefresh);
      }
      if (type === 'souls-by-volunteer' || path.includes('/souls-by-volunteer')) {
        return await handleSoulsByVolunteer(forceRefresh);
      }
      if (type === 'interactions' || path.includes('/interactions')) {
        return await handleFollowUpComments(queryParams);
      }
      // Default
      return await handleFollowUpSummary(forceRefresh);
    }

    if (path.includes('/query/admin') || path.includes('/admin')) {
      if (type === 'todays-followups' || path.includes('/todays-followups')) {
        return await handleTodaysFollowUps(forceRefresh);
      }
      if (type === 'new-first-timers' || path.includes('/new-first-timers')) {
        return await handleNewFirstTimers(queryParams, forceRefresh);
      }
      if (type === 'incomplete-evangelism' || path.includes('/incomplete-evangelism')) {
        return await handleIncompleteEvangelism(forceRefresh);
      }
      if (type === 'unassigned-members' || path.includes('/unassigned-members')) {
        return await handleUnassignedMembers(forceRefresh);
      }
      if (type === 'visited-members' || path.includes('/visited-members')) {
        return await handleVisitedMembers(forceRefresh);
      }
      if (type === 'department-rosters' || path.includes('/department-rosters')) {
        return await handleDepartmentRosters(forceRefresh);
      }
      if (type === 'department-roster' && queryParams.departmentId) {
        return await handleDepartmentRoster(queryParams, forceRefresh);
      }
      if (type === 'attendance-by-department' || path.includes('/attendance-by-department')) {
        return await handleAttendanceByDepartment(queryParams, forceRefresh);
      }
      // Default
      return await handleTodaysFollowUps(forceRefresh);
    }

    return errorResponse(404, 'Route not found', { path, type });
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
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getServiceKPIs(serviceId);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleEvangelismStats(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const period = (params.period as 'week' | 'month') || 'week';
  const cacheKey = CACHE_KEYS.EVANGELISM_STATS(period);

  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata<Record<string, unknown>>(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getEvangelismStats(period);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleFollowUpSummary(forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const cacheKey = 'follow-up:summary';
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata<Record<string, unknown>>(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getFollowUpSummary();
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
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
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getServiceAttendanceBreakdown(serviceId);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleDepartmentAttendance(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const serviceId = params.serviceId;
  if (!serviceId) return errorResponse(400, 'serviceId is required');

  const cacheKey = `attendance:department:${serviceId}`;
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getDepartmentAttendance(serviceId);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleServiceComparison(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const serviceAId = params.serviceA;
  const serviceBId = params.serviceB;
  if (!serviceAId || !serviceBId) return errorResponse(400, 'Both serviceA and serviceB are required');

  const cacheKey = `attendance:compare:${serviceAId}:${serviceBId}`;
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata<Record<string, unknown>>(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.compareTwoServices(serviceAId, serviceBId);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleMemberJourney(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const memberId = params.memberId;
  if (!memberId) return errorResponse(400, 'memberId is required');

  const cacheKey = CACHE_KEYS.MEMBER_JOURNEY(memberId);
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata<Record<string, unknown>>(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  try {
    const data = await queryService.getMemberJourney(memberId);
    await cacheService.set(cacheKey, data, DEFAULT_TTL);
    return successResponse(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[handleMemberJourney] Error fetching journey for ${memberId}:`, errorMessage);
    
    // Return appropriate status codes based on error type
    if (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND')) {
      return errorResponse(404, 'Member not found', errorMessage);
    }
    if (errorMessage.includes('permission') || errorMessage.includes('INVALID_PERMISSIONS') || errorMessage.includes('Authentication')) {
      return errorResponse(403, 'Access denied', errorMessage);
    }
    return errorResponse(500, 'Failed to load member journey', errorMessage);
  }
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
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getTodaysFollowUps();
  await cacheService.set(cacheKey, data, 300);
  return successResponse(data);
}

async function handleNewFirstTimers(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const days = parseInt(params.days || '30', 10);
  const cacheKey = `admin:new-first-timers:${days}`;

  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getNewFirstTimers(days);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleIncompleteEvangelism(forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const cacheKey = 'admin:incomplete-evangelism';
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getIncompleteEvangelismRecords();
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleUnassignedMembers(forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const cacheKey = 'admin:unassigned-members';
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getUnassignedMembers();
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleVisitedMembers(forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const cacheKey = 'admin:visited-members';
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getVisitedMembers();
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleDepartmentRosters(forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const cacheKey = 'admin:department-rosters';
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getDepartmentRosters();
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleAttendanceByDepartment(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const serviceId = params.serviceId;
  if (!serviceId) return errorResponse(400, 'serviceId is required');

  const cacheKey = `admin:attendance-by-dept:${serviceId}`;
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata<Record<string, unknown>>(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getAttendanceByServiceGroupedByDepartment(serviceId);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleServices(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const serviceId = params.serviceId;
  const limit = parseInt(params.limit || '10', 10);
  
  if (serviceId) {
    const cacheKey = `services:${serviceId}`;
    if (!forceRefresh) {
      const cached = await cacheService.getWithMetadata(cacheKey);
      if (cached) return successResponse(cached.data);
    }
    const data = await queryService.getServiceById(serviceId);
    await cacheService.set(cacheKey, data, DEFAULT_TTL);
    return successResponse(data);
  }

  const cacheKey = `services:recent:${limit}`;
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse(cached.data);
  }
  const data = await queryService.getRecentServices(limit);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleServiceAttendees(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const serviceId = params.serviceId;
  if (!serviceId) return errorResponse(400, 'serviceId is required');

  const cacheKey = `attendance:attendees:${serviceId}`;
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getServiceAttendees(serviceId);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleAttendeesByCategory(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const serviceId = params.serviceId;
  const category = params.category as 'firstTimers' | 'returners' | 'evangelismContacts' | 'department';
  const departmentId = params.departmentId;

  if (!serviceId) return errorResponse(400, 'serviceId is required');
  if (!category) return errorResponse(400, 'category is required');

  const cacheKey = `attendance:by-category:${serviceId}:${category}:${departmentId || 'all'}`;
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  try {
    const data = await queryService.getAttendeesByCategory(serviceId, category, departmentId);
    await cacheService.set(cacheKey, data, DEFAULT_TTL);
    return successResponse(data);
  } catch (error) {
    console.error('Error fetching attendees by category:', error);
    return errorResponse(500, 'Failed to fetch attendees', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function handleMemberById(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const memberId = params.memberId;
  if (!memberId) return errorResponse(400, 'memberId is required');

  const cacheKey = `member:${memberId}`;
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getMemberById(memberId);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleFollowUpByVolunteer(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const volunteerId = params.volunteerId;
  if (!volunteerId) return errorResponse(400, 'volunteerId is required');

  const cacheKey = `follow-up:volunteer:${volunteerId}`;
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getFollowUpsByVolunteer(volunteerId);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleSoulsByVolunteer(forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const cacheKey = 'follow-up:souls-by-volunteer';
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getSoulsAssignedByVolunteer();
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}

async function handleDepartmentRoster(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const departmentId = params.departmentId;
  if (!departmentId) return errorResponse(400, 'departmentId is required');

  const cacheKey = `admin:department-roster:${departmentId}`;
  if (!forceRefresh) {
    const cached = await cacheService.getWithMetadata(cacheKey);
    if (cached) return successResponse(cached.data);
  }

  const data = await queryService.getDepartmentRoster(departmentId);
  await cacheService.set(cacheKey, data, DEFAULT_TTL);
  return successResponse(data);
}
