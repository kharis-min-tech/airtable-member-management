# Design Document: Church Member Management Automation System

## Overview

This system provides an automation layer for church member management built on Airtable, using AWS Lambda functions for complex business logic and a React-based frontend for dashboards and interfaces. The architecture follows a serverless, event-driven pattern where Airtable webhooks trigger Lambda functions via API Gateway, and a separate frontend application provides role-based dashboards.

The system is designed for multi-church deployment with environment-based configuration, ensuring the same codebase can serve multiple churches with isolated data.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AIRTABLE BASE                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │     Forms       │  │     Tables      │  │    Webhooks     │              │
│  │ (First Timer,   │──│ (Members,       │──│  (Automation    │              │
│  │  Returner, etc) │  │  Services, etc) │  │   Triggers)     │              │
│  └─────────────────┘  └─────────────────┘  └────────┬────────┘              │
└─────────────────────────────────────────────────────┼───────────────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               AWS CLOUD                                     │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                          API GATEWAY                                 │   │
│  └──────────────────────────────┬───────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────┼───────────────────────────────────────┐   │
│  │                        LAMBDA FUNCTIONS                              │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │   │
│  │  │ Evangelism  │ │ First Timer │ │  Returner   │ │ Attendance  │     │   │
│  │  │  Handler    │ │  Handler    │ │  Handler    │ │  Handler    │     │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                     │   │
│  │  │ Follow-up   │ │  Programs   │ │   Query     │                     │   │
│  │  │  Handler    │ │  Handler    │ │  Service    │                     │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                           │
│         ┌───────────────────────┼───────────────────────┐                   │
│         ▼                       ▼                       ▼                   │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐            │
│  │  DynamoDB   │         │     SQS     │         │   Cognito   │            │
│  │ (Cache/Cfg) │         │   (Queue)   │         │ (User Auth) │            │
│  └─────────────┘         └─────────────┘         └─────────────┘            │
│                                                                             │
│  ┌─────────────┐         ┌─────────────┐                                    │
│  │     S3      │◄────────│ CloudFront  │◄─────────────────────┐             │
│  │ (Frontend)  │         │   (CDN)     │                      │             │
│  └─────────────┘         └─────────────┘                      │             │
└───────────────────────────────────────────────────────────────┼─────────────┘
                                                                │
                                                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND APPLICATION                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          React SPA                                  │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │    │
│  │  │   Pastor    │ │ Attendance  │ │   Member    │ │   Admin     │    │    │
│  │  │  Dashboard  │ │  Explorer   │ │   Journey   │ │   Views     │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Serverless Architecture**: AWS Lambda provides cost-effective, scalable compute that only runs when needed
2. **Event-Driven Processing**: Airtable webhooks trigger specific Lambda handlers for each event type
3. **Request Queuing**: SQS handles high-volume periods and ensures rate limit compliance
4. **Caching Layer**: DynamoDB caches frequently accessed data and stores church-specific configuration
5. **Separate Frontend**: React SPA hosted on S3/CloudFront provides flexible, role-based interfaces
6. **Cognito Authentication**: Manages user authentication and role-based access control

## Components and Interfaces

### 1. Airtable Service Client

A shared module for all Lambda functions to interact with Airtable API.

```typescript
interface AirtableConfig {
  baseId: string;
  apiKey: string;
  rateLimitPerSecond: number;
}

interface AirtableClient {
  // Record operations
  getRecord(tableId: string, recordId: string): Promise<AirtableRecord>;
  createRecord(tableId: string, fields: Record<string, any>): Promise<AirtableRecord>;
  updateRecord(tableId: string, recordId: string, fields: Record<string, any>): Promise<AirtableRecord>;
  
  // Query operations
  findRecords(tableId: string, filterFormula: string): Promise<AirtableRecord[]>;
  findByUniqueKey(tableId: string, phone?: string, email?: string): Promise<AirtableRecord | null>;
  
  // Batch operations
  batchCreate(tableId: string, records: Record<string, any>[]): Promise<AirtableRecord[]>;
  batchUpdate(tableId: string, updates: {id: string, fields: Record<string, any>}[]): Promise<AirtableRecord[]>;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
}
```

### 2. Member Service

Handles member record creation, deduplication, and merging.

