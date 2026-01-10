# Design Document

## Overview

This design enhances the church management application with four key improvements: custom domain integration with Cloudflare, data model consolidation from volunteers to members, API parameter bug fixes, and new public-facing embedded Airtable forms. The solution maintains the existing AWS CDK infrastructure while adding domain management capabilities and expanding the routing system to support public access patterns.

## Architecture

### Current Architecture
- **Frontend**: React SPA with TypeScript, hosted on S3 + CloudFront
- **Backend**: AWS Lambda functions with API Gateway
- **Authentication**: AWS Cognito User Pools
- **Database**: DynamoDB for caching and configuration
- **External Integration**: Airtable API for church data

### Enhanced Architecture
- **Domain Management**: AWS Route 53 + Certificate Manager integration with Cloudflare DNS
- **Public Routes**: Separate routing configuration for unauthenticated access
- **Unified Data Model**: Single Member entity replacing volunteer/member distinction
- **Embedded Content**: Airtable iframe integration with responsive design

## Components and Interfaces

### 1. Domain Management Components

#### CloudFlare Integration
```typescript
interface DomainConfig {
  domainName: string;
  certificateArn: string;
  hostedZoneId: string;
  cloudflareZoneId: string;
}
```

#### CDK Stack Extensions
- Certificate Manager for SSL certificates
- Route 53 hosted zone configuration
- CloudFront distribution domain aliases
- DNS validation records

### 2. Data Model Unification

#### Member Entity (Unified)
```typescript
interface Member {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phone?: string;
  email?: string;
  status: 'Member' | 'First Timer' | 'Returner' | 'Evangelism Contact';
  departmentId?: string;
  followUpOwnerId?: string;
  // Removed: volunteerRole, isVolunteer fields
}
```

#### Migration Strategy
- Update all API responses to use Member terminology
- Modify frontend components to remove volunteer references
- Update database queries to treat all participants as members

### 3. Public Route Components

#### Public Layout Component
```typescript
interface PublicLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}
```

#### Embedded Form Components
```typescript
interface AirtableEmbedProps {
  embedUrl: string;
  title: string;
  height?: string;
  allowFullscreen?: boolean;
}

interface FormListProps {
  forms: AirtableForm[];
}

interface AirtableForm {
  id: string;
  title: string;
  description: string;
  embedUrl: string;
  category: string;
}
```

### 4. API Parameter Fix Components

#### Enhanced Service Selector
```typescript
interface ServiceSelectorProps {
  onServiceChange: (serviceId: string) => void;
  selectedServiceId?: string;
  services: Service[];
}
```

#### Fixed API Client Methods
```typescript
// Fixed method signature
getAttendanceByDepartment: (serviceId: string) => Promise<AttendanceByDepartment>
```

## Data Models

### Unified Member Model
```typescript
interface Member {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phone?: string;
  email?: string;
  status: MemberStatus;
  departmentId?: string;
  departmentName?: string;
  followUpOwnerId?: string;
  followUpOwnerName?: string;
  lastVisited?: Date;
  dateJoined?: Date;
  notes?: string;
}

type MemberStatus = 'Member' | 'First Timer' | 'Returner' | 'Evangelism Contact';
```

### Public Form Configuration
```typescript
interface PublicFormConfig {
  forms: AirtableForm[];
  interfaces: AirtableInterface[];
}

interface AirtableForm {
  id: string;
  title: string;
  description: string;
  embedUrl: string;
  category: 'general' | 'membership' | 'events' | 'feedback';
  isActive: boolean;
}

interface AirtableInterface {
  id: string;
  title: string;
  description: string;
  embedUrl: string;
  type: 'contacts' | 'evangelism' | 'reports';
  isActive: boolean;
}
```

### Domain Configuration
```typescript
interface DomainSettings {
  customDomain: string;
  certificateArn: string;
  hostedZoneId: string;
  cloudflareConfig: {
    zoneId: string;
    apiToken: string;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After analyzing the acceptance criteria and performing property reflection to eliminate redundancy, here are the refined correctness properties:

### Property 1: Custom domain HTTPS accessibility
*For any* valid request to the custom Cloudflare domain, the Church_Management_System should serve the application content over HTTPS with proper SSL termination and HTTP-to-HTTPS redirection
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: DNS resolution correctness
*For any* DNS lookup of the Cloudflare domain, the resolution should point to the correct AWS CloudFront infrastructure
**Validates: Requirements 1.4**

### Property 3: Member terminology consistency
*For any* system interface, API response, or data operation, all references should use "Member" terminology instead of "Volunteer" terminology and treat all participants as Member_Record entities
**Validates: Requirements 2.1, 2.2, 2.3**

### Property 4: Data preservation during migration
*For any* existing volunteer record, after migration the system should preserve all information as member data with equivalent access patterns
**Validates: Requirements 2.4**

### Property 5: Service ID parameter inclusion
*For any* attendance by service API call, the request should include the selected Service_ID parameter and all other required parameters, returning service-specific attendance grouped by department
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 6: Meaningful error messages
*For any* API error condition, the Church_Management_System should display meaningful error messages instead of generic 400 errors
**Validates: Requirements 3.4**

### Property 7: Public route accessibility
*For any* request to /forms or /contacts paths, the system should allow access without requiring Cognito authentication
**Validates: Requirements 4.2, 5.2**

### Property 8: Airtable form rendering
*For any* active Airtable form configuration, the /forms page should render all available embedded form interfaces in a user-friendly list
**Validates: Requirements 4.3**

### Property 9: Airtable interface embedding
*For any* embedded Airtable interface on /contacts, the system should not interfere with real-time data updates from Airtable
**Validates: Requirements 5.4**

## Error Handling

### Domain Resolution Errors
- DNS propagation delays: Implement health checks and retry logic
- Certificate validation failures: Automated renewal and validation processes
- Cloudflare API errors: Fallback to manual DNS configuration instructions

### API Parameter Errors
- Missing service ID: Client-side validation before API calls
- Invalid service ID: Server-side validation with meaningful error messages
- Network timeouts: Retry logic with exponential backoff

### Public Route Errors
- Airtable embed failures: Fallback to direct links
- Content loading errors: Graceful degradation with error messages
- Mobile responsiveness issues: CSS media queries and responsive design

### Data Migration Errors
- Incomplete volunteer data: Data validation and cleanup scripts
- Reference integrity: Foreign key validation during migration
- Performance impact: Batch processing and progress monitoring

## Testing Strategy

### Unit Testing
- Component rendering tests for new public pages
- API client method tests for parameter passing
- Domain configuration validation tests
- Member data transformation tests

### Property-Based Testing
The system will use **fast-check** for JavaScript/TypeScript property-based testing with a minimum of 100 iterations per test. Each property-based test will be tagged with comments referencing the design document properties.

**Property-based tests will verify:**
- Domain accessibility across different request patterns
- Member terminology consistency across all interfaces  
- Data preservation during volunteer-to-member migration
- API parameter inclusion for all service-related calls
- Public route accessibility without authentication
- Airtable form rendering with various configurations
- Interface update consistency with data changes

**Unit tests will cover:**
- Specific domain configuration examples
- Edge cases in API parameter handling
- Public route component integration
- Error boundary behavior for embedded content

### Integration Testing
- End-to-end domain resolution testing
- Airtable embed functionality testing
- Public route navigation testing
- Authentication bypass verification for public routes

### Manual Testing
- Cross-browser compatibility for embedded forms
- Mobile responsiveness for public pages
- SSL certificate validation
- Cloudflare DNS propagation verification