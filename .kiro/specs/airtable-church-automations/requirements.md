# Requirements Document

## Introduction

This specification defines the automation layer for a church member management system built on Airtable. The system uses AWS Lambda functions triggered by Airtable webhooks to handle complex business logic including member deduplication, automatic follow-up assignment, attendance marking, and data synchronization across tables. The solution must be reproducible for deployment to multiple churches.

## Glossary

- **Member**: A person tracked in the Members table with status (Member / First Timer / Returner / Evangelism Contact)
- **Soul**: A person contacted through evangelism outreach, initially captured in the Evangelism table
- **First_Timer**: A person attending church for the first time, registered via the First Timers Register form
- **Returner**: A previously registered person returning to church (this is not necessarily just after absence it can just be a regular attendee too)
- **Follow_up_Assignment**: A record linking a Member to a Volunteer responsible for their follow-up
- **Attendance_Record**: A record in the Attendance table linking a Member to a Service with presence status
- **Automation_Service**: The AWS Lambda-based system that processes Airtable events
- **Airtable_API**: The REST API provided by Airtable for programmatic data access
- **Webhook_Trigger**: An Airtable automation that sends HTTP requests to Lambda when records change
- **Unique_Key**: A formula field used to identify duplicate records (typically phone number or email)

## Requirements

### Requirement 1: Evangelism to Member Record Creation

**User Story:** As an admin, I want souls captured through evangelism to automatically appear in the Members table, so that I can track their journey from first contact.

#### Acceptance Criteria

1. WHEN a new record is created in the Evangelism table, THE Automation_Service SHALL create a corresponding record in the Members table with Status set to "Evangelism Contact" and Source set to "Evangelism"
2. WHEN creating the Member record, THE Automation_Service SHALL copy First Name, Last Name, Phone, Email, and GhanaPost Code from the Evangelism record
3. WHEN the Member record is created, THE Automation_Service SHALL link the Evangelism record's Linked Member field to the new Member record
4. WHEN creating the Member record, THE Automation_Service SHALL set Date First Captured to the Evangelism record's Date field

### Requirement 2: First Timer Deduplication and Merge

**User Story:** As an admin, I want first timer registrations to merge with existing evangelism contacts rather than creating duplicates, so that I maintain a single member record per person.

#### Acceptance Criteria

1. WHEN a First Timer Register record is created, THE Automation_Service SHALL search the Members table for existing records matching by Phone or Email
2. WHEN a matching Member record exists with Status "Evangelism Contact", THE Automation_Service SHALL update the existing record's Status to "First Timer" but SHALL NOT update Source to "First Timer Form"
3. WHEN a matching Member record exists, THE Automation_Service SHALL merge any missing fields (Address, GhanaPost Code, Email) from the First Timer registration into the existing Member record without overwriting existing non-empty values
4. WHEN no matching Member record exists, THE Automation_Service SHALL create a new Member record with Status "First Timer" and Source "First Timer Form"
5. WHEN the merge or creation completes, THE Automation_Service SHALL link the First Timers Register record's Linked Member field to the Member record
6. WHEN updating an existing Member record, THE Automation_Service SHALL update First Service Attended if it was previously empty

### Requirement 3: Returner Registration Processing

**User Story:** As an admin, I want returner registrations to link to existing member records and update their information, so that I can track returning members accurately.

#### Acceptance Criteria

1. WHEN a Returners Register record is created, THE Automation_Service SHALL search the Members table for existing records matching by Phone or Email
2. WHEN a matching Member record exists, THE Automation_Service SHALL update the Status to "Returner" if currently "First Timer" or "Evangelism Contact"
3. WHEN a matching Member record exists, THE Automation_Service SHALL link the Returners Register record's Linked Member field to the Member record
4. WHEN no matching Member record exists, THE Automation_Service SHALL fail indicating the user to use the First Timer registration form instead as all Returners should already exist in the system

### Requirement 4: Automatic Follow-up Assignment for Evangelism

**User Story:** As a follow-up coordinator, I want evangelism contacts to be automatically assigned to the soul winner who captured them, so that follow-up begins immediately.

#### Acceptance Criteria

1. WHEN a new Evangelism record is created, THE Automation_Service SHALL create a Follow-up Assignment record linking the Member to that Volunteer (Soul Winner)
2. WHEN creating the Follow-up Assignment, THE Automation_Service SHALL set Assigned Date to the current date and Status to "Assigned"
3. WHEN creating the Follow-up Assignment, THE Automation_Service SHALL set Due Date to 3 days from the Assigned Date
4. WHEN the Follow-up Assignment is created, THE Automation_Service SHALL update the Member's Follow-up Owner field to the assigned Volunteer