```typescript
interface MemberService {
  // Core operations
  findMemberByPhoneOrEmail(phone?: string, email?: string): Promise<Member | null>;
  createMember(data: CreateMemberInput): Promise<Member>;
  updateMember(memberId: string, data: UpdateMemberInput): Promise<Member>;
  
  // Merge operations
  mergeMembers(sourceId: string, targetId: string): Promise<Member>;
  detectDuplicates(member: Member): Promise<Member[]>;
  
  // Status transitions
  transitionStatus(memberId: string, newStatus: MemberStatus): Promise<Member>;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  email?: string;
  status: MemberStatus;
  source: MemberSource;
  dateFirstCaptured: Date;
  followUpOwner?: string;
  followUpStatus: FollowUpStatus;
}

type MemberStatus = 'Member' | 'First Timer' | 'Returner' | 'Evangelism Contact';
type MemberSource = 'First Timer Form' | 'Returner Form' | 'Evangelism' | 'Other';
type FollowUpStatus = 'Not Started' | 'In Progress' | 'Contacted' | 'Visiting' | 'Integrated' | 'Established';

interface CreateMemberInput {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  ghanaPostCode?: string;
  status: MemberStatus;
  source: MemberSource;
  dateFirstCaptured: Date;
}

interface UpdateMemberInput {
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
```

### 3. Attendance Service

Manages attendance record creation and queries.

```typescript
interface AttendanceService {
  // Record operations
  markPresent(memberId: string, serviceId: string, sourceForm: SourceForm): Promise<AttendanceRecord>;
  findAttendance(memberId: string, serviceId: string): Promise<AttendanceRecord | null>;
  
  // Query operations
  getServiceAttendance(serviceId: string): Promise<AttendanceRecord[]>;
  getMemberAttendanceHistory(memberId: string): Promise<AttendanceRecord[]>;
  getAttendanceByDepartment(serviceId: string, departmentId: string): Promise<AttendanceSummary>;
  
  // Comparison operations
  compareTwoServices(serviceAId: string, serviceBId: string): Promise<ServiceComparison>;
}

interface AttendanceRecord {
  id: string;
  memberId: string;
  serviceId: string;
  present: boolean;
  groupTag?: string;
  sourceForm: SourceForm;
}

type SourceForm = 'First Timer' | 'Returner' | 'Evangelism' | 'Manual';

interface AttendanceSummary {
  serviceId: string;
  departmentId: string;
  departmentName: string;
  presentCount: number;
  activeMemberCount: number;
  attendancePercentage: number;
}

interface ServiceComparison {
  serviceA: ServiceInfo;
  serviceB: ServiceInfo;
  presentInAMissingInB: Member[];
  presentInBMissingInA: Member[];
}
```

### 4. Follow-up Service

Handles follow-up assignments and volunteer capacity management.

```typescript
interface FollowUpService {
  // Assignment operations
  createAssignment(memberId: string, volunteerId: string, dueInDays: number): Promise<FollowUpAssignment>;
  reassignMember(memberId: string, newVolunteerId: string, reason: string): Promise<FollowUpAssignment>;
  
  // Capacity management
  getVolunteerCapacity(volunteerId: string): Promise<CapacityInfo>;
  findAvailableVolunteer(role: VolunteerRole): Promise<Volunteer | null>;
  
  // Query operations
  getAssignmentsByVolunteer(volunteerId: string): Promise<FollowUpAssignment[]>;
  getDueAssignments(date: Date): Promise<FollowUpAssignment[]>;
  getUnassignedMembers(): Promise<Member[]>;
}

interface FollowUpAssignment {
  id: string;
  memberId: string;
  assignedTo: string;
  assignedDate: Date;
  dueDate: Date;
  status: AssignmentStatus;
}

type AssignmentStatus = 'Assigned' | 'In Progress' | 'Completed' | 'Reassigned';

interface CapacityInfo {
  volunteerId: string;
  volunteerName: string;
  capacity: number;
  currentAssignments: number;
  availableSlots: number;
  hasCapacity: boolean;
}

interface Volunteer {
  id: string;
  name: string;
  role: VolunteerRole;
  phone?: string;
  email?: string;
  active: boolean;
  capacity: number;
}

type VolunteerRole = 'Pastor' | 'Admin' | 'Follow-up' | 'Department Lead' | 'Evangelism';
```

### 5. Event Handlers (Lambda Functions)

