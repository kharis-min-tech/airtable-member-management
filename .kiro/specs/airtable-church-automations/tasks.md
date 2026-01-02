# Implementation Plan: Church Member Management Automation System

## Overview

This implementation plan covers the AWS Lambda automation layer and React frontend for the church member management system. Tasks are organized to build foundational components first, then handlers, then the frontend, with property-based tests integrated throughout.

## Tasks

- [-] 1. Project Setup and Infrastructure
  - [x] 1.1 Initialize TypeScript project with AWS CDK
    - Create package.json with dependencies (aws-cdk, aws-sdk, airtable, fast-check, jest)
    - Configure TypeScript with strict mode
    - Set up Jest for testing with fast-check integration
    - _Requirements: 12.1, 12.3_

  - [x] 1.2 Create CDK stack for Lambda functions and API Gateway
    - Define Lambda function resources for each handler
    - Configure API Gateway with routes for webhooks and query endpoints
    - Set up environment variables for Airtable configuration
    - _Requirements: 12.1, 12.2_

  - [x] 1.3 Create DynamoDB tables for caching and configuration
    - Create Cache table with TTL configuration
    - Create ChurchConfig table for multi-tenant configuration
    - Create UserMapping table for Cognito-to-Airtable mapping
    - _Requirements: 12.1, 21.1_

  - [x] 1.4 Set up Cognito User Pool for authentication
    - Create user pool with email sign-in
    - Configure user groups for roles (pastor, admin, follow_up, department_lead)
    - Set up app client for frontend
    - _Requirements: 20.1, 20.2, 20.3_

- [x] 2. Airtable Service Client
  - [x] 2.1 Implement AirtableClient class with rate limiting
    - Create client with configurable base ID and API key
    - Implement request throttling (5 requests/second)
    - Implement exponential backoff retry logic
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 2.2 Implement record CRUD operations
    - Implement getRecord, createRecord, updateRecord methods
    - Implement findRecords with filterFormula support
    - Implement batch operations (batchCreate, batchUpdate)
    - _Requirements: 14.3, 14.4_

  - [x] 2.3 Implement findByUniqueKey method for deduplication
    - Search by phone number with normalization
    - Search by email with case-insensitive matching
    - Return first match or null
    - _Requirements: 11.1, 2.1, 3.1_

  - [x] 2.4 Write property test for Member Search Correctness
    - **Property 2: Member Search Correctness**
    - **Validates: Requirements 2.1, 3.1**

- [x] 3. Member Service Implementation
  - [x] 3.1 Implement MemberService with create and update operations
    - Implement createMember with all required fields
    - Implement updateMember with partial updates
    - Implement findMemberByPhoneOrEmail using AirtableClient
    - _Requirements: 1.1, 2.4, 3.4_

  - [x] 3.2 Implement member merge logic
    - Implement mergeMembers to combine two member records
    - Preserve oldest Date First Captured
    - Consolidate linked records (Attendance, Home Visits, Follow-up)
    - Fill empty fields without overwriting non-empty values
    - _Requirements: 2.3, 11.2, 11.3, 11.4_

  - [x] 3.3 Write property test for First Timer Merge Preserves Existing Data
    - **Property 3: First Timer Merge Preserves Existing Data**
    - **Validates: Requirements 2.2, 2.3, 2.6**

  - [x] 3.4 Write property test for Duplicate Detection and Merge Correctness
    - **Property 10: Duplicate Detection and Merge Correctness**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**

- [x] 4. Checkpoint - Core Services
  - Ensure all tests pass, ask the user if questions arise.

