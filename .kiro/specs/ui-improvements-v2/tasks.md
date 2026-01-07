# Implementation Plan: UI Improvements v2

## Overview

This implementation plan covers the UI/UX improvements including enhanced navigation, service API changes, attendance drill-down, member journey fixes, simplified missing members, and demo pages. Tasks are organized to build foundational changes first, then UI components, then demo pages.

## Tasks

- [x] 1. Backend API Updates for Service Fetching
  - [x] 1.1 Update QueryService to support fetching all services without limit
    - Modify getRecentServices to accept optional limit parameter (default: no limit)
    - Add getAllServices method that returns all services
    - Ensure services are sorted by date descending
    - _Requirements: 2.1, 2.5_

  - [x] 1.2 Add service filtering by date range
    - Implement getServicesByDateRange(startDate, endDate) method
    - Add filterFormula for date range queries
    - _Requirements: 2.3_

  - [x] 1.3 Add service search functionality
    - Implement searchServices(query) method
    - Search by service name and date
    - _Requirements: 2.4_

  - [x] 1.4 Write property test for Services Sorted by Date Descending
    - **Property 5: Services Sorted by Date Descending**
    - **Validates: Requirements 2.5**

  - [x] 1.5 Write property test for Service Date Range Filter Correctness
    - **Property 3: Service Date Range Filter Correctness**
    - **Validates: Requirements 2.3**

- [x] 2. Backend API for Attendance Drill-Down
  - [x] 2.1 Add getAttendeesByCategory endpoint
    - Implement method to fetch members by attendance category (firstTimers, returners, evangelismContacts, department)
    - Return member details: id, fullName, phone, email, status
    - _Requirements: 3.2, 3.3_

  - [x] 2.2 Write property test for Drill-Down Member Details Complete
    - **Property 7: Drill-Down Member Details Complete**
    - **Validates: Requirements 3.3**

- [x] 3. Simplify Missing Members API
  - [x] 3.1 Update compareTwoServices to return unidirectional comparison
    - Modify to return only presentInAMissingInB
    - Remove presentInBMissingInA from response
    - Update response type to SimplifiedServiceComparison
    - _Requirements: 5.2, 5.3_

  - [x] 3.2 Write property test for Unidirectional Missing Members Comparison
    - **Property 9: Unidirectional Missing Members Comparison**
    - **Validates: Requirements 5.2, 5.3**

- [x] 4. Checkpoint - Backend Complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 5. Frontend Service Selector Enhancements
  - [x] 5.1 Update church-api.ts to support new service endpoints
    - Add getAllServices method
    - Add getServicesByDateRange method
    - Add searchServices method
    - Update getRecent to use optional limit
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 5.2 Create enhanced ServiceSelector component with filtering
    - Add date range filter inputs
    - Add search input
    - Implement lazy loading / load more functionality
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 5.3 Write unit tests for ServiceSelector component
    - Test date filter UI
    - Test search functionality
    - Test loading states
    - _Requirements: 7.1_

- [x] 6. Attendance Drill-Down Implementation
  - [x] 6.1 Create AttendanceDrillDownModal component
    - Modal with member list display
    - Show member details (name, phone, email, status)
    - Click handler to navigate to member journey
    - Close button functionality
    - _Requirements: 3.2, 3.3, 3.4, 3.6_

  - [x] 6.2 Update AttendanceBreakdownChart to support drill-down
    - Add click handlers to chart segments/bars
    - Pass category and serviceId to modal
    - _Requirements: 3.1_

  - [x] 6.3 Integrate drill-down modal into PastorDashboard
    - Add modal state management
    - Fetch attendees when category clicked
    - Display count in modal header
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 6.4 Write property test for Drill-Down Member Count Matches List Length
    - **Property 6: Drill-Down Member Count Matches List Length**
    - **Validates: Requirements 3.5**

  - [x] 6.5 Write unit tests for AttendanceDrillDownModal
    - Test modal open/close
    - Test member list rendering
    - Test navigation to member journey
    - _Requirements: 7.1_