#### Evangelism Handler
```typescript
interface EvangelismEvent {
  recordId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  ghanaPostCode?: string;
  date: Date;
  capturedBy?: string;
}

async function handleEvangelismCreated(event: EvangelismEvent): Promise<void> {
  // 1. Check for existing member by phone/email
  // 2. Create or update member record with status "Evangelism Contact"
  // 3. Link evangelism record to member
  // 4. Create follow-up assignment to soul winner
  // 5. Update member's follow-up owner
}
```

#### First Timer Handler
```typescript
interface FirstTimerEvent {
  recordId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  ghanaPostCode?: string;
  serviceId: string;
}

async function handleFirstTimerCreated(event: FirstTimerEvent): Promise<void> {
  // 1. Search for existing member by phone/email
  // 2. If exists with "Evangelism Contact" status:
  //    a. Update status to "First Timer"
  //    b. Merge missing fields without overwriting
  //    c. Check follow-up reassignment based on capacity
  // 3. If not exists: create new member
  // 4. Link first timer record to member
  // 5. Create attendance record for the service
  // 6. Update first service attended if empty
}
```

#### Returner Handler
```typescript
interface ReturnerEvent {
  recordId: string;
  name: string;
  phone?: string;
  email?: string;
  serviceId: string;
}

async function handleReturnerCreated(event: ReturnerEvent): Promise<void> {
  // 1. Search for existing member by phone/email
  // 2. If exists: update status to "Returner" if applicable
  // 3. If not exists: return error (should use First Timer form)
  // 4. Link returner record to member
  // 5. Create attendance record for the service
}
```

### 6. Query Service (for Frontend)

```typescript
interface QueryService {
  // Dashboard queries
  getServiceKPIs(serviceId: string): Promise<ServiceKPIs>;
  getEvangelismStats(period: 'week' | 'month'): Promise<EvangelismStats>;
  getFollowUpSummary(): Promise<FollowUpSummary>;
  
  // Attendance queries
  getServiceAttendanceBreakdown(serviceId: string): Promise<AttendanceBreakdown>;
  getDepartmentAttendance(serviceId: string): Promise<DepartmentAttendance[]>;
  
  // Member queries
  getMemberJourney(memberId: string): Promise<MemberJourney>;
  searchMembers(query: string): Promise<Member[]>;
  
  // Admin views
  getTodaysFollowUps(): Promise<FollowUpAssignment[]>;
  getNewFirstTimers(days: number): Promise<Member[]>;
  getIncompleteEvangelismRecords(): Promise<EvangelismRecord[]>;
  getUnassignedMembers(): Promise<Member[]>;
}

interface ServiceKPIs {
  totalAttendance: number;
  firstTimersCount: number;
  returnersCount: number;
  departmentBreakdown: {department: string; count: number}[];
}

interface MemberJourney {
  member: Member;
  timeline: TimelineEvent[];
  summary: JourneySummary;
}

interface TimelineEvent {
  date: Date;
  type: EventType;
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

type EventType = 
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

interface JourneySummary {
  firstEvangelised?: Date;
  firstVisited?: Date;
  firstAttended?: Date;
  lastAttended?: Date;
  visitsCount: number;
  assignedFollowUpPerson?: string;
}
```

### 7. Cache Service

```typescript
interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

// Cache key patterns
const CACHE_KEYS = {
  SERVICE_KPIS: (serviceId: string) => `kpis:service:${serviceId}`,
  EVANGELISM_STATS: (period: string) => `stats:evangelism:${period}`,
  MEMBER_JOURNEY: (memberId: string) => `journey:member:${memberId}`,
  DEPARTMENT_ROSTER: (deptId: string) => `roster:dept:${deptId}`,
};

const DEFAULT_TTL = 900; // 15 minutes
```

### 8. Authentication & Authorization

```typescript
interface AuthService {
  validateToken(token: string): Promise<UserContext>;
  getUserRole(userId: string): Promise<UserRole>;
  checkPermission(user: UserContext, resource: string, action: string): boolean;
}

interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  volunteerId?: string;
  departmentIds?: string[];
}

type UserRole = 'pastor' | 'admin' | 'follow_up' | 'department_lead';

// Permission matrix
const PERMISSIONS = {
  pastor: ['*'], // Full access
  admin: ['*'], // Full access
  follow_up: [
    'members:read:assigned',
    'follow_up:*:assigned',
    'journey:read:assigned'
  ],
  department_lead: [
    'members:read:department',
    'attendance:read:department',
    'roster:read:department'
  ]
};
```


