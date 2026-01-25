# Design Document: Member Terminology Update

## Overview

This design outlines the approach for updating terminology from "volunteers" to "members" throughout the church member management application. The update is a code-level refactoring that aligns the application's terminology with the existing Airtable data model, which already treats all participants as members.

### Key Principles

1. **Code-Only Changes**: No Airtable schema changes or data migration required
2. **Semantic Clarity**: Use "member" for all participants, "followUpMember" for members with follow-up roles
3. **Backward Compatibility**: Maintain all existing functionality and Airtable field mappings
4. **Consistency**: Apply terminology changes uniformly across backend, frontend, and tests

### Scope

- Backend TypeScript services and type definitions
- Frontend React components and TypeScript types
- Test suites (unit tests and property-based tests)
- Configuration constants and error codes
- Documentation and code comments

## Architecture

### Current State

The codebase currently uses mixed terminology:
- Type definitions: `Volunteer`, `VolunteerRole`, `volunteerId`
- Services: `FollowUpService` with methods referencing "volunteer"
- Constants: `DEFAULT_VOLUNTEER_CAPACITY`, `volunteerCapacityLimit`
- Error codes: `VOLUNTEER_NOT_FOUND`, `NO_AVAILABLE_VOLUNTEER`
- Airtable constants: `AIRTABLE_TABLES.VOLUNTEERS` (references non-existent table)

### Target State

The codebase will use consistent "member" terminology:
- Type definitions: `FollowUpMember`, `MemberRole`, `followUpMemberId`
- Services: Methods use "member" or "followUpMember"
- Constants: `DEFAULT_MEMBER_CAPACITY`, `memberCapacityLimit`
- Error codes: `FOLLOW_UP_MEMBER_NOT_FOUND`, `NO_AVAILABLE_FOLLOW_UP_MEMBER`
- Airtable constants: Remove `VOLUNTEERS`, use `MEMBERS` table

### Layered Approach

The update follows a layered approach from bottom to top:

1. **Type Layer**: Update core type definitions first
2. **Service Layer**: Update backend services and business logic
3. **API Layer**: Update handlers and response transformations
4. **Frontend Layer**: Update React components and UI
5. **Test Layer**: Update all test suites

## Components and Interfaces

### 1. Type Definitions (`src/types/index.ts`)

#### Changes Required

**Interface Renames:**
```typescript
// Before
export interface Volunteer {
  id: string;
  name: string;
  role: VolunteerRole;
  // ...
}

// After
export interface FollowUpMember {
  id: string;
  name: string;
  role: MemberRole;
  // ...
}
```

**Type Renames:**
```typescript
// Before
export type VolunteerRole = 'Pastor' | 'Admin' | 'Follow-up' | 'Department Lead' | 'Evangelism';

// After  
export type MemberRole = 'Pastor' | 'Admin' | 'Follow-up' | 'Department Lead' | 'Evangelism';
```

**Property Renames:**
```typescript
// Before
export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  volunteerId?: string;
  departmentIds?: string[];
}

// After
export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  followUpMemberId?: string;
  departmentIds?: string[];
}
```

**Configuration Interface:**
```typescript
// Before
export interface ChurchConfig {
  // ...
  volunteerCapacityLimit: number;
}

// After
export interface ChurchConfig {
  // ...
  memberCapacityLimit: number;
}
```

### 2. Follow-Up Service (`src/services/follow-up-service.ts`)

#### Changes Required

**Constants:**
```typescript
// Before
const DEFAULT_VOLUNTEER_CAPACITY = 20;

// After
const DEFAULT_MEMBER_CAPACITY = 20;
```

