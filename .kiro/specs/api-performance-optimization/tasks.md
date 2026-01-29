# Implementation Plan: API Performance Optimization

## Overview

This implementation plan breaks down the API performance optimization project into discrete coding tasks. The optimizations focus on zero-cost improvements through parallel execution, intelligent caching, and request deduplication across both frontend (React/TypeScript) and backend (AWS Lambda/Node.js) layers.

**Target**: Reduce API response times from ~5s to <2s while supporting 500 concurrent users.

**Technology Stack**:
- Frontend: React, TypeScript, Vite, Cognito auth, fast-check (already installed)
- Backend: AWS Lambda (Node.js 18), API Gateway, DynamoDB cache, Airtable API
- Infrastructure: AWS CDK
- Testing: Vitest (frontend), Jest (backend), fast-check (property-based testing)

## Tasks

- [x] 1. Implement Frontend Request Deduplication
  - Create `RequestDeduplicator` class in `frontend/src/services/request-deduplicator.ts`
  - Implement in-flight request tracking with 1-second deduplication window
  - Generate unique keys from endpoint + serialized parameters
  - Share promise results between duplicate requests
  - Add cleanup for expired deduplication entries
  - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.1 Write property test for request deduplication effectiveness
    - **Property 4: Request Deduplication Effectiveness**
    - **Validates: Requirements 2.1, 2.2**
    - Generate random endpoints and parameters
    - Make multiple simultaneous requests
    - Verify only one API call executes
    - Verify all callers receive same result

  - [x] 1.2 Write property test for deduplication window expiration
    - **Property 5: Deduplication Window Expiration**
    - **Validates: Requirements 2.3**
    - Make request, wait >1 second, make same request
    - Verify two separate API calls occurred

- [x] 2. Implement Stale-While-Revalidate Caching
  - Enhance existing `api-client.ts` cache with staleness tracking
  - Add `staleThreshold` (5 minutes) to cache configuration
  - Implement immediate return for stale data (5-15 min old)
  - Implement background refresh for stale cache hits
  - Add UI update mechanism when background refresh completes
  - _Requirements: 3.1, 3.2, 3.4_

  - [x] 2.1 Write property test for fresh cache immediate return
    - **Property 6: Fresh Cache Immediate Return**
    - **Validates: Requirements 3.1**
    - Generate cache entries <5 minutes old
    - Verify immediate return without fetch

  - [x] 2.2 Write property test for stale cache background refresh
    - **Property 7: Stale Cache Background Refresh**
    - **Validates: Requirements 3.2**
    - Generate cache entries 5-15 minutes old
    - Verify immediate return AND background refresh initiated

  - [x] 2.3 Write property test for expired cache fresh fetch
    - **Property 8: Expired Cache Fresh Fetch**
    - **Validates: Requirements 3.4**
    - Generate cache entries >15 minutes old
    - Verify fresh fetch with loading state

- [x] 3. Integrate Request Deduplicator with API Client
  - Update `api-client.ts` to use `RequestDeduplicator` for all requests
  - Wrap fetch calls with deduplication layer
  - Ensure deduplication works with existing cache layer
  - Handle error propagation to all waiting callers
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 4. Implement Parallel Dashboard Loading
  - Update dashboard data loading to use `Promise.all()`
  - Modify `frontend/src/services/church-api.ts` dashboard methods
  - Load services, KPIs, evangelism stats, souls assigned, and follow-ups in parallel
  - Implement partial failure handling with `Promise.allSettled()`
  - Display successful results even if some requests fail
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 4.1 Write property test for parallel API execution timing
    - **Property 1: Parallel API Execution Timing**
    - **Validates: Requirements 1.1**
    - Generate random sets of API endpoints
    - Verify all calls start within 50ms of each other

  - [x] 4.2 Write property test for parallel execution performance gain
    - **Property 2: Parallel Execution Performance Gain**
    - **Validates: Requirements 1.3**
    - Generate API calls with known delays
    - Verify parallel execution is at least 40% faster than sequential

  - [x] 4.3 Write property test for partial failure resilience
    - **Property 3: Partial Failure Resilience**
    - **Validates: Requirements 1.4**
    - Generate mixed success/failure API calls
    - Verify successful results returned without blocking

- [x] 5. Implement Debounced Date Filter Auto-Load
  - Create `useDebouncedDateFilter` hook in `frontend/src/hooks/useDebouncedDateFilter.ts`
  - Implement 500ms debounce using `useEffect` and `setTimeout`
  - Add loading state management
  - Implement cache invalidation for date range changes
  - Cancel pending requests on rapid date changes
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 5.1 Write property test for debounce timing accuracy
    - **Property 10: Debounce Timing Accuracy**
    - **Validates: Requirements 6.1**
    - Generate sequences of date changes
    - Verify 500ms wait after last change

  - [x] 5.2 Write property test for debounce cancellation
    - **Property 11: Debounce Cancellation**
    - **Validates: Requirements 6.2**
    - Make rapid date changes within 500ms
    - Verify only one fetch for final value

  - [x] 5.3 Write property test for cache invalidation on date change
    - **Property 12: Cache Invalidation on Date Change**
    - **Validates: Requirements 6.4**
    - Change date filter
    - Verify cache cleared for previous date