## Data Models

### Airtable Schema (Reference)

The system interacts with the following Airtable tables. Field names must match exactly for the automation to work.

```typescript
// Members Table
interface MembersTable {
  'Full Name': string;           // Formula
  'First Name': string;
  'Last Name': string;
  'Phone': string;
  'Email': string;
  'Gender': 'Male' | 'Female';
  'DOB': Date;
  'Address': string;
  'GhanaPost Code': string;
  'Status': 'Member' | 'First Timer' | 'Returner' | 'Evangelism Contact';
  'Source': 'First Timer Form' | 'Returner Form' | 'Evangelism' | 'Other';
  'Date First Captured': Date;
  'First Service Attended': string[];  // Link to Services
  'Last Service Attended': Date;       // Rollup
  'Visits Count': number;              // Rollup
  'Visited?': boolean;
  'Last Visited': Date;                // Rollup MAX
  'Follow-up Owner': string[];         // Link to Volunteers
  'Follow-up Status': 'Not Started' | 'In Progress' | 'Contacted' | 'Visiting' | 'Integrated' | 'Established';
  'Notes': string;
  'Data Completeness': number;         // Formula
  'Unique Key': string;                // Formula (phone or email based)
  'Attendance': string[];              // Link to Attendance
  'Home Visits': string[];             // Link to Home Visits
  'Membership Completed': Date;
  'Spiritual Maturity Completed': Date;
  'Water Baptized': boolean;
  'Water Baptism Date': Date;
  'Holy Spirit Baptism': boolean;
  'Member Programs': string[];         // Link to Member Programs
}

// Services Table
interface ServicesTable {
  'Service Name + Date': string;
  'Service Date': Date;
  'Service Name': 'Sunday Service' | 'Midweek' | 'Special' | 'Fasting Service';
  'Service Code': string;              // Formula: YYYY-MM-DD + Service Name
  'Notes': string;
  'Attendance': string[];              // Link to Attendance
  'First Timers Register': string[];   // Link to First Timers Register
  'Returners Register': string[];      // Link to Returners Register
  'Members': string[];                 // Link to Members
}

// Attendance Table
interface AttendanceTable {
  'Member + Service': string;
  'Service': string[];                 // Link to Services
  'Member': string[];                  // Link to Members
  'Present?': boolean;
  'Group Tag': string;
  'Source Form': 'First Timer' | 'Returner' | 'Evangelism' | 'Manual';
}

// Evangelism Table
interface EvangelismTable {
  'Date + Contact Name': string;
  'Date': Date;
  'Captured By': string[];             // Link to Volunteers
  'First Name': string;
  'Last Name': string;
  'Full Name': string;                 // Formula
  'Phone': string;
  'Email': string;
  'GhanaPost Code': string;
  'Notes / Prayer points': string;
  'Linked Member': string[];           // Link to Members
  'Data Completeness': number;         // Formula
  'Follow-up Interactions': string[];  // Link to Follow-up Interactions
  'Soul Type': string;
  'Evangelism Type': string;
}

// Follow-up Assignments Table
interface FollowUpAssignmentsTable {
  'Member + Assigned Date': string;
  'Member': string[];                  // Link to Members
  'Assigned To': string[];             // Link to Volunteers
  'Assigned Date': Date;
  'Due Date': Date;
  'Status': 'Assigned' | 'In Progress' | 'Completed' | 'Reassigned';
  'Latest Comment': string;            // Rollup
}

// Volunteers Table
interface VolunteersTable {
  'Name': string;
  'Role': 'Pastor' | 'Admin' | 'Follow-up' | 'Department Lead' | 'Evangelism';
  'Phone': string;
  'Email': string;
  'Active': boolean;
  'Capacity': number;
  'Members': string[];                 // Link to Members
}
```

### DynamoDB Tables (Cache & Config)

