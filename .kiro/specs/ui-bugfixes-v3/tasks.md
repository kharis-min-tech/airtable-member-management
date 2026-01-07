# Implementation Plan: UI Bug Fixes v3

## Overview

This implementation plan addresses three critical bugs: navigation not displaying, attendance drill-down modal crashing, and member journey API errors. Tasks are organized to fix the most impactful issues first.

## Tasks

- [x] 1. Fix Attendance Drill-Down Modal Error
  - [x] 1.1 Add missing attendees-by-category handler in backend query.ts
    - Add handler for type='attendees-by-category'
    - Extract serviceId, category, and departmentId from query params
    - Call queryService.getAttendeesByCategory and return response
    - _Requirements: 2.1, 2.2_

  - [x] 1.2 Add null-safe handling in PastorDashboard handleCategoryClick
    - Ensure response.data is checked with Array.isArray() before setting state
    - Default to empty array if response is null/undefined/not-array
    - Add error handling for failed API calls
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 1.3 Add defensive array check in AttendanceDrillDownModal
    - Add Array.isArray() check in MemberList component before .map()
    - Default to empty array if members prop is invalid
    - _Requirements: 2.5_

  - [x] 1.4 Write property test for Drill-Down Modal Array Safety
    - **Property 1: Drill-Down Modal Array Safety**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**

- [x] 2. Fix Navigation Display Issue
  - [x] 2.1 Investigate and fix MainLayout navigation rendering
    - Check if navigation is being rendered in DOM
    - Verify CSS classes are not hiding navigation
    - Ensure ProtectedRoute passes children correctly
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Write unit tests for MainLayout navigation
    - Test that all navigation tabs render
    - Test active state styling
    - Test role-based tab visibility
    - _Requirements: 1.1, 1.2_

- [x] 3. Fix Member Journey API Error
  - [x] 3.1 Improve error handling in getMemberJourney
    - Wrap Airtable calls in try-catch blocks
    - Return user-friendly error messages for permission errors
    - Log detailed errors for debugging
    - _Requirements: 3.2, 3.4_

  - [x] 3.2 Add better error display in MemberJourney page
    - Ensure error messages are clear and actionable
    - Verify retry button works correctly
    - _Requirements: 3.2, 3.5_

  - [x] 3.3 Write property test for Backend Error Response Consistency
    - **Property 2: Backend Error Response Consistency**
    - **Validates: Requirements 4.3**

- [x] 4. Checkpoint - Verify All Fixes
  - Ensure all tests pass
  - Test the fixes manually in the browser
  - Ask the user if questions arise

## Notes

- All tasks including tests are required for comprehensive coverage
- The drill-down modal fix is highest priority as it causes visible crashes
- Navigation fix may require CSS debugging
- Member journey fix depends on Airtable configuration being correct