- [x] 6. Checkpoint - Frontend Optimizations Complete
  - Ensure all frontend tests pass
  - Verify request deduplication working in browser dev tools
  - Verify stale-while-revalidate showing instant loads
  - Verify parallel loading reducing dashboard load time
  - Ask user if questions arise

- [x] 7. Implement Backend Parallel Airtable Queries
  - Create `ParallelAirtableExecutor` class in `src/services/parallel-airtable-executor.ts`
  - Implement rate limiter (5 requests/second) using token bucket algorithm
  - Update `QueryService` to use parallel execution for Service KPIs
  - Update `QueryService` to use parallel execution for Dashboard queries
  - Update `QueryService` to use parallel execution for Member Journey queries
  - Implement request queueing when approaching rate limit
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 11.1, 11.3_

  - [x] 7.1 Write property test for backend parallel query performance
    - **Property 9: Backend Parallel Query Performance**
    - **Validates: Requirements 4.4**
    - Generate sets of independent Airtable queries
    - Verify parallel execution at least 30% faster

  - [x] 7.2 Write property test for Airtable rate limit compliance
    - **Property 23: Airtable Rate Limit Compliance**
    - **Validates: Requirements 11.1**
    - Generate burst of Airtable requests
    - Verify average rate ≤5 requests/second

  - [x] 7.3 Write property test for request queueing under load
    - **Property 24: Request Queueing Under Load**
    - **Validates: Requirements 11.3**
    - Send requests exceeding 5/second
    - Verify queueing instead of rejection

- [x] 8. Implement Exponential Backoff for Rate Limit Errors
  - Add retry logic for 429 errors in `AirtableClient`
  - Implement exponential backoff: 1s, 2s, 4s, 8s, 16s
  - Set maximum 5 retries before failing
  - Log retry attempts for monitoring
  - _Requirements: 11.4_

  - [x] 8.1 Write property test for exponential backoff retry
    - **Property 25: Exponential Backoff Retry**
    - **Validates: Requirements 11.4**
    - Simulate 429 errors
    - Verify exponential delay pattern (1s, 2s, 4s, 8s)

- [x] 9. Update Lambda Memory Configuration in CDK Stack
  - Modify `lib/airtable-member-management-stack.ts`
  - Update `queryHandler` memory from 256MB to 512MB
  - Verify CDK synth succeeds
  - Document memory increase in stack comments
  - _Requirements: 5.1, 5.2_

- [x] 10. Checkpoint - Backend Optimizations Complete
  - Ensure all backend tests pass
  - Verify parallel queries reducing response time
  - Verify rate limiting preventing 429 errors
  - Deploy to dev environment and test
  - Ask user if questions arise

