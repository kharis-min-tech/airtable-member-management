import { apiClient } from './api-client';
import type {
  ServiceKPIs,
  EvangelismStats,
  FollowUpSummary,
  AttendanceBreakdown,
  DepartmentAttendance,
  ServiceAttendee,
  MemberJourney,
  Member,
  Service,
  ServiceComparison,
  FollowUpAssignment,
  FollowUpInteraction,
  SoulsAssignedByMember,
  EvangelismRecord,
  VisitedMember,
  DepartmentRoster,
  AttendanceByDepartment,
} from '../types';

/**
 * Church API service with typed methods for all backend endpoints.
 * Uses the base apiClient for HTTP requests with caching and retry logic.
 */
export const churchApi = {
  // Dashboard endpoints
  dashboard: {
    /**
     * Get KPIs for a specific service
     */
    getServiceKPIs: (serviceId: string) =>
      apiClient.get<ServiceKPIs>(`/query/dashboard?type=kpis&serviceId=${serviceId}`),

    /**
     * Get evangelism statistics for a period
     */
    getEvangelismStats: (period: 'week' | 'month') =>
      apiClient.get<EvangelismStats>(`/query/dashboard?type=evangelism&period=${period}`),

    /**
     * Get follow-up summary grouped by member
     */
    getFollowUpSummary: () =>
      apiClient.get<FollowUpSummary[]>('/query/dashboard?type=follow-up-summary'),
  },

  // Attendance endpoints
  attendance: {
    /**
     * Get attendance breakdown for a service
     */
    getServiceAttendance: (serviceId: string) =>
      apiClient.get<AttendanceBreakdown>(`/query/attendance?type=breakdown&serviceId=${serviceId}`),

    /**
     * Get attendees list for a service
     */
    getServiceAttendees: (serviceId: string) =>
      apiClient.get<ServiceAttendee[]>(`/query/attendance?type=attendees&serviceId=${serviceId}`),

    /**
     * Get department attendance for a service
     */
    getDepartmentAttendance: (serviceId: string) =>
      apiClient.get<DepartmentAttendance[]>(`/query/attendance?type=departments&serviceId=${serviceId}`),

    /**
     * Compare attendance between two services
     */
    compareServices: (serviceAId: string, serviceBId: string) =>
      apiClient.get<ServiceComparison>(
        `/query/attendance?type=compare&serviceA=${serviceAId}&serviceB=${serviceBId}`
      ),

    /**
     * Get attendees by category for drill-down view
     * Requirements: 3.2, 3.3
     * @param serviceId - The service ID to get attendees for
     * @param category - The attendance category (firstTimers, returners, members, evangelismContacts, visitors, department)
     * @param departmentId - Optional department ID when category is 'department'
     */
    getAttendeesByCategory: (
      serviceId: string, 
      category: 'firstTimers' | 'returners' | 'members' | 'children' | 'evangelismContacts' | 'visitors' | 'department',
      departmentId?: string
    ) => {
      const params = new URLSearchParams({
        type: 'attendees-by-category',
        serviceId,
        category,
      });
      if (departmentId) {
        params.append('departmentId', departmentId);
      }
      return apiClient.get<{ id: string; fullName: string; phone?: string; email?: string; status: string }[]>(
        `/query/attendance?${params.toString()}`
      );
    },
  },

  // Member endpoints
  members: {
    /**
     * Search members by name, phone, or email
     */
    search: (query: string) =>
      apiClient.get<Member[]>(`/query/members?type=search&q=${encodeURIComponent(query)}`),

    /**
     * Get member journey timeline
     */
    getJourney: (memberId: string) =>
      apiClient.get<MemberJourney>(`/query/journey?memberId=${memberId}`),

    /**
     * Get member by ID
     */
    getById: (memberId: string) =>
      apiClient.get<Member>(`/query/members?type=byId&memberId=${memberId}`),
  },

  // Service endpoints
  services: {
    /**
     * Get all services without limit
     * Returns all services sorted by date descending
     * Requirements: 2.1
     */
    getAll: () => apiClient.get<Service[]>('/query/dashboard?type=services'),

    /**
     * Get recent services with optional limit
     * If limit is undefined, returns all services
     * Requirements: 2.1, 2.2
     */
    getRecent: (limit?: number) => {
      const params = new URLSearchParams({ type: 'services' });
      if (limit !== undefined) {
        params.append('limit', limit.toString());
      }
      return apiClient.get<Service[]>(`/query/dashboard?${params.toString()}`);
    },

    /**
     * Get services within a date range
     * Requirements: 2.3
     * @param startDate - Start date of the range (inclusive)
     * @param endDate - End date of the range (inclusive)
     */
    getByDateRange: (startDate: string, endDate: string) => {
      const params = new URLSearchParams({
        type: 'services',
        startDate,
        endDate,
      });
      return apiClient.get<Service[]>(`/query/dashboard?${params.toString()}`);
    },

    /**
     * Search services by name or date
     * Requirements: 2.4
     * @param query - Search query string (case-insensitive)
     */
    search: (query: string) => {
      const params = new URLSearchParams({
        type: 'services',
        search: query,
      });
      return apiClient.get<Service[]>(`/query/dashboard?${params.toString()}`);
    },

    /**
     * Get service by ID
     */
    getById: (serviceId: string) =>
      apiClient.get<Service>(`/query/dashboard?type=service&serviceId=${serviceId}`),
  },

  // Follow-up endpoints
  followUp: {
    /**
     * Get today's due follow-ups
     */
    getTodaysDue: () =>
      apiClient.get<FollowUpAssignment[]>('/query/follow-up?type=due-today'),

    /**
     * Get follow-ups by member
     */
    getByMember: (memberId: string) =>
      apiClient.get<FollowUpAssignment[]>(`/query/follow-up?type=by-member&memberId=${memberId}`),

    /**
     * Get unassigned members
     */
    getUnassigned: () =>
      apiClient.get<Member[]>('/query/follow-up?type=unassigned'),

    /**
     * Get souls assigned grouped by member
     */
    getSoulsAssignedByMember: () =>
      apiClient.get<SoulsAssignedByMember[]>('/query/follow-up?type=souls-by-member'),

    /**
     * Get follow-up interactions with date filter
     */
    getInteractions: (startDate?: string, endDate?: string) => {
      const params = new URLSearchParams({ type: 'interactions' });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      return apiClient.get<FollowUpInteraction[]>(`/query/follow-up?${params.toString()}`);
    },
  },

  // Admin endpoints
  admin: {
    /**
     * Get today's follow-ups due
     * Requirements: 19.1
     */
    getTodaysFollowUps: () =>
      apiClient.get<FollowUpAssignment[]>('/query/admin?type=todays-followups'),

    /**
     * Get new first timers (last N days)
     * Requirements: 19.2
     */
    getNewFirstTimers: (days: number = 30) =>
      apiClient.get<Member[]>(`/query/admin?type=new-first-timers&days=${days}`),

    /**
     * Get incomplete evangelism records
     * Requirements: 19.3
     */
    getIncompleteEvangelism: () =>
      apiClient.get<EvangelismRecord[]>('/query/admin?type=incomplete-evangelism'),

    /**
     * Get members without follow-up owner
     * Requirements: 19.4
     */
    getUnassignedMembers: () =>
      apiClient.get<Member[]>('/query/admin?type=unassigned-members'),

    /**
     * Get visited members with last visited date
     * Requirements: 19.5
     */
    getVisitedMembers: () =>
      apiClient.get<VisitedMember[]>('/query/admin?type=visited-members'),

    /**
     * Get all department rosters
     * Requirements: 19.6
     */
    getDepartmentRosters: () =>
      apiClient.get<DepartmentRoster[]>('/query/admin?type=department-rosters'),

    /**
     * Get department roster by ID
     * Requirements: 19.6
     */
    getDepartmentRoster: (departmentId: string) =>
      apiClient.get<Member[]>(`/query/admin?type=department-roster&departmentId=${departmentId}`),

    /**
     * Get attendance by service grouped by department
     * Requirements: 19.7
     */
    getAttendanceByDepartment: (serviceId: string) =>
      apiClient.get<AttendanceByDepartment>(`/query/admin?type=attendance-by-department&serviceId=${serviceId}`),
  },

  // Cache control
  cache: {
    /**
     * Force refresh all cached data
     */
    refreshAll: () => {
      apiClient.clearCache();
    },

    /**
     * Refresh specific endpoint
     */
    refresh: <T>(endpoint: string) => apiClient.refresh<T>(endpoint),

    /**
     * Get last update timestamp for an endpoint
     */
    getLastUpdated: (endpoint: string) => apiClient.getCacheTimestamp(endpoint),
  },
};

