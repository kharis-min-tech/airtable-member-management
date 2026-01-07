# Design Document: UI Improvements v2

## Overview

This design document covers a set of UI/UX improvements for the church member management system. The changes include enhanced navigation, removal of service API limits, attendance drill-down functionality, member journey page fixes, simplified missing members comparison, and comprehensive demo pages for stakeholder presentations.

The implementation follows the existing React/TypeScript frontend architecture with AWS Lambda backend, maintaining consistency with the current codebase patterns.

## Architecture

The improvements primarily affect the frontend layer with some backend API modifications:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND APPLICATION                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Navigation Component                            │    │
│  │  ┌─────────┐ ┌──────────┐  ┌─────────┐ ┌─────────┐ ┌─────────┐      │    │
│  │  │Dashboard│ │Attendance│  │ Missing │ │ Member  │ │  Admin  │      │    │
│  │  │   Tab   │ │   Tab    │  │   Tab   │ │Journey  │ │   Tab   │      │    │
│  │  └─────────┘ └──────────┘  └─────────┘ └─────────┘ └─────────┘      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Page Components                                │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │    │
│  │  │  Dashboard  │ │ Attendance  │ │   Missing   │ │   Member    │    │    │
│  │  │ + DrillDown │ │  Explorer   │ │  Members    │ │   Journey   │    │    │
│  │  │   Modal     │ │ + Filters   │ │(Simplified) │ │  (Fixed)    │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Demo Pages (No Auth)                           │    │
│  │  ┌──────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │    │
│  │  │Demo Dashboard│ │Demo Attend  │ │Demo Missing │ │Demo Journey │   │    │
│  │  │              │ │  Explorer   │ │   Members   │ │             │   │    │
│  │  └──────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               AWS LAMBDA                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Query Service                                │    │
│  │  - getAllServices() (no limit)                                      │    │
│  │  - getServicesByDateRange(start, end)                               │    │
│  │  - getAttendeesByCategory(serviceId, category)                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Service Pagination**: Instead of a hard limit, implement date-range filtering and lazy loading for services
2. **Drill-Down Modal**: Use a modal component for attendance drill-down to avoid page navigation
3. **Unidirectional Comparison**: Simplify the missing members feature to show only one direction
4. **Demo Route Pattern**: Use `/demo/*` routes that bypass authentication and use mock data
5. **Shared Components**: Reuse existing components between live and demo pages where possible

## Components and Interfaces

### 1. Enhanced Service Selector Component

```typescript
interface ServiceSelectorProps {
  services: Service[];
  selectedServiceId: string | null;
  onServiceChange: (serviceId: string) => void;
  isLoading?: boolean;
  label?: string;
  // New props for filtering
  enableDateFilter?: boolean;
  enableSearch?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

interface ServiceFilterState {
  searchQuery: string;
  startDate: string | null;
  endDate: string | null;
}
```

### 2. Attendance Drill-Down Modal

```typescript
interface AttendanceDrillDownProps {
  isOpen: boolean;
  onClose: () => void;
  category: AttendanceCategory;
  serviceId: string;
  serviceName: string;
  members: DrillDownMember[];
  isLoading: boolean;
  onMemberClick: (memberId: string) => void;
}

type AttendanceCategory = 
  | 'firstTimers' 
  | 'returners' 
  | 'evangelismContacts' 
  | 'department';

interface DrillDownMember {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  status: string;
}
```

### 3. Simplified Missing Members Interface

```typescript
interface MissingMembersProps {
  referenceServiceId: string | null;
  comparisonServiceId: string | null;
  onReferenceServiceChange: (id: string) => void;
  onComparisonServiceChange: (id: string) => void;
}

interface SimplifiedServiceComparison {
  referenceService: ServiceInfo;
  comparisonService: ServiceInfo;
  missingMembers: Member[];  // Only one direction now
}
```

### 4. Demo Navigation Component

```typescript
interface DemoNavigationProps {
  currentPage: DemoPage;
}

type DemoPage = 
  | 'dashboard' 
  | 'attendance' 
  | 'missing-members' 
  | 'member-journey' 
  | 'admin';
```

### 5. Updated Query Service Methods

```typescript
interface QueryService {
  // Existing methods...
  
  // New/Modified methods
  getAllServices(): Promise<Service[]>;
  getServicesByDateRange(startDate: Date, endDate: Date): Promise<Service[]>;
  searchServices(query: string): Promise<Service[]>;
  getAttendeesByCategory(
    serviceId: string, 
    category: AttendanceCategory
  ): Promise<DrillDownMember[]>;
  
  // Modified to return only one direction
  compareTwoServicesSimplified(
    referenceServiceId: string, 
    comparisonServiceId: string
  ): Promise<SimplifiedServiceComparison>;
}
```

## Data Models

### Service Filter Model

```typescript
interface ServiceFilter {
  startDate?: string;  // ISO date string
  endDate?: string;    // ISO date string
  searchQuery?: string;
  sortOrder: 'asc' | 'desc';
}
```

### Drill-Down Response Model

```typescript
interface CategoryDrillDownResponse {
  category: AttendanceCategory;
  categoryLabel: string;
  serviceId: string;
  serviceName: string;
  totalCount: number;
  members: DrillDownMember[];
}
```

### Demo Data Models

