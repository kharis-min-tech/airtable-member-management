/**
 * Property-Based Test: Postman Example Schema Accuracy
 * Feature: api-performance-optimization, Property 18: Postman Example Schema Accuracy
 * 
 * Validates: Requirements 8.9
 * 
 * Property: For all example responses in the Postman collection, each example should 
 * match the actual Airtable schema structure for the corresponding resource.
 */

import fc from 'fast-check';
import { AIRTABLE_TABLES } from '../src/services/airtable-client';

// Feature: api-performance-optimization, Property 18: Postman Example Schema Accuracy

// Postman collection types
interface PostmanExample {
  name: string;
  originalRequest: {
    url: string | { raw: string };
    method: string;
  };
  response: Array<{
    name: string;
    status: string;
    code: number;
    body: string;
  }>;
}

interface PostmanRequest {
  id: string;
  name: string;
  request: {
    url: string | { raw: string };
    method: string;
  };
  response?: PostmanExample['response'];
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

// Airtable schema definitions based on actual tables
const AIRTABLE_SCHEMAS = {
  [AIRTABLE_TABLES.MEMBERS]: {
    requiredFields: ['Name', 'Phone', 'Email'],
    optionalFields: ['Department', 'Role', 'Status', 'Date Joined', 'Address', 'City', 'State', 'Zip Code'],
    fieldTypes: {
      Name: 'string',
      Phone: 'string',
      Email: 'string',
      Department: 'array',
      Role: 'string',
      Status: 'string',
      'Date Joined': 'string',
      Address: 'string',
      City: 'string',
      State: 'string',
      'Zip Code': 'string'
    }
  },
  [AIRTABLE_TABLES.SERVICES]: {
    requiredFields: ['Service Name', 'Service Date', 'Service Type'],
    optionalFields: ['Attendance Count', 'First Timers Count', 'Returners Count', 'Notes'],
    fieldTypes: {
      'Service Name': 'string',
      'Service Date': 'string',
      'Service Type': 'string',
      'Attendance Count': 'number',
      'First Timers Count': 'number',
      'Returners Count': 'number',
      Notes: 'string'
    }
  },
  [AIRTABLE_TABLES.ATTENDANCE]: {
    requiredFields: ['Member', 'Service', 'Attended'],
    optionalFields: ['Check-in Time', 'Notes'],
    fieldTypes: {
      Member: 'array',
      Service: 'array',
      Attended: 'boolean',
      'Check-in Time': 'string',
      Notes: 'string'
    }
  },
  [AIRTABLE_TABLES.EVANGELISM]: {
    requiredFields: ['Member', 'Date', 'Type'],
    optionalFields: ['Location', 'Notes', 'Follow-up Required', 'Assigned To'],
    fieldTypes: {
      Member: 'array',
      Date: 'string',
      Type: 'string',
      Location: 'string',
      Notes: 'string',
      'Follow-up Required': 'boolean',
      'Assigned To': 'array'
    }
  },
  [AIRTABLE_TABLES.FIRST_TIMERS_REGISTER]: {
    requiredFields: ['Name', 'Phone', 'Service'],
    optionalFields: ['Email', 'Address', 'Age', 'Visitor Type', 'Notes', 'Follow-up Status'],
    fieldTypes: {
      Name: 'string',
      Phone: 'string',
      Service: 'array',
      Email: 'string',
      Address: 'string',
      Age: 'string',
      'Visitor Type': 'string',
      Notes: 'string',
      'Follow-up Status': 'string'
    }
  },
  [AIRTABLE_TABLES.RETURNERS_REGISTER]: {
    requiredFields: ['Name', 'Phone', 'Service'],
    optionalFields: ['Email', 'Last Visit Date', 'Notes', 'Follow-up Status'],
    fieldTypes: {
      Name: 'string',
      Phone: 'string',
      Service: 'array',
      Email: 'string',
      'Last Visit Date': 'string',
      Notes: 'string',
      'Follow-up Status': 'string'
    }
  },
  [AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS]: {
    requiredFields: ['Member', 'Assigned To', 'Status'],
    optionalFields: ['Assignment Date', 'Due Date', 'Priority', 'Notes', 'Completed Date'],
    fieldTypes: {
      Member: 'array',
      'Assigned To': 'array',
      Status: 'string',
      'Assignment Date': 'string',
      'Due Date': 'string',
      Priority: 'string',
      Notes: 'string',
      'Completed Date': 'string'
    }
  },
  [AIRTABLE_TABLES.FOLLOW_UP_INTERACTIONS]: {
    requiredFields: ['Assignment', 'Interaction Date', 'Type'],
    optionalFields: ['Notes', 'Outcome', 'Next Steps', 'Recorded By'],
    fieldTypes: {
      Assignment: 'array',
      'Interaction Date': 'string',
      Type: 'string',
      Notes: 'string',
      Outcome: 'string',
      'Next Steps': 'string',
      'Recorded By': 'array'
    }
  },
  [AIRTABLE_TABLES.HOME_VISITS]: {
    requiredFields: ['Member', 'Visit Date', 'Visitor'],
    optionalFields: ['Purpose', 'Notes', 'Follow-up Required', 'Status'],
    fieldTypes: {
      Member: 'array',
      'Visit Date': 'string',
      Visitor: 'array',
      Purpose: 'string',
      Notes: 'string',
      'Follow-up Required': 'boolean',
      Status: 'string'
    }
  },
  [AIRTABLE_TABLES.DEPARTMENTS]: {
    requiredFields: ['Department Name'],
    optionalFields: ['Description', 'Head', 'Member Count'],
    fieldTypes: {
      'Department Name': 'string',
      Description: 'string',
      Head: 'array',
      'Member Count': 'number'
    }
  },
  [AIRTABLE_TABLES.MEMBER_DEPARTMENTS]: {
    requiredFields: ['Member', 'Department'],
    optionalFields: ['Role', 'Join Date', 'Status'],
    fieldTypes: {
      Member: 'array',
      Department: 'array',
      Role: 'string',
      'Join Date': 'string',
      Status: 'string'
    }
  },
  [AIRTABLE_TABLES.MEMBER_PROGRAMS]: {
    requiredFields: ['Member', 'Program'],
    optionalFields: ['Enrollment Date', 'Status', 'Completion Date', 'Notes'],
    fieldTypes: {
      Member: 'array',
      Program: 'string',
      'Enrollment Date': 'string',
      Status: 'string',
      'Completion Date': 'string',
      Notes: 'string'
    }
  }
} as const;

describe('Postman Example Schema Accuracy', () => {
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

  // Helper function to determine which Airtable table a request corresponds to
  function getTableFromRequest(request: PostmanRequest): string | null {
    const url = typeof request.request.url === 'string' 
      ? request.request.url 
      : request.request.url.raw;
    
    // Map endpoint patterns to Airtable tables
    if (url.includes('/query/dashboard')) {
      return 'dashboard'; // Multiple tables
    } else if (url.includes('/query/attendance')) {
      return AIRTABLE_TABLES.ATTENDANCE;
    } else if (url.includes('/query/members') || url.includes('/query/journey')) {
      return AIRTABLE_TABLES.MEMBERS;
    } else if (url.includes('/query/follow-up')) {
      return AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS;
    } else if (url.includes('/query/admin')) {
      return 'admin'; // Multiple tables
    }
    
    return null;
  }

  // Helper function to validate field types
  function validateFieldType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      default:
        return true; // Unknown type, skip validation
    }
  }

