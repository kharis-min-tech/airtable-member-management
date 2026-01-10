# Requirements Document

## Introduction

This specification addresses critical bug fixes for the church member management system UI. The issues include navigation not displaying, attendance drill-down modal crashing when clicking chart bars, and member journey page failing to load with Airtable permission errors.

## Glossary

- **Navigation_Component**: The main navigation bar/tabs that allow users to switch between pages
- **Attendance_Drill_Down_Modal**: A modal component that displays member details when clicking on attendance breakdown chart bars
- **Member_Journey_Page**: A page that displays a member's complete journey timeline
- **API_Response**: The data structure returned from backend API calls

## Requirements

### Requirement 1: Fix Navigation Display

**User Story:** As a user, I want to see the navigation tabs when I'm logged in, so that I can navigate between different pages of the application.

#### Acceptance Criteria

1. WHEN a user is authenticated and viewing any protected page, THE Navigation_Component SHALL be visible in the header
2. THE Navigation_Component SHALL display all configured tabs (Dashboard, Attendance Explorer, Missing Members, Member Journey, Admin)
3. WHEN the MainLayout component renders, THE Navigation_Component SHALL render without errors
4. IF the navigation is hidden due to CSS issues, THE System SHALL correct the styling to ensure visibility

### Requirement 2: Fix Attendance Drill-Down Modal Error

**User Story:** As a pastor, I want to click on attendance breakdown chart bars without errors, so that I can see which members are in each category.

#### Acceptance Criteria

1. WHEN a user clicks on an attendance breakdown chart bar, THE System SHALL open the drill-down modal without throwing errors
2. WHEN the API returns attendees data, THE System SHALL ensure the data is an array before passing to the modal
3. IF the API response is null or undefined, THE System SHALL default to an empty array
4. IF the API response has an unexpected structure, THE System SHALL handle it gracefully and display an appropriate message
5. THE Drill_Down_Modal SHALL validate that the members prop is an array before calling .map()

### Requirement 3: Fix Member Journey API Error

**User Story:** As a user, I want to view a member's journey page without permission errors, so that I can see their complete timeline.

#### Acceptance Criteria

1. WHEN a user navigates to a member journey page, THE System SHALL fetch the member data without Airtable permission errors
2. IF the Airtable API returns a permission error, THE System SHALL display a user-friendly error message
3. THE Backend SHALL use correct table names that match the Airtable base configuration
4. THE Backend SHALL handle cases where linked records reference non-existent tables gracefully
5. WHEN the member journey API fails, THE System SHALL provide a retry option and clear error details

### Requirement 4: Improve Error Handling

**User Story:** As a developer, I want better error handling throughout the application, so that users see helpful messages instead of crashes.

#### Acceptance Criteria

1. THE Frontend SHALL wrap API response data access in null-safe checks
2. THE Frontend SHALL provide default values for array props to prevent .map() errors
3. THE Backend SHALL return consistent error response structures
4. THE System SHALL log detailed error information for debugging while showing user-friendly messages
