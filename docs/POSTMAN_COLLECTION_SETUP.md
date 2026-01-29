# Postman Collection Setup Guide

## Overview

This document provides instructions for completing the Postman collection structure for the Church Management API Performance Tests.

## Current Status

✅ **Completed:**
- Workspace created: "Church Management API" (ID: `5223b139-24a0-4b2d-b983-3d54c6c0bdb7`)
- Collection created: "Church Management API - Performance Tests" (ID: `d6553e8e-ab3a-4317-bf15-7a57c4081cbd`)
- Authentication folder with "Get Cognito Token" request configured

## Required Folder Structure

The collection needs the following folder organization:

### 1. Authentication ✅
- **Status**: Complete
- **Description**: Cognito authentication requests for obtaining JWT tokens
- **Requests**:
  - Get Cognito Token (ID: `4337f7dd-548f-4835-bb4e-8eed74fa1bf6`)

### 2. Dashboard
- **Status**: Needs to be created
- **Description**: Dashboard data endpoints including services, KPIs, evangelism stats, souls assigned, and follow-up interactions
- **Requests**: To be added in Task 14-17

### 3. Attendance
- **Status**: Needs to be created
- **Description**: Attendance tracking and reporting endpoints
- **Requests**: To be added in Task 14-17

### 4. Members
- **Status**: Needs to be created
- **Description**: Member management and journey tracking endpoints
- **Requests**: To be added in Task 14-17

### 5. Follow-up
- **Status**: Needs to be created
- **Description**: Follow-up task and interaction management endpoints
- **Requests**: To be added in Task 14-17

### 6. Admin
- **Status**: Needs to be created
- **Description**: Administrative endpoints for system stats and cache management
- **Requests**: To be added in Task 14-17

## Manual Setup Instructions (If Needed)

If the folders need to be created manually in the Postman web interface:

1. Open Postman and navigate to the "Church Management API" workspace
2. Open the "Church Management API - Performance Tests" collection
3. For each folder that needs to be created:
   - Click "Add folder" in the collection
   - Enter the folder name and description
   - Save the folder

## Collection Configuration

**Authentication**: Bearer token using `{{AUTH_TOKEN}}` variable

**Environment Variables Required**:
- `API_URL`: Base URL for the API
- `USER_POOL_ID`: Cognito User Pool ID
- `CLIENT_ID`: Cognito client ID
- `TEST_USER_EMAIL`: Test user email
- `TEST_USER_PASSWORD`: Test user password
- `AUTH_TOKEN`: JWT token (set automatically by Get Cognito Token request)

## Environments

✅ **Three environments have been configured:**

### 1. Development Environment
- **ID**: `f57d5634-bbbb-4606-97fd-bc37e2fdc88c`
- **UID**: `51684623-f57d5634-bbbb-4606-97fd-bc37e2fdc88c`
- **Variables**:
  - `API_URL`: `https://dev-api.example.com`
  - `USER_POOL_ID`: `us-east-1_devPoolId`
  - `CLIENT_ID`: `dev_client_id_placeholder`
  - `TEST_USER_EMAIL`: `test@example.com`
  - `TEST_USER_PASSWORD`: (secret - set in Postman)

### 2. Staging Environment
- **ID**: `8ebf4c18-9ae2-46f4-a1b3-fbb3c3588353`
- **UID**: `51684623-8ebf4c18-9ae2-46f4-a1b3-fbb3c3588353`
- **Variables**:
  - `API_URL`: `https://staging-api.example.com`
  - `USER_POOL_ID`: `us-east-1_stagingPoolId`
  - `CLIENT_ID`: `staging_client_id_placeholder`
  - `TEST_USER_EMAIL`: `test@example.com`
  - `TEST_USER_PASSWORD`: (secret - set in Postman)

### 3. Production Environment
- **ID**: `ec42406e-3bc1-47ed-9e70-5c91744e9eea`
- **UID**: `51684623-ec42406e-3bc1-47ed-9e70-5c91744e9eea`
- **Variables**:
  - `API_URL`: `https://api.example.com`
  - `USER_POOL_ID`: `us-east-1_prodPoolId`
  - `CLIENT_ID`: `prod_client_id_placeholder`
  - `TEST_USER_EMAIL`: `test@example.com`
  - `TEST_USER_PASSWORD`: (secret - set in Postman)

### Configuring Environment Variables

**To update environment variables with actual values:**