**Error Codes:**
```typescript
// Before
export enum FollowUpErrorCode {
  VOLUNTEER_NOT_FOUND = 'VOLUNTEER_NOT_FOUND',
  NO_AVAILABLE_VOLUNTEER = 'NO_AVAILABLE_VOLUNTEER',
  // ...
}

// After
export enum FollowUpErrorCode {
  FOLLOW_UP_MEMBER_NOT_FOUND = 'FOLLOW_UP_MEMBER_NOT_FOUND',
  NO_AVAILABLE_FOLLOW_UP_MEMBER = 'NO_AVAILABLE_FOLLOW_UP_MEMBER',
  // ...
}
```

**Method Signatures:**
```typescript
// Before
async getVolunteerCapacity(volunteerId: string): Promise<CapacityInfo>
async findAvailableVolunteer(role?: VolunteerRole): Promise<Volunteer | null>
async getAssignmentsByVolunteer(volunteerId: string): Promise<FollowUpAssignment[]>

// After
async getFollowUpMemberCapacity(followUpMemberId: string): Promise<CapacityInfo>
async findAvailableFollowUpMember(role?: MemberRole): Promise<FollowUpMember | null>
async getAssignmentsByFollowUpMember(followUpMemberId: string): Promise<FollowUpAssignment[]>
```

**Internal Variables:**
- Rename all local variables from `volunteer*` to `followUpMember*`
- Update parameter names in all methods
- Update comments and JSDoc

### 3. Authentication Service (`src/services/auth-service.ts`)

#### Changes Required

**UserContext Property:**
```typescript
// Update all references from volunteerId to followUpMemberId
const scope = this.getDataScope(user);
// Use user.followUpMemberId instead of user.volunteerId
```

**Data Scope Type:**
```typescript
// Before
export type DataScope =
  | { type: 'all' }
  | { type: 'assigned'; volunteerId?: string }
  | { type: 'department'; departmentIds: string[] }
  | { type: 'none' };

// After
export type DataScope =
  | { type: 'all' }
  | { type: 'assigned'; followUpMemberId?: string }
  | { type: 'department'; departmentIds: string[] }
  | { type: 'none' };
```

**Filter Formulas:**
```typescript
// Update variable names in filter building methods
// Keep Airtable field names unchanged (e.g., "Follow-up Owner")
```

### 4. Configuration Service (`src/services/config-service.ts`)

#### Changes Required

**Configuration Properties:**
```typescript
// Before
volunteerCapacityLimit: (result.Item.volunteerCapacityLimit as number) || 20

// After
memberCapacityLimit: (result.Item.memberCapacityLimit as number) || 20
```

**User Mapping:**
```typescript
// Before
async getUserMapping(cognitoUserId: string, churchId: string): Promise<{
  volunteerId: string;
  role: UserRole;
  departmentIds: string[];
}>

// After
async getUserMapping(cognitoUserId: string, churchId: string): Promise<{
  followUpMemberId: string;
  role: UserRole;
  departmentIds: string[];
}>
```

### 5. Error Service (`src/services/error-service.ts`)

#### Changes Required

**Error Codes:**
```typescript
// Before
export enum ErrorCode {
  NO_AVAILABLE_VOLUNTEER = 'NO_AVAILABLE_VOLUNTEER',
  // ...
}

// After
export enum ErrorCode {
  NO_AVAILABLE_FOLLOW_UP_MEMBER = 'NO_AVAILABLE_FOLLOW_UP_MEMBER',
  // ...
}
```

**Critical Error Codes Array:**
```typescript
// Update references in CRITICAL_ERROR_CODES array
```

### 6. Airtable Client (`src/services/airtable-client.ts`)

#### Changes Required

**Table Constants:**
```typescript
// Before
export const AIRTABLE_TABLES = {
  MEMBERS: 'Members',
  // ...
  VOLUNTEERS: 'Volunteers',  // This table doesn't exist!
  // ...
} as const;

// After
export const AIRTABLE_TABLES = {
  MEMBERS: 'Members',
  // ...
  // Remove VOLUNTEERS constant
  // ...
} as const;
```

### 7. Query Service (`src/services/query-service.ts`)

#### Changes Required

