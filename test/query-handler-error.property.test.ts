/**
 * Property-Based Tests for Query Handler Error Response Consistency
 * 
 * Property 2: Backend Error Response Consistency
 * Validates: Requirements 4.3
 * 
 * For any error that occurs in the backend API handlers, the error response SHALL have
 * a consistent structure containing: `success: false`, an `error` string message, and
 * a `timestamp` ISO string.
 * 
 * Feature: ui-bugfixes-v3, Property 2: Backend Error Response Consistency
 */

import * as fc from 'fast-check';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Import the handler - we'll test the error response structure
import { handler } from '../src/handlers/query';

/**
 * Helper to create a mock API Gateway event
 */
function createMockEvent(path: string, queryParams: Record<string, string> = {}): APIGatewayProxyEvent {
  return {
    path,
    queryStringParameters: queryParams,
    httpMethod: 'GET',
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    body: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: 'test',
      apiId: 'test',
      authorizer: null,
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'test',
        userArn: null,
      },
      path,
      stage: 'test',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'test',
      resourcePath: path,
    },
    resource: path,
    multiValueQueryStringParameters: null,
  };
}

/**
 * Validates that a response body has the correct error structure
 */
function validateErrorResponseStructure(body: string): { valid: boolean; reason?: string } {
  try {
    const parsed = JSON.parse(body);
    
    // Check success is false
    if (parsed.success !== false) {
      return { valid: false, reason: `Expected success to be false, got ${parsed.success}` };
    }
    
    // Check error is a string
    if (typeof parsed.error !== 'string') {
      return { valid: false, reason: `Expected error to be a string, got ${typeof parsed.error}` };
    }
    
    // Check error is not empty
    if (parsed.error.length === 0) {
      return { valid: false, reason: 'Expected error message to be non-empty' };
    }
    
    // Check timestamp exists and is a valid ISO string
    if (typeof parsed.timestamp !== 'string') {
      return { valid: false, reason: `Expected timestamp to be a string, got ${typeof parsed.timestamp}` };
    }
    
    // Validate ISO 8601 format
    const timestampDate = new Date(parsed.timestamp);
    if (isNaN(timestampDate.getTime())) {
      return { valid: false, reason: `Expected timestamp to be a valid ISO date, got ${parsed.timestamp}` };
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, reason: `Failed to parse response body as JSON: ${e}` };
  }
}

