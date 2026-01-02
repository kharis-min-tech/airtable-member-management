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
      apiClient.get<ServiceKPIs>(`/dashboard/kpis/${serviceId}`),

    /**
     * Get evangelism statistics for a period
     */
    getEvangelismStats: (period: 'week' | 'month') =>
      apiClient.get<EvangelismStats>(`/dashboard/evangelism?period=${period}`),

    /**
     * Get follow-up summary grouped by volunteer
     */
    getFollowUpSummary: () =>
      apiClient.get<FollowUpSummary[]>('/dashboard/follow-up-summary'),
  },

  // Attendance endpoints
  attendance: {
    /**
     * Get attendance breakdown for a service
     */
    getServiceAttendance: (serviceId: string) =>
      apiClient.get<AttendanceBreakdown>(`/attendance/service/${serviceId}`),

    /**
     * Get attendees list for a service
     */
    getServiceAttendees: (serviceId: string) =>
      apiClient.get<ServiceAttendee[]>(`/attendance/service/${serviceId}/attendees`),

    /**
     * Get department attendance for a service
     */
    getDepartmentAttendance: (serviceId: string) =>
      apiClient.get<DepartmentAttendance[]>(`/attendance/service/${serviceId}/departments`),

    /**
     * Compare attendance between two services
     */
    compareServices: (serviceAId: string, serviceBId: string) =>
      apiClient.get<ServiceComparison>(
        `/attendance/compare?serviceA=${serviceAId}&serviceB=${serviceBId}`
      ),
  },

  // Member endpoints
  members: {
    /**
     * Search members by name, phone, or email
     */
    search: (query: string) =>
      apiClient.get<Member[]>(`/members/search?q=${encodeURIComponent(query)}`),

    /**
     * Get member journey timeline
     */
    getJourney: (memberId: string) =>
      apiClient.get<MemberJourney>(`/members/${memberId}/journey`),

    /**
     * Get member by ID
     */
    getById: (memberId: string) =>
      apiClient.get<Member>(`/members/${memberId}`),
  },

  // Service endpoints
  services: {
    /**
     * Get all services
     */
    getAll: () => apiClient.get<Service[]>('/services'),

    /**
     * Get recent services
     */
    getRecent: (limit: number = 10) =>
      apiClient.get<Service[]>(`/services/recent?limit=${limit}`),

    /**
     * Get service by ID
     */
    getById: (serviceId: string) =>
      apiClient.get<Service>(`/services/${serviceId}`),
  },

  // Follow-up endpoints
  followUp: {
    /**
     * Get today's due follow-ups
     */
    getTodaysDue: () =>
      apiClient.get<FollowUpAssignment[]>('/follow-up/due-today'),

    /**
     * Get follow-ups by volunteer
     */
    getByVolunteer: (volunteerId: string) =>
      apiClient.get<FollowUpAssignment[]>(`/follow-up/volunteer/${volunteerId}`),

    /**
     * Get unassigned members
     */
    getUnassigned: () =>
      apiClient.get<Member[]>('/follow-up/unassigned'),

    /**
     * Get souls assigned grouped by volunteer
     */
    getSoulsAssignedByVolunteer: () =>
      apiClient.get<SoulsAssignedByVolunteer[]>('/follow-up/souls-by-volunteer'),

    /**
     * Get follow-up interactions with date filter
     */
    getInteractions: (startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const queryString = params.toString();
      return apiClient.get<FollowUpInteraction[]>(
        `/follow-up/interactions${queryString ? `?${queryString}` : ''}`
      );
    },
  },

  // Admin endpoints
  admin: {
    /**
     * Get today's follow-ups due
     * Requirements: 19.1
     */
    getTodaysFollowUps: () =>
      apiClient.get<FollowUpAssignment[]>('/admin/todays-followups'),

    /**
     * Get new first timers (last N days)
     * Requirements: 19.2
     */
    getNewFirstTimers: (days: number = 30) =>
      apiClient.get<Member[]>(`/admin/new-first-timers?days=${days}`),

    /**
     * Get incomplete evangelism records
     * Requirements: 19.3
     */
    getIncompleteEvangelism: () =>
      apiClient.get<EvangelismRecord[]>('/admin/incomplete-evangelism'),

    /**
     * Get members without follow-up owner
     * Requirements: 19.4
     */
    getUnassignedMembers: () =>
      apiClient.get<Member[]>('/admin/unassigned-members'),

    /**
     * Get visited members with last visited date
     * Requirements: 19.5
     */
    getVisitedMembers: () =>
      apiClient.get<VisitedMember[]>('/admin/visited-members'),

    /**
     * Get all department rosters
     * Requirements: 19.6
     */
    getDepartmentRosters: () =>
      apiClient.get<DepartmentRoster[]>('/admin/department-rosters'),

    /**
     * Get department roster by ID
     * Requirements: 19.6
     */
    getDepartmentRoster: (departmentId: string) =>
      apiClient.get<Member[]>(`/admin/departments/${departmentId}/roster`),

    /**
     * Get attendance by service grouped by department
     * Requirements: 19.7
     */
    getAttendanceByDepartment: (serviceId: string) =>
      apiClient.get<AttendanceByDepartment>(`/admin/attendance-by-department?serviceId=${serviceId}`),
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