1. Open Postman and navigate to the "Church Management API" workspace
2. Click on "Environments" in the left sidebar
3. Select the environment you want to configure (Development, Staging, or Production)
4. Update the placeholder values with your actual values:
   - Replace `API_URL` with your actual API endpoint
   - Replace `USER_POOL_ID` with your Cognito User Pool ID
   - Replace `CLIENT_ID` with your Cognito App Client ID
   - Update `TEST_USER_EMAIL` with a valid test user email
   - Set `TEST_USER_PASSWORD` with the test user's password (marked as secret)
5. Click "Save" to persist your changes

**Using Environments:**

To switch between environments when running requests:
1. In Postman, use the environment dropdown in the top-right corner
2. Select "Development", "Staging", or "Production"
3. All requests will now use the variables from the selected environment

**Security Note:**

The `TEST_USER_PASSWORD` variable is marked as "secret" type in Postman, which means:
- The value is masked in the Postman UI
- The value is not included in collection exports
- The value is not visible in logs or screenshots
- You must set this value manually in each environment

## Pre-request Scripts

✅ **Collection-level Pre-request Script Added**

The collection now includes an automatic Cognito authentication pre-request script that:
- Runs before every request in the collection
- Checks if the current AUTH_TOKEN is valid (less than 55 minutes old)
- Automatically obtains a new token if needed
- Stores the token and timestamp in environment variables
- Handles authentication errors gracefully

**How it works:**
1. Before each request, checks `AUTH_TOKEN` and `AUTH_TOKEN_TIMESTAMP` environment variables
2. If token is missing or older than 55 minutes, automatically requests a new token from Cognito
3. Stores the new token in `AUTH_TOKEN` environment variable
4. Stores the timestamp in `AUTH_TOKEN_TIMESTAMP` for future validation
5. Logs authentication status to console

**Required Environment Variables:**
- `AWS_REGION`: AWS region for Cognito (e.g., "us-east-1")
- `CLIENT_ID`: Cognito client ID
- `TEST_USER_EMAIL`: Test user email
- `TEST_USER_PASSWORD`: Test user password
- `AUTH_TOKEN`: JWT token (set automatically by pre-request script)
- `AUTH_TOKEN_TIMESTAMP`: Token timestamp (set automatically by pre-request script)

## Next Steps

The following tasks will populate these folders with actual API requests:
- Task 15: Add test scripts for performance validation ✅
- Task 16: Configure environments (dev, staging, prod) ✅
- Task 17: Add example responses ✅
- Task 18: Create performance test scenarios ✅

## Performance Testing

✅ **Performance Test Scenarios Configured**

Comprehensive performance test scenarios have been created to validate the API performance targets:

- **Dashboard Load Test**: 100 iterations, 0ms delay, 10-500 virtual users
- **Member Journey Load Test**: 50 iterations, 100ms delay, 100 virtual users
- **Mixed Workload Test**: 200 iterations, 50ms delay, 250 virtual users
- **Cache Performance Test**: Multi-phase test validating cache hit (<200ms) and miss (<2000ms) performance
- **Stress Test**: 500 iterations, 0ms delay, 100-1000 virtual users (gradual increase)

**Performance Targets:**
- P95 Response Time: <2000ms
- Concurrent Users: 500
- Success Rate: >99%
- Cache Hit Performance: <200ms
- Cache Miss Performance: <2000ms

**Documentation**: See [POSTMAN_PERFORMANCE_TEST_SCENARIOS.md](./POSTMAN_PERFORMANCE_TEST_SCENARIOS.md) for detailed instructions on:
- Running each test scenario
- Using Newman CLI for 500+ concurrent users
- Analyzing performance results
- Troubleshooting common issues
- Integrating with CI/CD pipelines

**Quick Start:**
```bash
# Install Newman CLI
npm install -g newman newman-reporter-html

# Export collection and environment from Postman
# Then run performance test with 500 concurrent users
newman run collection.json \
  -e environment.json \
  --iteration-count 100 \
  --delay-request 0 \
  --parallel 500 \
  --reporters cli,json,html \
  --reporter-json-export results.json \
  --reporter-html-export report.html
```

## Postman Collection Details

**Workspace ID**: `5223b139-24a0-4b2d-b983-3d54c6c0bdb7`
**Collection ID**: `d6553e8e-ab3a-4317-bf15-7a57c4081cbd`
**Collection UID**: `51684623-d6553e8e-ab3a-4317-bf15-7a57c4081cbd`

## Accessing the Collection

You can access the collection directly in Postman:
1. Open Postman
2. Navigate to Workspaces → "Church Management API"
3. Open "Church Management API - Performance Tests" collection

Or use the Postman API to retrieve it:
```bash
curl --location 'https://api.getpostman.com/collections/51684623-d6553e8e-ab3a-4317-bf15-7a57c4081cbd' \
--header 'X-API-Key: YOUR_POSTMAN_API_KEY'
```
