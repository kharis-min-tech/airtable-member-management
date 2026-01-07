# Design Document: UI Bug Fixes v3

## Overview

This design document addresses three critical bugs in the church member management system:
1. Navigation tabs not displaying
2. Attendance drill-down modal crashing with "r.map is not a function" error
3. Member journey page failing with Airtable permission errors

The fixes focus on defensive programming, proper null handling, and ensuring API responses are correctly structured before use.

## Architecture

The bug fixes span both frontend and backend layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND FIXES                                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     MainLayout (Navigation Fix)                     │    │
│  │  - Verify navigation renders correctly                              │    │
│  │  - Check CSS visibility issues                                      │    │
│  │  - Ensure Outlet renders child routes                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  PastorDashboard (Drill-Down Fix)                   │    │
│  │  - Add null-safe handling for API response                          │    │
│  │  - Ensure drillDownMembers is always an array                       │    │
│  │  - Add error state handling                                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  AttendanceDrillDownModal (Safety)                  │    │
│  │  - Add Array.isArray() check before .map()                          │    │
│  │  - Default to empty array if members is invalid                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND FIXES                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Query Handler (Journey Fix)                     │    │
│  │  - Add attendees-by-category handler                                │    │
│  │  - Improve error handling for Airtable errors                       │    │
│  │  - Return consistent response structure                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     QueryService (Error Handling)                   │    │
│  │  - Wrap Airtable calls in try-catch                                 │    │
│  │  - Handle missing table/permission errors gracefully                │    │
│  │  - Return partial data when some lookups fail                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Navigation Fix

The MainLayout component already has proper navigation structure. The issue may be:
- CSS hiding the navigation
- Router not rendering MainLayout correctly
- Authentication state preventing render

**Investigation Points:**
```typescript
// Check if MainLayout is being rendered
// Verify ProtectedRoute is passing children correctly
// Ensure CSS classes are not hiding navigation
```

### 2. Attendance Drill-Down Fix

**Current Problem:**
```typescript
// In PastorDashboard.tsx
const response = await churchApi.attendance.getAttendeesByCategory(...);
setDrillDownMembers(response.data || []);  // response.data might not be an array
```

**Fix - Defensive Data Handling:**
```typescript
interface SafeApiResponse<T> {
  data: T | null;
  error?: string;
}

// Ensure data is always an array
const safeMembers = Array.isArray(response?.data) ? response.data : [];
setDrillDownMembers(safeMembers);
```

**Fix - Modal Component Safety:**
```typescript
// In AttendanceDrillDownModal.tsx
function MemberList({ members, onMemberClick }) {
  // Defensive check
  const safeMembers = Array.isArray(members) ? members : [];
  
  return (
    <div className="space-y-2">
      {safeMembers.map((member) => (
        <MemberRow key={member.id} member={member} onClick={() => onMemberClick(member.id)} />
      ))}
    </div>
  );
}
```

### 3. Member Journey API Fix

**Current Problem:**
The error "Invalid permissions, or the requested model was not found" indicates Airtable API issues.

**Root Causes:**
1. Table name mismatch (e.g., "Members" vs actual table name)
2. API key lacks permissions for certain tables
3. Linked record references non-existent tables

**Fix - Backend Error Handling:**
```typescript
// In query-service.ts getMemberJourney
async getMemberJourney(memberId: string): Promise<MemberJourney> {
  try {
    const memberRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.MEMBERS, memberId);
    // ... rest of implementation
  } catch (error) {
    if (error instanceof AirtableError) {
      if (error.code === AirtableErrorCode.NOT_FOUND) {
        throw new Error(`Member not found: ${memberId}`);
      }
      // Log detailed error for debugging
      console.error('Airtable error in getMemberJourney:', error);
      throw new Error('Unable to load member journey. Please check Airtable configuration.');
    }
    throw error;
  }
}
```

### 4. Query Handler - Add Missing Endpoint

**Current Problem:**
The `getAttendeesByCategory` endpoint is not handled in the query handler.

