# Task 14: Postman Pre-request Scripts Implementation

## Overview

Successfully implemented automatic Cognito authentication pre-request scripts for the Postman collection "Church Management API - Performance Tests".

## Implementation Details

### Collection-Level Pre-request Script

Added a collection-level pre-request script that automatically handles Cognito authentication for all requests in the collection.

**Key Features:**
1. **Automatic Token Management**: Checks token validity before each request
2. **Token Refresh Logic**: Automatically obtains new token if expired or missing
3. **Smart Caching**: Tokens are cached for 55 minutes (5 minutes before expiration)
4. **Error Handling**: Gracefully handles authentication failures with detailed logging
5. **Environment Integration**: Stores token and timestamp in environment variables

### Script Functionality

**Token Validation:**
- Checks if `AUTH_TOKEN` exists in environment
- Validates token age using `AUTH_TOKEN_TIMESTAMP`
- Refreshes token if older than 55 minutes (tokens expire after 1 hour)

**Authentication Flow:**
1. Pre-request script runs before every API request
2. Checks current token validity
3. If invalid/missing:
   - Constructs Cognito authentication request
   - Sends request to AWS Cognito
   - Parses response and extracts IdToken
   - Stores token in `AUTH_TOKEN` environment variable
   - Stores timestamp in `AUTH_TOKEN_TIMESTAMP` environment variable
4. If valid:
   - Uses existing token
   - Logs "Using existing authentication token"

**Error Handling:**
- Catches network errors during authentication
- Validates HTTP response codes
- Logs detailed error messages
- Throws errors to prevent requests with invalid authentication

### Environment Variables

**Required Variables:**
- `AWS_REGION`: AWS region for Cognito (e.g., "us-east-1")
- `CLIENT_ID`: Cognito client ID
- `TEST_USER_EMAIL`: Test user email for authentication
- `TEST_USER_PASSWORD`: Test user password for authentication

**Auto-managed Variables:**
- `AUTH_TOKEN`: JWT token (set automatically by pre-request script)
- `AUTH_TOKEN_TIMESTAMP`: Token creation timestamp (set automatically)

### Collection Configuration

**Authentication Type:** Bearer Token
**Token Variable:** `{{AUTH_TOKEN}}`
**Scope:** Collection-level (applies to all requests)

### Benefits

1. **Zero Manual Intervention**: No need to manually obtain tokens
2. **Automatic Refresh**: Tokens refresh automatically before expiration
3. **Consistent Authentication**: All requests use the same authentication mechanism
4. **Error Prevention**: Prevents requests with expired tokens
5. **Developer Experience**: Simplified testing workflow

## Testing

The pre-request script can be tested by:
1. Setting up environment variables (AWS_REGION, CLIENT_ID, TEST_USER_EMAIL, TEST_USER_PASSWORD)
2. Running any request in the collection
3. Observing console logs for authentication status
4. Verifying `AUTH_TOKEN` is set in environment variables

## Files Modified

1. **Postman Collection**: Updated via Postman API
   - Collection ID: `d6553e8e-ab3a-4317-bf15-7a57c4081cbd`
   - Added collection-level pre-request script
   - Updated timestamp: 2026-01-29T04:21:03.000Z

2. **docs/POSTMAN_COLLECTION_SETUP.md**
   - Added pre-request scripts documentation
   - Updated status to reflect completion
   - Added environment variable requirements

3. **.postman.json**
   - Updated status: `pre_request_scripts: "complete"`

## Requirements Satisfied

✅ **Requirement 8.2**: THE Postman_Collection SHALL include pre-request scripts for Cognito authentication

**Acceptance Criteria Met:**
- ✅ Create pre-request script for Cognito authentication
- ✅ Store token in environment variable
- ✅ Add token to Authorization header
- ✅ Handle token refresh logic

## Next Steps

- Task 15: Add test scripts for performance validation
- Task 16: Configure environments (dev, staging, prod)
- Task 17: Add example responses
- Task 18: Create performance test scenarios

## Notes

- The pre-request script uses `pm.sendRequest()` which is asynchronous
- Token refresh happens automatically before each request
- The 55-minute refresh threshold provides a 5-minute buffer before token expiration
- Console logging helps with debugging authentication issues
- The script is compatible with Postman Collection v2.1.0 schema