### Requirement 5: Follow-up Reassignment on First Church Visit

**User Story:** As a follow-up coordinator, I want first timers to potentially be reassigned to a different follow-up person based on capacity, so that workload is balanced.

#### Acceptance Criteria

1. WHEN a First Timer registration is processed for an existing Evangelism Contact, THE Automation_Service SHALL check if reassignment is needed based on Volunteer capacity
2. WHEN the current Follow-up Owner has reached their Capacity limit (20), THE Automation_Service SHALL find an available Volunteer with Role "Follow-up" and Active status who has not reached capacity
3. WHEN a new Volunteer is assigned, THE Automation_Service SHALL create a new Follow-up Assignment with Status "Reassigned" for the previous assignment and "Assigned" for the new one
4. IF no available Volunteer exists with capacity, THEN THE Automation_Service SHALL retain the current assignment and log a warning for admin review

### Requirement 6: Attendance Marking from First Timer Registration

**User Story:** As an admin, I want first timers to be automatically marked as present for the service they registered at, so that attendance is accurate without manual entry.

#### Acceptance Criteria

1. WHEN a First Timers Register record is created with a linked Service, THE Automation_Service SHALL create an Attendance record linking the Member to that Service
2. WHEN creating the Attendance record, THE Automation_Service SHALL set Present? to true and Source Form to "First Timer"
3. WHEN the Attendance record already exists for that Member and Service combination, THE Automation_Service SHALL update Present? to true rather than creating a duplicate

### Requirement 7: Attendance Marking from Returner Registration

**User Story:** As an admin, I want returners to be automatically marked as present for the service they registered at, so that attendance is accurate without manual entry.

#### Acceptance Criteria

1. WHEN a Returners Register record is created with a linked Service, THE Automation_Service SHALL create an Attendance record linking the Member to that Service
2. WHEN creating the Attendance record, THE Automation_Service SHALL set Present? to true and Source Form to "Returner"
3. WHEN the Attendance record already exists for that Member and Service combination, THE Automation_Service SHALL update Present? to true rather than creating a duplicate

### Requirement 8: Follow-up and Home Visit Date Tracking

**User Story:** As a pastor, I want to see when members were first and last followed up or visited, so that I can monitor engagement quality.

#### Acceptance Criteria

1. WHEN a Follow-up Interaction record is created for a Member, THE Automation_Service SHALL update the Member's rollup fields to reflect first and last follow-up dates
2. WHEN a Home Visit record is created for a Member, THE Automation_Service SHALL update the Member's Last Visited rollup and Visited? checkbox
3. WHEN the Home Visit is the first for that Member, THE Automation_Service SHALL ensure the Visits Count rollup reflects the correct count
4. THE Members table SHALL have rollup fields configured to automatically calculate First Followed Up, Last Followed Up, First Visited, and Last Visited dates

### Requirement 9: Department Membership Synchronization

**User Story:** As an admin, I want department sign-ups to automatically update both the member's department list and the department's roster, so that data stays consistent.

#### Acceptance Criteria

1. WHEN a Member Departments junction record is created, THE Automation_Service SHALL verify the bidirectional link between Member and Department is established
2. WHEN a Member Departments record is marked as Active = false, THE Automation_Service SHALL NOT remove the record but maintain it for historical tracking
3. WHEN querying a Member's departments, THE system SHALL filter by Active = true to show current memberships
4. WHEN querying a Department's roster, THE system SHALL filter by Active = true to show current members

### Requirement 10: New Believers Program Status Updates

**User Story:** As a discipleship coordinator, I want member program completion status to update automatically when sessions are marked complete, so that I can track spiritual growth progress.

#### Acceptance Criteria

1. WHEN a Member Programs record has all four Session Completed checkboxes set to true, THE Program Completed formula SHALL evaluate to true
2. WHEN Program Completed becomes true, THE Completion Date formula SHALL calculate the latest Session Date among the four sessions
3. WHEN a Member Programs record is created or updated, THE Automation_Service SHALL update the linked Member's relevant program tracking fields
4. WHEN all sessions are completed for New Believers program, THE Automation_Service SHALL update the Member's Membership Completed date if not already set

### Requirement 11: Duplicate Prevention

**User Story:** As an admin, I want the system to prevent duplicate member records from being created, so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN any automation creates or updates a Member record, THE Automation_Service SHALL first check for existing records using the Unique Key formula (based on Phone and/or Email)
2. WHEN a potential duplicate is detected, THE Automation_Service SHALL merge records rather than create new ones
3. WHEN merging records, THE Automation_Service SHALL preserve the oldest Date First Captured value
4. WHEN merging records, THE Automation_Service SHALL combine linked records (Attendance, Home Visits, Follow-up Interactions) under the surviving Member record
5. IF automatic merge is not possible due to conflicting data, THEN THE Automation_Service SHALL flag the records for manual admin review

