# API Gateway Documentation Setup

This document explains how to access and use the API Gateway documentation after deployment.

## Overview

The CDK stack automatically configures API Gateway documentation for all endpoints. The documentation is linked to the OpenAPI specification located at `docs/openapi.yaml`.

## Accessing Documentation

After deploying the CDK stack, you can access the API documentation in two ways:

### 1. AWS Console (Recommended)

The deployment outputs include a direct link to the API Gateway documentation console:

```bash
# After deployment, look for this output:
ApiDocumentationUrl = https://console.aws.amazon.com/apigateway/home?region=<region>#/apis/<api-id>/documentation
```

Click this URL to view the documentation in the AWS Console.

### 2. API Gateway Console Navigation

Alternatively, navigate manually:

1. Open the AWS Console
2. Go to API Gateway service
3. Select your API (e.g., "AirtableMemberManagementStack-API")
4. Click on "Documentation" in the left sidebar
5. Select version "1.0.0"

## Documentation Features

The API Gateway documentation includes:

- **API-level information**: Title, version, and description
- **Endpoint documentation**: All `/query/*` endpoints and `/health`
- **Parameters**: Query parameters with descriptions
- **Responses**: All status codes (200, 400, 401, 403, 404, 500)
- **Authentication**: Cognito JWT requirements
- **Tags**: Organized by resource type (Dashboard, Attendance, Members, etc.)

## Documented Endpoints

The following endpoints are documented:

### Query Endpoints (Authenticated)
- `GET /query/dashboard` - Dashboard data and KPIs
- `GET /query/attendance` - Service attendance data
- `GET /query/members` - Member search and details
- `GET /query/journey` - Member journey timeline
- `GET /query/follow-up` - Follow-up assignments
- `GET /query/admin` - Administrative views

### System Endpoints (Public)
- `GET /health` - Health check

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:
- **Location**: `docs/openapi.yaml`
- **Version**: 1.0.0
- **Format**: YAML

You can use this specification with:
- Postman (import collection)
- Swagger UI (interactive documentation)
- Code generators (client SDKs)
- API testing tools

## Deployment

The documentation is automatically deployed when you run:

```bash
cdk deploy
```

The documentation version is set to "1.0.0" and includes all endpoint definitions.

## Updating Documentation

To update the documentation:

1. Modify the OpenAPI spec at `docs/openapi.yaml`
2. Update the CDK stack documentation parts in `lib/airtable-member-management-stack.ts`
3. Increment the documentation version in the `configureApiDocumentation` method
4. Deploy the changes with `cdk deploy`

## Performance Features

The API includes several performance optimizations documented in the specification:

- **Caching**: 15-minute TTL with stale-while-revalidate
- **Request Deduplication**: 1-second window for duplicate requests
- **Parallel Execution**: Independent queries run concurrently
- **Rate Limiting**: 5 requests/second to Airtable API

## Cache Control

All query endpoints support cache control via the `refresh` query parameter:

- `refresh=false` (default): Use cached data if available
- `refresh=true`: Force cache refresh and fetch fresh data

## Authentication

All `/query/*` endpoints require AWS Cognito JWT authentication:

1. Obtain a JWT token from Cognito User Pool
2. Include in Authorization header: `Authorization: Bearer <token>`
3. Token must be valid and not expired

## Error Responses

All endpoints document standard error responses:

- **400 Bad Request**: Invalid parameters or request format
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Valid token but insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error

## Support

For issues or questions about the API documentation:
- Review the OpenAPI spec at `docs/openapi.yaml`
- Check the CDK stack configuration in `lib/airtable-member-management-stack.ts`
- Refer to the requirements document at `.kiro/specs/api-performance-optimization/requirements.md`
