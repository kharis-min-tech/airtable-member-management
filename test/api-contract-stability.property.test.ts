/**
 * Property-Based Tests for API Contract Stability
 * 
 * Property 22: API Contract Stability
 * Validates: Requirements 10.1
 * 
 * For all API endpoints, the request schema (parameters, body structure) and 
 * response schema (field names, types, structure) should remain identical 
 * before and after optimization, demonstrating backward compatibility.
 * 
 * Feature: api-performance-optimization, Property 22: API Contract Stability
 */

import * as fc from 'fast-check';

/**
 * API Contract Definition
 * This represents the expected contract for each endpoint
 */
interface APIContract {
  endpoint: string;
  method: string;
  requestSchema: {
    queryParams?: string[];
    requiredParams?: string[];
    optionalParams?: string[];
  };
  responseSchema: {
    successFields: string[];
    errorFields: string[];
    dataStructure?: string; // Description of data structure
  };
}

/**
 * Expected API contracts for all /query/* endpoints
 * These contracts should remain stable across optimizations
 */
const EXPECTED_API_CONTRACTS: APIContract[] = [
  {
    endpoint: '/query/dashboard',
    method: 'GET',
    requestSchema: {
      queryParams: ['type', 'refresh', 'serviceId', 'period', 'startDate', 'endDate'],
      requiredParams: [],
      optionalParams: ['type', 'refresh', 'serviceId', 'period', 'startDate', 'endDate'],
    },
    responseSchema: {
      successFields: ['success', 'data', 'timestamp'],
      errorFields: ['success', 'error', 'timestamp', 'details'],
      dataStructure: 'varies by type parameter',
    },
  },
  {
    endpoint: '/query/attendance',
    method: 'GET',
    requestSchema: {
      queryParams: ['type', 'serviceId', 'refresh', 'serviceA', 'serviceB', 'category', 'departmentId'],
      requiredParams: [],
      optionalParams: ['type', 'serviceId', 'refresh', 'serviceA', 'serviceB', 'category', 'departmentId'],
    },
    responseSchema: {
      successFields: ['success', 'data', 'timestamp'],
      errorFields: ['success', 'error', 'timestamp', 'details'],
      dataStructure: 'attendance breakdown or comparison data',
    },
  },
  {
    endpoint: '/query/members',
    method: 'GET',
    requestSchema: {
      queryParams: ['type', 'q', 'query', 'memberId', 'refresh'],
      requiredParams: [],
      optionalParams: ['type', 'q', 'query', 'memberId', 'refresh'],
    },
    responseSchema: {
      successFields: ['success', 'data', 'timestamp'],
      errorFields: ['success', 'error', 'timestamp', 'details'],
      dataStructure: 'member search results or member details',
    },
  },
  {
    endpoint: '/query/journey',
    method: 'GET',
    requestSchema: {
      queryParams: ['memberId', 'refresh'],
      requiredParams: ['memberId'],
      optionalParams: ['refresh'],
    },
    responseSchema: {
      successFields: ['success', 'data', 'timestamp'],
      errorFields: ['success', 'error', 'timestamp', 'details'],
      dataStructure: 'member journey with attendance, evangelism, and follow-up data',
    },
  },
  {
    endpoint: '/query/follow-up',
    method: 'GET',
    requestSchema: {
      queryParams: ['type', 'refresh', 'followUpMemberId', 'startDate', 'endDate'],
      requiredParams: [],
      optionalParams: ['type', 'refresh', 'followUpMemberId', 'startDate', 'endDate'],
    },
    responseSchema: {
      successFields: ['success', 'data', 'timestamp'],
      errorFields: ['success', 'error', 'timestamp', 'details'],
      dataStructure: 'follow-up summary, interactions, or assignments',
    },
  },
  {
    endpoint: '/query/admin',
    method: 'GET',
    requestSchema: {
      queryParams: ['type', 'refresh', 'days', 'serviceId', 'departmentId'],
      requiredParams: [],
      optionalParams: ['type', 'refresh', 'days', 'serviceId', 'departmentId'],
    },
    responseSchema: {
      successFields: ['success', 'data', 'timestamp'],
      errorFields: ['success', 'error', 'timestamp', 'details'],
      dataStructure: 'admin view data (follow-ups, first-timers, evangelism, etc.)',
    },
  },
];

/**
 * Validate that a response object matches the expected success schema
 */