### Requirement 12: Multi-Church Deployment Support

**User Story:** As a system administrator, I want the automation system to be easily deployable to multiple church Airtable bases, so that other churches can use the same solution.

#### Acceptance Criteria

1. THE Automation_Service SHALL use environment variables for Airtable Base ID and API Key configuration
2. THE Automation_Service SHALL NOT contain hardcoded references to specific record IDs or base-specific values
3. THE Automation_Service SHALL use table and field names that match the standardized schema
4. WHEN deploying to a new church, THE administrator SHALL only need to configure environment variables and set up Airtable webhook triggers
5. THE Automation_Service SHALL include deployment documentation with step-by-step setup instructions

### Requirement 13: Error Handling and Logging

**User Story:** As an admin, I want automation errors to be logged and reported, so that I can troubleshoot issues and ensure data integrity.

#### Acceptance Criteria

1. WHEN an automation fails, THE Automation_Service SHALL log the error with full context (record IDs, operation attempted, error message)
2. WHEN a critical automation fails (member creation, attendance marking), THE Automation_Service SHALL send a notification to configured admin contacts
3. THE Automation_Service SHALL implement retry logic for transient failures (API rate limits, network issues)
4. WHEN retries are exhausted, THE Automation_Service SHALL log the failure and continue processing other records
5. THE Automation_Service SHALL expose a health check endpoint for monitoring

### Requirement 14: API Rate Limit Management

**User Story:** As a system administrator, I want the automation to respect Airtable API rate limits, so that the system remains stable and reliable.

#### Acceptance Criteria

1. THE Automation_Service SHALL implement request throttling to stay within Airtable's 5 requests per second limit
2. WHEN rate limit errors are received, THE Automation_Service SHALL implement exponential backoff retry logic
3. WHEN processing batch operations, THE Automation_Service SHALL use Airtable's batch API endpoints to minimize request count
4. THE Automation_Service SHALL queue requests during high-volume periods and process them sequentially


### Requirement 15: Pastor Dashboard Interface

**User Story:** As a pastor, I want a dashboard showing key metrics and follow-up status at a glance, so that I can monitor church health and member engagement.

#### Acceptance Criteria

1. THE Pastor_Dashboard SHALL display KPI tiles showing: Total attendance (for selected service), First timers count (for selected service), Returners count (for selected service), and Evangelism contacts (with week/month toggle)
2. WHEN the week/month toggle is set to "week", THE Pastor_Dashboard SHALL calculate evangelism contacts from Sunday to Saturday of the current week
3. WHEN the week/month toggle is set to "month", THE Pastor_Dashboard SHALL calculate evangelism contacts from the 1st to last day of the current month
4. THE Pastor_Dashboard SHALL display a chart showing attendance breakdown by group (First Timers, Returners, Departments, Evangelism Contacts)
5. THE Pastor_Dashboard SHALL display a table showing "Souls/Contacts assigned to individuals" grouped by Follow-up Owner
6. THE Pastor_Dashboard SHALL display a table showing "Consolidated follow-up comments" from Follow-up Interactions with date range filter
7. THE Pastor_Dashboard SHALL allow selection of a specific Service to filter attendance-related metrics

### Requirement 16: Service Attendance Explorer Interface

**User Story:** As an admin, I want to explore attendance details for any service with department breakdowns, so that I can analyze participation patterns.

#### Acceptance Criteria

1. THE Attendance_Explorer SHALL provide a Service selector (single select or record picker) to choose which service to analyze
2. WHEN a Service is selected, THE Attendance_Explorer SHALL display a list of all attendees for that service
3. THE Attendance_Explorer SHALL display attendance breakdown by departments and other groups (First Timers, Returners, Evangelism Contacts)
4. THE Attendance_Explorer SHALL calculate and display attendance percentage for each department as (present members / active members in department) × 100
5. WHEN calculating department attendance percentage, THE Attendance_Explorer SHALL use the count of Members with Active = true in Member Departments for that department as the denominator
6. THE Attendance_Explorer SHALL visually highlight departments with attendance below a configurable threshold (default 85%)

### Requirement 17: Missing Members List Interface

**User Story:** As an admin, I want to compare attendance between two services to identify who was missing, so that I can follow up with absent members.

#### Acceptance Criteria

