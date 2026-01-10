# Requirements Document

## Introduction

This specification defines a set of UI/UX improvements and feature enhancements for the church member management system. The improvements focus on better navigation, removing API limits for historical data access, adding drill-down capabilities for attendance data, fixing the member journey page loading issue, simplifying the missing members comparison feature, and adding demo pages for stakeholder presentations.

## Glossary

- **Navigation_Tabs**: A tabbed navigation interface allowing users to easily switch between different pages/views
- **Service_Selector**: A UI component for selecting services, now without arbitrary limits on historical data
- **Attendance_Breakdown**: A chart/display showing attendance categorized by groups (First Timers, Returners, Departments, etc.)
- **Drill_Down**: The ability to click on a summary figure to see the detailed list of members that make up that figure
- **Missing_Members_Comparison**: A feature comparing attendance between two services to identify absent members
- **Demo_Page**: A page showing mock data for demonstration purposes to stakeholders

## Requirements

### Requirement 1: Enhanced Navigation Tabs

**User Story:** As a user, I want clear navigation tabs that are always visible and easy to use, so that I can quickly navigate between different pages of the application.

#### Acceptance Criteria

1. THE Navigation_Component SHALL display tabs for: Dashboard, Attendance Explorer, Missing Members, Member Journey, and Admin (for authorized users)
2. WHEN a user clicks on a navigation tab, THE System SHALL navigate to the corresponding page
3. THE Navigation_Component SHALL visually indicate the currently active tab
4. THE Navigation_Component SHALL be responsive and work well on both desktop and mobile devices
5. WHEN on mobile devices, THE Navigation_Component SHALL display a collapsible menu or horizontal scrollable tabs

### Requirement 2: Remove Service Limit for Historical Data Access

**User Story:** As an admin, I want to access services from any date in the past without arbitrary limits, so that I can analyze historical attendance data from months or years ago.

#### Acceptance Criteria

1. THE Service_Selector SHALL NOT impose a hard limit on the number of services returned
2. WHEN fetching services, THE API SHALL support pagination or lazy loading to handle large datasets efficiently
3. THE Service_Selector SHALL allow users to filter services by date range
4. THE Service_Selector SHALL support searching for services by name or date
5. WHEN displaying services, THE System SHALL sort them by date in descending order (most recent first)
6. THE System SHALL implement efficient caching to avoid repeated API calls for the same service data

### Requirement 3: Attendance Breakdown Drill-Down

**User Story:** As a pastor, I want to click on attendance breakdown figures to see which specific members make up that count, so that I can understand who attended in each category.

#### Acceptance Criteria

1. WHEN viewing the attendance breakdown chart on the dashboard, THE User SHALL be able to click on any category (First Timers, Returners, Departments, Evangelism Contacts)
2. WHEN a category is clicked, THE System SHALL display a modal or expandable section showing the list of members in that category
3. THE Drill_Down_View SHALL display member details including: Full Name, Phone, Email, and Status
4. THE Drill_Down_View SHALL allow the user to navigate to a member's journey page by clicking on their name
5. THE Drill_Down_View SHALL show the total count of members in the selected category
6. WHEN the drill-down view is open, THE User SHALL be able to close it and return to the summary view

### Requirement 4: Fix Member Journey Page Loading

**User Story:** As a user, I want the member journey page to load correctly when I select a member, so that I can view their complete journey timeline.

#### Acceptance Criteria

1. WHEN a user selects a member from search results, THE System SHALL navigate to the member journey page with the correct member ID
2. WHEN the member journey page loads with a member ID, THE System SHALL fetch and display the member's journey data
3. IF the member data fails to load, THE System SHALL display an appropriate error message with a retry option
4. WHILE the member data is loading, THE System SHALL display a loading indicator
5. THE Member_Journey_Page SHALL correctly parse the member ID from the URL parameters

### Requirement 5: Simplify Missing Members Comparison (Unidirectional)

**User Story:** As an admin, I want a simplified missing members comparison that shows only members present in Service A who are missing from Service B, so that the interface is less confusing.

#### Acceptance Criteria

1. THE Missing_Members_Interface SHALL display two service selectors: "Reference Service" (Service A) and "Comparison Service" (Service B)
2. WHEN both services are selected, THE System SHALL display only members who were present in Service A but absent in Service B
3. THE System SHALL NOT display the reverse comparison (present in B, missing in A)
4. THE Missing_Members_List SHALL show member details including: Full Name, Phone, Status, and Follow-up Owner
5. THE Missing_Members_Interface SHALL allow filtering by member status
6. THE Missing_Members_Interface SHALL provide an export option for the missing members list
7. THE Interface SHALL clearly label the comparison direction (e.g., "Members who attended [Service A] but missed [Service B]")

### Requirement 6: Demo Pages for Stakeholder Presentations

**User Story:** As a product owner, I want demo pages with realistic mock data for all major features, so that I can demonstrate the system's capabilities to stakeholders without needing live data.

#### Acceptance Criteria

1. THE System SHALL provide demo versions of: Dashboard, Attendance Explorer, Missing Members, Member Journey, and Admin Views
2. THE Demo_Pages SHALL use realistic mock data that demonstrates all features
3. THE Demo_Pages SHALL be accessible without authentication via a /demo/* route pattern
4. THE Demo_Pages SHALL include a visible banner indicating "Demo Mode" with mock data
5. WHEN a user interacts with demo pages, THE System SHALL simulate realistic behavior (filtering, searching, etc.)
6. THE Demo_Pages SHALL NOT make any API calls to the backend
7. THE Demo_Navigation SHALL allow users to navigate between different demo pages

### Requirement 7: Unit Test Coverage

**User Story:** As a developer, I want comprehensive unit tests for all new and modified functionality, so that I can ensure code quality and prevent regressions.

#### Acceptance Criteria

1. THE Test_Suite SHALL include unit tests for all new UI components
2. THE Test_Suite SHALL include unit tests for modified API service methods
3. THE Test_Suite SHALL include tests for the service pagination/filtering logic
4. THE Test_Suite SHALL include tests for the attendance drill-down functionality
5. THE Test_Suite SHALL achieve at least 80% code coverage for new code
6. WHEN tests are run, THE System SHALL report any failures with clear error messages