- [-] 5. Evangelism Handler Implementation
  - [x] 5.1 Implement handleEvangelismCreated Lambda handler
    - Parse webhook payload from Airtable
    - Check for existing member by phone/email
    - Create member record with Status "Evangelism Contact", Source "Evangelism"
    - Copy all fields (First Name, Last Name, Phone, Email, GhanaPost Code)
    - Set Date First Captured from evangelism Date
    - Link evangelism record to member
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 5.2 Write property test for Evangelism to Member Creation Completeness
    - **Property 1: Evangelism to Member Creation Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 6. Follow-up Service Implementation
  - [x] 6.1 Implement FollowUpService with assignment operations
    - Implement createAssignment with due date calculation (assigned + 3 days)
    - Implement getVolunteerCapacity to check current assignments
    - Implement findAvailableVolunteer to find volunteer with capacity
    - _Requirements: 4.1, 4.2, 4.3, 5.2_

  - [x] 6.2 Implement follow-up assignment in evangelism flow
    - Create follow-up assignment to Captured By volunteer
    - Update member's Follow-up Owner field
    - _Requirements: 4.1, 4.4_

  - [x] 6.3 Implement reassignment logic for capacity overflow
    - Check if current owner has >= 20 assignments
    - Find available volunteer if capacity exceeded
    - Create new assignment and mark old as "Reassigned"
    - Log warning if no volunteer available
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 6.4 Write property test for Follow-up Assignment Creation
    - **Property 6: Follow-up Assignment Creation**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [x] 6.5 Write property test for Follow-up Reassignment on Capacity
    - **Property 7: Follow-up Reassignment on Capacity**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 7. Attendance Service Implementation
  - [x] 7.1 Implement AttendanceService with marking operations
    - Implement markPresent to create/update attendance record
    - Implement findAttendance to check for existing record
    - Handle idempotency (update if exists, create if not)
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_

  - [x] 7.2 Write property test for Attendance Marking Idempotency
    - **Property 8: Attendance Marking Idempotency**
    - **Validates: Requirements 6.1, 6.2, 6.3, 7.1, 7.2, 7.3**

- [-] 8. First Timer Handler Implementation
  - [x] 8.1 Implement handleFirstTimerCreated Lambda handler
    - Parse webhook payload
    - Search for existing member by phone/email
    - If match with "Evangelism Contact": update status, merge fields, check reassignment
    - If no match: create new member with Status "First Timer", Source "First Timer Form"
    - Link first timer record to member
    - Update First Service Attended if empty
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 8.2 Integrate attendance marking in first timer flow
    - Call AttendanceService.markPresent with Source Form "First Timer"
    - _Requirements: 6.1, 6.2_

  - [x] 8.3 Write property test for First Timer New Member Creation
    - **Property 4: First Timer New Member Creation**
    - **Validates: Requirements 2.4, 2.5**

- [ ] 9. Returner Handler Implementation
  - [ ] 9.1 Implement handleReturnerCreated Lambda handler
    - Parse webhook payload
    - Search for existing member by phone/email
    - If match: update status to "Returner" if applicable, link record
    - If no match: return error indicating First Timer form should be used
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 9.2 Integrate attendance marking in returner flow
    - Call AttendanceService.markPresent with Source Form "Returner"
    - _Requirements: 7.1, 7.2_

  - [ ] 9.3 Write property test for Returner Processing Rules
    - **Property 5: Returner Processing Rules**
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [ ] 10. Checkpoint - All Handlers Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Programs Handler Implementation
  - [ ] 11.1 Implement handleProgramUpdated Lambda handler
    - Check if all four sessions are completed
    - Update member's Membership Completed date if not already set
    - _Requirements: 10.3, 10.4_

  - [ ] 11.2 Write property test for Program Completion Triggers Member Update
    - **Property 9: Program Completion Triggers Member Update**
    - **Validates: Requirements 10.3, 10.4**

- [ ] 12. Error Handling and Logging
  - [ ] 12.1 Implement centralized error handling
    - Create AppError class with error codes
    - Implement retry logic with exponential backoff
    - _Requirements: 13.1, 13.3, 13.4_

  - [ ] 12.2 Implement error notification system
    - Send notifications for critical errors
    - Log all errors with full context
    - _Requirements: 13.1, 13.2_

  - [ ] 12.3 Implement health check endpoint
    - Create Lambda for health check
    - Verify Airtable connectivity
    - _Requirements: 13.5_