- [x] 11. Create OpenAPI 3.0 Specification
  - Create `docs/openapi.yaml` with OpenAPI 3.0 schema
  - Document all `/query/*` endpoints with parameters
  - Add request/response schemas for each endpoint
  - Document Cognito JWT authentication
  - Add error response schemas (400, 401, 403, 404, 500)
  - Document cache headers and refresh parameters
  - Add rate limiting information
  - Include example requests and responses
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 11.1 Write property test for OpenAPI endpoint coverage
    - **Property 13: OpenAPI Endpoint Coverage**
    - **Validates: Requirements 7.2**
    - Compare actual endpoints with documented endpoints
    - Verify all /query/* endpoints documented

  - [x] 11.2 Write property test for OpenAPI error response completeness
    - **Property 14: OpenAPI Error Response Completeness**
    - **Validates: Requirements 7.4**
    - Verify each endpoint documents 400, 401, 403, 404, 500

  - [x] 11.3 Write property test for OpenAPI example completeness
    - **Property 15: OpenAPI Example Completeness**
    - **Validates: Requirements 7.7**
    - Verify each endpoint has example request/response

- [x] 12. Configure API Gateway Documentation
  - Update CDK stack to enable API Gateway documentation
  - Configure documentation parts for each endpoint
  - Link OpenAPI spec to API Gateway
  - Deploy documentation to API Gateway console
  - _Requirements: 7.8_

- [x] 13. Create Postman Collection Structure
  - Use Postman MCP to create workspace "Church Management API"
  - Create collection "Church Management API - Performance Tests"
  - Organize folders: Dashboard, Attendance, Members, Follow-up, Admin
  - Add authentication folder with Cognito token request
  - _Requirements: 8.1, 8.11_

- [x] 14. Add Postman Pre-request Scripts
  - Create pre-request script for Cognito authentication
  - Store token in environment variable
  - Add token to Authorization header
  - Handle token refresh logic
  - _Requirements: 8.2_

- [x] 15. Add Postman Test Scripts
  - Add response time validation (<2s) to all requests
  - Add status code validation to all requests
  - Add response schema validation to all requests
  - Add data integrity checks to all requests
  - _Requirements: 8.3, 8.4, 8.5, 8.6_

  - [x] 15.1 Write property test for Postman test script completeness
    - **Property 16: Postman Test Script Completeness**
    - **Validates: Requirements 8.3, 8.4, 8.5, 8.6**
    - Parse Postman collection
    - Verify each request has all 4 test types

- [x] 16. Configure Postman Environments
  - Create dev environment with variables
  - Create staging environment with variables
  - Create prod environment with variables
  - Add variables: API_URL, USER_POOL_ID, CLIENT_ID, TEST_USER_EMAIL, TEST_USER_PASSWORD
  - _Requirements: 8.7, 8.8_

  - [x] 16.1 Write property test for Postman environment variable usage
    - **Property 17: Postman Environment Variable Usage**
    - **Validates: Requirements 8.8**
    - Parse collection requests
    - Verify URLs and headers use environment variables

- [x] 17. Add Postman Example Responses
  - Use Airtable MCP to fetch actual schema
  - Create example responses matching Airtable schema
  - Add examples to each request in collection
  - Verify examples match OpenAPI spec
  - _Requirements: 8.9_

  - [x] 17.1 Write property test for Postman example schema accuracy
    - **Property 18: Postman Example Schema Accuracy**
    - **Validates: Requirements 8.9**
    - Compare example responses with Airtable schema
    - Verify structure matches

- [x] 18. Create Postman Performance Test Scenarios
  - Add collection runner configuration for 500 concurrent users
  - Configure iteration count and delay
  - Add performance assertions
  - Document how to run load tests
  - _Requirements: 8.10_

- [x] 19. Checkpoint - Documentation and Testing Tools Complete
  - Verify OpenAPI spec validates
  - Verify API Gateway documentation accessible
  - Verify Postman collection imports successfully
  - Run sample Postman tests
  - Ask user if questions arise

- [x] 20. Write Integration Tests for Optimizations
  - Test end-to-end dashboard load with parallel calls
  - Test request deduplication across components
  - Test stale-while-revalidate cache behavior
  - Test debounced date filter auto-load
  - Test backend parallel query execution
  - _Requirements: 1.1, 2.1, 3.2, 6.1, 4.1_

- [x] 21. Run Performance Benchmarks
  - Measure baseline performance (before optimizations)
  - Measure optimized performance (after optimizations)
  - Verify <2s response time at p95
  - Verify 500 concurrent user support
  - Verify cache hit performance <200ms
  - Verify cache miss performance <2s
  - Document performance improvements
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 21.1 Write property test for p95 response time target
    - **Property 19: P95 Response Time Target**
    - **Validates: Requirements 9.1, 9.2**
    - Run load test with 500 concurrent users
    - Verify p95 response time <2000ms

  - [x] 21.2 Write property test for cache hit performance
    - **Property 20: Cache Hit Performance**
    - **Validates: Requirements 9.3**
    - Make requests resulting in cache hits
    - Verify response time <200ms

  - [x] 21.3 Write property test for cache miss performance
    - **Property 21: Cache Miss Performance**
    - **Validates: Requirements 9.4**
    - Make requests resulting in cache misses
    - Verify response time <2000ms

- [x] 22. Verify Backward Compatibility
  - Run existing frontend tests
  - Verify API contracts unchanged
  - Verify request/response formats preserved
  - Verify Cognito authentication still works
  - _Requirements: 10.1, 10.4_

  - [x] 22.1 Write property test for API contract stability
    - **Property 22: API Contract Stability**
    - **Validates: Requirements 10.1**
    - Compare request/response schemas before and after
    - Verify identical structure

- [ ] 23. Deploy and Monitor
  - Deploy CDK stack changes (Lambda memory increase)
  - Deploy frontend optimizations
  - Deploy backend optimizations
  - Configure CloudWatch alarms for p95 >2s
  - Configure CloudWatch alarms for error rate >1%
  - Monitor cache hit rate
  - Monitor deduplication rate
  - _Requirements: 9.1, 9.2_

- [ ] 24. Final Checkpoint - All Optimizations Complete
  - Verify all tests passing
  - Verify performance targets met (<2s response time)
  - Verify 500 concurrent user support
  - Verify zero cost increase (within free tier)
  - Document final performance metrics
  - Ask user if questions arise

## Notes

- All tasks are required for comprehensive optimization and testing
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (100+ iterations each)
- Unit tests validate specific examples and edge cases
- All property tests must include comment tag: `// Feature: api-performance-optimization, Property {number}: {property_text}`
- Frontend uses Vitest + fast-check, Backend uses Jest + fast-check
- Postman operations use Postman MCP server
- Airtable schema operations use Airtable MCP server