export default churchApi;


/**
 * Parallel Dashboard Loading Helper
 * Loads all dashboard data in parallel using Promise.allSettled() for resilience
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export interface DashboardData {
  services: Service[];
  serviceKPIs: ServiceKPIs | null;
  evangelismStats: EvangelismStats | null;
  soulsAssigned: SoulsAssignedByMember[];
  followUpInteractions: FollowUpInteraction[];
  errors: {
    services?: string;
    serviceKPIs?: string;
    evangelismStats?: string;
    soulsAssigned?: string;
    followUpInteractions?: string;
  };
}

export const loadDashboardDataParallel = async (
  serviceId?: string,
  period: 'week' | 'month' = 'week'
): Promise<DashboardData> => {
  // Execute all API calls in parallel using Promise.allSettled()
  const [
    servicesResult,
    kpisResult,
    evangelismResult,
    soulsResult,
    followUpsResult
  ] = await Promise.allSettled([
    churchApi.services.getAll(),
    serviceId ? churchApi.dashboard.getServiceKPIs(serviceId) : Promise.resolve(null),
    churchApi.dashboard.getEvangelismStats(period),
    churchApi.followUp.getSoulsAssignedByMember(),
    churchApi.followUp.getInteractions()
  ]);

  // Extract successful results and capture errors
  const result: DashboardData = {
    services: [],
    serviceKPIs: null,
    evangelismStats: null,
    soulsAssigned: [],
    followUpInteractions: [],
    errors: {}
  };

  // Process services result
  if (servicesResult.status === 'fulfilled') {
    result.services = servicesResult.value.data;
  } else {
    result.errors.services = servicesResult.reason?.message || 'Failed to load services';
    console.error('Failed to load services:', servicesResult.reason);
  }

  // Process service KPIs result
  if (kpisResult.status === 'fulfilled' && kpisResult.value !== null) {
    result.serviceKPIs = kpisResult.value.data;
  } else if (kpisResult.status === 'rejected') {
    result.errors.serviceKPIs = kpisResult.reason?.message || 'Failed to load service KPIs';
    console.error('Failed to load service KPIs:', kpisResult.reason);
  }

  // Process evangelism stats result
  if (evangelismResult.status === 'fulfilled') {
    result.evangelismStats = evangelismResult.value.data;
  } else {
    result.errors.evangelismStats = evangelismResult.reason?.message || 'Failed to load evangelism stats';
    console.error('Failed to load evangelism stats:', evangelismResult.reason);
  }

  // Process souls assigned result
  if (soulsResult.status === 'fulfilled') {
    result.soulsAssigned = soulsResult.value.data;
  } else {
    result.errors.soulsAssigned = soulsResult.reason?.message || 'Failed to load souls assigned';
    console.error('Failed to load souls assigned:', soulsResult.reason);
  }

  // Process follow-up interactions result
  if (followUpsResult.status === 'fulfilled') {
    result.followUpInteractions = followUpsResult.value.data;
  } else {
    result.errors.followUpInteractions = followUpsResult.reason?.message || 'Failed to load follow-up interactions';
    console.error('Failed to load follow-up interactions:', followUpsResult.reason);
  }

  return result;
};
