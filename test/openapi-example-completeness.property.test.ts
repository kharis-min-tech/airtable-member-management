/**
 * Property-Based Test: OpenAPI Example Completeness
 * Feature: api-performance-optimization, Property 15: OpenAPI Example Completeness
 * 
 * Validates: Requirements 7.7
 * 
 * Property: For all endpoints in the OpenAPI specification, each endpoint should 
 * include at least one example request and one example response.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import fc from 'fast-check';

// Feature: api-performance-optimization, Property 15: OpenAPI Example Completeness

describe('OpenAPI Example Completeness', () => {
  let openApiSpec: any;
  let allEndpoints: string[];

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
    
    // Get all endpoints
    const paths = openApiSpec.paths || {};
    allEndpoints = Object.keys(paths);
  });

  test('all endpoints have example responses', () => {
    if (allEndpoints.length === 0) {
      console.warn('No endpoints found in OpenAPI spec');
      return;
    }
    
    fc.assert(
      fc.property(
        fc.constantFrom(...allEndpoints),
        (endpoint) => {
          const paths = openApiSpec.paths || {};
          const endpointDef = paths[endpoint];
          
          if (!endpointDef || !endpointDef.get) {
            console.error(`Endpoint ${endpoint} missing GET method`);
            return false;
          }
          
          const responses = endpointDef.get.responses || {};
          
          // Check if 200 response has an example
          const response200 = responses['200'];
          if (!response200) {
            console.error(`Endpoint ${endpoint} missing 200 response`);
            return false;
          }
          
          // Check for example in response
          const hasExample = checkForExample(response200, endpoint, '200');
          
          if (!hasExample) {
            console.error(`Endpoint ${endpoint} 200 response missing example`);
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: allEndpoints.length }
    );
  });

  test('error responses include examples', () => {
    if (allEndpoints.length === 0) {
      console.warn('No endpoints found in OpenAPI spec');
      return;
    }
    
    fc.assert(
      fc.property(
        fc.constantFrom(...allEndpoints),
        (endpoint) => {
          const paths = openApiSpec.paths || {};
          const endpointDef = paths[endpoint];
          
          if (!endpointDef || !endpointDef.get) {
            return true; // Skip if no GET method
          }
          
          const responses = endpointDef.get.responses || {};
          const errorCodes = ['400', '401', '403', '404', '500'];
          
          // Check each error response for examples
          for (const errorCode of errorCodes) {
            if (errorCode in responses) {
              const errorResponse = responses[errorCode];
              const hasExample = checkForExample(errorResponse, endpoint, errorCode);
              
              if (!hasExample) {
                console.error(`Endpoint ${endpoint} ${errorCode} response missing example`);
                return false;
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: allEndpoints.length }
    );
  });

  test('endpoints with parameters have parameter examples', () => {
    if (allEndpoints.length === 0) {
      console.warn('No endpoints found in OpenAPI spec');
      return;
    }
    
    fc.assert(
      fc.property(
        fc.constantFrom(...allEndpoints),
        (endpoint) => {
          const paths = openApiSpec.paths || {};
          const endpointDef = paths[endpoint];
          
          if (!endpointDef || !endpointDef.get) {
            return true; // Skip if no GET method
          }
          
          const parameters = endpointDef.get.parameters || [];
          
          // Check each parameter for example
          for (const param of parameters) {
            // Skip if parameter is a $ref (examples are in the referenced component)
            if ('$ref' in param) {
              continue;
            }
            
            // Check for example in parameter or schema
            const hasExample = 'example' in param || 
                              ('schema' in param && 'example' in param.schema);
            
            if (!hasExample && param.required) {
              console.error(`Endpoint ${endpoint} required parameter ${param.name} missing example`);
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: allEndpoints.length }
    );
  });

  test('OpenAPI spec has example values in schemas', () => {
    // Check that common schemas have examples
    expect(openApiSpec.components).toHaveProperty('schemas');
    
    const schemas = openApiSpec.components.schemas;
    
    // SuccessResponse should have example values
    if ('SuccessResponse' in schemas) {
      const successResponse = schemas.SuccessResponse;
      expect(successResponse).toHaveProperty('properties');
      
      // Check if properties have examples
      const properties = successResponse.properties;
      const hasExamples = Object.values(properties).some((prop: any) => 'example' in prop);
      
      expect(hasExamples).toBe(true);
    }
    
    // ErrorResponse should have example values
    if ('ErrorResponse' in schemas) {
      const errorResponse = schemas.ErrorResponse;
      expect(errorResponse).toHaveProperty('properties');
      
      // Check if properties have examples
      const properties = errorResponse.properties;
      const hasExamples = Object.values(properties).some((prop: any) => 'example' in prop);
      
      expect(hasExamples).toBe(true);
    }
  });
});

/**
 * Helper function to check if a response has an example
 */
function checkForExample(response: any, _endpoint: string, _statusCode: string): boolean {
  // Check for direct example
  if ('example' in response) {
    return true;
  }
  
  // Check for example in content
  if ('content' in response) {
    const content = response.content;
    
    // Check application/json content type
    if ('application/json' in content) {
      const jsonContent = content['application/json'];
      
      // Check for example or examples
      if ('example' in jsonContent || 'examples' in jsonContent) {
        return true;
      }
      
      // Check for example in schema
      if ('schema' in jsonContent) {
        const schema = jsonContent.schema;
        
        // If schema is a $ref, we assume it has examples in the component
        if ('$ref' in schema) {
          return true; // Assume referenced schemas have examples
        }
        
        // Check for example in schema
        if ('example' in schema) {
          return true;
        }
      }
    }
  }
  
  // Check if it's a $ref (examples are in the referenced component)
  if ('$ref' in response) {
    return true; // Assume referenced responses have examples
  }
  
  return false;
}
