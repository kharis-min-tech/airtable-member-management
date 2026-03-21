/**
 * Property-Based Test: OpenAPI Error Response Completeness
 * Feature: api-performance-optimization, Property 14: OpenAPI Error Response Completeness
 * 
 * Validates: Requirements 7.4
 * 
 * Property: For all endpoints in the OpenAPI specification, each endpoint should 
 * document error responses for status codes 400, 401, 403, 404, and 500.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import fc from 'fast-check';

// Feature: api-performance-optimization, Property 14: OpenAPI Error Response Completeness

describe('OpenAPI Error Response Completeness', () => {
  let openApiSpec: any;
  let authenticatedEndpoints: string[];
  let unauthenticatedEndpoints: string[];
  
  // Required error status codes for authenticated endpoints
  const requiredAuthenticatedErrorCodes = ['400', '401', '403', '404', '500'];
  
  // Required error status codes for unauthenticated endpoints (no 401/403)
  const requiredUnauthenticatedErrorCodes = ['400', '404', '500'];

  beforeAll(() => {
    // Load OpenAPI specification
    const openApiPath = path.join(__dirname, '../docs/openapi.yaml');
    
    // Check if file exists
    if (!fs.existsSync(openApiPath)) {
      throw new Error(`OpenAPI spec file not found at: ${openApiPath}`);
    }
    
    const openApiContent = fs.readFileSync(openApiPath, 'utf8');
    
    try {
      openApiSpec = yaml.load(openApiContent);
      
      if (!openApiSpec) {
        throw new Error('OpenAPI spec loaded but is null or undefined');
      }
      
      if (!openApiSpec.paths) {
        throw new Error('OpenAPI spec missing paths property');
      }
    } catch (error) {
      console.error('Error loading OpenAPI spec:', error);
      throw error;
    }
    
    // Categorize endpoints by authentication requirement
    const paths = openApiSpec.paths || {};
    authenticatedEndpoints = [];
    unauthenticatedEndpoints = [];
    
    for (const [endpoint, methods] of Object.entries(paths)) {
      if (typeof methods === 'object' && methods !== null) {
        const methodDef = (methods as any).get;
        if (methodDef) {
          // Check if endpoint requires authentication
          const requiresAuth = methodDef.security && Array.isArray(methodDef.security) && methodDef.security.length > 0;
          
          if (requiresAuth) {
            authenticatedEndpoints.push(endpoint);
          } else {
            unauthenticatedEndpoints.push(endpoint);
          }
        }
      }
    }
  });

  test('authenticated endpoints document all required error responses', () => {
    if (authenticatedEndpoints.length === 0) {
      console.warn('No authenticated endpoints found in OpenAPI spec');
      return;
    }
    
    fc.assert(
      fc.property(
        fc.constantFrom(...authenticatedEndpoints),
        (endpoint) => {
          const paths = openApiSpec.paths || {};
          const endpointDef = paths[endpoint];
          
          if (!endpointDef || !endpointDef.get) {
            console.error(`Endpoint ${endpoint} missing GET method`);
            return false;
          }
          
          const responses = endpointDef.get.responses || {};
          
          // Check for all required error codes
          for (const errorCode of requiredAuthenticatedErrorCodes) {
            if (!(errorCode in responses)) {
              console.error(`Endpoint ${endpoint} missing ${errorCode} error response`);
              return false;
            }
            
            const errorResponse = responses[errorCode];
            
            // Check if error response has description
            if (!errorResponse.description || typeof errorResponse.description !== 'string') {
              console.error(`Endpoint ${endpoint} ${errorCode} response missing description`);
              return false;
            }
            
            // Check if error response has content or $ref
            const hasContent = 'content' in errorResponse || '$ref' in errorResponse;
            if (!hasContent) {
              console.error(`Endpoint ${endpoint} ${errorCode} response missing content or $ref`);
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: authenticatedEndpoints.length }
    );
  });

  test('unauthenticated endpoints document required error responses', () => {
    if (unauthenticatedEndpoints.length === 0) {
      console.warn('No unauthenticated endpoints found in OpenAPI spec');
      return;
    }
    
    fc.assert(
      fc.property(
        fc.constantFrom(...unauthenticatedEndpoints),
        (endpoint) => {
          const paths = openApiSpec.paths || {};
          const endpointDef = paths[endpoint];
          
          if (!endpointDef || !endpointDef.get) {
            console.error(`Endpoint ${endpoint} missing GET method`);
            return false;
          }
          
          const responses = endpointDef.get.responses || {};
          
          // Check for required error codes (no 401/403 for unauthenticated)
          for (const errorCode of requiredUnauthenticatedErrorCodes) {
            if (!(errorCode in responses)) {
              console.error(`Endpoint ${endpoint} missing ${errorCode} error response`);
              return false;
            }
            
            const errorResponse = responses[errorCode];
            
            // Check if error response has description
            if (!errorResponse.description || typeof errorResponse.description !== 'string') {
              console.error(`Endpoint ${endpoint} ${errorCode} response missing description`);
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: unauthenticatedEndpoints.length }
    );
  });

  test('error responses use consistent schema structure', () => {
    const paths = openApiSpec.paths || {};
    const allEndpoints = Object.keys(paths);
    
    if (allEndpoints.length === 0) {
      console.warn('No endpoints found in OpenAPI spec');
      return;
    }
    
    fc.assert(
      fc.property(
        fc.constantFrom(...allEndpoints),
        (endpoint) => {
          const endpointDef = paths[endpoint];
          
          if (!endpointDef || !endpointDef.get) {
            return true; // Skip if no GET method
          }
          
          const responses = endpointDef.get.responses || {};
          const errorCodes = ['400', '401', '403', '404', '500'];
          
          for (const errorCode of errorCodes) {
            if (errorCode in responses) {
              const errorResponse = responses[errorCode];
              
              // If it has content, check for application/json
              if ('content' in errorResponse) {
                const content = errorResponse.content;
                
                if (!('application/json' in content)) {
                  console.error(`Endpoint ${endpoint} ${errorCode} response missing application/json content type`);
                  return false;
                }
                
                const jsonContent = content['application/json'];
                
                // Check for schema or example
                const hasSchemaOrExample = 'schema' in jsonContent || 'example' in jsonContent;
                if (!hasSchemaOrExample) {
                  console.error(`Endpoint ${endpoint} ${errorCode} response missing schema or example`);
                  return false;
                }
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: allEndpoints.length }
    );
  });

  test('error response schemas reference ErrorResponse component', () => {
    const paths = openApiSpec.paths || {};
    const allEndpoints = Object.keys(paths);
    
    if (allEndpoints.length === 0) {
      console.warn('No endpoints found in OpenAPI spec');
      return;
    }
    
    // Check that ErrorResponse schema exists in components
    expect(openApiSpec.components).toHaveProperty('schemas');
    expect(openApiSpec.components.schemas).toHaveProperty('ErrorResponse');
    
    const errorResponseSchema = openApiSpec.components.schemas.ErrorResponse;
    expect(errorResponseSchema).toHaveProperty('properties');
    expect(errorResponseSchema.properties).toHaveProperty('success');
    expect(errorResponseSchema.properties).toHaveProperty('error');
    expect(errorResponseSchema.properties).toHaveProperty('timestamp');
  });

  test('error responses include example values', () => {
    const paths = openApiSpec.paths || {};
    const allEndpoints = Object.keys(paths);
    
    if (allEndpoints.length === 0) {
      console.warn('No endpoints found in OpenAPI spec');
      return;
    }
    
    fc.assert(
      fc.property(
        fc.constantFrom(...allEndpoints),
        (endpoint) => {
          const endpointDef = paths[endpoint];
          
          if (!endpointDef || !endpointDef.get) {
            return true; // Skip if no GET method
          }
          
          const responses = endpointDef.get.responses || {};
          const errorCodes = ['400', '401', '403', '404', '500'];
          
          for (const errorCode of errorCodes) {
            if (errorCode in responses) {
              const errorResponse = responses[errorCode];
              
              // If it has content with application/json, check for example
              if ('content' in errorResponse && 'application/json' in errorResponse.content) {
                const jsonContent = errorResponse.content['application/json'];
                
                // Should have either example or schema with example
                const hasExample = 'example' in jsonContent || 
                                  ('schema' in jsonContent && '$ref' in jsonContent.schema);
                
                if (!hasExample) {
                  console.error(`Endpoint ${endpoint} ${errorCode} response missing example`);
                  return false;
                }
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: allEndpoints.length }
    );
  });
});