- [x] 7. Fix Member Journey Page Loading
  - [x] 7.1 Debug and fix member ID extraction from URL
    - Verify useParams hook usage
    - Ensure memberId is correctly passed to API call
    - _Requirements: 4.5_

  - [x] 7.2 Fix API call triggering on member selection
    - Ensure useApi hook triggers when memberId changes
    - Add proper dependency array
    - _Requirements: 4.1, 4.2_

  - [x] 7.3 Improve error handling and loading states
    - Add clear error messages
    - Add retry button
    - Improve loading indicator
    - _Requirements: 4.3, 4.4_

  - [x] 7.4 Write property test for Member Journey URL Parameter Parsing
    - **Property 8: Member Journey URL Parameter Parsing**
    - **Validates: Requirements 4.1, 4.2, 4.5**

  - [x] 7.5 Write unit tests for MemberJourney page
    - Test URL parameter extraction
    - Test loading state
    - Test error state
    - _Requirements: 7.1_

- [x] 8. Simplify Missing Members UI
  - [x] 8.1 Update MissingMembers page for unidirectional comparison
    - Remove second comparison list (present in B, missing in A)
    - Update labels to clarify direction
    - Update export to only include one direction
    - _Requirements: 5.2, 5.3, 5.7_

  - [x] 8.2 Update service selector labels
    - Rename to "Reference Service" and "Comparison Service"
    - Add helper text explaining the comparison direction
    - _Requirements: 5.1, 5.7_

  - [x] 8.3 Write property test for Missing Members Status Filter
    - **Property 10: Missing Members Status Filter**
    - **Validates: Requirements 5.5**

  - [x] 8.4 Write unit tests for simplified MissingMembers page
    - Test unidirectional display
    - Test status filter
    - Test export functionality
    - _Requirements: 7.1_

- [x] 9. Checkpoint - Core Features Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Demo Pages Implementation
  - [x] 10.1 Create comprehensive mock data module
    - Create mockData.ts with realistic demo data
    - Include services, members, KPIs, attendance, journeys
    - Ensure data is interconnected and realistic
    - _Requirements: 6.2_

  - [x] 10.2 Create DemoLayout component with navigation
    - Demo banner indicating mock data mode
    - Navigation tabs for all demo pages
    - No authentication required
    - _Requirements: 6.3, 6.4, 6.7_

  - [x] 10.3 Create DemoAttendanceExplorer page
    - Use mock data for attendance breakdown
    - Include drill-down functionality with mock members
    - _Requirements: 6.1, 6.5_

  - [x] 10.4 Create DemoMissingMembers page
    - Use mock data for service comparison
    - Show unidirectional comparison with mock members
    - _Requirements: 6.1, 6.5_

  - [x] 10.5 Create DemoMemberJourney page
    - Use mock member journey data
    - Include timeline with various event types
    - Allow navigation between mock members
    - _Requirements: 6.1, 6.5_

  - [x] 10.6 Create DemoAdminViews page
    - Use mock data for admin quick views
    - Include all admin view types
    - _Requirements: 6.1, 6.5_

  - [x] 10.7 Update router with demo routes
    - Add /demo/dashboard (existing)
    - Add /demo/attendance
    - Add /demo/missing-members
    - Add /demo/members/:memberId
    - Add /demo/admin
    - _Requirements: 6.3_

  - [x] 10.8 Write property test for Demo Pages Make No API Calls
    - **Property 11: Demo Pages Make No API Calls**
    - **Validates: Requirements 6.6**

  - [x] 10.9 Write unit tests for demo pages
    - Test demo banner visibility
    - Test mock data rendering
    - Test navigation between demo pages
    - _Requirements: 7.1_

- [x] 11. Navigation Enhancement
  - [x] 11.1 Review and enhance MainLayout navigation
    - Ensure all tabs are clearly visible
    - Verify active state styling
    - Test mobile responsiveness
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 11.2 Write property test for Navigation Tab Click Routes Correctly
    - **Property 1: Navigation Tab Click Routes Correctly**
    - **Validates: Requirements 1.2**

  - [x] 11.3 Write unit tests for Navigation component
    - Test tab rendering
    - Test active state
    - Test role-based visibility
    - _Requirements: 7.1_

  - [ ] 12. Final Checkpoint
    - Ensure all tests pass, ask the user if questions arise.
    - Verify all demo pages work correctly
    - Test navigation flow end-to-end

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Demo pages should use the same components as live pages where possible to ensure consistency