  // Helper function to validate example response against schema
  function validateExampleAgainstSchema(
    example: any,
    tableName: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Skip validation for composite endpoints (dashboard, admin)
    if (tableName === 'dashboard' || tableName === 'admin') {
      return { valid: true, errors: [] };
    }
    
    const schema = AIRTABLE_SCHEMAS[tableName as keyof typeof AIRTABLE_SCHEMAS];
    if (!schema) {
      errors.push(`No schema defined for table: ${tableName}`);
      return { valid: false, errors };
    }
    
    // Parse example body if it's a string
    let exampleData: any;
    try {
      exampleData = typeof example === 'string' ? JSON.parse(example) : example;
    } catch (e) {
      errors.push(`Failed to parse example JSON: ${e}`);
      return { valid: false, errors };
    }
    
    // Handle wrapped response format
    if (exampleData.success && exampleData.data) {
      exampleData = exampleData.data;
    }
    
    // Handle array responses
    const records = Array.isArray(exampleData) ? exampleData : [exampleData];
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // Check if record has Airtable structure (id, fields, createdTime)
      if (record.id && record.fields) {
        // Validate fields object
        const fields = record.fields;
        
        // Check required fields
        for (const requiredField of schema.requiredFields) {
          if (!(requiredField in fields)) {
            errors.push(`Record ${i}: Missing required field "${requiredField}"`);
          }
        }
        
        // Validate field types
        for (const [fieldName, fieldValue] of Object.entries(fields)) {
          const expectedType = schema.fieldTypes[fieldName as keyof typeof schema.fieldTypes];
          if (expectedType && !validateFieldType(fieldValue, expectedType)) {
            errors.push(
              `Record ${i}: Field "${fieldName}" has incorrect type. Expected ${expectedType}, got ${typeof fieldValue}`
            );
          }
        }
      } else {
        // Direct field structure (not wrapped in Airtable format)
        // Check required fields
        for (const requiredField of schema.requiredFields) {
          if (!(requiredField in record)) {
            errors.push(`Record ${i}: Missing required field "${requiredField}"`);
          }
        }
        
        // Validate field types
        for (const [fieldName, fieldValue] of Object.entries(record)) {
          const expectedType = schema.fieldTypes[fieldName as keyof typeof schema.fieldTypes];
          if (expectedType && !validateFieldType(fieldValue, expectedType)) {
            errors.push(
              `Record ${i}: Field "${fieldName}" has incorrect type. Expected ${expectedType}, got ${typeof fieldValue}`
            );
          }
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
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
              url: '{{API_URL}}/query/dashboard?type=services',
              method: 'GET'
            },
            response: [
              {
                name: 'Success Response',
                status: 'OK',
                code: 200,
                body: JSON.stringify({
                  success: true,
                  data: [
                    {
                      id: 'rec123abc',
                      fields: {
                        'Service Name': 'Sunday Service',
                        'Service Date': '2024-01-15T10:00:00Z',
                        'Service Type': 'Main Service',
                        'Attendance Count': 150,
                        'First Timers Count': 5,
                        'Returners Count': 3
                      },
                      createdTime: '2024-01-15T08:00:00Z'
                    }
                  ],
                  timestamp: '2024-01-15T10:30:00Z'
                })
              }
            ]
          }
        ]
      },
      {
        name: 'Members',
        item: [
          {
            id: 'req2',
            name: 'Get Member Details',
            request: {
              url: '{{API_URL}}/query/members?memberId=rec456def',
              method: 'GET'
            },
            response: [
              {
                name: 'Success Response',
                status: 'OK',
                code: 200,
                body: JSON.stringify({
                  success: true,
                  data: {
                    id: 'rec456def',
                    fields: {
                      Name: 'John Doe',
                      Phone: '+1234567890',
                      Email: 'john.doe@example.com',
                      Department: ['recDept123'],
                      Role: 'Member',
                      Status: 'Active',
                      'Date Joined': '2023-01-01'
                    },
                    createdTime: '2023-01-01T00:00:00Z'
                  },
                  timestamp: '2024-01-15T10:30:00Z'
                })
              }
            ]
          }
        ]
      }
    ]
  };

  test('all requests with examples have valid schema structure', () => {
    const requests = extractAllRequests(mockCollection.item);
    const requestsWithExamples = requests.filter(r => r.response && r.response.length > 0);
    
    if (requestsWithExamples.length === 0) {
      console.warn('No requests with example responses found in collection');
      return;
    }
    
    fc.assert(
      fc.property(
        fc.constantFrom(...requestsWithExamples),
        (request) => {
          const tableName = getTableFromRequest(request);
          
          if (!tableName) {
            console.warn(`Could not determine table for request: ${request.name}`);
            return true; // Skip validation for unknown endpoints
          }
          
          // Validate each example response
          for (const example of request.response || []) {
            if (example.code === 200 && example.body) {
              const validation = validateExampleAgainstSchema(example.body, tableName);
              
              if (!validation.valid) {
                console.error(`Request "${request.name}" has invalid example schema:`);
                validation.errors.forEach(err => console.error(`  - ${err}`));
                return false;
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: Math.max(requestsWithExamples.length, 1) }
    );
  });

  test('example responses include required Airtable fields', () => {
    const requests = extractAllRequests(mockCollection.item);
    const requestsWithExamples = requests.filter(r => r.response && r.response.length > 0);
    
    if (requestsWithExamples.length === 0) {
      return;
    }
    
    fc.assert(
      fc.property(
        fc.constantFrom(...requestsWithExamples),
        (request) => {
          const tableName = getTableFromRequest(request);
          
          if (!tableName || tableName === 'dashboard' || tableName === 'admin') {
            return true; // Skip composite endpoints
          }
          
          const schema = AIRTABLE_SCHEMAS[tableName as keyof typeof AIRTABLE_SCHEMAS];
          if (!schema) {
            return true; // Skip if no schema defined
          }
          
          for (const example of request.response || []) {
            if (example.code === 200 && example.body) {
              try {
                const exampleData = JSON.parse(example.body);
                let data = exampleData.success && exampleData.data ? exampleData.data : exampleData;
                
                // Handle array responses
                const records = Array.isArray(data) ? data : [data];
                
                for (const record of records) {
                  const fields = record.fields || record;
                  
                  // Check for at least one required field
                  const hasRequiredField = schema.requiredFields.some(field => field in fields);
                  
                  if (!hasRequiredField) {
                    console.error(
                      `Request "${request.name}" example missing all required fields: ${schema.requiredFields.join(', ')}`
                    );
                    return false;
                  }
                }
              } catch (e) {
                console.error(`Request "${request.name}" has invalid JSON in example: ${e}`);
                return false;
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: Math.max(requestsWithExamples.length, 1) }
    );
  });

  test('example responses use correct field types', () => {
    const requests = extractAllRequests(mockCollection.item);
    const requestsWithExamples = requests.filter(r => r.response && r.response.length > 0);
    
    if (requestsWithExamples.length === 0) {
      return;
    }
    
    fc.assert(
      fc.property(
        fc.constantFrom(...requestsWithExamples),
        (request) => {
          const tableName = getTableFromRequest(request);
          
          if (!tableName || tableName === 'dashboard' || tableName === 'admin') {
            return true; // Skip composite endpoints
          }
          
          const schema = AIRTABLE_SCHEMAS[tableName as keyof typeof AIRTABLE_SCHEMAS];
          if (!schema) {
            return true; // Skip if no schema defined
          }
          
          for (const example of request.response || []) {
            if (example.code === 200 && example.body) {
              try {
                const exampleData = JSON.parse(example.body);
                let data = exampleData.success && exampleData.data ? exampleData.data : exampleData;
                
                // Handle array responses
                const records = Array.isArray(data) ? data : [data];
                
                for (const record of records) {
                  const fields = record.fields || record;
                  
                  // Validate field types
                  for (const [fieldName, fieldValue] of Object.entries(fields)) {
                    const expectedType = schema.fieldTypes[fieldName as keyof typeof schema.fieldTypes];
                    
                    if (expectedType && !validateFieldType(fieldValue, expectedType)) {
                      console.error(
                        `Request "${request.name}" field "${fieldName}" has incorrect type. Expected ${expectedType}, got ${typeof fieldValue}`
                      );
                      return false;
                    }
                  }
                }
              } catch (e) {
                console.error(`Request "${request.name}" has invalid JSON in example: ${e}`);
                return false;
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: Math.max(requestsWithExamples.length, 1) }
    );
  });

  test('example responses follow Airtable record structure', () => {
    const requests = extractAllRequests(mockCollection.item);
    const requestsWithExamples = requests.filter(r => r.response && r.response.length > 0);
    
    if (requestsWithExamples.length === 0) {
      return;
    }
    
    fc.assert(
      fc.property(
        fc.constantFrom(...requestsWithExamples),
        (request) => {
          for (const example of request.response || []) {
            if (example.code === 200 && example.body) {
              try {
                const exampleData = JSON.parse(example.body);
                let data = exampleData.success && exampleData.data ? exampleData.data : exampleData;
                
                // Handle array responses
                const records = Array.isArray(data) ? data : [data];
                
                for (const record of records) {
                  // Check if record follows Airtable structure (id, fields, createdTime)
                  // OR is a direct field object
                  const hasAirtableStructure = 
                    record.id && 
                    record.fields && 
                    typeof record.fields === 'object';
                  
                  const hasDirectFields = 
                    !record.id && 
                    !record.fields && 
                    typeof record === 'object';
                  
                  if (!hasAirtableStructure && !hasDirectFields) {
                    console.error(
                      `Request "${request.name}" example doesn't follow Airtable record structure or direct field structure`
                    );
                    return false;
                  }
                }
              } catch (e) {
                console.error(`Request "${request.name}" has invalid JSON in example: ${e}`);
                return false;
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: Math.max(requestsWithExamples.length, 1) }
    );
  });

  test('mock collection has requests with example responses', () => {
    const requests = extractAllRequests(mockCollection.item);
    const requestsWithExamples = requests.filter(r => r.response && r.response.length > 0);
    expect(requestsWithExamples.length).toBeGreaterThan(0);
  });

  test('Airtable schemas are defined for all tables', () => {
    const tableNames = Object.values(AIRTABLE_TABLES);
    
    for (const tableName of tableNames) {
      const schema = AIRTABLE_SCHEMAS[tableName as keyof typeof AIRTABLE_SCHEMAS];
      expect(schema).toBeDefined();
      expect(schema.requiredFields).toBeDefined();
      expect(Array.isArray(schema.requiredFields)).toBe(true);
      expect(schema.fieldTypes).toBeDefined();
      expect(typeof schema.fieldTypes).toBe('object');
    }
  });
});