**Variable Names:**
- Update all local variables from `volunteer*` to `followUpMember*`
- Update method parameters
- Update comments

**Airtable Queries:**
```typescript
// Before
const volunteerRecord = await this.airtableClient.getRecord(
  AIRTABLE_TABLES.VOLUNTEERS,
  volunteerId
);

// After
const followUpMemberRecord = await this.airtableClient.getRecord(
  AIRTABLE_TABLES.MEMBERS,
  followUpMemberId
);
```

### 8. Frontend Type Definitions (`frontend/src/types/index.ts`)

#### Changes Required

**UserContext Interface:**
```typescript
// Before
export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  volunteerId?: string;
  departmentIds?: string[];
}

// After
export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  followUpMemberId?: string;
  departmentIds?: string[];
}
```

### 9. Frontend Auth Context (`frontend/src/contexts/AuthContext.tsx`)

#### Changes Required

**Token Extraction:**
```typescript
// Before
const volunteerId = idToken?.payload?.['custom:volunteerId'] as string | undefined;

// After
const followUpMemberId = idToken?.payload?.['custom:followUpMemberId'] as string | undefined;
```

**Context Value:**
```typescript
// Before
{
  userId: authUser.userId,
  email: authUser.signInDetails?.loginId || '',
  role,
  volunteerId,
  departmentIds: departmentIds ? departmentIds.split(',') : undefined,
}

// After
{
  userId: authUser.userId,
  email: authUser.signInDetails?.loginId || '',
  role,
  followUpMemberId,
  departmentIds: departmentIds ? departmentIds.split(',') : undefined,
}
```

### 10. Frontend Components

#### Changes Required

**TodaysFollowUpsView.tsx:**
```typescript
// Before
placeholder="Search by member or volunteer name..."

// After
placeholder="Search by member or follow-up member name..."
```

**FollowUpCommentsTable.tsx:**
```typescript
// Before
<th>Volunteer</th>
<td>{interaction.volunteerName}</td>

// After
<th>Follow-up Member</th>
<td>{interaction.followUpMemberName}</td>
```

**Variable Names:**
- Update all component state variables from `volunteer*` to `followUpMember*`
- Update prop names
- Update interface definitions

### 11. Test Files

#### Changes Required

**Test Descriptions:**
```typescript
// Before
it('should hide Admin tab for volunteer role', () => {

// After
it('should hide Admin tab for follow-up member role', () => {
```

**Mock Data:**
```typescript
// Before
const mockVolunteer = {
  id: 'vol123',
  name: 'John Doe',
  role: 'Follow-up',
  // ...
};

// After
const mockFollowUpMember = {
  id: 'mem123',
  name: 'John Doe',
  role: 'Follow-up',
  // ...
};
```

**Variable Names:**
- Update all test variables from `volunteer*` to `followUpMember*`
- Update assertions
- Update property-based test generators

## Data Models

### FollowUpMember Interface

```typescript
export interface FollowUpMember {
  id: string;
  name: string;
  role: MemberRole;
  phone: string;
  email?: string;
  active: boolean;
  capacity: number;
}
```

**Mapping from Airtable:**
- Source table: `Members` (not a separate "Volunteers" table)
- Filter: Members with roles like 'Follow-up', 'Pastor', 'Admin', etc.
- Fields map directly from Members table fields

### CapacityInfo Interface

```typescript
export interface CapacityInfo {
  memberId: string;           // Renamed from volunteerId
  memberName: string;          // Renamed from volunteerName
  capacity: number;
  currentAssignments: number;
  availableSlots: number;
  hasCapacity: boolean;
}
```

### UserContext Interface

```typescript
export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  followUpMemberId?: string;   // Renamed from volunteerId
  departmentIds?: string[];
}
```

### DataScope Type

