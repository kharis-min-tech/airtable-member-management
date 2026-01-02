/**
 * Admin-specific types for quick views
 * Requirements: 19.1-19.7
 */

import type { Member } from './index';

/**
 * Evangelism record with incomplete data
 * Requirements: 19.3
 */
export interface EvangelismRecord {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  date: Date;
  dataCompleteness: number;
  capturedBy?: string;
  capturedByName?: string;
}

/**
 * Visited member with last visited date
 * Requirements: 19.5
 */
export interface VisitedMember {
  member: Member;
  lastVisited: Date;
}

/**
 * Department roster with members
 * Requirements: 19.6
 */
export interface DepartmentRoster {
  departmentId: string;
  departmentName: string;
  members: Member[];
}

/**
 * Attendance by service grouped by department
 * Requirements: 19.7
 */
export interface AttendanceByDepartment {
  serviceId: string;
  serviceName: string;
  departments: {
    departmentId: string;
    departmentName: string;
    attendees: Member[];
  }[];
}

/**
 * Admin view type for navigation
 */
export type AdminViewType =
  | 'follow-ups-due'
  | 'new-first-timers'
  | 'incomplete-evangelism'
  | 'no-follow-up-owner'
  | 'visited-members'
  | 'department-lists'
  | 'attendance-by-service';

/**
 * Admin view configuration
 */
export interface AdminViewConfig {
  id: AdminViewType;
  label: string;
  description: string;
  icon?: string;
}