1. THE Missing_List_Interface SHALL provide two Service selectors: Service A and Service B
2. WHEN both services are selected, THE Missing_List_Interface SHALL display members present in Service A but absent in Service B
3. THE Missing_List_Interface SHALL also display members present in Service B but absent in Service A (bidirectional comparison)
4. THE Missing_List_Interface SHALL show member details including: Full Name, Phone, Follow-up Owner, and Last Service Attended
5. THE Missing_List_Interface SHALL allow filtering the missing list by department or member status
6. THE Missing_List_Interface SHALL provide an export option for the missing members list

### Requirement 18: Member Journey Timeline Interface

**User Story:** As a pastor or follow-up team member, I want to see a complete timeline of a member's journey through the church, so that I can understand their engagement history and spiritual growth.

#### Acceptance Criteria

1. THE Member_Journey_Interface SHALL display a member profile page with all member details (name, contact info, status, source, etc.)
2. THE Member_Journey_Interface SHALL display a chronological timeline combining events from multiple sources sorted by date
3. THE timeline SHALL include: Evangelism date(s) when first contacted, First timer registration date, All services attended from Attendance records, All home visits with dates and visitor names, All follow-up interactions with dates and volunteer names
4. THE timeline SHALL include milestone events: Department join dates, New Believers program session completion dates (Sessions 1-4), Water baptism date, Membership completion date, Spiritual maturity completion date
5. THE Member_Journey_Interface SHALL display summary metrics: "First Evangelised" date, "First Visited" date, "First Attended" date, "Last Attended" date, "Visits Count" (total home visits), "Assigned Follow-up Person"
6. THE Member_Journey_Interface SHALL allow navigation between member profiles
7. THE Member_Journey_Interface SHALL provide a search function to find members by name, phone, or email

### Requirement 19: Admin Quick Views Interface

**User Story:** As an admin, I want pre-configured views for common tasks, so that I can quickly access the information I need without manual filtering.

#### Acceptance Criteria

1. THE Admin_Views SHALL include a "Today's Follow-ups Due" view showing Follow-up Assignments where Due Date equals today and Status is not "Completed"
2. THE Admin_Views SHALL include a "New First Timers (last 1 month)" view showing Members with Status "First Timer" and Date First Captured within the last 30 days
3. THE Admin_Views SHALL include an "Evangelism Contacts (Incomplete data)" view showing Evangelism records where Data Completeness formula indicates missing required fields
4. THE Admin_Views SHALL include a "No Follow-up Owner Assigned" view showing Members where Follow-up Owner is empty and Status is not "Member" or "Integrated"
5. THE Admin_Views SHALL include a "Visited Members + Last Visited Date" view showing Members where Visited? is true, sorted by Last Visited date descending
6. THE Admin_Views SHALL include "Department Membership Lists" views showing active members grouped by Department
7. THE Admin_Views SHALL include an "Attendance by Service" view grouped first by Service then by Department

### Requirement 20: Role-Based Access Control

**User Story:** As a system administrator, I want different user roles to see only the data relevant to their responsibilities, so that data privacy is maintained and interfaces are not cluttered.

#### Acceptance Criteria

1. THE Interface_System SHALL support the following roles: Pastor, Admin, Follow-up Team, Department Lead
2. WHEN a user with role "Pastor" accesses the system, THE Interface_System SHALL grant access to all interfaces and all data
3. WHEN a user with role "Admin" accesses the system, THE Interface_System SHALL grant access to all interfaces and all data
4. WHEN a user with role "Follow-up Team" accesses the system, THE Interface_System SHALL restrict Member Journey and follow-up views to only show members assigned to that volunteer
5. WHEN a user with role "Department Lead" accesses the system, THE Interface_System SHALL restrict views to only show members who are active in their department(s)
6. WHEN a Department Lead accesses the Attendance Explorer, THE Interface_System SHALL only show attendance data for their department(s)
7. THE Interface_System SHALL log access attempts and enforce role restrictions at the data query level

### Requirement 21: Data Refresh and Caching

**User Story:** As a user, I want dashboard data to load quickly while still being able to get fresh data when needed, so that I have a responsive experience without stale information.

#### Acceptance Criteria

1. THE Interface_System SHALL cache dashboard data with a default refresh interval of 15 minutes
2. THE Interface_System SHALL display a "Last Updated" timestamp on all cached views
3. THE Interface_System SHALL provide a "Refresh Now" button on each interface to force immediate data refresh
4. WHEN "Refresh Now" is clicked, THE Interface_System SHALL fetch fresh data from Airtable and update the cache
5. THE Interface_System SHALL automatically refresh data when a user navigates to an interface if the cache is older than the refresh interval
6. WHEN real-time updates are critical (e.g., during a live service), THE Interface_System SHALL support a "Live Mode" toggle that polls for updates every 30 seconds
