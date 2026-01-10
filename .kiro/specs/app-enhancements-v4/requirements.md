# Requirements Document

## Introduction

This feature enhances the church management application with custom domain support, data model simplification, bug fixes, and new embedded form capabilities. The system will integrate Cloudflare domain management, consolidate volunteer/member concepts, resolve API parameter issues, and provide public access to specific forms and interfaces.

## Glossary

- **Church_Management_System**: The web application for managing church operations, attendance, and member data
- **Cloudflare_Domain**: Custom domain hosted on Cloudflare DNS service for user-friendly application access
- **Member_Record**: Unified data model representing all church participants (previously volunteers and members)
- **Attendance_Service_API**: Backend service providing attendance data grouped by service and department
- **Airtable_Form**: Embedded form interface from Airtable for data collection
- **Airtable_Interface**: Embedded view from Airtable displaying evangelism contact data
- **Public_Route**: Application path accessible without Cognito authentication
- **Service_ID**: Unique identifier for church services used in API calls

## Requirements

### Requirement 1

**User Story:** As a church administrator, I want to access the application through a custom domain, so that users have a professional and memorable URL.

#### Acceptance Criteria

1. WHEN users navigate to the custom Cloudflare domain THEN the Church_Management_System SHALL serve the application content
2. WHEN the custom domain is configured THEN the Church_Management_System SHALL redirect HTTP traffic to HTTPS
3. WHEN SSL certificates are needed THEN the Church_Management_System SHALL automatically provision and renew certificates
4. WHEN DNS resolution occurs THEN the Cloudflare_Domain SHALL resolve to the correct AWS infrastructure

### Requirement 2

**User Story:** As a system administrator, I want to consolidate volunteer and member concepts into a single member model, so that data management is simplified and consistent.

#### Acceptance Criteria

1. WHEN the system references volunteers THEN the Church_Management_System SHALL use Member_Record instead
2. WHEN displaying user interfaces THEN the Church_Management_System SHALL show "Members" terminology instead of "Volunteers"
3. WHEN processing data operations THEN the Church_Management_System SHALL treat all participants as Member_Record entities
4. WHEN migrating existing data THEN the Church_Management_System SHALL preserve all volunteer information as member data

### Requirement 3

**User Story:** As an administrator viewing attendance data, I want the attendance by service view to load correctly, so that I can analyze service-specific attendance patterns.

#### Acceptance Criteria

1. WHEN selecting a service in the attendance view THEN the Attendance_Service_API SHALL receive the correct Service_ID parameter
2. WHEN the API call is made THEN the Church_Management_System SHALL include all required parameters in the request
3. WHEN attendance data is requested THEN the Church_Management_System SHALL return service-specific attendance grouped by department
4. WHEN API errors occur THEN the Church_Management_System SHALL display meaningful error messages instead of generic 400 errors

### Requirement 4

**User Story:** As a church member, I want to access forms for data submission, so that I can provide information without needing to log in.

#### Acceptance Criteria

1. WHEN users navigate to /forms THEN the Church_Management_System SHALL display embedded Airtable_Form interfaces
2. WHEN accessing the forms page THEN the Church_Management_System SHALL allow access without Cognito authentication
3. WHEN forms are displayed THEN the Church_Management_System SHALL render all available Airtable forms in a user-friendly list
4. WHEN users submit forms THEN the Church_Management_System SHALL process submissions through Airtable integration

### Requirement 5

**User Story:** As a church leader, I want to view evangelism contacts through an embedded interface, so that I can track souls won through evangelism efforts.

#### Acceptance Criteria

1. WHEN users navigate to /contacts THEN the Church_Management_System SHALL display the embedded Airtable_Interface for evangelism contacts
2. WHEN accessing the contacts page THEN the Church_Management_System SHALL allow access without Cognito authentication
3. WHEN the interface loads THEN the Church_Management_System SHALL display all souls won through evangelism in the Airtable view
4. WHEN the interface updates THEN the Church_Management_System SHALL reflect real-time data from Airtable