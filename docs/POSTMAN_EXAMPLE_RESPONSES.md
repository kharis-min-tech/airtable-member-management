# Postman Example Responses

## Overview

This document describes the example responses added to the Postman collection for the Church Management API. All example responses are based on the actual Airtable schema fetched via Airtable MCP and match the OpenAPI specification.

## Example Response Structure

All successful API responses follow this structure:

```json
{
  "success": true,
  "data": <response_data>,
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

Error responses follow this structure:

```json
{
  "success": false,
  "error": "<error_message>",
  "details": {},
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## Airtable Record Structure

All Airtable records in example responses follow this structure:

```json
{
  "id": "rec123abc",
  "fields": {
    "Field Name": "field value",
    ...
  },
  "createdTime": "2024-01-15T08:00:00.000Z"
}
```

## Dashboard Endpoints

### Get Services

**Endpoint**: `GET /query/dashboard?type=services`

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "rec123abc",
      "fields": {
        "Service Code": "January 15, 2024 - Sunday Service",
        "Service Date": "2024-01-15",
        "Service Type": "Sunday Service",
        "Notes": "Great service with powerful worship"
      },
      "createdTime": "2024-01-15T08:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Schema Mapping**:
- `Service Code`: Formula field combining date and service type
- `Service Date`: Date field (YYYY-MM-DD format)
- `Service Type`: Single select (Sunday Service, Midweek Service, Special, Fasting Service, Other)
- `Notes`: Multiline text field

### Get Evangelism Stats

**Endpoint**: `GET /query/dashboard?type=evangelism`

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "recEvg123",
      "fields": {
        "Full Name": "John Smith",
        "First Name": "John",
        "Last Name": "Smith",
        "Phone": "+233501234567",
        "Email": "john.smith@example.com",
        "Date": "2024-01-15",
        "Soul Type": "New Believer",
        "Evangelism Type": "Town - Lapaz",
        "Notes / Prayer points": "Interested in joining Bible study",
        "Data Completeness": "Complete"
      },
      "createdTime": "2024-01-15T14:30:00.000Z"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Schema Mapping**:
- `Full Name`: Formula field combining first and last name
- `First Name`: Single line text
- `Last Name`: Single line text
- `Phone`: Phone number field
- `Email`: Email field
- `Date`: Date field
- `Soul Type`: Single select (New Believer, Contact)
- `Evangelism Type`: Single select (various university, high school, and town options)
- `Notes / Prayer points`: Multiline text
- `Data Completeness`: Formula field (Complete/Incomplete)

## Attendance Endpoints

### Get Attendance Records

**Endpoint**: `GET /query/attendance?serviceId=rec123abc`

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "recAtt001",
      "fields": {
        "Present?": true,
        "Group Tag": "Youth",
        "Source Form": "Manual"
      },
      "createdTime": "2024-01-15T10:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Schema Mapping**:
- `Present?`: Checkbox field
- `Group Tag`: Single line text
- `Source Form`: Single select (First Timer, Returner, Evangelism, Manual)

## Member Endpoints

### Get Member Details

**Endpoint**: `GET /query/members?memberId=recMem123`

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "recMem123",
    "fields": {
      "Full Name": "Jane Doe",
      "First Name": "Jane",
      "Last Name": "Doe",
      "Phone": "+233501234567",
      "Email": "jane.doe@example.com",
      "Gender": "Female",
      "Age Bracket": "Adult",
      "Address": "123 Main Street, Accra",
      "GhanaPost Code": "GA-123-4567",
      "Status": "Member",
      "Source": "First Timer Form",
      "Member Type": "Local",
      "Date First Captured": "2023-06-15",
      "Follow-up Status": "Integrated",
      "Data Completeness": "Complete"
    },
    "createdTime": "2023-06-15T10:00:00.000Z"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Schema Mapping**:
- `Full Name`: Formula field
- `First Name`: Single line text
- `Last Name`: Single line text
- `Phone`: Phone number field
- `Email`: Email field
- `Gender`: Single select (Male, Female)
- `Age Bracket`: Single select (Child, Adult, Senior)
- `Address`: Multiline text
- `GhanaPost Code`: Single line text
- `Status`: Single select (Member, First Timer, Returner, Evangelism Contact, Pastor, Visitor)
- `Source`: Single select (First Timer Form, Returner Form, Evangelism, Other)
- `Member Type`: Single select (Local, Student)
- `Date First Captured`: Date field
- `Follow-up Status`: Single select (Not Started, In Progress, Contacted, Visiting, Integrated, Closed)
- `Data Completeness`: Formula field

### Search Members

**Endpoint**: `GET /query/members?q=Jane`

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "recMem123",
      "fields": {
        "Full Name": "Jane Doe",
        "Phone": "+233501234567",
        "Email": "jane.doe@example.com",
        "Status": "Member"
      },
      "createdTime": "2023-06-15T10:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### Get Member Journey

**Endpoint**: `GET /query/journey?memberId=recMem123`

**Example Response**:
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "recMem123",
      "fields": {
        "Full Name": "Jane Doe",
        "Phone": "+233501234567",
        "Status": "Member",
        "Date First Captured": "2023-06-15"
      }
    },
    "attendance": [
      {
        "id": "recAtt001",
        "fields": {
          "Present?": true,
          "Group Tag": "Adults"
        },
        "createdTime": "2024-01-15T10:00:00.000Z"
      }
    ],
    "evangelism": [],
    "followUpInteractions": [
      {
        "id": "recInt001",
        "fields": {
          "Interaction Date": "2023-06-20",
          "Type": "Call",
          "Comments": "Welcomed to church, invited to next service",
          "Follow Up Outcome": "coming on sunday"
        },
        "createdTime": "2023-06-20T15:00:00.000Z"
      }
    ]
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## Follow-up Endpoints