```typescript
// Cache Table
interface CacheTable {
  pk: string;           // Cache key
  sk: string;           // 'CACHE'
  data: string;         // JSON stringified data
  ttl: number;          // Unix timestamp for TTL
  createdAt: string;    // ISO timestamp
}

// Church Config Table
interface ChurchConfigTable {
  pk: string;           // 'CHURCH#{churchId}'
  sk: string;           // 'CONFIG'
  churchName: string;
  airtableBaseId: string;
  airtableApiKey: string;  // Encrypted
  defaultFollowUpDueDays: number;
  volunteerCapacityLimit: number;
  adminEmails: string[];
  createdAt: string;
  updatedAt: string;
}

// User Mapping Table (Cognito to Airtable)
interface UserMappingTable {
  pk: string;           // 'USER#{cognitoUserId}'
  sk: string;           // 'CHURCH#{churchId}'
  volunteerId: string;  // Airtable volunteer record ID
  role: UserRole;
  departmentIds: string[];
  createdAt: string;
}
```

## Error Handling

### Error Types

```typescript
enum ErrorCode {
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Business logic errors
  DUPLICATE_MEMBER = 'DUPLICATE_MEMBER',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  NO_AVAILABLE_VOLUNTEER = 'NO_AVAILABLE_VOLUNTEER',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  RETURNER_NOT_IN_SYSTEM = 'RETURNER_NOT_IN_SYSTEM',
  
  // External service errors
  AIRTABLE_API_ERROR = 'AIRTABLE_API_ERROR',
  AIRTABLE_RATE_LIMITED = 'AIRTABLE_RATE_LIMITED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

interface AppError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
}
```

### Retry Strategy

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: ErrorCode[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableErrors: [
    ErrorCode.AIRTABLE_RATE_LIMITED,
    ErrorCode.AIRTABLE_API_ERROR,
  ],
};

// Exponential backoff with jitter
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}
```

### Error Notification

```typescript
interface ErrorNotification {
  severity: 'critical' | 'warning' | 'info';
  errorCode: ErrorCode;
  message: string;
  context: {
    churchId: string;
    recordId?: string;
    operation: string;
    timestamp: string;
  };
}

// Critical errors that trigger immediate notification
const CRITICAL_ERRORS = [
  ErrorCode.DUPLICATE_MEMBER,
  ErrorCode.NO_AVAILABLE_VOLUNTEER,
  ErrorCode.CONFIGURATION_ERROR,
];
```

## Testing Strategy

### Dual Testing Approach

The system uses both unit tests and property-based tests to ensure correctness:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all valid inputs

### Testing Framework

- **Unit Testing**: Jest with TypeScript
- **Property-Based Testing**: fast-check library
- **Integration Testing**: Localstack for AWS services, Airtable API mocking

### Test Configuration

```typescript
// Property test configuration
const PBT_CONFIG = {
  numRuns: 100,  // Minimum iterations per property
  seed: undefined,  // Random seed for reproducibility when debugging
};
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Evangelism to Member Creation Completeness

*For any* valid evangelism record with First Name, Last Name, Phone, Email, GhanaPost Code, and Date, when processed by the Automation_Service, the resulting Member record SHALL contain all these fields copied exactly, have Status "Evangelism Contact", Source "Evangelism", Date First Captured matching the evangelism Date, and the Evangelism record's Linked Member field SHALL reference the created Member.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Member Search Correctness

*For any* phone number or email that exists in the Members table, searching by that phone or email SHALL return the matching Member record. *For any* phone number or email that does not exist in the Members table, searching SHALL return null.

**Validates: Requirements 2.1, 3.1**

### Property 3: First Timer Merge Preserves Existing Data

*For any* existing Member with Status "Evangelism Contact" and non-empty fields, when a First Timer registration matches by phone or email, the merge operation SHALL:
- Update Status to "First Timer"
- NOT change the Source field
- Fill any empty fields from the First Timer data
- NOT overwrite any non-empty fields
- Set First Service Attended if it was previously empty

**Validates: Requirements 2.2, 2.3, 2.6**

### Property 4: First Timer New Member Creation

*For any* First Timer registration where no matching Member exists by phone or email, the Automation_Service SHALL create a new Member with Status "First Timer" and Source "First Timer Form", and link the First Timers Register record to the new Member.

**Validates: Requirements 2.4, 2.5**

### Property 5: Returner Processing Rules

*For any* Returner registration:
- If a matching Member exists with Status "First Timer" or "Evangelism Contact", the Status SHALL be updated to "Returner"
- If a matching Member exists with Status "Member" or "Returner", the Status SHALL remain unchanged
- If no matching Member exists, the operation SHALL fail with an appropriate error indicating First Timer form should be used

**Validates: Requirements 3.2, 3.3, 3.4**

