# Requirements Document

## Introduction

This feature adds the ability to edit and delete attendance records from the frontend. Currently, attendance records can only be created via webhooks and viewed via the query handler. Pastors and admins need to correct attendance mistakes without logging into Airtable directly. The feature covers backend mutation APIs (update presence, soft-delete, hard-delete), API Gateway routing with Cognito authorization, frontend inline editing within the existing AttendanceExplorer page, and optional audit trail logging.

## Glossary

- **Attendance_Record**: An Airtable record linking a Member to a Service with a `Present?` boolean, a `Group Tag`, and a `Source Form`.
- **Mutation_Handler**: A new Lambda handler that processes POST/PUT/DELETE requests for attendance record modifications.
- **Soft_Delete**: Setting the `Present?` field of an Attendance_Record to `false` without removing the Airtable record.
- **Hard_Delete**: Permanently removing an Attendance_Record from the Airtable base.
- **Authorized_User**: A user authenticated via Cognito whose role is either `pastor` or `admin`.
- **AttendanceExplorer**: The existing frontend page that displays service attendance breakdowns and attendee lists.
- **AirtableClient**: The backend service that provides rate-limited, retry-capable access to the Airtable API.
- **AttendanceService**: The backend service that manages attendance record creation and queries.
- **Cache_Service**: The DynamoDB-backed caching layer used by the query handler.

## Requirements

### Requirement 1: Role-Based Access Control for Attendance Mutations

**User Story:** As a system administrator, I want only pastors and admins to modify attendance records, so that data integrity is maintained and unauthorized changes are prevented.

#### Acceptance Criteria

1. WHEN a user with the `pastor` or `admin` Cognito role sends a mutation request, THE Mutation_Handler SHALL process the request.
2. WHEN a user without the `pastor` or `admin` role sends a mutation request, THE Mutation_Handler SHALL reject the request with a 403 status code and a descriptive error message.
3. THE API Gateway SHALL route attendance mutation endpoints through the existing Cognito authorizer.
4. WHILE rendering the attendees list, THE AttendanceExplorer SHALL display edit and delete action controls only for Authorized_Users.
5. WHILE a user without the `pastor` or `admin` role views the attendees list, THE AttendanceExplorer SHALL hide all edit and delete action controls.

### Requirement 2: Update Attendance Presence

**User Story:** As a pastor, I want to toggle a member's attendance presence for a service, so that I can correct mistakes in attendance records.

#### Acceptance Criteria

1. WHEN an Authorized_User requests to update an Attendance_Record's `Present?` field, THE AttendanceService SHALL update the record in Airtable and return the updated Attendance_Record.
2. WHEN an Authorized_User requests to update a non-existent Attendance_Record, THE AttendanceService SHALL return a 404 error with the error code `ATTENDANCE_NOT_FOUND`.
3. WHEN the Airtable API returns a rate-limit or server error during an update, THE AirtableClient SHALL retry the request using exponential backoff.
4. WHEN an attendance update succeeds, THE Cache_Service SHALL invalidate all cached attendance data for the affected service.

### Requirement 3: Soft-Delete Attendance Record

**User Story:** As a pastor, I want to mark an attendee as not present without removing the record, so that the historical link between the member and the service is preserved.

#### Acceptance Criteria

1. WHEN an Authorized_User requests a soft-delete of an Attendance_Record, THE AttendanceService SHALL set the `Present?` field to `false` in Airtable.
2. WHEN a soft-delete succeeds, THE AttendanceService SHALL return the updated Attendance_Record with `present` set to `false`.
3. WHEN a soft-delete is requested for a non-existent Attendance_Record, THE AttendanceService SHALL return a 404 error with the error code `ATTENDANCE_NOT_FOUND`.

### Requirement 4: Hard-Delete Attendance Record

**User Story:** As an admin, I want to permanently remove an attendance record from Airtable, so that erroneous records are fully cleaned up.

#### Acceptance Criteria

1. WHEN an Authorized_User requests a hard-delete of an Attendance_Record, THE AirtableClient SHALL send a DELETE request to the Airtable API and remove the record.
2. WHEN a hard-delete succeeds, THE AttendanceService SHALL return a success response with the deleted record ID.
3. WHEN a hard-delete is requested for a non-existent Attendance_Record, THE AirtableClient SHALL return a 404 error.
4. WHEN a hard-delete succeeds, THE Cache_Service SHALL invalidate all cached attendance data for the affected service.

### Requirement 5: Confirmation Dialog for Delete Operations

**User Story:** As a pastor, I want to confirm before deleting an attendance record, so that I do not accidentally remove data.

#### Acceptance Criteria

1. WHEN an Authorized_User clicks a delete action on an attendee, THE AttendanceExplorer SHALL display a confirmation dialog before executing the delete.
2. THE confirmation dialog SHALL clearly distinguish between soft-delete and hard-delete options and describe the consequence of each.
3. WHEN the user cancels the confirmation dialog, THE AttendanceExplorer SHALL take no action and close the dialog.
4. WHEN the user confirms the deletion, THE AttendanceExplorer SHALL execute the selected delete type and display a success or error notification.

### Requirement 6: Frontend Inline Edit and Delete UI

**User Story:** As a pastor, I want to edit and delete attendance records inline within the attendees list, so that I can make corrections without navigating away from the page.

#### Acceptance Criteria

1. WHEN an Authorized_User views the attendees list for a selected service, THE AttendanceExplorer SHALL display a toggle control for the `Present?` field and a delete button on each attendee row.
2. WHEN an Authorized_User toggles the `Present?` field, THE AttendanceExplorer SHALL send an update request to the Mutation_Handler and reflect the new state upon success.
3. WHEN a mutation request is in progress, THE AttendanceExplorer SHALL display a loading indicator on the affected row and disable further actions on that row.
4. IF a mutation request fails, THEN THE AttendanceExplorer SHALL display an error notification with the error message and revert the UI to the previous state.
5. WHEN a mutation succeeds, THE AttendanceExplorer SHALL refresh the attendance data for the current service to reflect the change.

### Requirement 7: API Gateway Routing for Attendance Mutations

**User Story:** As a developer, I want dedicated API endpoints for attendance mutations, so that the backend cleanly separates read and write operations.

#### Acceptance Criteria

1. THE API Gateway SHALL expose a PUT method on the `/query/attendance` resource for updating attendance records, protected by the Cognito authorizer.
2. THE API Gateway SHALL expose a DELETE method on the `/query/attendance` resource for deleting attendance records, protected by the Cognito authorizer.
3. WHEN a PUT request is received, THE Mutation_Handler SHALL route to the update attendance logic based on the request body.
4. WHEN a DELETE request is received, THE Mutation_Handler SHALL route to the soft-delete or hard-delete logic based on the `deleteType` query parameter.

### Requirement 8: Audit Trail Logging (Optional)

**User Story:** As an admin, I want to know who modified or deleted an attendance record and when, so that changes can be traced for accountability.

#### Acceptance Criteria

1. WHEN an attendance record is updated or deleted, THE Mutation_Handler SHALL log the action type, record ID, user ID, user email, and timestamp to CloudWatch Logs.
2. THE audit log entry SHALL include the previous and new values of the modified field.