### Get Follow-up Assignments

**Endpoint**: `GET /query/follow-up?type=assignments`

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "recFup001",
      "fields": {
        "Assigned Date": "2024-01-15",
        "Due Date": "2024-01-22",
        "Status": "In Progress",
        "Latest Comment": "Called member, will visit this weekend"
      },
      "createdTime": "2024-01-15T09:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Schema Mapping**:
- `Assigned Date`: Date field
- `Due Date`: Date field
- `Status`: Single select (Assigned, In Progress, Completed, Reassigned)
- `Latest Comment`: Multiline text

### Get Follow-up Interactions

**Endpoint**: `GET /query/follow-up?type=interactions`

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "recInt001",
      "fields": {
        "Interaction Date": "2024-01-18",
        "Type": "Call",
        "Comments": "Member confirmed attendance for Sunday service",
        "Follow Up Outcome": "coming on sunday"
      },
      "createdTime": "2024-01-18T16:30:00.000Z"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Schema Mapping**:
- `Interaction Date`: Date field
- `Type`: Single select (Call, WhatsApp, Message, Other)
- `Comments`: Multiline text
- `Follow Up Outcome`: Single select (can be visited, coming on sunday, not interested, no answer)

## Admin Endpoints

### Get First Timers

**Endpoint**: `GET /query/admin?type=first-timers`

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "recFT001",
      "fields": {
        "Full Name": "Michael Johnson",
        "First Name": "Michael",
        "Last Name": "Johnson",
        "Phone": "+233501112222",
        "Email": "michael.j@example.com",
        "Address": "456 Oak Avenue, Accra",
        "GhanaPost Code": "GA-456-7890",
        "How did you hear about us?": "Social Media",
        "Age Bracket": "Adult",
        "Visitor?": true
      },
      "createdTime": "2024-01-15T10:30:00.000Z"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Schema Mapping**:
- `Full Name`: Formula field
- `First Name`: Single line text
- `Last Name`: Single line text
- `Phone`: Phone number field
- `Email`: Email field
- `Address`: Multiline text
- `GhanaPost Code`: Single line text
- `How did you hear about us?`: Single select (Family/Friend, Flyer, Social Media, Evangelism, Outreach Campaign)
- `Age Bracket`: Single select (Child, Adult, Senior)
- `Visitor?`: Checkbox field

### Get Returners

**Endpoint**: `GET /query/admin?type=returners`

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "recRet001",
      "fields": {},
      "createdTime": "2024-01-15T11:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Note**: Returners Register has minimal fields (Unique Key, Service, Linked Member) as it primarily links to existing members.

### Get Departments

**Endpoint**: `GET /query/admin?type=departments`

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "recDept001",
      "fields": {
        "Department Name": "Ushering",
        "Category": "Front Facing"
      },
      "createdTime": "2023-01-01T00:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Schema Mapping**:
- `Department Name`: Single line text
- `Category`: Single select (Front Facing, Back End)

## Schema Validation

All example responses have been validated against:

1. **Airtable Schema**: Fetched via Airtable MCP from base `app2eLpfiWsdxBCsR`
2. **OpenAPI Specification**: Defined in `docs/openapi.yaml`
3. **Property-Based Tests**: Validated by `test/postman-example-schema-accuracy.property.test.ts`

## Testing

To verify example responses match the Airtable schema:

```bash
npm test -- test/postman-example-schema-accuracy.property.test.ts
```

This property-based test validates:
- All required fields are present
- Field types match Airtable schema
- Response structure follows Airtable record format
- Examples match OpenAPI specification

## Notes

- All phone numbers use Ghana format: `+233XXXXXXXXX`
- All dates use ISO 8601 format: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`
- Record IDs follow Airtable format: `rec` followed by alphanumeric characters
- Formula fields (like `Full Name`, `Service Code`) are computed by Airtable
- Linked record fields return arrays of record IDs

## Next Steps

1. Import the Postman collection from `.postman.json`
2. Configure environment variables (API_URL, USER_POOL_ID, CLIENT_ID, etc.)
3. Run the collection to validate API responses match examples
4. Use examples as reference for API integration