- [ ] 13. Cache Service Implementation
  - [ ] 13.1 Implement CacheService with DynamoDB
    - Implement get, set, invalidate operations
    - Configure TTL (15 minutes default)
    - _Requirements: 21.1, 21.2_

  - [ ] 13.2 Implement cache refresh functionality
    - Implement invalidatePattern for bulk invalidation
    - Support manual refresh trigger
    - _Requirements: 21.3, 21.4_

  - [ ] 13.3 Write property test for Cache Invalidation on Refresh
    - **Property 15: Cache Invalidation on Refresh**
    - **Validates: Requirements 21.3, 21.4, 21.5**

- [ ] 14. Query Service Implementation
  - [ ] 14.1 Implement dashboard KPI queries
    - getServiceKPIs: total attendance, first timers, returners
    - getEvangelismStats: week/month toggle with Sunday-Saturday week
    - getFollowUpSummary: assignments by volunteer
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ] 14.2 Implement attendance explorer queries
    - getServiceAttendanceBreakdown: attendees by group
    - getDepartmentAttendance: percentage calculation
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [ ] 14.3 Write property test for Attendance Percentage Calculation
    - **Property 11: Attendance Percentage Calculation**
    - **Validates: Requirements 16.4, 16.5**

  - [ ] 14.4 Implement service comparison query
    - compareTwoServices: bidirectional missing members
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [ ] 14.5 Write property test for Service Comparison Bidirectional Correctness
    - **Property 12: Service Comparison Bidirectional Correctness**
    - **Validates: Requirements 17.2, 17.3**

  - [ ] 14.6 Implement member journey query
    - getMemberJourney: aggregate timeline from all sources
    - Sort events chronologically
    - Include all milestone types
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [ ] 14.7 Write property test for Timeline Chronological Ordering
    - **Property 13: Timeline Chronological Ordering**
    - **Validates: Requirements 18.2, 18.3**

  - [ ] 14.8 Implement admin quick view queries
    - getTodaysFollowUps, getNewFirstTimers, getIncompleteEvangelismRecords
    - getUnassignedMembers, getVisitedMembers, getDepartmentRosters
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

- [ ] 15. Checkpoint - Backend Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Authentication Service Implementation
  - [ ] 16.1 Implement AuthService with Cognito integration
    - Implement validateToken to verify JWT
    - Implement getUserRole from Cognito groups
    - _Requirements: 20.1, 20.2, 20.3_

  - [ ] 16.2 Implement role-based data filtering
    - Filter queries based on user role
    - Follow-up team: only assigned members
    - Department lead: only department members
    - _Requirements: 20.4, 20.5, 20.6, 20.7_

  - [ ] 16.3 Write property test for Role-Based Data Filtering
    - **Property 14: Role-Based Data Filtering**
    - **Validates: Requirements 20.4, 20.5, 20.6**

- [ ] 17. Frontend Setup
  - [ ] 17.1 Initialize React application with TypeScript
    - Create React app with Vite
    - Configure TypeScript, ESLint, Prettier
    - Set up routing with React Router
    - _Requirements: 15.1, 16.1, 17.1, 18.1, 19.1_

  - [ ] 17.2 Set up authentication with AWS Amplify
    - Configure Amplify with Cognito
    - Implement login/logout flow
    - Create AuthContext for role-based rendering
    - _Requirements: 20.1, 20.2, 20.3_

  - [ ] 17.3 Create API client for backend communication
    - Implement fetch wrapper with auth headers
    - Add error handling and retry logic
    - Implement cache-aware requests with refresh support
    - _Requirements: 21.3, 21.4_

