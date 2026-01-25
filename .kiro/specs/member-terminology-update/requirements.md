# Requirements Document

## Introduction

This specification addresses the terminology update from "volunteers" to "members" throughout the church member management application. The change reflects the church's assimilation model where all participants are considered "members" who may take on various roles and responsibilities as they grow in the church, rather than having a separate "volunteer" designation.

**Important Context:** The Airtable database schema already reflects this model - there is no "Volunteers" table. All participants are stored in the "Members" table, and those who perform follow-up duties are simply members with specific roles. This update is primarily a code-level terminology change to align the application code with the existing data model.

## Glossary

- **System**: The Church Member Management Automation System (backend and frontend)
- **Member**: A person in the church database who may have various roles and responsibilities
- **Follow_Up_Member**: A member who has the role of providing follow-up support to other members (previously referred to as "volunteer" in code)
- **Codebase**: All source code files including backend services, frontend components, type definitions, tests, and documentation
- **API_Response**: Data returned from backend API endpoints
- **Database_Query**: Airtable queries and filters used to retrieve data
- **Type_Definition**: TypeScript interfaces and type declarations
- **UI_Component**: React components that render user interface elements
- **Test_Suite**: Unit tests and property-based tests
- **Airtable_Schema**: The existing Airtable database structure (which already uses "Members" table for all participants)

## Requirements

### Requirement 1: Update Type Definitions

**User Story:** As a developer, I want all TypeScript type definitions to use "member" terminology, so that the codebase accurately reflects the current data model.

#### Acceptance Criteria

1. THE System SHALL rename the `Volunteer` interface to `FollowUpMember` in type definitions
2. THE System SHALL rename the `VolunteerRole` type to `MemberRole` in type definitions
3. THE System SHALL rename all `volunteerId` properties to `memberId` in interfaces
4. THE System SHALL rename `volunteerCapacityLimit` to `memberCapacityLimit` in configuration types
5. THE System SHALL update all type imports to use the new naming conventions

### Requirement 2: Update Backend Services

**User Story:** As a developer, I want all backend service code to use "member" terminology, so that the code is consistent with the domain model.

#### Acceptance Criteria

1. THE System SHALL rename the `FollowUpService` class methods to use "member" instead of "volunteer"
2. WHEN referencing capacity limits, THE System SHALL use `memberCapacityLimit` instead of `volunteerCapacityLimit`
3. THE System SHALL update all variable names containing "volunteer" to use "member" or "followUpMember"
4. THE System SHALL update all function parameters containing "volunteer" to use "member" or "followUpMember"
5. THE System SHALL update error codes from `VOLUNTEER_NOT_FOUND` to `FOLLOW_UP_MEMBER_NOT_FOUND` and `NO_AVAILABLE_VOLUNTEER` to `NO_AVAILABLE_FOLLOW_UP_MEMBER`
6. THE System SHALL update all comments and documentation strings to use "member" terminology

### Requirement 3: Update Authentication and Authorization

**User Story:** As a developer, I want authentication and authorization code to use "member" terminology, so that user context accurately reflects the domain model.

#### Acceptance Criteria

1. THE System SHALL rename `volunteerId` to `followUpMemberId` in the `UserContext` interface
2. THE System SHALL update the `ConfigService.getUserMapping` method to return `followUpMemberId` instead of `volunteerId`
3. THE System SHALL update the `AuthService` to use `followUpMemberId` in data scope calculations
4. THE System SHALL update all filter formulas to reference follow-up members instead of volunteers
5. THE System SHALL update access logging to use "followUpMemberId" instead of "volunteerId"

### Requirement 4: Update API Endpoints and Handlers

**User Story:** As a developer, I want API responses to use "member" terminology, so that frontend applications receive consistent data structures.

#### Acceptance Criteria

1. WHEN API endpoints return user context, THE System SHALL include `followUpMemberId` instead of `volunteerId`
2. WHEN API endpoints return follow-up assignments, THE System SHALL use "assignedToMember" instead of "assignedToVolunteer"
3. THE System SHALL update all API handler functions to use "member" terminology in variable names
4. THE System SHALL update all API response transformations to use the new property names

### Requirement 5: Update Frontend Components

**User Story:** As a user, I want the user interface to display "member" terminology, so that the application reflects current church practices.

#### Acceptance Criteria

1. WHEN displaying follow-up assignments, THE System SHALL show "Follow-up Member" instead of "Volunteer"
2. WHEN displaying search interfaces, THE System SHALL use placeholder text like "Search by member or follow-up member name"
3. THE System SHALL update all UI labels, headers, and text content to use "member" terminology
4. THE System SHALL update all component prop names containing "volunteer" to use "member" or "followUpMember"
5. THE System SHALL update all state variable names containing "volunteer" to use "member" or "followUpMember"