```typescript
export type DataScope =
  | { type: 'all' }
  | { type: 'assigned'; followUpMemberId?: string }  // Renamed from volunteerId
  | { type: 'department'; departmentIds: string[] }
  | { type: 'none' };
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Capacity Configuration Consistency

*For any* follow-up member capacity check, the system should use the `memberCapacityLimit` configuration value (not `volunteerCapacityLimit`) when determining if a member has reached their assignment limit.

**Validates: Requirements 2.2, 9.1**

### Property 2: Error Code Terminology Consistency

*For any* error condition related to follow-up member operations, the system should throw error codes using "FOLLOW_UP_MEMBER" or "MEMBER" terminology (e.g., `FOLLOW_UP_MEMBER_NOT_FOUND`, `NO_AVAILABLE_FOLLOW_UP_MEMBER`) rather than "VOLUNTEER" terminology.

**Validates: Requirements 2.5, 10.2**

### Property 3: User Mapping Property Names

*For any* user mapping retrieved from the configuration service, the returned object should contain a `followUpMemberId` property (not `volunteerId`) when the user has a follow-up role assignment.

**Validates: Requirements 3.2**

### Property 4: Data Scope Filtering Correctness

*For any* user with an "assigned" data scope, the scope object should contain a `followUpMemberId` property (not `volunteerId`), and filtering operations should correctly use this property to restrict data access.

**Validates: Requirements 3.3**

### Property 5: Filter Formula Construction

*For any* Airtable filter formula constructed for role-based access control, the formula should correctly reference the "Follow-up Owner" field in Airtable while using `followUpMemberId` in the code variables.

**Validates: Requirements 3.4**

### Property 6: API Response Property Names

*For any* API response containing user context or follow-up assignment data, the response object should use `followUpMemberId` (not `volunteerId`) and should not contain any properties with "volunteer" in the name.

**Validates: Requirements 4.1, 4.2**

### Property 7: Authentication Context Property Extraction

*For any* authentication token processed by the frontend auth context, the extracted user context should contain a `followUpMemberId` property (not `volunteerId`) when the custom attribute is present in the token.

**Validates: Requirements 6.2**

### Property 8: Airtable Table and Field Usage

*For any* database query operation, the system should:
- Query the "Members" table (not "Volunteers" table) when retrieving follow-up member data
- Use existing Airtable field names like "Assigned To" in the "Follow-up Assignments" table
- Correctly map Airtable records to application types with `followUpMemberId` properties

**Validates: Requirements 7.3, 7.4, 11.3, 13.4**

### Property 9: Error Message Terminology

*For any* error or warning message generated by the system, the message text should use "member" or "follow-up member" terminology (not "volunteer") when referring to participants with follow-up roles.

**Validates: Requirements 10.2**

### Property 10: No Volunteer Table References

*For the* AIRTABLE_TABLES constant object, it should not contain a `VOLUNTEERS` property, and no code in the system should attempt to reference `AIRTABLE_TABLES.VOLUNTEERS`.

**Validates: Requirements 13.1, 13.2**

## Error Handling

### Error Code Updates

All error codes related to follow-up member operations must be updated:

**Before:**
- `VOLUNTEER_NOT_FOUND`
- `NO_AVAILABLE_VOLUNTEER`

**After:**
- `FOLLOW_UP_MEMBER_NOT_FOUND`
- `NO_AVAILABLE_FOLLOW_UP_MEMBER`

### Error Message Updates

Error messages should use the new terminology:

**Before:**
```typescript
throw new FollowUpError(
  FollowUpErrorCode.VOLUNTEER_NOT_FOUND,
  'Volunteer not found'
);
```

**After:**
```typescript
throw new FollowUpError(
  FollowUpErrorCode.FOLLOW_UP_MEMBER_NOT_FOUND,
  'Follow-up member not found'
);
```

### Backward Compatibility

- No changes to Airtable schema or field names
- Existing API contracts maintained (only property names change)
- No data migration required
- All existing functionality preserved

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests:**
- Verify specific examples of terminology updates
- Test edge cases (e.g., missing followUpMemberId)
- Test error conditions with new error codes
- Test UI component rendering with new labels
- Integration tests for API endpoints

**Property-Based Tests:**
- Verify universal properties across all inputs
- Test that all API responses use correct property names
- Test that all error codes use correct terminology
- Test that all database queries use correct tables
- Minimum 100 iterations per property test

### Property Test Configuration

Each property-based test should:
- Run minimum 100 iterations (due to randomization)
- Reference its design document property number
- Use tag format: **Feature: member-terminology-update, Property {number}: {property_text}**

### Test Coverage Areas

1. **Type System Tests**
   - Verify interfaces compile with new names
   - Verify no references to old type names remain

2. **Service Layer Tests**
   - Test FollowUpService methods with new signatures
   - Test ConfigService returns correct property names
   - Test AuthService uses correct property in scopes
   - Test error codes are thrown correctly

3. **API Layer Tests**
   - Test API responses have correct property names
   - Test request handlers use correct terminology
   - Test error responses use new error codes

4. **Frontend Tests**
   - Test components render correct labels
   - Test auth context extracts correct property
   - Test state management uses correct property names

5. **Integration Tests**
   - Test end-to-end flows with new terminology
   - Test Airtable queries use correct tables
   - Test record mapping produces correct objects

### Example Property Test

```typescript
/**
 * Feature: member-terminology-update, Property 6: API Response Property Names
 * 
 * For any API response containing user context or follow-up assignment data,
 * the response object should use followUpMemberId (not volunteerId)
 */
