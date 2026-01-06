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
  SoulsAssignedByVolunteer,
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
     * Get follow-up summary grouped by volunteer
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
     * Get all services
     */
    getAll: () => apiClient.get<Service[]>('/query/dashboard?type=services'),

    /**
     * Get recent services
     */
    getRecent: (limit: number = 10) =>
      apiClient.get<Service[]>(`/query/dashboard?type=services&limit=${limit}`),

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
     * Get follow-ups by volunteer
     */
    getByVolunteer: (volunteerId: string) =>
      apiClient.get<FollowUpAssignment[]>(`/query/follow-up?type=by-volunteer&volunteerId=${volunteerId}`),

    /**
     * Get unassigned members
     */
    getUnassigned: () =>
      apiClient.get<Member[]>('/query/follow-up?type=unassigned'),

    /**
     * Get souls assigned grouped by volunteer
     */
    getSoulsAssignedByVolunteer: () =>
      apiClient.get<SoulsAssignedByVolunteer[]>('/query/follow-up?type=souls-by-volunteer'),

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