### Property 6: Follow-up Assignment Creation

*For any* Evangelism record with a Captured By volunteer, the Automation_Service SHALL create a Follow-up Assignment where:
- Member links to the created/matched Member record
- Assigned To links to the Captured By volunteer
- Assigned Date equals the current date
- Due Date equals Assigned Date + 3 days
- Status equals "Assigned"
- The Member's Follow-up Owner field references the assigned volunteer

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 7: Follow-up Reassignment on Capacity

*For any* First Timer registration for an existing Evangelism Contact where the current Follow-up Owner has >= 20 active assignments:
- If an available volunteer with capacity exists, a new assignment SHALL be created with the new volunteer, the old assignment Status SHALL be "Reassigned", and the Member's Follow-up Owner SHALL be updated
- If no available volunteer exists, the current assignment SHALL be retained and a warning SHALL be logged

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 8: Attendance Marking Idempotency

*For any* First Timer or Returner registration with a linked Service:
- An Attendance record SHALL exist linking the Member to the Service with Present? = true
- The Source Form SHALL match the registration type ("First Timer" or "Returner")
- Processing the same registration multiple times SHALL NOT create duplicate Attendance records
- If an Attendance record already exists for that Member+Service, it SHALL be updated rather than duplicated

**Validates: Requirements 6.1, 6.2, 6.3, 7.1, 7.2, 7.3**

### Property 9: Program Completion Triggers Member Update

*For any* Member Programs record where all four Session Completed checkboxes become true:
- The linked Member's Membership Completed date SHALL be set to the latest session date (if not already set)
- If Membership Completed was already set, it SHALL NOT be overwritten

**Validates: Requirements 10.3, 10.4**

### Property 10: Duplicate Detection and Merge Correctness

*For any* operation that would create a Member record:
- If a Member with matching Unique Key (phone or email) exists, records SHALL be merged rather than duplicated
- When merging, the oldest Date First Captured SHALL be preserved
- When merging, all linked records (Attendance, Home Visits, Follow-up Interactions) SHALL be consolidated under the surviving Member
- The total count of Members with the same phone/email SHALL never exceed 1

**Validates: Requirements 11.1, 11.2, 11.3, 11.4**

### Property 11: Attendance Percentage Calculation

*For any* Service and Department combination:
- Attendance percentage SHALL equal (count of present members in department for service / count of active members in department) × 100
- Active members count SHALL only include Member Departments records where Active = true
- The percentage SHALL be between 0 and 100 (inclusive), with >100% possible if non-department members attend

**Validates: Requirements 16.4, 16.5**

### Property 12: Service Comparison Bidirectional Correctness

*For any* two Services A and B:
- "Present in A, Missing in B" SHALL contain exactly those Members who have Attendance with Present? = true for Service A AND (no Attendance record for Service B OR Present? = false for Service B)
- "Present in B, Missing in A" SHALL contain exactly those Members who have Attendance with Present? = true for Service B AND (no Attendance record for Service A OR Present? = false for Service A)
- The union of both lists plus members present in both SHALL equal all members who attended either service

**Validates: Requirements 17.2, 17.3**

### Property 13: Timeline Chronological Ordering

*For any* Member's journey timeline:
- All events SHALL be sorted by date in ascending order (oldest first)
- Events with the same date SHALL maintain a consistent ordering
- The timeline SHALL include all events from: Evangelism, First Timer registration, Attendance, Home Visits, Follow-up Interactions, Department joins, Program sessions, Water baptism, Membership completion, Spiritual maturity completion

**Validates: Requirements 18.2, 18.3**

### Property 14: Role-Based Data Filtering

*For any* user with role "Follow-up Team":
- Member queries SHALL only return Members where Follow-up Owner matches the user's volunteer ID
- *For any* user with role "Department Lead":
- Member queries SHALL only return Members who have an active Member Departments record for one of the user's departments
- Attendance queries SHALL only return records for Members in the user's departments

**Validates: Requirements 20.4, 20.5, 20.6**

### Property 15: Cache Invalidation on Refresh

*For any* cached data item:
- After a "Refresh Now" action, the returned data SHALL reflect the current state in Airtable
- The "Last Updated" timestamp SHALL be updated to the current time
- Cached data older than 15 minutes SHALL be automatically refreshed on access

**Validates: Requirements 21.3, 21.4, 21.5**
