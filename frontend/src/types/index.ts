// User and Authentication Types
export type UserRole = 'pastor' | 'admin' | 'follow_up' | 'department_lead';

export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  volunteerId?: string;
  departmentIds?: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserContext | null;
  error: string | null;
}

// Member Types
export type MemberStatus = 'Member' | 'First Timer' | 'Returner' | 'Evangelism Contact';
export type MemberSource = 'First Timer Form' | 'Returner Form' | 'Evangelism' | 'Other';
export type FollowUpStatus = 'Not Started' | 'In Progress' | 'Contacted' | 'Visiting' | 'Integrated' | 'Established';

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  email?: string;
  address?: string;
  ghanaPostCode?: string;
  gender?: 'Male' | 'Female';
  dob?: Date;
  status: MemberStatus;
  source: MemberSource;
  dateFirstCaptured: Date;
  firstServiceAttended?: string;
  lastServiceAttended?: Date;
  visitsCount?: number;
  visited?: boolean;
  lastVisited?: Date;
  followUpOwner?: string;
  followUpOwnerName?: string;
  followUpStatus: FollowUpStatus;
  membershipCompleted?: Date;
  spiritualMaturityCompleted?: Date;
  waterBaptized?: boolean;
  waterBaptismDate?: Date;
  holySpritBaptism?: boolean;
  departments?: string[];
  notes?: string;
}

// Service and Attendance Types
export interface Service {
  id: string;
  serviceName: string;
  serviceDate: Date;
  serviceCode: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  serviceId: string;
  present: boolean;
  groupTag?: string;
  sourceForm: 'First Timer' | 'Returner' | 'Evangelism' | 'Manual';
}

export interface AttendanceSummary {
  serviceId: string;
  departmentId: string;
  departmentName: string;
  presentCount: number;
  activeMemberCount: number;
  attendancePercentage: number;
}

export interface AttendanceBreakdown {
  serviceId: string;
  serviceName: string;
  totalAttendance: number;
  firstTimers: number;
  returners: number;
  evangelismContacts: number;
  departments: { departmentId: string; departmentName: string; count: number }[];
}

export interface DepartmentAttendance {
  serviceId: string;
  departmentId: string;
  departmentName: string;
  presentCount: number;
  activeMemberCount: number;
  attendancePercentage: number;
  belowThreshold: boolean;
}

export interface ServiceAttendee {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  status: MemberStatus;
  groupTag?: string;
  sourceForm: 'First Timer' | 'Returner' | 'Evangelism' | 'Manual';
}

// Dashboard Types
export interface ServiceKPIs {
  totalAttendance: number;
  firstTimersCount: number;
  returnersCount: number;
  departmentBreakdown: { department: string; count: number }[];
}

export interface EvangelismStats {
  period: 'week' | 'month';
  contactCount: number;
  startDate: Date;
  endDate: Date;
}

export interface FollowUpSummary {
  volunteerId: string;
  volunteerName: string;
  assignedCount: number;
  completedCount: number;
  overdueCount: number;
}

// Follow-up Types
export interface FollowUpAssignment {
  id: string;
  memberId: string;
  memberName: string;
  assignedTo: string;
  assignedToName: string;
  assignedDate: Date;
  dueDate: Date;
  status: 'Assigned' | 'In Progress' | 'Completed' | 'Reassigned';
  latestComment?: string;
}

export interface FollowUpInteraction {
  id: string;
  memberId: string;
  memberName: string;
  volunteerId: string;
  volunteerName: string;
  date: Date;
  comment: string;
  interactionType?: string;
}

export interface SoulsAssignedByVolunteer {
  volunteerId: string;
  volunteerName: string;
  members: {
    id: string;
    name: string;
    status: MemberStatus;
    phone?: string;
    assignedDate: Date;
  }[];
}

// Member Journey Types
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

// Service Comparison Types
export interface ServiceComparison {
  serviceA: Service;
  serviceB: Service;
  presentInAMissingInB: Member[];
  presentInBMissingInA: Member[];
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  lastUpdated: Date;
  cached: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Re-export admin types
export * from './admin';