describe('Property 2: Backend Error Response Consistency', () => {
  /**
   * Property 2.1: Missing required parameters should return consistent error structure
   * 
   * For any endpoint that requires parameters, missing parameters should return
   * a response with success: false, error: string, and timestamp: ISO string
   * 
   * Validates: Requirements 4.3
   */
  it('should return consistent error structure for missing required parameters', async () => {
    // Test endpoints that require parameters
    const endpointsRequiringParams = [
      { path: '/query/dashboard', type: 'kpis' }, // requires serviceId
      { path: '/query/attendance', type: 'breakdown' }, // requires serviceId
      { path: '/query/attendance', type: 'departments' }, // requires serviceId
      { path: '/query/attendance', type: 'compare' }, // requires serviceA and serviceB
      { path: '/query/journey', type: undefined }, // requires memberId
      { path: '/query/members', type: 'search' }, // requires q or query
      { path: '/query/members', type: 'byId' }, // requires memberId
    ];

    for (const endpoint of endpointsRequiringParams) {
      const event = createMockEvent(endpoint.path, endpoint.type ? { type: endpoint.type } : {});
      const response = await handler(event);
      
      // Should be a 400 error for missing params
      expect(response.statusCode).toBe(400);
      
      const validation = validateErrorResponseStructure(response.body);
      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.error(`Endpoint ${endpoint.path}?type=${endpoint.type} failed: ${validation.reason}`);
      }
    }
  });

  /**
   * Property 2.2: Invalid routes should return consistent error structure
   * 
   * For any invalid route path, the response should have
   * success: false, error: string, and timestamp: ISO string
   * 
   * Validates: Requirements 4.3
   */
  it('should return consistent error structure for invalid routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random invalid paths
        fc.stringOf(fc.constantFrom('a', 'b', 'c', '/', '-', '_', '1', '2', '3'), { minLength: 1, maxLength: 50 })
          .filter(s => !s.includes('query') && !s.includes('dashboard') && !s.includes('attendance') && 
                       !s.includes('journey') && !s.includes('members') && !s.includes('follow-up') && 
                       !s.includes('admin')),
        async (randomPath) => {
          const path = `/${randomPath}`;
          const event = createMockEvent(path);
          const response = await handler(event);
          
          // Should be a 404 for invalid routes
          expect(response.statusCode).toBe(404);
          
          const validation = validateErrorResponseStructure(response.body);
          expect(validation.valid).toBe(true);
          if (!validation.valid) {
            throw new Error(`Path ${path} failed: ${validation.reason}`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.3: Error responses always have required fields
   * 
   * For any error response (status code >= 400), the body should contain
   * success: false, error: string, and timestamp: ISO string
   * 
   * Validates: Requirements 4.3
   */
  it('should always include success, error, and timestamp in error responses', async () => {
    // Generate various error-inducing scenarios
    const errorScenarios: Array<{ path: string; params: Record<string, string> }> = [
      // Missing serviceId for KPIs
      { path: '/query/dashboard', params: { type: 'kpis' } },
      // Missing serviceId for breakdown
      { path: '/query/attendance', params: { type: 'breakdown' } },
      // Missing both services for compare
      { path: '/query/attendance', params: { type: 'compare' } },
      // Missing one service for compare
      { path: '/query/attendance', params: { type: 'compare', serviceA: 'rec123' } },
      // Missing memberId for journey
      { path: '/query/journey', params: {} },
      // Missing search query
      { path: '/query/members', params: { type: 'search' } },
      // Invalid route
      { path: '/invalid/route', params: {} },
    ];

    for (const scenario of errorScenarios) {
      const event = createMockEvent(scenario.path, scenario.params);
      const response = await handler(event);
      
      // Should be an error response
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      
      const validation = validateErrorResponseStructure(response.body);
      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.error(`Scenario ${scenario.path} with params ${JSON.stringify(scenario.params)} failed: ${validation.reason}`);
      }
    }
  });

  /**
   * Property 2.4: Error response timestamp is recent
   * 
   * For any error response, the timestamp should be within a reasonable
   * time window of the request (within 5 seconds)
   * 
   * Validates: Requirements 4.3
   */
  it('should have a recent timestamp in error responses', async () => {
    const beforeRequest = new Date();
    
    const event = createMockEvent('/query/dashboard', { type: 'kpis' }); // Missing serviceId
    const response = await handler(event);
    
    const afterRequest = new Date();
    
    expect(response.statusCode).toBe(400);
    
    const parsed = JSON.parse(response.body);
    const responseTimestamp = new Date(parsed.timestamp);
    
    // Timestamp should be between before and after request (with 1 second buffer)
    expect(responseTimestamp.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime() - 1000);
    expect(responseTimestamp.getTime()).toBeLessThanOrEqual(afterRequest.getTime() + 1000);
  });

  /**
   * Property 2.5: Error messages are non-empty and descriptive
   * 
   * For any error response, the error message should be non-empty
   * and provide meaningful information
   * 
   * Validates: Requirements 4.3
   */
  it('should have non-empty descriptive error messages', async () => {
    const errorScenarios: Array<{ path: string; params: Record<string, string>; expectedContains: string }> = [
      { path: '/query/dashboard', params: { type: 'kpis' }, expectedContains: 'serviceId' },
      { path: '/query/attendance', params: { type: 'compare' }, expectedContains: 'service' },
      { path: '/query/journey', params: {}, expectedContains: 'memberId' },
      { path: '/query/members', params: { type: 'search' }, expectedContains: 'query' },
    ];

    for (const scenario of errorScenarios) {
      const event = createMockEvent(scenario.path, scenario.params);
      const response = await handler(event);
      
      const parsed = JSON.parse(response.body);
      
      // Error message should be non-empty
      expect(parsed.error.length).toBeGreaterThan(0);
      
      // Error message should contain relevant information
      expect(parsed.error.toLowerCase()).toContain(scenario.expectedContains.toLowerCase());
    }
  });
});