### Requirement 6: Update Frontend Type Definitions

**User Story:** As a developer, I want frontend TypeScript types to use "member" terminology, so that frontend code is consistent with backend types.

#### Acceptance Criteria

1. THE System SHALL update the frontend `UserContext` interface to use `followUpMemberId` instead of `volunteerId`
2. THE System SHALL update the `AuthContext` to extract and store `followUpMemberId` from authentication tokens
3. THE System SHALL update all frontend type imports to use the new naming conventions

### Requirement 7: Update Database Queries and Filters

**User Story:** As a developer, I want database queries to use "member" terminology in code, so that query logic is clear and maintainable.

#### Acceptance Criteria

1. THE System SHALL update Airtable filter formulas to use "member" in variable names and comments
2. THE System SHALL update query builder methods to use "member" terminology in parameters
3. THE System SHALL continue to query the "Members" table in Airtable (no table name changes needed)
4. THE System SHALL continue to use existing Airtable field names like "Assigned To" in the "Follow-up Assignments" table (which links to Members)

### Requirement 8: Update Test Suites

**User Story:** As a developer, I want all tests to use "member" terminology, so that test code is consistent with production code.

#### Acceptance Criteria

1. THE System SHALL update all test descriptions to use "member" instead of "volunteer"
2. THE System SHALL update all test variable names containing "volunteer" to use "member" or "followUpMember"
3. THE System SHALL update all test assertions to reference the new property names
4. THE System SHALL update property-based test generators to use "member" terminology
5. WHEN tests create mock data, THE System SHALL use "member" terminology in mock object properties

### Requirement 9: Update Configuration and Constants

**User Story:** As a developer, I want configuration values to use "member" terminology, so that system configuration is clear and consistent.

#### Acceptance Criteria

1. THE System SHALL rename `DEFAULT_VOLUNTEER_CAPACITY` to `DEFAULT_MEMBER_CAPACITY`
2. THE System SHALL rename `volunteerCapacityLimit` configuration property to `memberCapacityLimit`
3. THE System SHALL update all configuration documentation to use "member" terminology
4. THE System SHALL update environment variable names and references to use "member" terminology where applicable

### Requirement 10: Update Error Messages and Logging

**User Story:** As a developer, I want error messages and logs to use "member" terminology, so that debugging and monitoring are clear.

#### Acceptance Criteria

1. WHEN logging capacity warnings, THE System SHALL reference "follow-up member" instead of "volunteer"
2. WHEN throwing errors, THE System SHALL use error messages with "member" terminology
3. THE System SHALL update all console.log and console.warn statements to use "member" terminology
4. THE System SHALL update error code descriptions to use "member" terminology

### Requirement 11: Maintain Backward Compatibility

**User Story:** As a system administrator, I want the system to continue working with existing Airtable data, so that no data migration is required.

#### Acceptance Criteria

1. THE System SHALL continue to query the "Members" table in Airtable (no table name changes)
2. THE System SHALL continue to use existing Airtable field names (e.g., "Assigned To" field in "Follow-up Assignments" table)
3. WHEN mapping Airtable records to application types, THE System SHALL correctly transform data to use the new terminology in code
4. THE System SHALL maintain all existing functionality while using updated terminology in code
5. THE System SHALL NOT require any Airtable schema changes or data migration

### Requirement 13: Remove Unused Table References

**User Story:** As a developer, I want to remove references to non-existent tables, so that the code accurately reflects the database schema.

#### Acceptance Criteria

1. THE System SHALL remove the `VOLUNTEERS` constant from `AIRTABLE_TABLES` (as this table does not exist in Airtable)
2. THE System SHALL update any code that references `AIRTABLE_TABLES.VOLUNTEERS` to use `AIRTABLE_TABLES.MEMBERS` instead
3. THE System SHALL verify that no queries attempt to access a "Volunteers" table
4. THE System SHALL update any mapping functions that assume a separate "Volunteers" table exists

### Requirement 14: Update Documentation and Comments

**User Story:** As a developer, I want code documentation to use "member" terminology, so that documentation accurately describes the system.

#### Acceptance Criteria

1. THE System SHALL update all JSDoc comments to use "member" instead of "volunteer"
2. THE System SHALL update all inline code comments to use "member" terminology
3. THE System SHALL update all requirement references in comments to use "member" terminology
4. THE System SHALL update all README files and documentation to use "member" terminology