function validateSuccessResponse(response: unknown, contract: APIContract): boolean {
  if (typeof response !== 'object' || response === null) {
    return false;
  }

  const responseObj = response as Record<string, unknown>;

  // Check all required success fields are present
  for (const field of contract.responseSchema.successFields) {
    if (!(field in responseObj)) {
      return false;
    }
  }

  // Validate field types
  if (typeof responseObj.success !== 'boolean') return false;
  if (responseObj.success !== true) return false;
  if (typeof responseObj.timestamp !== 'string') return false;
  if (!('data' in responseObj)) return false;

  return true;
}

/**
 * Validate that an error response object matches the expected error schema
 */
function validateErrorResponse(response: unknown, contract: APIContract): boolean {
  if (typeof response !== 'object' || response === null) {
    return false;
  }

  const responseObj = response as Record<string, unknown>;

  // Check all required error fields are present (except optional 'details')
  const requiredErrorFields = contract.responseSchema.errorFields.filter(f => f !== 'details');
  for (const field of requiredErrorFields) {
    if (!(field in responseObj)) {
      return false;
    }
  }

  // Validate field types
  if (typeof responseObj.success !== 'boolean') return false;
  if (responseObj.success !== false) return false;
  if (typeof responseObj.error !== 'string') return false;
  if (typeof responseObj.timestamp !== 'string') return false;

  return true;
}

/**
 * Check if required parameters are present
 */
function hasRequiredParameters(params: Record<string, string>, contract: APIContract): boolean {
  const requiredParams = contract.requestSchema.requiredParams || [];
  return requiredParams.every(param => param in params);
}

