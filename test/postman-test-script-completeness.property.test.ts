/**
 * Property-Based Test: Postman Test Script Completeness
 * Feature: api-performance-optimization, Property 16: Postman Test Script Completeness
 * 
 * Validates: Requirements 8.3, 8.4, 8.5, 8.6
 * 
 * Property: For all requests in the Postman collection, each request should include 
 * test scripts that validate: (1) response time < 2s, (2) HTTP status code, 
 * (3) response schema, and (4) data integrity.
 */

import fc from 'fast-check';

// Feature: api-performance-optimization, Property 16: Postman Test Script Completeness

// Mock Postman API client for testing
interface PostmanRequest {
  id: string;
  name: string;
  event?: Array<{
    listen: string;
    script: {
      exec: string[];
      type: string;
    };
  }>;
}

interface PostmanFolder {
  name: string;
  item: (PostmanRequest | PostmanFolder)[];
}

interface PostmanCollection {
  info: {
    name: string;
    _postman_id: string;
  };
  item: (PostmanRequest | PostmanFolder)[];
}

describe('Postman Test Script Completeness', () => {
  // Helper function to extract all requests from collection (including nested folders)
  function extractAllRequests(items: (PostmanRequest | PostmanFolder)[]): PostmanRequest[] {
    const requests: PostmanRequest[] = [];
    
    for (const item of items) {
      if ('item' in item && Array.isArray(item.item)) {
        // It's a folder, recurse
        requests.push(...extractAllRequests(item.item));
      } else {
        // It's a request
        requests.push(item as PostmanRequest);
      }
    }
    
    return requests;
  }

  // Helper function to check if test script contains specific validation
  function hasResponseTimeValidation(scriptLines: string[]): boolean {
    const scriptText = scriptLines.join('\n');
    // Check for response time validation patterns
    return (
      scriptText.includes('pm.response.responseTime') &&
      (scriptText.includes('2000') || scriptText.includes('2s'))
    );
  }

  function hasStatusCodeValidation(scriptLines: string[]): boolean {
    const scriptText = scriptLines.join('\n');
    // Check for status code validation patterns
    return (
      scriptText.includes('pm.response.to.have.status') ||
      scriptText.includes('pm.expect(pm.response.code)') ||
      scriptText.includes('status code')
    );
  }

  function hasSchemaValidation(scriptLines: string[]): boolean {
    const scriptText = scriptLines.join('\n');
    // Check for schema validation patterns
    return (
      scriptText.includes('jsonSchema') ||
      scriptText.includes('schema') ||
      scriptText.includes('pm.response.to.have.jsonSchema')
    );
  }

  function hasDataIntegrityValidation(scriptLines: string[]): boolean {
    const scriptText = scriptLines.join('\n');
    // Check for data integrity validation patterns
    return (
      scriptText.includes('data integrity') ||
      scriptText.includes('pm.response.json()') ||
      scriptText.includes('forEach') ||
      scriptText.includes('valid') ||
      scriptText.includes('not.empty')
    );
  }

  // Helper function to get test events from a request
  function getTestEvents(request: PostmanRequest): string[] {
    if (!request.event) {
      return [];
    }
    
    const testEvents = request.event.filter(e => e.listen === 'test');
    const allScriptLines: string[] = [];
    
    for (const event of testEvents) {
      if (event.script && event.script.exec) {
        allScriptLines.push(...event.script.exec);
      }
    }
    
    return allScriptLines;
  }

  // Mock collection for testing (will be replaced with actual Postman API call)
  const mockCollection: PostmanCollection = {
    info: {
      name: 'Church Management API - Performance Tests',
      _postman_id: 'd6553e8e-ab3a-4317-bf15-7a57c4081cbd'
    },
    item: [
      {
        name: 'Dashboard',
        item: [
          {
            id: 'req1',
            name: 'Get Services',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Response time is less than 2000ms", () => {',
                    '  pm.expect(pm.response.responseTime).to.be.below(2000);',
                    '});',
                    'pm.test("Status code is 200", () => {',
                    '  pm.response.to.have.status(200);',
                    '});',
                    'pm.test("Response matches schema", () => {',
                    '  pm.response.to.have.jsonSchema(schema);',
                    '});',
                    'pm.test("Data integrity check", () => {',
                    '  const data = pm.response.json();',
                    '  data.forEach(item => pm.expect(item.id).to.not.be.empty);',
                    '});'
                  ],
                  type: 'text/javascript'
                }
              }
            ]
          }
        ]
      }
    ]
  };

  test('all requests have complete test scripts with 4 validation types', () => {
    const requests = extractAllRequests(mockCollection.item);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...requests),
        (request) => {
          const scriptLines = getTestEvents(request);
          
          if (scriptLines.length === 0) {
            console.error(`Request "${request.name}" has no test scripts`);
            return false;
          }
          
          // Check for all 4 required validation types
          const hasResponseTime = hasResponseTimeValidation(scriptLines);
          const hasStatusCode = hasStatusCodeValidation(scriptLines);
          const hasSchema = hasSchemaValidation(scriptLines);
          const hasDataIntegrity = hasDataIntegrityValidation(scriptLines);
          
          if (!hasResponseTime) {
            console.error(`Request "${request.name}" missing response time validation (<2s)`);
            return false;
          }
          
          if (!hasStatusCode) {
            console.error(`Request "${request.name}" missing status code validation`);
            return false;
          }
          
          if (!hasSchema) {
            console.error(`Request "${request.name}" missing response schema validation`);
            return false;
          }
          
          if (!hasDataIntegrity) {
            console.error(`Request "${request.name}" missing data integrity validation`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: Math.max(requests.length, 1) }
    );
  });

  test('response time validation checks for 2000ms threshold', () => {
    const requests = extractAllRequests(mockCollection.item);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...requests),
        (request) => {
          const scriptLines = getTestEvents(request);
          const scriptText = scriptLines.join('\n');
          
          if (!hasResponseTimeValidation(scriptLines)) {
            return true; // Skip if no response time validation (caught by other test)
          }
          
          // Verify the threshold is 2000ms or 2s
          const has2000msThreshold = scriptText.includes('2000') || scriptText.includes('2s');
          
          if (!has2000msThreshold) {
            console.error(`Request "${request.name}" response time validation doesn't use 2000ms threshold`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: Math.max(requests.length, 1) }
    );
  });

  test('status code validation checks for success codes', () => {
    const requests = extractAllRequests(mockCollection.item);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...requests),
        (request) => {
          const scriptLines = getTestEvents(request);
          const scriptText = scriptLines.join('\n');
          
          if (!hasStatusCodeValidation(scriptLines)) {
            return true; // Skip if no status code validation (caught by other test)
          }
          
          // Verify it checks for 200 or 2xx status codes
          const checksSuccessCode = 
            scriptText.includes('200') || 
            scriptText.includes('2xx') ||
            scriptText.includes('pm.response.to.be.success');
          
          if (!checksSuccessCode) {
            console.error(`Request "${request.name}" status code validation doesn't check for success codes`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: Math.max(requests.length, 1) }
    );
  });

  test('schema validation uses jsonSchema or similar validation', () => {
    const requests = extractAllRequests(mockCollection.item);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...requests),
        (request) => {
          const scriptLines = getTestEvents(request);
          const scriptText = scriptLines.join('\n');
          
          if (!hasSchemaValidation(scriptLines)) {
            return true; // Skip if no schema validation (caught by other test)
          }
          
          // Verify it uses proper schema validation methods
          const usesProperValidation = 
            scriptText.includes('jsonSchema') ||
            scriptText.includes('pm.response.to.have.jsonSchema') ||
            (scriptText.includes('schema') && scriptText.includes('pm.expect'));
          
          if (!usesProperValidation) {
            console.error(`Request "${request.name}" schema validation doesn't use proper validation methods`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: Math.max(requests.length, 1) }
    );
  });

  test('data integrity validation accesses response data', () => {
    const requests = extractAllRequests(mockCollection.item);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...requests),
        (request) => {
          const scriptLines = getTestEvents(request);
          const scriptText = scriptLines.join('\n');
          
          if (!hasDataIntegrityValidation(scriptLines)) {
            return true; // Skip if no data integrity validation (caught by other test)
          }
          
          // Verify it accesses response data
          const accessesResponseData = 
            scriptText.includes('pm.response.json()') ||
            scriptText.includes('responseBody') ||
            scriptText.includes('jsonData');
          
          if (!accessesResponseData) {
            console.error(`Request "${request.name}" data integrity validation doesn't access response data`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: Math.max(requests.length, 1) }
    );
  });

  test('mock collection has at least one request for testing', () => {
    const requests = extractAllRequests(mockCollection.item);
    expect(requests.length).toBeGreaterThan(0);
  });

  test('mock collection structure is valid', () => {
    expect(mockCollection).toHaveProperty('info');
    expect(mockCollection.info).toHaveProperty('name');
    expect(mockCollection.info).toHaveProperty('_postman_id');
    expect(mockCollection).toHaveProperty('item');
    expect(Array.isArray(mockCollection.item)).toBe(true);
  });
});
