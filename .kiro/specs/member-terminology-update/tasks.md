# Implementation Plan: Member Terminology Update

## Overview

This plan outlines the step-by-step implementation of the member terminology update. The approach follows a layered strategy, starting with type definitions and moving up through services, API handlers, frontend, and tests. Each task builds on previous tasks to ensure a smooth, incremental implementation.

## Tasks

- [x] 1. Update core type definitions
  - Update `src/types/index.ts` to rename interfaces and types
  - Rename `Volunteer` interface to `FollowUpMember`
  - Rename `VolunteerRole` type to `MemberRole`
  - Rename `volunteerId` to `followUpMemberId` in `UserContext` interface
  - Rename `volunteerCapacityLimit` to `memberCapacityLimit` in `ChurchConfig` interface
  - Update `CapacityInfo` interface property names
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.1 Write property test for type definition consistency
  - **Property 3: User Mapping Property Names**
  - **Validates: Requirements 3.2**

- [x] 2. Update Airtable client constants
  - Update `src/services/airtable-client.ts`
  - Remove `VOLUNTEERS: 'Volunteers'` from `AIRTABLE_TABLES` constant
  - Add comment explaining that follow-up members are stored in the Members table
  - _Requirements: 13.1_

- [x] 2.1 Write property test for Airtable table references
  - **Property 10: No Volunteer Table References**
  - **Validates: Requirements 13.1, 13.2**

- [x] 3. Update FollowUpService
  - Update `src/services/follow-up-service.ts`
  - Rename constant `DEFAULT_VOLUNTEER_CAPACITY` to `DEFAULT_MEMBER_CAPACITY`
  - Update error codes: `VOLUNTEER_NOT_FOUND` → `FOLLOW_UP_MEMBER_NOT_FOUND`, `NO_AVAILABLE_VOLUNTEER` → `NO_AVAILABLE_FOLLOW_UP_MEMBER`
  - Rename method `getVolunteerCapacity` to `getFollowUpMemberCapacity`
  - Rename method `findAvailableVolunteer` to `findAvailableFollowUpMember`
  - Rename method `getAssignmentsByVolunteer` to `getAssignmentsByFollowUpMember`
  - Update all parameter names from `volunteerId` to `followUpMemberId`
  - Update all local variable names from `volunteer*` to `followUpMember*`
  - Update method `mapRecordToVolunteer` to `mapRecordToFollowUpMember`
  - Update all JSDoc comments to use "member" terminology
  - Update configuration property access from `volunteerCapacityLimit` to `memberCapacityLimit`
  - _Requirements: 2.1, 2.2, 2.5, 2.6, 9.1, 9.2_

- [x] 3.1 Write property test for capacity configuration
  - **Property 1: Capacity Configuration Consistency**
  - **Validates: Requirements 2.2, 9.1**

- [x] 3.2 Write property test for error codes
  - **Property 2: Error Code Terminology Consistency**
  - **Validates: Requirements 2.5, 10.2**

- [x] 4. Update ConfigService
  - Update `src/services/config-service.ts`
  - Update `getChurchConfig` method to use `memberCapacityLimit` instead of `volunteerCapacityLimit`
  - Update `getUserMapping` return type to use `followUpMemberId` instead of `volunteerId`
  - Update DynamoDB field mapping to use `followUpMemberId`
  - Update `saveUserMapping` method parameter to use `followUpMemberId`
  - Update all JSDoc comments
  - _Requirements: 3.2, 9.2_

- [x] 5. Update AuthService
  - Update `src/services/auth-service.ts`
  - Update `UserContext` usage to use `followUpMemberId` instead of `volunteerId`
  - Update `DataScope` type to use `followUpMemberId` in the "assigned" scope
  - Update `getDataScope` method to use `followUpMemberId`
  - Update `filterMembersByScope` to use `followUpMemberId`
  - Update `canAccessMember` to use `followUpMemberId`
  - Update `buildMemberFilterFormula` to use `followUpMemberId` in code (keep Airtable field names unchanged)
  - Update `logAccessAttempt` to log `followUpMemberId`
  - Update all JSDoc comments
  - _Requirements: 3.1, 3.3, 3.4, 3.5_

- [x] 5.1 Write property test for data scope filtering
  - **Property 4: Data Scope Filtering Correctness**
  - **Validates: Requirements 3.3**

- [x] 5.2 Write property test for filter formula construction
  - **Property 5: Filter Formula Construction**
  - **Validates: Requirements 3.4**

- [x] 6. Update ErrorService
  - Update `src/services/error-service.ts`
  - Update `ErrorCode` enum: `NO_AVAILABLE_VOLUNTEER` → `NO_AVAILABLE_FOLLOW_UP_MEMBER`
  - Update `CRITICAL_ERROR_CODES` array to use new error code
  - Update error messages to use "member" terminology
  - _Requirements: 2.5, 10.2_