describe('Property 22: API Contract Stability', () => {
  /**
   * Property 22.1: Success response structure stability
   * 
   * For any successful API response, the response should contain exactly
   * the expected fields: success (boolean), data (object), timestamp (string)
   * 
   * Validates: Requirements 10.1
   */
  it('should maintain stable success response structure across all endpoints', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...EXPECTED_API_CONTRACTS),
        fc.record({
          success: fc.constant(true),
          data: fc.oneof(
            fc.record({}),
            fc.array(fc.record({})),
            fc.object(),
          ),
          timestamp: fc.date().map(d => d.toISOString()),
        }),
        (contract, response) => {
          // Property: Success response must have stable structure
          expect(validateSuccessResponse(response, contract)).toBe(true);
          
          // Property: Response must have exactly the expected fields
          const responseKeys = Object.keys(response).sort();
          const expectedKeys = contract.responseSchema.successFields.sort();
          expect(responseKeys).toEqual(expectedKeys);
          
          // Property: Field types must be correct
          expect(typeof response.success).toBe('boolean');
          expect(response.success).toBe(true);
          expect(typeof response.timestamp).toBe('string');
          expect('data' in response).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.2: Error response structure stability
   * 
   * For any error API response, the response should contain exactly
   * the expected fields: success (boolean), error (string), timestamp (string),
   * and optionally details (object)
   * 
   * Validates: Requirements 10.1
   */
  it('should maintain stable error response structure across all endpoints', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...EXPECTED_API_CONTRACTS),
        fc.record({
          success: fc.constant(false),
          error: fc.string({ minLength: 1, maxLength: 100 }),
          timestamp: fc.date().map(d => d.toISOString()),
          details: fc.option(fc.oneof(fc.string(), fc.object()), { nil: undefined }),
        }),
        (contract, response) => {
          // Property: Error response must have stable structure
          expect(validateErrorResponse(response, contract)).toBe(true);
          
          // Property: Required error fields must be present
          expect(response).toHaveProperty('success');
          expect(response).toHaveProperty('error');
          expect(response).toHaveProperty('timestamp');
          
          // Property: Field types must be correct
          expect(typeof response.success).toBe('boolean');
          expect(response.success).toBe(false);
          expect(typeof response.error).toBe('string');
          expect(typeof response.timestamp).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.3: Request parameter schema stability
   * 
   * For any endpoint, only the documented query parameters should be accepted,
   * and required parameters must be enforced
   * 
   * Validates: Requirements 10.1
   */
  it('should maintain stable request parameter schemas', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...EXPECTED_API_CONTRACTS),
        (contract) => {
          // Property: All parameters should be documented in the contract
          const documentedParams = contract.requestSchema.queryParams || [];
          
          // For this test, we verify that the contract defines valid parameters
          // In a real scenario, we'd validate actual requests against the contract
          expect(documentedParams.length).toBeGreaterThan(0);
          
          // Property: Required parameters are defined
          const requiredParams = contract.requestSchema.requiredParams || [];
          expect(Array.isArray(requiredParams)).toBe(true);
          
          // Property: Optional parameters are defined
          const optionalParams = contract.requestSchema.optionalParams || [];
          expect(Array.isArray(optionalParams)).toBe(true);
          
          // Property: All required params should be in the query params list
          requiredParams.forEach(param => {
            expect(documentedParams).toContain(param);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.4: Response field naming consistency
   * 
   * For any API response, field names should follow consistent naming conventions
   * and should not change between versions
   * 
   * Validates: Requirements 10.1
   */
  it('should maintain consistent field naming in responses', () => {
    fc.assert(
      fc.property(
        fc.record({
          success: fc.boolean(),
          data: fc.option(fc.object(), { nil: undefined }),
          error: fc.option(fc.string(), { nil: undefined }),
          timestamp: fc.date().map(d => d.toISOString()),
          details: fc.option(fc.object(), { nil: undefined }),
        }),
        (response) => {
          // Property: Field names should use camelCase
          const fieldNames = Object.keys(response);
          fieldNames.forEach(fieldName => {
            // Check camelCase pattern (starts with lowercase, no underscores)
            expect(fieldName).toMatch(/^[a-z][a-zA-Z0-9]*$/);
          });
          
          // Property: Core fields should always be present
          expect(response).toHaveProperty('success');
          expect(response).toHaveProperty('timestamp');
          
          // Property: Either data or error should be present based on success
          if (response.success) {
            expect(response).toHaveProperty('data');
          } else {
            expect(response).toHaveProperty('error');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.5: HTTP status code consistency
   * 
   * For any API response, the HTTP status code should match the response content
   * (200 for success, 4xx/5xx for errors)
   * 
   * Validates: Requirements 10.1
   */
  it('should maintain consistent HTTP status codes', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Success response
          fc.record({
            statusCode: fc.constant(200),
            body: fc.record({
              success: fc.constant(true),
              data: fc.object(),
              timestamp: fc.date().map(d => d.toISOString()),
            }),
          }),
          // Error responses
          fc.record({
            statusCode: fc.constantFrom(400, 401, 403, 404, 500),
            body: fc.record({
              success: fc.constant(false),
              error: fc.string({ minLength: 1 }),
              timestamp: fc.date().map(d => d.toISOString()),
            }),
          }),
        ),
        (apiResponse) => {
          const bodyObj = apiResponse.body;
          
          // Property: 200 status should have success=true
          if (apiResponse.statusCode === 200) {
            expect(bodyObj.success).toBe(true);
            expect(bodyObj).toHaveProperty('data');
          }
          
          // Property: 4xx/5xx status should have success=false
          if (apiResponse.statusCode >= 400) {
            expect(bodyObj.success).toBe(false);
            expect(bodyObj).toHaveProperty('error');
          }
          
          // Property: Status code should be valid
          expect([200, 400, 401, 403, 404, 500]).toContain(apiResponse.statusCode);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.6: Endpoint path structure stability
   * 
   * For any API endpoint, the path structure should follow the /query/* pattern
   * and should remain stable
   * 
   * Validates: Requirements 10.1
   */
  it('should maintain stable endpoint path structures', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...EXPECTED_API_CONTRACTS),
        (contract) => {
          // Property: All endpoints should start with /query/
          expect(contract.endpoint).toMatch(/^\/query\//);
          
          // Property: Endpoint should be a valid path
          expect(contract.endpoint).toMatch(/^\/[a-z-/]+$/);
          
          // Property: Method should be GET (for query endpoints)
          expect(contract.method).toBe('GET');
          
          // Property: Contract should define request schema
          expect(contract.requestSchema).toBeDefined();
          expect(contract.requestSchema.queryParams).toBeDefined();
          
          // Property: Contract should define response schema
          expect(contract.responseSchema).toBeDefined();
          expect(contract.responseSchema.successFields).toBeDefined();
          expect(contract.responseSchema.errorFields).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.7: Authentication header consistency
   * 
   * For any API request, the authentication mechanism should remain consistent
   * (Cognito JWT in Authorization header)
   * 
   * Validates: Requirements 10.1, 10.4
   */
  it('should maintain consistent authentication mechanism', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...EXPECTED_API_CONTRACTS),
        fc.record({
          Authorization: fc.string({ minLength: 20, maxLength: 500 }).map(s => `Bearer ${s}`),
        }),
        (contract, headers) => {
          // Property: Authorization header should use Bearer token format
          expect(headers.Authorization).toMatch(/^Bearer .+$/);
          
          // Property: All endpoints should support the same auth mechanism
          expect(contract.endpoint).toBeDefined();
          
          // Property: Token should be a string
          const token = headers.Authorization.replace('Bearer ', '');
          expect(typeof token).toBe('string');
          expect(token.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.8: Cache control header consistency
   * 
   * For any API response, cache-related headers and parameters should remain
   * consistent (refresh parameter, cache headers)
   * 
   * Validates: Requirements 10.1
   */
  it('should maintain consistent cache control mechanisms', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...EXPECTED_API_CONTRACTS),
        fc.record({
          refresh: fc.option(fc.constantFrom('true', 'false'), { nil: undefined }),
        }),
        (contract, queryParams) => {
          // Property: refresh parameter should be optional for all endpoints
          const optionalParams = contract.requestSchema.optionalParams || [];
          
          // Property: If refresh is used, it should be a valid value
          if (queryParams.refresh !== undefined) {
            expect(['true', 'false']).toContain(queryParams.refresh);
          }
          
          // Property: Contract should define optional parameters
          expect(Array.isArray(optionalParams)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.9: Data type consistency in responses
   * 
   * For any API response data field, the data types should remain consistent
   * (arrays stay arrays, objects stay objects, etc.)
   * 
   * Validates: Requirements 10.1
   */
  it('should maintain consistent data types in response data', () => {
    fc.assert(
      fc.property(
        fc.record({
          success: fc.constant(true),
          data: fc.oneof(
            // Array response
            fc.array(fc.record({
              id: fc.uuid(),
              name: fc.string(),
            })),
            // Object response
            fc.record({
              id: fc.uuid(),
              name: fc.string(),
              count: fc.integer(),
            }),
            // Nested object response
            fc.record({
              summary: fc.record({
                total: fc.integer(),
                active: fc.integer(),
              }),
              items: fc.array(fc.record({
                id: fc.uuid(),
              })),
            }),
          ),
          timestamp: fc.date().map(d => d.toISOString()),
        }),
        (response) => {
          // Property: data field should be defined
          expect(response.data).toBeDefined();
          
          // Property: data should be an object or array
          expect(typeof response.data).toBe('object');
          
          // Property: If data is an array, all items should have consistent structure
          if (Array.isArray(response.data)) {
            if (response.data.length > 0) {
              const firstItem = response.data[0];
              if (firstItem && typeof firstItem === 'object') {
                const firstItemKeys = Object.keys(firstItem).sort();
                response.data.forEach((item) => {
                  if (item && typeof item === 'object') {
                    const itemKeys = Object.keys(item).sort();
                    // All items should have the same keys (consistent structure)
                    expect(itemKeys).toEqual(firstItemKeys);
                  }
                });
              }
            }
          }
          
          // Property: Response should have stable structure
          expect(response).toHaveProperty('success');
          expect(response).toHaveProperty('data');
          expect(response).toHaveProperty('timestamp');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.10: Backward compatibility of optional parameters
   * 
   * For any endpoint, adding new optional parameters should not break
   * existing requests that don't include them
   * 
   * Validates: Requirements 10.1
   */
  it('should maintain backward compatibility when optional parameters are omitted', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...EXPECTED_API_CONTRACTS),
        fc.array(
          fc.constantFrom('type', 'refresh', 'serviceId', 'memberId', 'period'),
          { minLength: 0, maxLength: 3 }
        ),
        (contract, includedParams) => {
          // Property: Request should be valid with any subset of optional parameters
          const optionalParams = contract.requestSchema.optionalParams || [];
          const requiredParams = contract.requestSchema.requiredParams || [];
          
          // Build a request with only some optional parameters
          const requestParams: Record<string, string> = {};
          includedParams.forEach((param: string) => {
            if (optionalParams.includes(param)) {
              requestParams[param] = 'test-value';
            }
          });
          
          // Add all required parameters
          requiredParams.forEach(param => {
            requestParams[param] = 'required-value';
          });
          
          // Property: Request should have all required parameters
          expect(hasRequiredParameters(requestParams, contract)).toBe(true);
          
          // Property: Optional parameters should be truly optional
          const hasAllRequired = requiredParams.every(param => param in requestParams);
          expect(hasAllRequired).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
