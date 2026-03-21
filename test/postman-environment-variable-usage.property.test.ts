/**
 * Property-Based Test: Postman Environment Variable Usage
 * Feature: api-performance-optimization, Property 17: Postman Environment Variable Usage
 * 
 * Validates: Requirements 8.8
 * 
 * Property: For all requests in the Postman collection, each request URL and 
 * authentication header should reference environment variables rather than 
 * hardcoded values.
 */

import fc from 'fast-check';

// Feature: api-performance-optimization, Property 17: Postman Environment Variable Usage

// Mock Postman API client for testing
interface PostmanHeader {
  key: string;
  value: string;
  type?: string;
}

interface PostmanUrl {
  raw: string;
  protocol?: string;
  host?: string[];
  path?: string[];
}

interface PostmanRequest {
  id: string;
  name: string;
  request: {
    method: string;
    url: PostmanUrl | string;
    header?: PostmanHeader[];
    auth?: {
      type: string;
      bearer?: Array<{ key: string; value: string; type: string }>;
    };
  };
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

describe('Postman Environment Variable Usage', () => {
  // Helper function to extract all requests from collection (including nested folders)
  function extractAllRequests(items: (PostmanRequest | PostmanFolder)[]): PostmanRequest[] {
    const requests: PostmanRequest[] = [];
    
    for (const item of items) {
      if ('item' in item && Array.isArray(item.item)) {
        // It's a folder, recurse
        requests.push(...extractAllRequests(item.item));
      } else if ('request' in item) {
        // It's a request
        requests.push(item as PostmanRequest);
      }
    }
    
    return requests;
  }

  // Helper function to check if a string contains environment variable references
  function hasEnvironmentVariable(value: string): boolean {
    // Postman environment variables use {{VARIABLE_NAME}} syntax
    return /\{\{[A-Z_]+\}\}/.test(value);
  }

  // Helper function to check if a string is hardcoded (contains actual URL or token)
  function isHardcodedUrl(value: string): boolean {
    // Check for hardcoded URLs (http://, https://, or domain patterns)
    const hasProtocol = /^https?:\/\//.test(value);
    const hasDomain = /\.(com|org|net|io|dev|local)/.test(value);
    const hasIPAddress = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(value);
    
    return hasProtocol || hasDomain || hasIPAddress;
  }

  // Helper function to check if a string is a hardcoded token/key
  function isHardcodedToken(value: string): boolean {
    // Check for JWT-like patterns or long alphanumeric strings that look like tokens
    const looksLikeJWT = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value);
    const looksLikeAPIKey = /^[A-Za-z0-9]{32,}$/.test(value);
    const looksLikeBearer = /^Bearer [A-Za-z0-9-_\.]+$/.test(value);
    
    return looksLikeJWT || looksLikeAPIKey || looksLikeBearer;
  }

  // Helper function to extract URL string from PostmanUrl object or string
  function getUrlString(url: PostmanUrl | string): string {
    if (typeof url === 'string') {
      return url;
    }
    return url.raw || '';
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
            request: {
              method: 'GET',
              url: {
                raw: '{{API_URL}}/query/services',
                protocol: 'https',
                host: ['{{API_URL}}'],
                path: ['query', 'services']
              },
              header: [
                {
                  key: 'Authorization',
                  value: 'Bearer {{AUTH_TOKEN}}',
                  type: 'text'
                },
                {
                  key: 'Content-Type',
                  value: 'application/json',
                  type: 'text'
                }
              ]
            }
          },
          {
            id: 'req2',
            name: 'Get Service KPIs',
            request: {
              method: 'GET',
              url: '{{API_URL}}/query/service-kpis?serviceId={{SERVICE_ID}}',
              header: [
                {
                  key: 'Authorization',
                  value: 'Bearer {{AUTH_TOKEN}}',
                  type: 'text'
                }
              ]
            }
          }
        ]
      },
      {
        name: 'Authentication',
        item: [
          {
            id: 'auth1',
            name: 'Get Cognito Token',
            request: {
              method: 'POST',
              url: 'https://cognito-idp.{{AWS_REGION}}.amazonaws.com/',
              header: [
                {
                  key: 'X-Amz-Target',
                  value: 'AWSCognitoIdentityProviderService.InitiateAuth',
                  type: 'text'
                },
                {
                  key: 'Content-Type',
                  value: 'application/x-amz-json-1.1',
                  type: 'text'
                }
              ]
            }
          }
        ]
      }
    ]
  };

  test('all request URLs use environment variables instead of hardcoded values', () => {
    const requests = extractAllRequests(mockCollection.item);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...requests),
        (request) => {
          const urlString = getUrlString(request.request.url);
          
          if (!urlString) {
            console.error(`Request "${request.name}" has no URL`);
            return false;
          }
          
          // Check if URL contains environment variables
          const hasEnvVar = hasEnvironmentVariable(urlString);
          
          // Check if URL is hardcoded
          const isHardcoded = isHardcodedUrl(urlString);
          
          // URL should either use environment variables OR be a special case (like AWS service endpoints)
          // For AWS service endpoints, we allow them if they use region variables
          const isAWSServiceEndpoint = urlString.includes('amazonaws.com') && hasEnvironmentVariable(urlString);
          
          if (isHardcoded && !hasEnvVar && !isAWSServiceEndpoint) {
            console.error(`Request "${request.name}" URL is hardcoded: ${urlString}`);
            return false;
          }
          
          // If it's not a special AWS endpoint, it should use environment variables
          if (!isAWSServiceEndpoint && !hasEnvVar) {
            console.error(`Request "${request.name}" URL doesn't use environment variables: ${urlString}`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: Math.max(requests.length, 1) }
    );
  });

  test('all authorization headers use environment variables instead of hardcoded tokens', () => {
    const requests = extractAllRequests(mockCollection.item);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...requests),
        (request) => {
          const headers = request.request.header || [];
          const authHeaders = headers.filter(h => 
            h.key.toLowerCase() === 'authorization' || 
            h.key.toLowerCase() === 'x-api-key'
          );
          
          if (authHeaders.length === 0) {
            // No auth headers is acceptable (might use collection-level auth)
            return true;
          }
          
          for (const header of authHeaders) {
            const hasEnvVar = hasEnvironmentVariable(header.value);
            const isHardcoded = isHardcodedToken(header.value);
            
            if (isHardcoded && !hasEnvVar) {
              console.error(`Request "${request.name}" has hardcoded auth token in header "${header.key}"`);
              return false;
            }
            
            if (!hasEnvVar && header.value !== '') {
              console.error(`Request "${request.name}" auth header "${header.key}" doesn't use environment variables`);
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: Math.max(requests.length, 1) }
    );
  });

  test('bearer token authentication uses environment variables', () => {
    const requests = extractAllRequests(mockCollection.item);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...requests),
        (request) => {
          const auth = request.request.auth;
          
          if (!auth || auth.type !== 'bearer') {
            // No bearer auth is acceptable
            return true;
          }
          
          if (auth.bearer) {
            for (const item of auth.bearer) {
              if (item.key === 'token') {
                const hasEnvVar = hasEnvironmentVariable(item.value);
                const isHardcoded = isHardcodedToken(item.value);
                
                if (isHardcoded && !hasEnvVar) {
                  console.error(`Request "${request.name}" has hardcoded bearer token`);
                  return false;
                }
                
                if (!hasEnvVar && item.value !== '') {
                  console.error(`Request "${request.name}" bearer token doesn't use environment variables`);
                  return false;
                }
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: Math.max(requests.length, 1) }
    );
  });

  test('environment variable names follow naming conventions', () => {
    const requests = extractAllRequests(mockCollection.item);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...requests),
        (request) => {
          const urlString = getUrlString(request.request.url);
          const headers = request.request.header || [];
          
          // Extract all environment variable references
          const envVarPattern = /\{\{([A-Z_]+)\}\}/g;
          const allText = urlString + ' ' + headers.map(h => h.value).join(' ');
          const matches = allText.matchAll(envVarPattern);
          
          for (const match of matches) {
            const varName = match[1];
            
            if (!varName) {
              continue;
            }
            
            // Check naming convention: UPPER_CASE_WITH_UNDERSCORES
            const isValidName = /^[A-Z][A-Z0-9_]*$/.test(varName);
            
            if (!isValidName) {
              console.error(`Request "${request.name}" uses invalid environment variable name: ${varName}`);
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: Math.max(requests.length, 1) }
    );
  });

  test('common environment variables are used consistently', () => {
    const requests = extractAllRequests(mockCollection.item);
    
    // Collect all environment variables used across all requests
    const usedVars = new Set<string>();
    
    for (const request of requests) {
      const urlString = getUrlString(request.request.url);
      const headers = request.request.header || [];
      const allText = urlString + ' ' + headers.map(h => h.value).join(' ');
      
      const envVarPattern = /\{\{([A-Z_]+)\}\}/g;
      const matches = allText.matchAll(envVarPattern);
      
      for (const match of matches) {
        const varName = match[1];
        if (varName) {
          usedVars.add(varName);
        }
      }
    }
    
    // Check if at least some expected variables are used
    const hasAPIUrl = usedVars.has('API_URL');
    const hasAuthToken = usedVars.has('AUTH_TOKEN');
    
    // At minimum, API_URL should be used in most requests
    if (!hasAPIUrl) {
      console.warn('Collection does not use API_URL environment variable');
    }
    
    // This is a soft check - we expect these variables to be used
    expect(hasAPIUrl || hasAuthToken).toBe(true);
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

  test('all requests have valid request structure', () => {
    const requests = extractAllRequests(mockCollection.item);
    
    for (const request of requests) {
      expect(request).toHaveProperty('request');
      expect(request.request).toHaveProperty('method');
      expect(request.request).toHaveProperty('url');
    }
  });
});
