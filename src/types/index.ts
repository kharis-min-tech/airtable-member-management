/**
 * Core type definitions for the Church Member Management Automation System
 */

// Member Status Types
export type MemberStatus = 'Member' | 'First Timer' | 'Returner' | 'Evangelism Contact';
export type MemberSource = 'First Timer Form' | 'Returner Form' | 'Evangelism' | 'Other';
export type FollowUpStatus = 'Not Started' | 'In Progress' | 'Contacted' | 'Visiting' | 'Integrated' | 'Established';

// Assignment Status Types
export type AssignmentStatus = 'Assigned' | 'In Progress' | 'Completed' | 'Reassigned';

// Source Form Types
export type SourceForm = 'First Timer' | 'Returner' | 'Evangelism' | 'Manual';

// Volunteer Role Types
export type VolunteerRole = 'Pastor' | 'Admin' | 'Follow-up' | 'Department Lead' | 'Evangelism';

// User Role Types (for authentication)
export type UserRole = 'pastor' | 'admin' | 'follow_up' | 'department_lead';

// Timeline Event Types
export type EventType =
  | 'evangelism'
  | 'first_timer'
  | 'attendance'
  | 'home_visit'
  | 'follow_up'
  | 'department_join'
  | 'program_session'
  | 'water_baptism'
  | 'membership_completed'
  | 'spiritual_maturity';

// Core Interfaces
export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email?: string;
  status: MemberStatus;
  source: MemberSource;
  dateFirstCaptured: Date;
  followUpOwner?: string;
  followUpStatus: FollowUpStatus;
}

export interface CreateMemberInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  ghanaPostCode?: string;
  status: MemberStatus;
  source: MemberSource;
  dateFirstCaptured: Date;
}

export interface UpdateMemberInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  ghanaPostCode?: string;
  status?: MemberStatus;
  followUpOwner?: string;
  followUpStatus?: FollowUpStatus;
  firstServiceAttended?: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  serviceId: string;
  present: boolean;
  groupTag?: string;
  sourceForm: SourceForm;
}

export interface FollowUpAssignment {
  id: string;
  memberId: string;
  assignedTo: string;
  assignedDate: Date;
  dueDate: Date;
  status: AssignmentStatus;
}

export interface Volunteer {
  id: string;
  name: string;
  role: VolunteerRole;
  phone: string;
  email?: string;
  active: boolean;
  capacity: number;
}

export interface CapacityInfo {
  volunteerId: string;
  volunteerName: string;
  capacity: number;
  currentAssignments: number;
  availableSlots: number;
  hasCapacity: boolean;
}

export interface TimelineEvent {
  date: Date;
  type: EventType;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface JourneySummary {
  firstEvangelised?: Date;
  firstVisited?: Date;
  firstAttended?: Date;
  lastAttended?: Date;
  visitsCount: number;
  assignedFollowUpPerson?: string;
}

export interface MemberJourney {
  member: Member;
  timeline: TimelineEvent[];
  summary: JourneySummary;
}

export interface ServiceKPIs {
  totalAttendance: number;
  firstTimersCount: number;
  returnersCount: number;
  departmentBreakdown: { department: string; count: number }[];
}

export interface AttendanceSummary {
  serviceId: string;
  departmentId: string;
  departmentName: string;
  presentCount: number;
  activeMemberCount: number;
  attendancePercentage: number;
}

export interface ServiceComparison {
  serviceA: { id: string; name: string };
  serviceB: { id: string; name: string };
  presentInAMissingInB: Member[];
  presentInBMissingInA: Member[];
}

// Airtable Record Interface
export interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

// User Context for Authentication
export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  volunteerId?: string;
  departmentIds?: string[];
}

// Configuration Interfaces
export interface AirtableConfig {
  baseId: string;
  apiKey: string;
  rateLimitPerSecond: number;
}

export interface ChurchConfig {
  churchId: string;
  churchName: string;
  airtableBaseId: string;
  airtableApiKey: string;
  defaultFollowUpDueDays: number;
  volunteerCapacityLimit: number;
  adminEmails: string[];
}

// Webhook Event Interfaces
export interface EvangelismEvent {
  recordId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  ghanaPostCode?: string;
  date: string; // ISO date string from Airtable
  capturedBy?: string; // Volunteer record ID
}

export interface EvangelismWebhookPayload {
  base: {
    id: string;
  };
  webhook: {
    id: string;
  };
  timestamp: string;
  record: {
    id: string;
    fields: {
      'First Name'?: string;
      'Last Name'?: string;
      'Phone'?: string;
      'Email'?: string;
      'GhanaPost Code'?: string;
      'Date'?: string;
      'Captured By'?: string[];
      'Linked Member'?: string[];
    };
  };
}

export interface EvangelismHandlerResult {
  success: boolean;
  memberId?: string;
  memberCreated: boolean;
  evangelismRecordLinked: boolean;
  followUpAssignmentId?: string;
  followUpAssignmentCreated: boolean;
  followUpOwnerUpdated: boolean;
  error?: string;
}