**Fix - Add Handler:**
```typescript
// In query.ts handler
if (type === 'attendees-by-category') {
  return await handleAttendeesByCategory(queryParams, forceRefresh);
}

async function handleAttendeesByCategory(params: QueryParams, forceRefresh: boolean): Promise<APIGatewayProxyResult> {
  const serviceId = params.serviceId;
  const category = params.category as AttendanceCategory;
  const departmentId = params.departmentId;

  if (!serviceId) return errorResponse(400, 'serviceId is required');
  if (!category) return errorResponse(400, 'category is required');

  try {
    const data = await queryService.getAttendeesByCategory(serviceId, category, departmentId);
    return successResponse(data);
  } catch (error) {
    console.error('Error fetching attendees by category:', error);
    return errorResponse(500, 'Failed to fetch attendees', error instanceof Error ? error.message : 'Unknown error');
  }
}
```

## Data Models

### API Response Structure

```typescript
// Consistent API response wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  timestamp: string;
}

// DrillDownMember array response
type AttendeesByCategoryResponse = ApiResponse<DrillDownMember[]>;
```

## Error Handling

### Frontend Error Handling Strategy

```typescript
// Safe API call wrapper
async function safeApiCall<T>(
  apiCall: () => Promise<{ data: T }>,
  defaultValue: T
): Promise<T> {
  try {
    const response = await apiCall();
    return response?.data ?? defaultValue;
  } catch (error) {
    console.error('API call failed:', error);
    return defaultValue;
  }
}

// Usage
const members = await safeApiCall(
  () => churchApi.attendance.getAttendeesByCategory(serviceId, category),
  [] // default to empty array
);
```

### Backend Error Handling Strategy

```typescript
// Wrap Airtable operations with detailed error handling
async function safeAirtableOperation<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Airtable error in ${context}:`, error);
    if (error instanceof AirtableError) {
      // Log but don't crash - return null for graceful degradation
      return null;
    }
    throw error;
  }
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Drill-Down Modal Array Safety

*For any* input passed as the `members` prop to the AttendanceDrillDownModal component, if the input is not a valid array (null, undefined, object, string, number), the component SHALL render without throwing errors and SHALL display an empty state or appropriate message.

**Validates: Requirements 2.2, 2.3, 2.4, 2.5**

### Property 2: Backend Error Response Consistency

*For any* error that occurs in the backend API handlers, the error response SHALL have a consistent structure containing: `success: false`, an `error` string message, and a `timestamp` ISO string.

**Validates: Requirements 4.3**

## Testing Strategy

### Dual Testing Approach

The system uses both unit tests and property-based tests to ensure correctness:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all valid inputs

### Testing Framework

- **Unit Testing**: Vitest with React Testing Library (frontend), Jest (backend)
- **Property-Based Testing**: fast-check library
- **Component Testing**: React Testing Library for UI components

### Test Configuration

```typescript
// Property test configuration
const PBT_CONFIG = {
  numRuns: 100,  // Minimum iterations per property
};
```

### Unit Test Focus Areas

1. **Navigation Component**
   - Verify all tabs render
   - Verify active state styling
   - Verify role-based tab visibility

2. **Attendance Drill-Down Modal**
   - Test with valid array data
   - Test with empty array
   - Test with null/undefined
   - Test modal open/close behavior

3. **PastorDashboard Drill-Down Handler**
   - Test API response handling
   - Test error state handling
   - Test loading state

4. **Member Journey Page**
   - Test error message display
   - Test retry button functionality
   - Test loading state

5. **Backend Query Handler**
   - Test attendees-by-category endpoint
   - Test error response format
   - Test missing parameter handling

### Property Test Focus Areas

1. **Drill-Down Modal Robustness**
   - Generate various non-array inputs
   - Verify no crashes occur
   - Verify graceful degradation

2. **Backend Error Consistency**
   - Generate various error scenarios
   - Verify response structure is consistent

### Test File Organization

```
frontend/src/
├── components/dashboard/
│   └── AttendanceDrillDownModal.test.tsx
├── pages/dashboard/
│   └── PastorDashboard.test.tsx
├── pages/members/
│   └── MemberJourney.test.tsx
└── layouts/
    └── MainLayout.test.tsx

test/
└── query-han