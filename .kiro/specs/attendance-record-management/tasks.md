# Implementation Plan: Attendance Record Management

## Overview

Incrementally add attendance mutation capabilities across the backend (AirtableClient, AttendanceService, new Lambda handler), CDK infrastructure (API Gateway PUT/DELETE routes), and frontend (churchApi methods, inline edit/delete UI in AttendeesListCard, confirmation dialog). Each task builds on the previous, with property tests validating core logic early.

## Tasks

- [ ] 1. Add `deleteRecord()` to AirtableClient
  - [ ] 1.1 Add `deleteRecord(tableId: string, recordId: string): Promise<void>` method to `src/services/airtable-client.ts`
    - Follow the same pattern as `updateRecord()`: rate-limited, uses `executeWithRetry`, calls `this.buildUrl(tableId, recordId)` with `DELETE` method
    - Handle error responses using existing `handleErrorResponse`
    - _Requirements: 4.1_
  - [ ] 1.2 Write unit tests for `deleteRecord` in `test/airtable-client.test.ts`
    - Test successful delete (200/204 response)
    - Test 404 response throws `AirtableErrorCode.NOT_FOUND`
    - Test 429 response triggers retry
    - _Requirements: 4.1, 4.3_

- [ ] 2. Add mutation methods to AttendanceService
  - [ ] 2.1 Add `updateAttendance(recordId: string, present: boolean): Promise<AttendanceRecord>` to `src/services/attendance-service.ts`
    - Validate recordId is non-empty
    - Call `airtableClient.getRecord()` to verify existence, throw `ATTENDANCE_NOT_FOUND` if not found
    - Call `airtableClient.updateRecord()` with `{ 'Present?': present }`
    - Return mapped `AttendanceRecord`
    - _Requirements: 2.1, 2.2_
  - [ ] 2.2 Add `softDeleteAttendance(recordId: string): Promise<AttendanceRecord>` to `src/services/attendance-service.ts`
    - Delegate to `updateAttendance(recordId, false)`
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 2.3 Add `hardDeleteAttendance(recordId: string): Promise<{ deletedId: string }>` to `src/services/attendance-service.ts`
    - Validate recordId is non-empty
    - Call `airtableClient.deleteRecord(AIRTABLE_TABLES.ATTENDANCE, recordId)`
    - Return `{ deletedId: recordId }`
    - _Requirements: 4.1, 4.2_
  - [ ] 2.4 Write property tests for AttendanceService mutations in `test/attendance-service-mutation.property.test.ts`
    - **Property 3: Update attendance returns record with correct present value**
    - **Validates: Requirements 2.1, 3.1, 3.2**
    - **Property 5: Hard-delete removes record and returns the deleted ID**
    - **Validates: Requirements 4.1, 4.2**

- [ ] 3. Create attendance mutation handler
  - [ ] 3.1 Create `src/handlers/attendance-mutation.ts` with Lambda handler
    - Extract user context from `event.requestContext.authorizer.claims`
    - Check role is `pastor` or `admin`, return 403 if not
    - Route PUT to `handleUpdateAttendance` (parse body for `recordId` and `present`)
    - Route DELETE to `handleDeleteAttendance` (parse `recordId` and `deleteType` from query params)
    - Invalidate cache after successful mutations using `CacheService`
    - Log audit entries with action, recordId, userId, email, timestamp, and value changes
    - Use existing `successResponse` / `errorResponse` patterns from query handler
    - _Requirements: 1.1, 1.2, 2.4, 4.4, 7.3, 7.4, 8.1, 8.2_
  - [ ] 3.2 Write property tests for mutation handler in `test/attendance-mutation-handler.property.test.ts`
    - **Property 1: Authorization accepts if and only if role is pastor or admin**
    - **Validates: Requirements 1.1, 1.2**
    - **Property 7: Handler routes mutations to correct service method**
    - **Validates: Requirements 7.3, 7.4**
    - **Property 8: Audit log entries contain all required fields**
    - **Validates: Requirements 8.1, 8.2**

