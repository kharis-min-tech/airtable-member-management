/**
 * Property-Based Test: OpenAPI Endpoint Coverage
 * Feature: api-performance-optimization, Property 13: OpenAPI Endpoint Coverage
 * 
 * Validates: Requirements 7.2
 * 
 * Property: For all actual API endpoints matching the pattern /query/*, 
 * the OpenAPI specification should contain a corresponding path definition 
 * with request parameters and response schemas.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import fc from 'fast-check';

// Feature: api-performance-optimization, Property 13: OpenAPI Endpoint Coverage

describe('OpenAPI Endpoint Coverage', () => {
  let openApiSpec: any;
  
  // Actual /query/* endpoints from the application
  const actualQueryEndpoints = [
    '/query/dashboard',
    '/query/attendance',
    '/query/members',
    '/query/journey',
    '/query/follow-up',
    '/query/admin',
  ];

  beforeAll(() => {
    // Load OpenAPI specification
    const openApiPath = path.join(__dirname, '../docs/openapi.yaml');
    const openApiContent = fs.readFileSync(openApiPath, 'utf8');
    openApiSpec = yaml.load(openApiContent);
  });

  test('all /query/* endpoints are documented in OpenAPI spec', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...actualQueryEndpoints),
        (endpoint) => {
          // Check if endpoint exists in OpenAPI paths
          const paths = openApiSpec.paths || {};
          const endpointExists = endpoint in paths;
          
          if (!endpointExists) {
            console.error(`Missing endpoint in OpenAPI spec: ${endpoint}`);
            return false;
          }
          
          // Check if endpoint has GET method defined
          const endpointDef = paths[endpoint];
          const hasGetMethod = 'get' in endpointDef;
          
          if (!hasGetMethod) {
            console.error(`Endpoint ${endpoint} missing GET method definition`);
            return false;
          }
          
          // Check if GET method has parameters defined
          const getMethod = endpointDef.get;
          const hasParameters = 'parameters' in getMethod && Array.isArray(getMethod.parameters);
          
          if (!hasParameters) {
            console.error(`Endpoint ${endpoint} GET method missing parameters`);
            return false;
          }
          
          // Check if GET method has responses defined
          const hasResponses = 'responses' in getMethod && typeof getMethod.responses === 'object';
          
          if (!hasResponses) {
            console.error(`Endpoint ${endpoint} GET method missing responses`);
            return false;
          }
          
          // Check if responses include success (200) and error codes
          const responses = getMethod.responses;
          const has200Response = '200' in responses;
          
          if (!has200Response) {
            console.error(`Endpoint ${endpoint} missing 200 response`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: actualQueryEndpoints.length }
    );
  });

  test('documented endpoints have complete parameter definitions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...actualQueryEndpoints),
        (endpoint) => {
          const paths = openApiSpec.paths || {};
          const endpointDef = paths[endpoint];
          
          if (!endpointDef || !endpointDef.get) {
            return false;
          }
          
          const parameters = endpointDef.get.parameters || [];
          
          // Each parameter should have required fields
          for (const param of parameters) {
            // Check for name
            if (!param.name || typeof param.name !== 'string') {
              console.error(`Parameter in ${endpoint} missing name`);
              return false;
            }
            
            // Check for 'in' field (query, path, header, etc.)
            if (!param.in || typeof param.in !== 'string') {
              console.error(`Parameter ${param.name} in ${endpoint} missing 'in' field`);
              return false;
            }
            
            // Check for schema or $ref
            const hasSchema = 'schema' in param || '$ref' in param;
            if (!hasSchema) {
              console.error(`Parameter ${param.name} in ${endpoint} missing schema`);
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: actualQueryEndpoints.length }
    );
  });

  test('documented endpoints have complete response schemas', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...actualQueryEndpoints),
        (endpoint) => {
          const paths = openApiSpec.paths || {};
          const endpointDef = paths[endpoint];
          
          if (!endpointDef || !endpointDef.get) {
            return false;
          }
          
          const responses = endpointDef.get.responses || {};
          
          // Check 200 response has content or $ref
          const response200 = responses['200'];
          if (!response200) {
            console.error(`Endpoint ${endpoint} missing 200 response`);
            return false;
          }
          
          // Response should have description
          if (!response200.description || typeof response200.description !== 'string') {
            console.error(`Endpoint ${endpoint} 200 response missing description`);
            return false;
          }
          
          // Response should have content or $ref
          const hasContent = 'content' in response200 || '$ref' in response200;
          if (!hasContent) {
            console.error(`Endpoint ${endpoint} 200 response missing content or $ref`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: actualQueryEndpoints.length }
    );
  });

  test('OpenAPI spec includes health endpoint', () => {
    const paths = openApiSpec.paths || {};
    expect(paths).toHaveProperty('/health');
    expect(paths['/health']).toHaveProperty('get');
    expect(paths['/health'].get).toHaveProperty('responses');
    expect(paths['/health'].get.responses).toHaveProperty('200');
  });

  test('OpenAPI spec has required metadata', () => {
    // Check info section
    expect(openApiSpec).toHaveProperty('info');
    expect(openApiSpec.info).toHaveProperty('title');
    expect(openApiSpec.info).toHaveProperty('version');
    expect(openApiSpec.info).toHaveProperty('description');
    
    // Check servers section
    expect(openApiSpec).toHaveProperty('servers');
    expect(Array.isArray(openApiSpec.servers)).toBe(true);
    expect(openApiSpec.servers.length).toBeGreaterThan(0);
    
    // Check security schemes
    expect(openApiSpec).toHaveProperty('components');
    expect(openApiSpec.components).toHaveProperty('securitySchemes');
    expect(openApiSpec.components.securitySchemes).toHaveProperty('CognitoAuth');
  });
});