describe('API Response Property Names', () => {
  it('should use followUpMemberId in all API responses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string(),
          email: fc.emailAddress(),
          role: fc.constantFrom('pastor', 'admin', 'follow_up', 'department_lead'),
          followUpMemberId: fc.option(fc.string(), { nil: undefined }),
        }),
        async (mockUser) => {
          const response = await apiHandler(mockUser);
          
          // Property: Response should have followUpMemberId, not volunteerId
          expect(response).toHaveProperty('followUpMemberId');
          expect(response).not.toHaveProperty('volunteerId');
          
          // Property: No properties should contain "volunteer" in the name
          const propertyNames = Object.keys(response);
          const hasVolunteerProperty = propertyNames.some(name => 
            name.toLowerCase().includes('volunteer')
          );
          expect(hasVolunteerProperty).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Manual Testing Checklist

After implementation, manually verify:
- [ ] All UI labels display "Follow-up Member" instead of "Volunteer"
- [ ] Search placeholders use correct terminology
- [ ] Error messages display correct terminology
- [ ] API responses in browser dev tools show correct property names
- [ ] No console errors or warnings about missing properties
- [ ] All existing features work as before (backward compatibility)

## Implementation Notes

### Order of Implementation

1. **Phase 1: Type Definitions**
   - Update core type definitions in `src/types/index.ts`
   - Update frontend type definitions in `frontend/src/types/index.ts`
   - This establishes the foundation for all other changes

2. **Phase 2: Backend Services**
   - Update FollowUpService
   - Update ConfigService
   - Update AuthService
   - Update ErrorService
   - Update AirtableClient constants

3. **Phase 3: Query and Handler Services**
   - Update QueryService
   - Update all handler functions
   - Update API response transformations

4. **Phase 4: Frontend**
   - Update AuthContext
   - Update UI components
   - Update component props and state

5. **Phase 5: Tests**
   - Update unit tests
   - Update property-based tests
   - Add new tests for terminology verification

### Migration Strategy

Since this is a code-only change with no data migration:

1. All changes can be deployed in a single release
2. No database downtime required
3. No API versioning needed (property names change but functionality identical)
4. Frontend and backend can be deployed together

### Rollback Plan

If issues arise:
1. Revert to previous code version
2. No data cleanup needed (no data was changed)
3. No Airtable schema changes to revert

### Performance Considerations

- No performance impact expected (terminology changes only)
- No additional database queries
- No changes to query complexity
- No changes to data structures or algorithms