- [ ] 4. Checkpoint - Backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Add API Gateway routes and mutation handler Lambda in CDK stack
  - [ ] 5.1 Update `lib/airtable-member-management-stack.ts`
    - Add new `attendanceMutationHandler` NodejsFunction pointing to `src/handlers/attendance-mutation.ts`
    - Grant DynamoDB read/write access to cache table (same role as query handler)
    - Store the attendance resource from `queryResource.addResource('attendance')` in a variable
    - Add PUT and DELETE methods on the attendance resource with `LambdaIntegration(attendanceMutationHandler)` and `authOptions`
    - _Requirements: 7.1, 7.2, 1.3_

- [ ] 6. Add frontend API methods for attendance mutations
  - [ ] 6.1 Add mutation methods to `frontend/src/services/church-api.ts` under `attendance`
    - `updatePresence(recordId: string, present: boolean)` — `apiClient.put<AttendanceRecord>('/query/attendance', { recordId, present })`
    - `softDelete(recordId: string)` — `apiClient.delete<AttendanceRecord>('/query/attendance?recordId=${recordId}&deleteType=soft')`
    - `hardDelete(recordId: string)` — `apiClient.delete<{ deletedId: string }>('/query/attendance?recordId=${recordId}&deleteType=hard')`
    - _Requirements: 2.1, 3.1, 4.1_

- [ ] 7. Create ConfirmDeleteDialog component
  - [ ] 7.1 Create `frontend/src/components/attendance/ConfirmDeleteDialog.tsx`
    - Props: `isOpen`, `attendeeName`, `onSoftDelete`, `onHardDelete`, `onCancel`, `isLoading`
    - Modal overlay with two action buttons: "Mark as Not Present" (soft) and "Remove Permanently" (hard)
    - Cancel button to close without action
    - Disable all buttons while `isLoading` is true
    - Clear descriptions of each delete type's consequence
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ] 7.2 Export `ConfirmDeleteDialog` from `frontend/src/components/attendance/index.ts`
    - _Requirements: 5.1_

- [ ] 8. Add inline edit/delete UI to AttendeesListCard
  - [ ] 8.1 Update `frontend/src/components/attendance/AttendeesListCard.tsx`
    - Add props: `userRole?: UserRole`, `onUpdatePresence?: (recordId: string, present: boolean) => Promise<void>`, `onDeleteRecord?: (recordId: string, deleteType: 'soft' | 'hard') => Promise<void>`
    - When `userRole` is `pastor` or `admin`, render a presence toggle (checkbox) and delete button per attendee row
    - Track per-row loading state to show spinner and disable actions during mutations
    - On toggle, call `onUpdatePresence` with the new value; on error, revert the toggle
    - On delete button click, open `ConfirmDeleteDialog`
    - _Requirements: 1.4, 1.5, 6.1, 6.2, 6.3, 6.4_

- [ ] 9. Wire mutations into AttendanceExplorer page
  - [ ] 9.1 Update `frontend/src/pages/attendance/AttendanceExplorer.tsx`
    - Import `useAuth` hook to get current user role
    - Add mutation handler functions that call `churchApi.attendance.updatePresence`, `softDelete`, `hardDelete`
    - On success, call `refreshBreakdown()` and `refreshDepartments()` to reload data
    - On error, display error notification (use existing error handling patterns)
    - Pass `userRole`, `onUpdatePresence`, and `onDeleteRecord` to `AttendeesListCard`
    - _Requirements: 6.2, 6.4, 6.5_
  - [ ] 9.2 Write unit tests for AttendanceExplorer mutation wiring
    - Test that mutation callbacks call correct churchApi methods
    - Test that data refreshes after successful mutation
    - Test that error is displayed on mutation failure
    - _Requirements: 6.2, 6.4, 6.5_

- [ ] 10. Final checkpoint - All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The existing `AttendeesListCard` currently shows summary stats, not individual attendee rows. Task 8.1 will need to extend it to show per-attendee rows with the service attendees data (from `churchApi.attendance.getServiceAttendees`)
- Property tests validate universal correctness properties using fast-check with Jest
- Unit tests validate specific examples and edge cases