- [ ] 18. Pastor Dashboard Interface
  - [ ] 18.1 Create KPI tiles component
    - Display total attendance, first timers, returners
    - Implement service selector
    - _Requirements: 15.1, 15.7_

  - [ ] 18.2 Create evangelism stats component with toggle
    - Week/month toggle (Sunday-Saturday week)
    - Display contact count
    - _Requirements: 15.1, 15.2, 15.3_

  - [ ] 18.3 Create attendance breakdown chart
    - Chart showing First Timers, Returners, Departments, Evangelism Contacts
    - _Requirements: 15.4_

  - [ ] 18.4 Create follow-up tables
    - Souls assigned to individuals grouped by Follow-up Owner
    - Consolidated follow-up comments with date filter
    - _Requirements: 15.5, 15.6_

- [ ] 19. Service Attendance Explorer Interface
  - [ ] 19.1 Create service selector component
    - Record picker for service selection
    - _Requirements: 16.1_

  - [ ] 19.2 Create attendees list component
    - Display all attendees for selected service
    - _Requirements: 16.2_

  - [ ] 19.3 Create department breakdown component
    - Show attendance by department with percentages
    - Highlight departments below 50% threshold
    - _Requirements: 16.3, 16.4, 16.5, 16.6_

- [ ] 20. Missing Members List Interface
  - [ ] 20.1 Create dual service selector
    - Two service pickers for comparison
    - _Requirements: 17.1_

  - [ ] 20.2 Create bidirectional comparison display
    - Show members in A missing from B
    - Show members in B missing from A
    - Display member details and export option
    - _Requirements: 17.2, 17.3, 17.4, 17.5, 17.6_

- [ ] 21. Member Journey Interface
  - [ ] 21.1 Create member profile component
    - Display all member details
    - _Requirements: 18.1_

  - [ ] 21.2 Create timeline component
    - Chronological event display
    - Include all event types (evangelism, attendance, visits, programs, milestones)
    - _Requirements: 18.2, 18.3, 18.4_

  - [ ] 21.3 Create journey summary component
    - Display key dates and metrics
    - _Requirements: 18.5_

  - [ ] 21.4 Create member search and navigation
    - Search by name, phone, email
    - Navigate between profiles
    - _Requirements: 18.6, 18.7_

- [ ] 22. Admin Quick Views Interface
  - [ ] 22.1 Create quick view components
    - Today's Follow-ups Due
    - New First Timers (last 1 month)
    - Evangelism Contacts (Incomplete data)
    - No Follow-up Owner Assigned
    - _Requirements: 19.1, 19.2, 19.3, 19.4_

  - [ ] 22.2 Create additional admin views
    - Visited members + last visited date
    - Department membership lists
    - Attendance by Service grouped by Department
    - _Requirements: 19.5, 19.6, 19.7_

- [ ] 23. Data Refresh UI
  - [ ] 23.1 Implement refresh controls
    - Add "Last Updated" timestamp to all views
    - Add "Refresh Now" button
    - Implement Live Mode toggle (30-second polling)
    - _Requirements: 21.2, 21.3, 21.4, 21.5, 21.6_

- [ ] 24. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all interfaces render correctly
  - Test role-based access control

## Notes

- All tasks including property-based tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases

## Configuration Required From User

Before starting implementation, you will need to provide the following:

### Airtable Configuration
1. **Airtable API Key** - Generate from https://airtable.com/account (or create a Personal Access Token)
2. **Airtable Base ID** - Found in your base URL: `https://airtable.com/[BASE_ID]/...`
3. **Webhook Secret** (optional) - For validating webhook requests

### AWS Configuration
1. **AWS Account** - You'll need an AWS account with permissions to create:
   - Lambda functions
   - API Gateway
   - DynamoDB tables
   - Cognito User Pools
   - S3 buckets
   - CloudFront distributions
2. **AWS CLI configured** - Run `aws configure` with your access key and secret
3. **AWS Region** - Which region to deploy to (e.g., `eu-west-2` for London)

### Application Configuration
1. **Admin Email(s)** - For error notifications
2. **Church Name** - For multi-tenant identification
3. **Default Follow-up Due Days** - Currently set to 3 days
4. **Volunteer Capacity Limit** - Currently set to 20

These will be stored as environment variables and in DynamoDB configuration. The code will read from environment variables, so no secrets are hardcoded.