- [x] 7. Update QueryService
  - Update `src/services/query-service.ts`
  - Replace all references to `AIRTABLE_TABLES.VOLUNTEERS` with `AIRTABLE_TABLES.MEMBERS`
  - Update all local variable names from `volunteer*` to `followUpMember*`
  - Update all parameter names from `volunteer*` to `followUpMember*`
  - Update comments to use "member" terminology
  - Ensure Airtable field names remain unchanged (e.g., "Assigned To")
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 13.2_

- [x] 7.1 Write property test for Airtable table and field usage
  - **Property 8: Airtable Table and Field Usage**
  - **Validates: Requirements 7.3, 7.4, 11.3, 13.4**

- [ ] 8. Checkpoint - Ensure backend tests pass
  - Run all backend unit tests
  - Run all backend property-based tests
  - Fix any failing tests
  - Ensure all tests pass, ask the user if questions arise

- [x] 9. Update API handlers
  - Update all handler files in `src/handlers/`
  - Update response transformations to use `followUpMemberId` instead of `volunteerId`
  - Update all local variable names from `volunteer*` to `followUpMember*`
  - Update error responses to use new error codes
  - Update JSDoc comments
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9.1 Write property test for API response property names
  - **Property 6: API Response Property Names**
  - **Validates: Requirements 4.1, 4.2**

- [x] 10. Update frontend type definitions
  - Update `frontend/src/types/index.ts`
  - Update `UserContext` interface to use `followUpMemberId` instead of `volunteerId`
  - Update any other interfaces that reference volunteer terminology
  - _Requirements: 6.1, 6.3_

- [x] 11. Update frontend AuthContext
  - Update `frontend/src/contexts/AuthContext.tsx`
  - Update token extraction to use `custom:followUpMemberId` instead of `custom:volunteerId`
  - Update context value to use `followUpMemberId`
  - Update all variable names from `volunteerId` to `followUpMemberId`
  - _Requirements: 6.2_

- [x] 11.1 Write property test for auth context property extraction
  - **Property 7: Authentication Context Property Extraction**
  - **Validates: Requirements 6.2**

- [x] 12. Update frontend components
  - Update `frontend/src/components/admin/TodaysFollowUpsView.tsx`
    - Change placeholder text to "Search by member or follow-up member name..."
  - Update `frontend/src/components/dashboard/FollowUpCommentsTable.tsx`
    - Change table header from "Volunteer" to "Follow-up Member"
    - Update property access from `volunteerName` to `followUpMemberName`
    - Update search filter to use `followUpMemberName`
  - Update any other components that reference volunteer terminology
  - Update all component prop names from `volunteer*` to `followUpMember*`
  - Update all state variable names from `volunteer*` to `followUpMember*`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 13. Update frontend tests
  - Update `frontend/src/layouts/MainLayout.test.tsx`
    - Change test description from "volunteer role" to "follow-up member role"
  - Update any other frontend tests that reference volunteer terminology
  - Update mock data to use `followUpMember*` property names
  - Update assertions to check for new property names
  - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 14. Checkpoint - Ensure frontend tests pass
  - Run all frontend unit tests
  - Run all frontend component tests
  - Fix any failing tests
  - Ensure all tests pass, ask the user if questions arise

- [x] 15. Update backend test suites
  - Update `test/follow-up-service.property.test.ts`
    - Update test descriptions to use "member" terminology
    - Update variable names from `volunteer*` to `followUpMember*`
    - Update mock data to use new property names
    - Update assertions to check for new error codes
  - Update `test/auth-service.property.test.ts`
    - Update test descriptions and variable names
    - Update assertions to check for `followUpMemberId`
  - Update `test/member-terminology.property.test.ts` (if it exists)
    - Update all terminology references
  - Update any other test files that reference volunteer terminology
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 15.1 Write property test for error message terminology
  - **Property 9: Error Message Terminology**
  - **Validates: Requirements 10.2**

- [x] 16. Update configuration and documentation
  - Update environment variable documentation to reference `memberCapacityLimit`
  - Update README files to use "member" terminology
  - Update any API documentation to show new property names
  - Update inline code comments throughout the codebase
  - _Requirements: 9.3, 9.4, 12.1, 12.2, 12.3, 12.4, 14.1, 14.2, 14.3, 14.4_

- [x] 17. Final checkpoint - Run all tests
  - Run complete backend test suite
  - Run complete frontend test suite
  - Run all property-based tests (minimum 100 iterations each)
  - Verify all tests pass
  - Ensure all tests pass, ask the user if questions arise

- [x] 18. Manual verification
  - Start the application locally
  - Verify UI displays "Follow-up Member" labels
  - Verify search placeholders use correct terminology
  - Test API endpoints and verify response property names
  - Test error scenarios and verify error messages
  - Verify no console errors about missing properties
  - Verify all existing features work correctly (backward compatibility)
  - _Requirements: 11.4, 11.5_

## Notes

- All property-based tests are required for comprehensive validation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: types → services → API → frontend → tests
- No Airtable schema changes or data migration required
- All changes can be deployed in a single release