```typescript
// Mock data structures for demo pages
interface DemoData {
  services: Service[];
  members: Member[];
  kpis: Record<string, ServiceKPIs>;
  evangelismStats: Record<'week' | 'month', EvangelismStats>;
  soulsAssigned: SoulsAssignedByVolunteer[];
  followUpComments: FollowUpInteraction[];
  attendanceBreakdown: Record<string, AttendanceBreakdown>;
  memberJourneys: Record<string, MemberJourney>;
}
```

## Error Handling

### Service Loading Errors

```typescript
interface ServiceLoadError {
  type: 'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE';
  message: string;
  retryable: boolean;
}

// Error handling for member journey page
interface JourneyLoadError {
  type: 'MEMBER_NOT_FOUND' | 'NETWORK_ERROR' | 'INVALID_ID';
  message: string;
  memberId?: string;
}
```

### Retry Strategy

The existing retry strategy from the base implementation will be used:
- 3 retries with exponential backoff
- Clear error messages displayed to users
- Retry button available for failed requests



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Navigation Tab Click Routes Correctly

*For any* navigation tab in the Navigation_Component, when clicked, the system SHALL navigate to the corresponding route path that matches the tab's destination.

**Validates: Requirements 1.2**

### Property 2: Service List Has No Artificial Limit

*For any* number of services in the database, when fetching all services, the API SHALL return all services without imposing an arbitrary maximum limit.

**Validates: Requirements 2.1**

### Property 3: Service Date Range Filter Correctness

*For any* date range (startDate, endDate) and any set of services, the filtered result SHALL contain only services where serviceDate >= startDate AND serviceDate <= endDate.

**Validates: Requirements 2.3**

### Property 4: Service Search Returns Matching Results

*For any* search query string, the search results SHALL contain only services where the service name or date contains the search query (case-insensitive).

**Validates: Requirements 2.4**

### Property 5: Services Sorted by Date Descending

*For any* list of services returned by the API, the services SHALL be sorted by serviceDate in descending order (most recent first), such that for any adjacent pair (service[i], service[i+1]), service[i].serviceDate >= service[i+1].serviceDate.

**Validates: Requirements 2.5**

### Property 6: Drill-Down Member Count Matches List Length

*For any* attendance category drill-down, the displayed total count SHALL equal the length of the members list shown.

**Validates: Requirements 3.5**

### Property 7: Drill-Down Member Details Complete

*For any* member displayed in the drill-down view, the display SHALL include the member's Full Name, and SHALL include Phone, Email, and Status if those fields are present on the member record.

**Validates: Requirements 3.3**

### Property 8: Member Journey URL Parameter Parsing

*For any* valid member ID in the URL path `/members/:memberId`, the Member_Journey_Page SHALL correctly extract and use that member ID to fetch the member's journey data.

**Validates: Requirements 4.1, 4.2, 4.5**

### Property 9: Unidirectional Missing Members Comparison

*For any* two services A (reference) and B (comparison), the missing members result SHALL contain exactly those members who have attendance Present=true for Service A AND (no attendance record for Service B OR Present=false for Service B). The result SHALL NOT contain members who are only present in Service B.

**Validates: Requirements 5.2, 5.3**

### Property 10: Missing Members Status Filter

*For any* status filter applied to the missing members list, the filtered result SHALL contain only members whose status matches the selected filter value.

**Validates: Requirements 5.5**

### Property 11: Demo Pages Make No API Calls

*For any* interaction with demo pages (navigation, filtering, searching), the system SHALL NOT make any HTTP requests to the backend API endpoints.

**Validates: Requirements 6.6**

## Testing Strategy

### Dual Testing Approach

The system uses both unit tests and property-based tests to ensure correctness:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all valid inputs

### Testing Framework

- **Unit Testing**: Jest with React Testing Library
- **Property-Based Testing**: fast-check library
- **Component Testing**: React Testing Library for UI components

### Test Configuration

```typescript
// Property test configuration
const PBT_CONFIG = {
  numRuns: 100,  // Minimum iterations per property
  seed: undefined,  // Random seed for reproducibility when debugging
};
```

### Unit Test Focus Areas

1. **Navigation Component**
   - Tab rendering for different user roles
   - Active tab highlighting
   - Mobile responsive behavior

2. **Service Selector**
   - Date range filter UI
   - Search input behavior
   - Loading states

3. **Attendance Drill-Down**
   - Modal open/close behavior
   - Member list rendering
   - Navigation to member journey

4. **Member Journey Page**
   - URL parameter extraction
   - Loading and error states
   - Data display

5. **Missing Members (Simplified)**
   - Service selector behavior
   - Unidirectional comparison display
   - Export functionality

6. **Demo Pages**
   - Mock data rendering
   - Demo banner visibility
   - Navigation between demo pages

### Property Test Focus Areas

1. **Service Filtering Logic**
   - Date range filtering correctness
   - Search query matching
   - Sort order verification

2. **Comparison Logic**
   - Unidirectional comparison correctness
   - Status filtering

3. **Data Integrity**
   - Member count consistency
   - URL parameter handling

### Test File Organization

```
test/
├── frontend/
│   ├── components/
│   │   ├── navigation.test.tsx
│   │   ├── service-selector.test.tsx
│   │   ├── attendance-drilldown.test.tsx
│   │   └── missing-members.test.tsx
│   ├── pages/
│   │   ├── member-journey.test.tsx
│   │   └── demo-pages.test.tsx
│   └── services/
│       └── church-api.test.ts
├── services/
│   └── query-service.property.test.ts (updated)
```

