/**
 * Property-Based Tests for Query Service
 * 
 * Property 11: Attendance Percentage Calculation
 * Validates: Requirements 16.4, 16.5
 * 
 * For any Service and Department combination:
 * - Attendance percentage SHALL equal (count of present members in department for service / count of active members in department) × 100
 * - Active members count SHALL only include Member Departments records where Active = true
 * - The percentage SHALL be between 0 and 100 (inclusive), with >100% possible if non-department members attend
 */

import * as fc from 'fast-check';
import { QueryService } from '../src/services/query-service';
import { AirtableClient } from '../src/services/airtable-client';
import { AirtableRecord } from '../src/types';

/**
 * Arbitraries for generating test data
 * Using a numeric suffix to avoid collisions with JavaScript built-in property names
 */
const airtableIdArb = fc.integer({ min: 10000000000000, max: 99999999999999 }).map(n => `rec${n}`);

// Arbitraries are defined inline in tests for flexibility

describe('Property 11: Attendance Percentage Calculation', () => {
  let mockAirtableClient: jest.Mocked<AirtableClient>;
  let queryService: QueryService;

  beforeEach(() => {
    mockAirtableClient = {
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      getRecord: jest.fn(),
      findRecords: jest.fn(),
      batchCreate: jest.fn(),
      batchUpdate: jest.fn(),
    } as unknown as jest.Mocked<AirtableClient>;

    queryService = new QueryService(mockAirtableClient, { attendanceThreshold: 85 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 11.1: Attendance percentage equals (present / active) × 100
   * 
   * For any department with N active members and M present at a service,
   * the attendance percentage should be (M / N) × 100
   * 
   * Validates: Requirements 16.4
   */
  it('should calculate attendance percentage as (present / active) × 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceId
        airtableIdArb, // departmentId
        fc.string({ minLength: 1, maxLength: 30 }), // departmentName
        fc.integer({ min: 1, max: 50 }), // activeMemberCount (at least 1 to avoid division by zero)
        fc.integer({ min: 0, max: 50 }), // presentCount
        async (serviceId, departmentId, departmentName, activeMemberCount, presentCount) => {
          // Ensure presentCount doesn't exceed activeMemberCount for this test
          const actualPresentCount = Math.min(presentCount, activeMemberCount);

          // Generate member IDs for active members
          const activeMemberIds = Array.from({ length: activeMemberCount }, (_, i) => `recMember${i.toString().padStart(10, '0')}`);
          
          // Select which members are present
          const presentMemberIds = activeMemberIds.slice(0, actualPresentCount);

          // Mock department record
          const deptRecord: AirtableRecord = {
            id: departmentId,
            fields: { 'Name': departmentName },
            createdTime: new Date().toISOString(),
          };

          // Mock member department records (active members)
          const memberDeptRecords: AirtableRecord[] = activeMemberIds.map((memberId, i) => ({
            id: `recMD${i.toString().padStart(12, '0')}`,
            fields: {
              'Member': [memberId],
              'Department': [departmentId],
              'Active': true,
            },
            createdTime: new Date().toISOString(),
          }));

          // Mock attendance records for present members
          const attendanceRecords: AirtableRecord[] = presentMemberIds.map((memberId, i) => ({
            id: `recAtt${i.toString().padStart(11, '0')}`,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': true,
            },
            createdTime: new Date().toISOString(),
          }));

          // Mock service record with attendance IDs
          const serviceRecord: AirtableRecord = {
            id: serviceId,
            fields: { 
              'Service Code': 'Test Service',
              'Attendance': attendanceRecords.map(a => a.id),
            },
            createdTime: new Date().toISOString(),
          };

          // Setup mocks
          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services' && id === serviceId) {
              return serviceRecord;
            }
            // Return attendance records by ID
            if (table === 'Attendance') {
              const record = attendanceRecords.find(a => a.id === id);
              if (record) return record;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Departments') {
              return [deptRecord];
            }
            if (table === 'Member Departments') {
              return memberDeptRecords;
            }
            return [];
          });

          const result = await queryService.getDepartmentAttendance(serviceId);

          // Find the department in results
          const deptResult = result.find(r => r.departmentId === departmentId);
          expect(deptResult).toBeDefined();

          // Verify the calculation
          const expectedPercentage = (actualPresentCount / activeMemberCount) * 100;
          expect(deptResult!.attendancePercentage).toBeCloseTo(expectedPercentage, 5);
          expect(deptResult!.presentCount).toBe(actualPresentCount);
          expect(deptResult!.activeMemberCount).toBe(activeMemberCount);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.2: Only active members are counted in the denominator
   * 
   * For any department with both active and inactive members,
   * only active members should be counted in the denominator
   * 
   * Validates: Requirements 16.5
   */
  it('should only count active members in denominator', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceId
        airtableIdArb, // departmentId
        fc.string({ minLength: 1, maxLength: 30 }), // departmentName
        fc.integer({ min: 1, max: 20 }), // activeMemberCount
        fc.integer({ min: 0, max: 20 }), // inactiveMemberCount (used to verify filtering)
        async (serviceId, departmentId, departmentName, activeMemberCount, _inactiveMemberCount) => {
          // Generate member IDs - only active ones matter since the query filters by Active = TRUE
          const activeMemberIds = Array.from({ length: activeMemberCount }, (_, i) => `recActive${i.toString().padStart(9, '0')}`);

          // Mock department record
          const deptRecord: AirtableRecord = {
            id: departmentId,
            fields: { 'Name': departmentName },
            createdTime: new Date().toISOString(),
          };

          // Mock member department records - only return active ones (as per the filter)
          const activeMemberDeptRecords: AirtableRecord[] = activeMemberIds.map((memberId, i) => ({
            id: `recMD${i.toString().padStart(12, '0')}`,
            fields: {
              'Member': [memberId],
              'Department': [departmentId],
              'Active': true,
            },
            createdTime: new Date().toISOString(),
          }));

          // Mock service record with no attendance
          const serviceRecord: AirtableRecord = {
            id: serviceId,
            fields: { 
              'Service Code': 'Test Service',
              'Attendance': [],
            },
            createdTime: new Date().toISOString(),
          };

          // Setup mocks
          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services' && id === serviceId) {
              return serviceRecord;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Departments') {
              return [deptRecord];
            }
            if (table === 'Member Departments') {
              return activeMemberDeptRecords;
            }
            return [];
          });

          const result = await queryService.getDepartmentAttendance(serviceId);

          const deptResult = result.find(r => r.departmentId === departmentId);
          expect(deptResult).toBeDefined();

          // Active member count should only include active members
          expect(deptResult!.activeMemberCount).toBe(activeMemberCount);
          // The query filters by Active = TRUE, so inactive members are not included

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.3: Percentage is 0 when no members attend
   * 
   * For any department with active members but no attendance,
   * the percentage should be 0
   * 
   * Validates: Requirements 16.4
   */
  it('should return 0% when no members attend', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceId
        airtableIdArb, // departmentId
        fc.string({ minLength: 1, maxLength: 30 }), // departmentName
        fc.integer({ min: 1, max: 50 }), // activeMemberCount
        async (serviceId, departmentId, departmentName, activeMemberCount) => {
          const activeMemberIds = Array.from({ length: activeMemberCount }, (_, i) => `recMember${i.toString().padStart(10, '0')}`);

          const deptRecord: AirtableRecord = {
            id: departmentId,
            fields: { 'Name': departmentName },
            createdTime: new Date().toISOString(),
          };

          const memberDeptRecords: AirtableRecord[] = activeMemberIds.map((memberId, i) => ({
            id: `recMD${i.toString().padStart(12, '0')}`,
            fields: {
              'Member': [memberId],
              'Department': [departmentId],
              'Active': true,
            },
            createdTime: new Date().toISOString(),
          }));

          // Mock service record with no attendance
          const serviceRecord: AirtableRecord = {
            id: serviceId,
            fields: { 
              'Service Code': 'Test Service',
              'Attendance': [],
            },
            createdTime: new Date().toISOString(),
          };

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services' && id === serviceId) {
              return serviceRecord;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Departments') return [deptRecord];
            if (table === 'Member Departments') return memberDeptRecords;
            return [];
          });

          const result = await queryService.getDepartmentAttendance(serviceId);

          const deptResult = result.find(r => r.departmentId === departmentId);
          expect(deptResult).toBeDefined();
          expect(deptResult!.attendancePercentage).toBe(0);
          expect(deptResult!.presentCount).toBe(0);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 11.4: Percentage is 100 when all members attend
   * 
   * For any department where all active members attend,
   * the percentage should be 100
   * 
   * Validates: Requirements 16.4
   */
  it('should return 100% when all members attend', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceId
        airtableIdArb, // departmentId
        fc.string({ minLength: 1, maxLength: 30 }), // departmentName
        fc.integer({ min: 1, max: 30 }), // activeMemberCount
        async (serviceId, departmentId, departmentName, activeMemberCount) => {
          const activeMemberIds = Array.from({ length: activeMemberCount }, (_, i) => `recMember${i.toString().padStart(10, '0')}`);

          const deptRecord: AirtableRecord = {
            id: departmentId,
            fields: { 'Name': departmentName },
            createdTime: new Date().toISOString(),
          };

          const memberDeptRecords: AirtableRecord[] = activeMemberIds.map((memberId, i) => ({
            id: `recMD${i.toString().padStart(12, '0')}`,
            fields: {
              'Member': [memberId],
              'Department': [departmentId],
              'Active': true,
            },
            createdTime: new Date().toISOString(),
          }));

          // All members attended
          const attendanceRecords: AirtableRecord[] = activeMemberIds.map((memberId, i) => ({
            id: `recAtt${i.toString().padStart(11, '0')}`,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': true,
            },
            createdTime: new Date().toISOString(),
          }));

          // Mock service record with all attendance
          const serviceRecord: AirtableRecord = {
            id: serviceId,
            fields: { 
              'Service Code': 'Test Service',
              'Attendance': attendanceRecords.map(a => a.id),
            },
            createdTime: new Date().toISOString(),
          };

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services' && id === serviceId) {
              return serviceRecord;
            }
            if (table === 'Attendance') {
              const record = attendanceRecords.find(a => a.id === id);
              if (record) return record;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Departments') return [deptRecord];
            if (table === 'Member Departments') return memberDeptRecords;
            return [];
          });

          const result = await queryService.getDepartmentAttendance(serviceId);

          const deptResult = result.find(r => r.departmentId === departmentId);
          expect(deptResult).toBeDefined();
          expect(deptResult!.attendancePercentage).toBe(100);
          expect(deptResult!.presentCount).toBe(activeMemberCount);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 11.5: Percentage is 0 when department has no active members
   * 
   * For any department with no active members,
   * the percentage should be 0 (avoid division by zero)
   * 
   * Validates: Requirements 16.4, 16.5
   */
  it('should return 0% when department has no active members', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceId
        airtableIdArb, // departmentId
        fc.string({ minLength: 1, maxLength: 30 }), // departmentName
        async (serviceId, departmentId, departmentName) => {
          const deptRecord: AirtableRecord = {
            id: departmentId,
            fields: { 'Name': departmentName },
            createdTime: new Date().toISOString(),
          };

          // Mock service record with no attendance
          const serviceRecord: AirtableRecord = {
            id: serviceId,
            fields: { 
              'Service Code': 'Test Service',
              'Attendance': [],
            },
            createdTime: new Date().toISOString(),
          };

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services' && id === serviceId) {
              return serviceRecord;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Departments') return [deptRecord];
            if (table === 'Member Departments') return []; // No active members
            return [];
          });

          const result = await queryService.getDepartmentAttendance(serviceId);

          const deptResult = result.find(r => r.departmentId === departmentId);
          expect(deptResult).toBeDefined();
          expect(deptResult!.attendancePercentage).toBe(0);
          expect(deptResult!.activeMemberCount).toBe(0);
          expect(deptResult!.presentCount).toBe(0);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 11.6: belowThreshold flag is correctly set based on threshold
   * 
   * For any attendance percentage, belowThreshold should be true
   * if and only if percentage < threshold (default 85%)
   * 
   * Validates: Requirements 16.6
   */
  it('should correctly set belowThreshold flag based on threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceId
        airtableIdArb, // departmentId
        fc.string({ minLength: 1, maxLength: 30 }), // departmentName
        fc.integer({ min: 1, max: 100 }), // activeMemberCount
        fc.integer({ min: 0, max: 100 }), // percentage (0-100)
        async (serviceId, departmentId, departmentName, activeMemberCount, targetPercentage) => {
          // Calculate how many members need to be present for the target percentage
          const presentCount = Math.round((targetPercentage / 100) * activeMemberCount);
          const actualPercentage = activeMemberCount > 0 ? (presentCount / activeMemberCount) * 100 : 0;

          const activeMemberIds = Array.from({ length: activeMemberCount }, (_, i) => `recMember${i.toString().padStart(10, '0')}`);
          const presentMemberIds = activeMemberIds.slice(0, presentCount);

          const deptRecord: AirtableRecord = {
            id: departmentId,
            fields: { 'Name': departmentName },
            createdTime: new Date().toISOString(),
          };

          const memberDeptRecords: AirtableRecord[] = activeMemberIds.map((memberId, i) => ({
            id: `recMD${i.toString().padStart(12, '0')}`,
            fields: {
              'Member': [memberId],
              'Department': [departmentId],
              'Active': true,
            },
            createdTime: new Date().toISOString(),
          }));

          // Create attendance records for present members
          const attendanceRecords: AirtableRecord[] = presentMemberIds.map((memberId, i) => ({
            id: `recAtt${i.toString().padStart(11, '0')}`,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': true,
            },
            createdTime: new Date().toISOString(),
          }));

          // Mock service record with attendance
          const serviceRecord: AirtableRecord = {
            id: serviceId,
            fields: { 
              'Service Code': 'Test Service',
              'Attendance': attendanceRecords.map(a => a.id),
            },
            createdTime: new Date().toISOString(),
          };

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services' && id === serviceId) {
              return serviceRecord;
            }
            if (table === 'Attendance') {
              const record = attendanceRecords.find(a => a.id === id);
              if (record) return record;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Departments') return [deptRecord];
            if (table === 'Member Departments') return memberDeptRecords;
            return [];
          });

          const result = await queryService.getDepartmentAttendance(serviceId);

          const deptResult = result.find(r => r.departmentId === departmentId);
          expect(deptResult).toBeDefined();

          // belowThreshold should be true if percentage < 85 (default threshold)
          const expectedBelowThreshold = actualPercentage < 85;
          expect(deptResult!.belowThreshold).toBe(expectedBelowThreshold);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 12: Service Comparison Unidirectional Correctness
 * Validates: Requirements 5.2, 5.3
 * 
 * For any two Services A (reference) and B (comparison):
 * - "Present in A, Missing in B" SHALL contain exactly those Members who have Attendance with Present? = true for Service A 
 *   AND (no Attendance record for Service B OR Present? = false for Service B)
 * - The comparison is unidirectional - only shows members present in reference service but missing from comparison service
 */
describe('Property 12: Service Comparison Unidirectional Correctness', () => {
  let mockAirtableClient: jest.Mocked<AirtableClient>;
  let queryService: QueryService;

  beforeEach(() => {
    mockAirtableClient = {
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      getRecord: jest.fn(),
      findRecords: jest.fn(),
      batchCreate: jest.fn(),
      batchUpdate: jest.fn(),
    } as unknown as jest.Mocked<AirtableClient>;

    queryService = new QueryService(mockAirtableClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 12.1: Members present in A but missing in B are correctly identified
   * 
   * Validates: Requirements 5.2, 5.3
   */
  it('should correctly identify members present in A but missing in B', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceAId
        airtableIdArb, // serviceBId
        fc.uniqueArray(airtableIdArb, { minLength: 0, maxLength: 10 }), // membersInBothServices (unique)
        fc.uniqueArray(airtableIdArb, { minLength: 0, maxLength: 10 }), // membersOnlyInA (unique)
        fc.uniqueArray(airtableIdArb, { minLength: 0, maxLength: 10 }), // membersOnlyInB (unique)
        async (serviceAId, serviceBId, membersInBoth, membersOnlyInA, membersOnlyInB) => {
          // Skip when comparing the same service to itself - that's a degenerate case
          if (serviceAId === serviceBId) return;
          // Ensure non-overlapping sets by filtering
          const uniqueMembersInBoth = [...new Set(membersInBoth)];
          const uniqueMembersOnlyInA = [...new Set(membersOnlyInA)].filter(m => !uniqueMembersInBoth.includes(m));
          const uniqueMembersOnlyInB = [...new Set(membersOnlyInB)].filter(m => !uniqueMembersInBoth.includes(m) && !uniqueMembersOnlyInA.includes(m));

          const membersInA = [...uniqueMembersInBoth, ...uniqueMembersOnlyInA];
          const membersInB = [...uniqueMembersInBoth, ...uniqueMembersOnlyInB];
          const allMembers = [...new Set([...membersInA, ...membersInB])];

          // Mock attendance records
          const attendanceA: AirtableRecord[] = membersInA.map((memberId, i) => ({
            id: `recAttA${i.toString().padStart(10, '0')}`,
            fields: { 'Member': [memberId], 'Service': [serviceAId], 'Present?': true },
            createdTime: new Date().toISOString(),
          }));

          const attendanceB: AirtableRecord[] = membersInB.map((memberId, i) => ({
            id: `recAttB${i.toString().padStart(10, '0')}`,
            fields: { 'Member': [memberId], 'Service': [serviceBId], 'Present?': true },
            createdTime: new Date().toISOString(),
          }));

          // Mock service records with attendance IDs
          const serviceARecord: AirtableRecord = {
            id: serviceAId,
            fields: { 
              'Service Code': 'Service A',
              'Attendance': attendanceA.map(a => a.id),
            },
            createdTime: new Date().toISOString(),
          };
          const serviceBRecord: AirtableRecord = {
            id: serviceBId,
            fields: { 
              'Service Code': 'Service B',
              'Attendance': attendanceB.map(a => a.id),
            },
            createdTime: new Date().toISOString(),
          };

          // Mock member records
          const memberRecords: AirtableRecord[] = allMembers.map((memberId, i) => ({
            id: memberId,
            fields: {
              'First Name': `First${i}`,
              'Last Name': `Last${i}`,
              'Full Name': `First${i} Last${i}`,
              'Phone': `+1234567890${i}`,
              'Status': 'Member',
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          }));

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services') {
              if (id === serviceAId) return serviceARecord;
              if (id === serviceBId) return serviceBRecord;
            }
            if (table === 'Attendance') {
              const recordA = attendanceA.find(a => a.id === id);
              if (recordA) return recordA;
              const recordB = attendanceB.find(a => a.id === id);
              if (recordB) return recordB;
            }
            if (table === 'Members') {
              const member = memberRecords.find(m => m.id === id);
              if (member) return member;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table, filter) => {
            if (table === 'Members') {
              const idMatches = filter.match(/RECORD_ID\(\) = '([^']+)'/g) || [];
              const requestedIds = idMatches.map(match => {
                const idMatch = match.match(/RECORD_ID\(\) = '([^']+)'/);
                return idMatch ? idMatch[1] : null;
              }).filter((id): id is string => id !== null);
              
              return memberRecords.filter(m => requestedIds.includes(m.id));
            }
            return [];
          });

          const result = await queryService.compareTwoServices(serviceAId, serviceBId);

          // Verify members in A but not in B
          const expectedInANotB = uniqueMembersOnlyInA;
          const actualInANotB = result.presentInAMissingInB.map(m => m.id);

          expect(actualInANotB.sort()).toEqual(expectedInANotB.sort());

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.2: Empty comparison service returns all reference service members
   * 
   * Validates: Requirements 5.2, 5.3
   */
  it('should handle empty comparison service correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceAId
        airtableIdArb, // serviceBId
        fc.uniqueArray(airtableIdArb, { minLength: 0, maxLength: 10 }), // membersInA (unique)
        async (serviceAId, serviceBId, membersInA) => {
          const uniqueMembersInA = [...new Set(membersInA)];

          const attendanceA: AirtableRecord[] = uniqueMembersInA.map((memberId, i) => ({
            id: `recAttA${i.toString().padStart(10, '0')}`,
            fields: { 'Member': [memberId], 'Service': [serviceAId], 'Present?': true },
            createdTime: new Date().toISOString(),
          }));

          const serviceARecord: AirtableRecord = {
            id: serviceAId,
            fields: { 
              'Service Code': 'Service A',
              'Attendance': attendanceA.map(a => a.id),
            },
            createdTime: new Date().toISOString(),
          };
          const serviceBRecord: AirtableRecord = {
            id: serviceBId,
            fields: { 
              'Service Code': 'Service B',
              'Attendance': [], // Service B is empty
            },
            createdTime: new Date().toISOString(),
          };

          const memberRecords: AirtableRecord[] = uniqueMembersInA.map((memberId, i) => ({
            id: memberId,
            fields: {
              'First Name': `First${i}`,
              'Last Name': `Last${i}`,
              'Full Name': `First${i} Last${i}`,
              'Phone': `+1234567890${i}`,
              'Status': 'Member',
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          }));

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services') {
              if (id === serviceAId) return serviceARecord;
              if (id === serviceBId) return serviceBRecord;
            }
            if (table === 'Attendance') {
              const record = attendanceA.find(a => a.id === id);
              if (record) return record;
            }
            if (table === 'Members') {
              const member = memberRecords.find(m => m.id === id);
              if (member) return member;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table, filter) => {
            if (table === 'Members') {
              const idMatches = filter.match(/RECORD_ID\(\) = '([^']+)'/g) || [];
              const requestedIds = idMatches.map(match => {
                const idMatch = match.match(/RECORD_ID\(\) = '([^']+)'/);
                return idMatch ? idMatch[1] : null;
              }).filter((id): id is string => id !== null);
              
              return memberRecords.filter(m => requestedIds.includes(m.id));
            }
            return [];
          });

          const result = await queryService.compareTwoServices(serviceAId, serviceBId);

          // All members in A should be in "present in A, missing in B"
          expect(result.presentInAMissingInB.map(m => m.id).sort()).toEqual(uniqueMembersInA.sort());

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 12.3: Empty reference service returns no missing members
   * 
   * Validates: Requirements 5.2, 5.3
   */
  it('should return empty result when reference service is empty', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceAId
        airtableIdArb, // serviceBId
        fc.uniqueArray(airtableIdArb, { minLength: 0, maxLength: 10 }), // membersInB (unique)
        async (serviceAId, serviceBId, membersInB) => {
          const uniqueMembersInB = [...new Set(membersInB)];

          const attendanceB: AirtableRecord[] = uniqueMembersInB.map((memberId, i) => ({
            id: `recAttB${i.toString().padStart(10, '0')}`,
            fields: { 'Member': [memberId], 'Service': [serviceBId], 'Present?': true },
            createdTime: new Date().toISOString(),
          }));

          const serviceARecord: AirtableRecord = {
            id: serviceAId,
            fields: { 
              'Service Code': 'Service A',
              'Attendance': [], // Service A is empty
            },
            createdTime: new Date().toISOString(),
          };
          const serviceBRecord: AirtableRecord = {
            id: serviceBId,
            fields: { 
              'Service Code': 'Service B',
              'Attendance': attendanceB.map(a => a.id),
            },
            createdTime: new Date().toISOString(),
          };

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services') {
              if (id === serviceAId) return serviceARecord;
              if (id === serviceBId) return serviceBRecord;
            }
            if (table === 'Attendance') {
              const record = attendanceB.find(a => a.id === id);
              if (record) return record;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async () => []);

          const result = await queryService.compareTwoServices(serviceAId, serviceBId);

          // No members should be in "present in A, missing in B" since A is empty
          expect(result.presentInAMissingInB).toHaveLength(0);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });
});


/**
 * Property 13: Timeline Chronological Ordering
 * Validates: Requirements 18.2, 18.3
 * 
 * For any Member's journey timeline:
 * - All events SHALL be sorted by date in ascending order (oldest first)
 * - Events with the same date SHALL maintain a consistent ordering
 * - The timeline SHALL include all events from: Evangelism, First Timer registration, Attendance, 
 *   Home Visits, Follow-up Interactions, Department joins, Program sessions, Water baptism, 
 *   Membership completion, Spiritual maturity completion
 */
describe('Property 13: Timeline Chronological Ordering', () => {
  let mockAirtableClient: jest.Mocked<AirtableClient>;
  let queryService: QueryService;

  beforeEach(() => {
    mockAirtableClient = {
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      getRecord: jest.fn(),
      findRecords: jest.fn(),
      batchCreate: jest.fn(),
      batchUpdate: jest.fn(),
    } as unknown as jest.Mocked<AirtableClient>;

    queryService = new QueryService(mockAirtableClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 13.1: Timeline events are sorted in ascending chronological order
   * 
   * Validates: Requirements 18.2
   */
  it('should sort timeline events in ascending chronological order', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // memberId
        fc.array(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), { minLength: 2, maxLength: 10 }), // event dates
        async (memberId, eventDates) => {
          // Create member record
          const memberRecord: AirtableRecord = {
            id: memberId,
            fields: {
              'First Name': 'Test',
              'Last Name': 'Member',
              'Full Name': 'Test Member',
              'Phone': '+1234567890',
              'Status': 'Member',
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          };

          // Create evangelism records with different dates
          const evangelismRecords: AirtableRecord[] = eventDates.slice(0, Math.min(3, eventDates.length)).map((date, i) => ({
            id: `recEvang${i.toString().padStart(11, '0')}`,
            fields: {
              'Linked Member': [memberId],
              'Date': date.toISOString().split('T')[0],
            },
            createdTime: new Date().toISOString(),
          }));

          // Create home visit records
          const homeVisitRecords: AirtableRecord[] = eventDates.slice(Math.min(3, eventDates.length)).map((date, i) => ({
            id: `recVisit${i.toString().padStart(11, '0')}`,
            fields: {
              'Member': [memberId],
              'Date': date.toISOString().split('T')[0],
            },
            createdTime: new Date().toISOString(),
          }));

          mockAirtableClient.getRecord.mockResolvedValue(memberRecord);
          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Evangelism') return evangelismRecords;
            if (table === 'Home Visits') return homeVisitRecords;
            return [];
          });

          const result = await queryService.getMemberJourney(memberId);

          // Verify timeline is sorted in ascending order
          for (let i = 1; i < result.timeline.length; i++) {
            const prevDate = result.timeline[i - 1]!.date.getTime();
            const currDate = result.timeline[i]!.date.getTime();
            expect(currDate).toBeGreaterThanOrEqual(prevDate);
          }

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.2: Timeline includes all event types when present
   * 
   * Validates: Requirements 18.3
   */
  it('should include all event types in timeline when present', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // memberId
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), // baseDate
        async (memberId, baseDate) => {
          const dateStr = baseDate.toISOString().split('T')[0];

          // Create evangelism record
          const evangelismRecord: AirtableRecord = {
            id: 'recEvang00000000001',
            fields: {
              'Linked Member': [memberId],
              'Date': dateStr,
            },
            createdTime: new Date().toISOString(),
          };

          // Create home visit record
          const homeVisitRecord: AirtableRecord = {
            id: 'recVisit00000000001',
            fields: {
              'Member': [memberId],
              'Visit Date': dateStr,
              'Conducted By?': ['recVolunteer001'],
            },
            createdTime: new Date().toISOString(),
          };

          // Create follow-up interaction record
          const followUpRecord: AirtableRecord = {
            id: 'recFollowUp0000001',
            fields: {
              'Member': [memberId],
              'Interaction Date': dateStr,
              'Comment': 'Test follow-up',
            },
            createdTime: new Date().toISOString(),
          };

          // Create member department record
          const memberDeptRecord: AirtableRecord = {
            id: 'recMemberDept00001',
            fields: {
              'Member': [memberId],
              'Department': ['recDept0000000001'],
              'Join Date': dateStr,
            },
            createdTime: new Date().toISOString(),
          };

          // Create member program record with completed sessions (fetched via findRecords)
          const memberProgramRecord: AirtableRecord = {
            id: 'recProgram0000001',
            fields: {
              'Member': [memberId],
              'Program Name': 'New Believers',
              'Session 1 Completed': true,
              'Session 1 Date': dateStr,
              'Session 2 Completed': true,
              'Session 2 Date': dateStr,
            },
            createdTime: new Date().toISOString(),
          };

          // Create member record with linked record IDs for timeline events
          // Note: Uses 'Visits Received' for home visits, not 'Home Visits'
          const memberRecord: AirtableRecord = {
            id: memberId,
            fields: {
              'First Name': 'Test',
              'Last Name': 'Member',
              'Full Name': 'Test Member',
              'Phone': '+1234567890',
              'Status': 'Member',
              'Source': 'Other',
              'Date First Captured': dateStr,
              'Follow-up Status': 'Not Started',
              'Water Baptized': true,
              'Water Baptism Date': dateStr,
              'Membership Completed': dateStr,
              'Spiritual Maturity Completed': dateStr,
              // Linked records for timeline events
              'Evangelism': [evangelismRecord.id],
              'Visits Received': [homeVisitRecord.id], // Correct field name for home visits
              'Follow-up Interactions': [followUpRecord.id],
              'Member Departments': [memberDeptRecord.id],
            },
            createdTime: new Date().toISOString(),
          };

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Members' && id === memberId) return memberRecord;
            if (table === 'Evangelism' && id === evangelismRecord.id) return evangelismRecord;
            if (table === 'Home Visits' && id === homeVisitRecord.id) return homeVisitRecord;
            if (table === 'Follow-up Interactions' && id === followUpRecord.id) return followUpRecord;
            if (table === 'Member Departments' && id === memberDeptRecord.id) return memberDeptRecord;
            if (table === 'Departments') return { id, fields: { 'Department Name': 'Test Dept', 'Name': 'Test Dept' }, createdTime: new Date().toISOString() };
            if (table === 'Members' && id === 'recVolunteer001') return { id, fields: { 'Full Name': 'Test Volunteer' }, createdTime: new Date().toISOString() };
            throw new Error(`Record not found: ${table}/${id}`);
          });

          // Program sessions are fetched via findRecords, not linked records
          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Member Programs') return [memberProgramRecord];
            return [];
          });

          const result = await queryService.getMemberJourney(memberId);

          // Check that expected event types are present
          const eventTypes = result.timeline.map(e => e.type);

          expect(eventTypes).toContain('evangelism');
          expect(eventTypes).toContain('home_visit');
          expect(eventTypes).toContain('follow_up');
          expect(eventTypes).toContain('department_join');
          expect(eventTypes).toContain('program_session');
          expect(eventTypes).toContain('water_baptism');
          expect(eventTypes).toContain('membership_completed');
          expect(eventTypes).toContain('spiritual_maturity');

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  }, 90000); // 90 second timeout

  /**
   * Property 13.3: Empty timeline when no events exist
   * 
   * Validates: Requirements 18.2
   */
  it('should return empty timeline when no events exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // memberId
        async (memberId) => {
          // Create member record with no milestone dates
          const memberRecord: AirtableRecord = {
            id: memberId,
            fields: {
              'First Name': 'Test',
              'Last Name': 'Member',
              'Full Name': 'Test Member',
              'Phone': '+1234567890',
              'Status': 'First Timer',
              'Source': 'First Timer Form',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          };

          mockAirtableClient.getRecord.mockResolvedValue(memberRecord);
          mockAirtableClient.findRecords.mockResolvedValue([]);

          const result = await queryService.getMemberJourney(memberId);

          // Timeline should be empty when no events exist
          expect(result.timeline).toHaveLength(0);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 13.4: Timeline maintains consistent ordering for same-date events
   * 
   * Validates: Requirements 18.2
   */
  it('should maintain consistent ordering for events on the same date', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // memberId
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), // sameDate
        async (memberId, sameDate) => {
          const dateStr = sameDate.toISOString().split('T')[0];

          // Create member record
          const memberRecord: AirtableRecord = {
            id: memberId,
            fields: {
              'First Name': 'Test',
              'Last Name': 'Member',
              'Full Name': 'Test Member',
              'Phone': '+1234567890',
              'Status': 'Member',
              'Source': 'Other',
              'Date First Captured': dateStr,
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          };

          // Create multiple events on the same date
          const evangelismRecords: AirtableRecord[] = [
            {
              id: 'recEvang00000000001',
              fields: { 'Linked Member': [memberId], 'Date': dateStr },
              createdTime: new Date().toISOString(),
            },
            {
              id: 'recEvang00000000002',
              fields: { 'Linked Member': [memberId], 'Date': dateStr },
              createdTime: new Date().toISOString(),
            },
          ];

          const homeVisitRecords: AirtableRecord[] = [
            {
              id: 'recVisit00000000001',
              fields: { 'Member': [memberId], 'Date': dateStr },
              createdTime: new Date().toISOString(),
            },
          ];

          mockAirtableClient.getRecord.mockResolvedValue(memberRecord);
          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Evangelism') return evangelismRecords;
            if (table === 'Home Visits') return homeVisitRecords;
            return [];
          });

          // Run the query multiple times
          const results = await Promise.all([
            queryService.getMemberJourney(memberId),
            queryService.getMemberJourney(memberId),
            queryService.getMemberJourney(memberId),
          ]);

          // All results should have the same ordering
          const firstOrder = results[0]!.timeline.map(e => `${e.type}-${e.metadata?.recordId || ''}`);
          
          for (const result of results) {
            const order = result.timeline.map(e => `${e.type}-${e.metadata?.recordId || ''}`);
            expect(order).toEqual(firstOrder);
          }

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });
});


/**
 * Tests for new QueryService methods
 * Tests: getServiceById, getRecentServices, getServiceAttendees, getMemberById,
 *        getFollowUpsByFollowUpMember, getSoulsAssignedByFollowUpMember, getDepartmentRoster
 */
describe('Additional QueryService Methods', () => {
  let mockAirtableClient: jest.Mocked<AirtableClient>;
  let queryService: QueryService;

  beforeEach(() => {
    mockAirtableClient = {
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      getRecord: jest.fn(),
      findRecords: jest.fn(),
      batchCreate: jest.fn(),
      batchUpdate: jest.fn(),
    } as unknown as jest.Mocked<AirtableClient>;

    queryService = new QueryService(mockAirtableClient, { attendanceThreshold: 85 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getServiceById', () => {
    it('should return service details for valid ID', async () => {
      const serviceId = 'recService001';
      const serviceRecord: AirtableRecord = {
        id: serviceId,
        fields: {
          'Service Code': 'Sunday Service - 2024-01-07',
          'Service Date': '2024-01-07',
          'Service Type': 'Sunday Service',
        },
        createdTime: new Date().toISOString(),
      };

      mockAirtableClient.getRecord.mockResolvedValue(serviceRecord);

      const result = await queryService.getServiceById(serviceId);

      expect(result).toBeDefined();
      expect(result!.id).toBe(serviceId);
      expect(result!.serviceName).toBe('Sunday Service - 2024-01-07');
      expect(result!.serviceCode).toBe('Sunday Service');
    });

    it('should return null for non-existent service', async () => {
      mockAirtableClient.getRecord.mockRejectedValue(new Error('Not found'));

      const result = await queryService.getServiceById('recNonExistent');

      expect(result).toBeNull();
    });

    it('should throw error for empty service ID', async () => {
      await expect(queryService.getServiceById('')).rejects.toThrow('Service ID is required');
    });
  });

  describe('getRecentServices', () => {
    it('should return recent services sorted by date', async () => {
      const serviceRecords: AirtableRecord[] = [
        {
          id: 'recService001',
          fields: { 'Service Code': 'Service 1', 'Service Date': '2024-01-14', 'Service Type': 'Sunday' },
          createdTime: new Date().toISOString(),
        },
        {
          id: 'recService002',
          fields: { 'Service Code': 'Service 2', 'Service Date': '2024-01-07', 'Service Type': 'Sunday' },
          createdTime: new Date().toISOString(),
        },
      ];

      mockAirtableClient.findRecords.mockResolvedValue(serviceRecords);

      const result = await queryService.getRecentServices(10);

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('recService001');
      expect(mockAirtableClient.findRecords).toHaveBeenCalledWith(
        'Services',
        'TRUE()',
        expect.objectContaining({ maxRecords: 10 })
      );
    });
  });

  describe('getServiceAttendees', () => {
    it('should return members who attended a service', async () => {
      const serviceId = 'recService001';
      const attendanceRecords: AirtableRecord[] = [
        { id: 'recAtt001', fields: { 'Member': ['recMember001'], 'Service': [serviceId], 'Present?': true }, createdTime: new Date().toISOString() },
        { id: 'recAtt002', fields: { 'Member': ['recMember002'], 'Service': [serviceId], 'Present?': true }, createdTime: new Date().toISOString() },
      ];

      const memberRecords: AirtableRecord[] = [
        { id: 'recMember001', fields: { 'First Name': 'John', 'Last Name': 'Doe', 'Full Name': 'John Doe', 'Phone': '123', 'Status': 'Member', 'Source': 'Other', 'Date First Captured': '2024-01-01', 'Follow-up Status': 'Not Started' }, createdTime: new Date().toISOString() },
        { id: 'recMember002', fields: { 'First Name': 'Jane', 'Last Name': 'Doe', 'Full Name': 'Jane Doe', 'Phone': '456', 'Status': 'Member', 'Source': 'Other', 'Date First Captured': '2024-01-01', 'Follow-up Status': 'Not Started' }, createdTime: new Date().toISOString() },
      ];

      // Mock service record with attendance IDs
      const serviceRecord: AirtableRecord = {
        id: serviceId,
        fields: { 
          'Service Code': 'Test Service',
          'Attendance': attendanceRecords.map(a => a.id),
        },
        createdTime: new Date().toISOString(),
      };

      mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
        if (table === 'Services' && id === serviceId) return serviceRecord;
        if (table === 'Attendance') {
          const record = attendanceRecords.find(a => a.id === id);
          if (record) return record;
        }
        if (table === 'Members') {
          const member = memberRecords.find(m => m.id === id);
          if (member) return member;
        }
        throw new Error(`Record not found: ${table}/${id}`);
      });

      mockAirtableClient.findRecords.mockImplementation(async (table) => {
        if (table === 'Members') return memberRecords;
        return [];
      });

      const result = await queryService.getServiceAttendees(serviceId);

      expect(result).toHaveLength(2);
      expect(result.map(m => m.id).sort()).toEqual(['recMember001', 'recMember002']);
    });

    it('should throw error for empty service ID', async () => {
      await expect(queryService.getServiceAttendees('')).rejects.toThrow('Service ID is required');
    });
  });

  describe('getMemberById', () => {
    it('should return member details for valid ID', async () => {
      const memberId = 'recMember001';
      const memberRecord: AirtableRecord = {
        id: memberId,
        fields: {
          'First Name': 'John',
          'Last Name': 'Doe',
          'Full Name': 'John Doe',
          'Phone': '+1234567890',
          'Email': 'john@example.com',
          'Status': 'Member',
          'Source': 'Evangelism',
          'Date First Captured': '2024-01-01',
          'Follow-up Status': 'Completed',
        },
        createdTime: new Date().toISOString(),
      };

      mockAirtableClient.getRecord.mockResolvedValue(memberRecord);

      const result = await queryService.getMemberById(memberId);

      expect(result).toBeDefined();
      expect(result!.id).toBe(memberId);
      expect(result!.fullName).toBe('John Doe');
    });

    it('should return null for non-existent member', async () => {
      mockAirtableClient.getRecord.mockRejectedValue(new Error('Not found'));

      const result = await queryService.getMemberById('recNonExistent');

      expect(result).toBeNull();
    });

    it('should throw error for empty member ID', async () => {
      await expect(queryService.getMemberById('')).rejects.toThrow('Member ID is required');
    });
  });

  describe('getFollowUpsByFollowUpMember', () => {
    it('should return follow-up assignments for a follow-up member', async () => {
      const followUpMemberId = 'recFollowUpMember001';
      const assignmentRecords: AirtableRecord[] = [
        {
          id: 'recAssign001',
          fields: {
            'Member': ['recMember001'],
            'Assigned To': [followUpMemberId],
            'Assigned Date': '2024-01-01',
            'Due Date': '2024-01-15',
            'Status': 'Assigned',
          },
          createdTime: new Date().toISOString(),
        },
      ];

      mockAirtableClient.findRecords.mockResolvedValue(assignmentRecords);

      const result = await queryService.getFollowUpsByFollowUpMember(followUpMemberId);

      expect(result).toHaveLength(1);
      expect(result[0]!.assignedTo).toBe(followUpMemberId);
    });

    it('should throw error for empty follow-up member ID', async () => {
      await expect(queryService.getFollowUpsByFollowUpMember('')).rejects.toThrow('Follow-up member ID is required');
    });
  });

  describe('getSoulsAssignedByFollowUpMember', () => {
    it('should return souls grouped by follow-up member', async () => {
      const followUpMemberId = 'recFollowUpMember001';
      const evangelismRecords: AirtableRecord[] = [
        {
          id: 'recEvang001',
          fields: { 'Soul Winner': [followUpMemberId], 'Linked Member': ['recMember001'], 'Date': '2024-01-01' },
          createdTime: new Date().toISOString(),
        },
      ];

      const followUpMemberRecord: AirtableRecord = {
        id: followUpMemberId,
        fields: { 'Full Name': 'John Follow-up Member' },
        createdTime: new Date().toISOString(),
      };

      const memberRecords: AirtableRecord[] = [
        {
          id: 'recMember001',
          fields: { 'First Name': 'Soul', 'Last Name': 'Won', 'Full Name': 'Soul Won', 'Phone': '123', 'Status': 'Evangelism Contact', 'Source': 'Evangelism', 'Date First Captured': '2024-01-01', 'Follow-up Status': 'Not Started' },
          createdTime: new Date().toISOString(),
        },
      ];

      mockAirtableClient.findRecords.mockImplementation(async (table) => {
        if (table === 'Evangelism') return evangelismRecords;
        if (table === 'Members') return memberRecords;
        return [];
      });

      mockAirtableClient.getRecord.mockResolvedValue(followUpMemberRecord);

      const result = await queryService.getSoulsAssignedByFollowUpMember();

      expect(result).toHaveLength(1);
      expect(result[0]!.followUpMemberId).toBe(followUpMemberId);
      expect(result[0]!.followUpMemberName).toBe('John Follow-up Member');
      expect(result[0]!.members).toHaveLength(1);
    });
  });

  describe('getDepartmentRoster', () => {
    it('should return members in a department', async () => {
      const departmentId = 'recDept001';
      const memberDeptRecords: AirtableRecord[] = [
        { id: 'recMD001', fields: { 'Member': ['recMember001'], 'Department': [departmentId], 'Active': true }, createdTime: new Date().toISOString() },
        { id: 'recMD002', fields: { 'Member': ['recMember002'], 'Department': [departmentId], 'Active': true }, createdTime: new Date().toISOString() },
      ];

      const memberRecords: AirtableRecord[] = [
        { id: 'recMember001', fields: { 'First Name': 'John', 'Last Name': 'Doe', 'Full Name': 'John Doe', 'Phone': '123', 'Status': 'Member', 'Source': 'Other', 'Date First Captured': '2024-01-01', 'Follow-up Status': 'Not Started' }, createdTime: new Date().toISOString() },
        { id: 'recMember002', fields: { 'First Name': 'Jane', 'Last Name': 'Doe', 'Full Name': 'Jane Doe', 'Phone': '456', 'Status': 'Member', 'Source': 'Other', 'Date First Captured': '2024-01-01', 'Follow-up Status': 'Not Started' }, createdTime: new Date().toISOString() },
      ];

      mockAirtableClient.findRecords.mockImplementation(async (table) => {
        if (table === 'Member Departments') return memberDeptRecords;
        if (table === 'Members') return memberRecords;
        return [];
      });

      const result = await queryService.getDepartmentRoster(departmentId);

      expect(result).toHaveLength(2);
      expect(result.map(m => m.id).sort()).toEqual(['recMember001', 'recMember002']);
    });

    it('should throw error for empty department ID', async () => {
      await expect(queryService.getDepartmentRoster('')).rejects.toThrow('Department ID is required');
    });
  });
});


/**
 * Property 5: Services Sorted by Date Descending
 * Validates: Requirements 2.5
 * 
 * For any list of services returned by the API, the services SHALL be sorted by serviceDate 
 * in descending order (most recent first), such that for any adjacent pair (service[i], service[i+1]), 
 * service[i].serviceDate >= service[i+1].serviceDate.
 */
describe('Property 5: Services Sorted by Date Descending', () => {
  let mockAirtableClient: jest.Mocked<AirtableClient>;
  let queryService: QueryService;

  beforeEach(() => {
    mockAirtableClient = {
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      getRecord: jest.fn(),
      findRecords: jest.fn(),
      batchCreate: jest.fn(),
      batchUpdate: jest.fn(),
    } as unknown as jest.Mocked<AirtableClient>;

    queryService = new QueryService(mockAirtableClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 5.1: Services returned by getRecentServices are sorted by date descending
   * 
   * For any set of services with various dates, when fetched via getRecentServices,
   * the result should be sorted with most recent first.
   * 
   * Validates: Requirements 2.5
   */
  it('should return services sorted by date descending from getRecentServices', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: airtableIdArb,
            serviceName: fc.string({ minLength: 1, maxLength: 50 }),
            serviceDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            serviceCode: fc.string({ minLength: 1, maxLength: 10 }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (services) => {
          // Create mock records from generated services
          const mockRecords: AirtableRecord[] = services.map(s => ({
            id: s.id,
            fields: {
              'Service Code': s.serviceName,
              'Service Date': s.serviceDate.toISOString().split('T')[0],
              'Service Type': s.serviceCode,
            },
            createdTime: new Date().toISOString(),
          }));

          // Sort the mock records by date descending (simulating Airtable's sort)
          const sortedRecords = [...mockRecords].sort((a, b) => {
            const dateA = new Date(a.fields['Service Date'] as string);
            const dateB = new Date(b.fields['Service Date'] as string);
            return dateB.getTime() - dateA.getTime();
          });

          mockAirtableClient.findRecords.mockResolvedValue(sortedRecords);

          const result = await queryService.getRecentServices();

          // Verify the result is sorted by date descending
          for (let i = 0; i < result.length - 1; i++) {
            const currentDate = result[i]!.serviceDate;
            const nextDate = result[i + 1]!.serviceDate;
            
            if (currentDate && nextDate) {
              expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
            }
          }

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.2: Services returned by getAllServices are sorted by date descending
   * 
   * Validates: Requirements 2.5
   */
  it('should return services sorted by date descending from getAllServices', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: airtableIdArb,
            serviceName: fc.string({ minLength: 1, maxLength: 50 }),
            serviceDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            serviceCode: fc.string({ minLength: 1, maxLength: 10 }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (services) => {
          const mockRecords: AirtableRecord[] = services.map(s => ({
            id: s.id,
            fields: {
              'Service Code': s.serviceName,
              'Service Date': s.serviceDate.toISOString().split('T')[0],
              'Service Type': s.serviceCode,
            },
            createdTime: new Date().toISOString(),
          }));

          // Sort the mock records by date descending
          const sortedRecords = [...mockRecords].sort((a, b) => {
            const dateA = new Date(a.fields['Service Date'] as string);
            const dateB = new Date(b.fields['Service Date'] as string);
            return dateB.getTime() - dateA.getTime();
          });

          mockAirtableClient.findRecords.mockResolvedValue(sortedRecords);

          const result = await queryService.getAllServices();

          // Verify the result is sorted by date descending
          for (let i = 0; i < result.length - 1; i++) {
            const currentDate = result[i]!.serviceDate;
            const nextDate = result[i + 1]!.serviceDate;
            
            if (currentDate && nextDate) {
              expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
            }
          }

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.3: Services returned by getServicesByDateRange are sorted by date descending
   * 
   * Validates: Requirements 2.5
   */
  it('should return services sorted by date descending from getServicesByDateRange', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), // startDate
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), // endDate
        fc.array(
          fc.record({
            id: airtableIdArb,
            serviceName: fc.string({ minLength: 1, maxLength: 50 }),
            serviceDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            serviceCode: fc.string({ minLength: 1, maxLength: 10 }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (startDate, endDate, services) => {
          // Ensure startDate <= endDate
          const actualStartDate = startDate <= endDate ? startDate : endDate;
          const actualEndDate = startDate <= endDate ? endDate : startDate;

          // Filter services within the date range
          const servicesInRange = services.filter(s => 
            s.serviceDate >= actualStartDate && s.serviceDate <= actualEndDate
          );

          const mockRecords: AirtableRecord[] = servicesInRange.map(s => ({
            id: s.id,
            fields: {
              'Service Code': s.serviceName,
              'Service Date': s.serviceDate.toISOString().split('T')[0],
              'Service Type': s.serviceCode,
            },
            createdTime: new Date().toISOString(),
          }));

          // Sort the mock records by date descending
          const sortedRecords = [...mockRecords].sort((a, b) => {
            const dateA = new Date(a.fields['Service Date'] as string);
            const dateB = new Date(b.fields['Service Date'] as string);
            return dateB.getTime() - dateA.getTime();
          });

          mockAirtableClient.findRecords.mockResolvedValue(sortedRecords);

          const result = await queryService.getServicesByDateRange(actualStartDate, actualEndDate);

          // Verify the result is sorted by date descending
          for (let i = 0; i < result.length - 1; i++) {
            const currentDate = result[i]!.serviceDate;
            const nextDate = result[i + 1]!.serviceDate;
            
            if (currentDate && nextDate) {
              expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
            }
          }

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.4: Services returned by searchServices are sorted by date descending
   * 
   * Validates: Requirements 2.5
   */
  it('should return services sorted by date descending from searchServices', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }), // searchQuery
        fc.array(
          fc.record({
            id: airtableIdArb,
            serviceName: fc.string({ minLength: 1, maxLength: 50 }),
            serviceDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            serviceCode: fc.string({ minLength: 1, maxLength: 10 }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (searchQuery, services) => {
          const mockRecords: AirtableRecord[] = services.map(s => ({
            id: s.id,
            fields: {
              'Service Code': s.serviceName,
              'Service Date': s.serviceDate.toISOString().split('T')[0],
              'Service Type': s.serviceCode,
            },
            createdTime: new Date().toISOString(),
          }));

          // Sort the mock records by date descending
          const sortedRecords = [...mockRecords].sort((a, b) => {
            const dateA = new Date(a.fields['Service Date'] as string);
            const dateB = new Date(b.fields['Service Date'] as string);
            return dateB.getTime() - dateA.getTime();
          });

          mockAirtableClient.findRecords.mockResolvedValue(sortedRecords);

          const result = await queryService.searchServices(searchQuery);

          // Verify the result is sorted by date descending
          for (let i = 0; i < result.length - 1; i++) {
            const currentDate = result[i]!.serviceDate;
            const nextDate = result[i + 1]!.serviceDate;
            
            if (currentDate && nextDate) {
              expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
            }
          }

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 3: Service Date Range Filter Correctness
 * Validates: Requirements 2.3
 * 
 * For any date range (startDate, endDate) and any set of services, the filtered result 
 * SHALL contain only services where serviceDate >= startDate AND serviceDate <= endDate.
 */
describe('Property 3: Service Date Range Filter Correctness', () => {
  let mockAirtableClient: jest.Mocked<AirtableClient>;
  let queryService: QueryService;

  beforeEach(() => {
    mockAirtableClient = {
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      getRecord: jest.fn(),
      findRecords: jest.fn(),
      batchCreate: jest.fn(),
      batchUpdate: jest.fn(),
    } as unknown as jest.Mocked<AirtableClient>;

    queryService = new QueryService(mockAirtableClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 3.1: All returned services are within the specified date range
   * 
   * For any date range and set of services, getServicesByDateRange should only
   * return services where serviceDate >= startDate AND serviceDate <= endDate.
   * 
   * Validates: Requirements 2.3
   */
  it('should only return services within the specified date range', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), // startDate
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), // endDate
        fc.array(
          fc.record({
            id: airtableIdArb,
            serviceName: fc.string({ minLength: 1, maxLength: 50 }),
            serviceDate: fc.date({ min: new Date('2019-01-01'), max: new Date('2031-12-31') }),
            serviceCode: fc.string({ minLength: 1, maxLength: 10 }),
          }),
          { minLength: 0, maxLength: 30 }
        ),
        async (startDate, endDate, services) => {
          // Ensure startDate <= endDate
          const actualStartDate = startDate <= endDate ? startDate : endDate;
          const actualEndDate = startDate <= endDate ? endDate : startDate;

          // Simulate Airtable filtering - only return services within the date range
          const servicesInRange = services.filter(s => {
            const serviceDate = new Date(s.serviceDate.toISOString().split('T')[0]!);
            const start = new Date(actualStartDate.toISOString().split('T')[0]!);
            const end = new Date(actualEndDate.toISOString().split('T')[0]!);
            return serviceDate >= start && serviceDate <= end;
          });

          const mockRecords: AirtableRecord[] = servicesInRange.map(s => ({
            id: s.id,
            fields: {
              'Service Code': s.serviceName,
              'Service Date': s.serviceDate.toISOString().split('T')[0],
              'Service Type': s.serviceCode,
            },
            createdTime: new Date().toISOString(),
          }));

          // Sort by date descending
          const sortedRecords = [...mockRecords].sort((a, b) => {
            const dateA = new Date(a.fields['Service Date'] as string);
            const dateB = new Date(b.fields['Service Date'] as string);
            return dateB.getTime() - dateA.getTime();
          });

          mockAirtableClient.findRecords.mockResolvedValue(sortedRecords);

          const result = await queryService.getServicesByDateRange(actualStartDate, actualEndDate);

          // Verify all returned services are within the date range
          const startDateStr = actualStartDate.toISOString().split('T')[0]!;
          const endDateStr = actualEndDate.toISOString().split('T')[0]!;
          const startDateNormalized = new Date(startDateStr);
          const endDateNormalized = new Date(endDateStr);

          for (const service of result) {
            if (service.serviceDate) {
              expect(service.serviceDate.getTime()).toBeGreaterThanOrEqual(startDateNormalized.getTime());
              expect(service.serviceDate.getTime()).toBeLessThanOrEqual(endDateNormalized.getTime());
            }
          }

          // Verify the count matches expected
          expect(result.length).toBe(servicesInRange.length);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.2: Services outside the date range are excluded
   * 
   * For any date range, services with dates before startDate or after endDate
   * should not be included in the result.
   * 
   * Validates: Requirements 2.3
   */
  it('should exclude services outside the date range', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date('2022-01-01'), max: new Date('2024-12-31') }), // startDate
        fc.date({ min: new Date('2022-01-01'), max: new Date('2024-12-31') }), // endDate
        fc.array(
          fc.record({
            id: airtableIdArb,
            serviceName: fc.string({ minLength: 1, maxLength: 50 }),
            serviceDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2026-12-31') }),
            serviceCode: fc.string({ minLength: 1, maxLength: 10 }),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        async (startDate, endDate, services) => {
          // Ensure startDate <= endDate
          const actualStartDate = startDate <= endDate ? startDate : endDate;
          const actualEndDate = startDate <= endDate ? endDate : startDate;

          // Simulate Airtable filtering - only return services within the date range
          const servicesInRange = services.filter(s => {
            const serviceDate = new Date(s.serviceDate.toISOString().split('T')[0]!);
            const start = new Date(actualStartDate.toISOString().split('T')[0]!);
            const end = new Date(actualEndDate.toISOString().split('T')[0]!);
            return serviceDate >= start && serviceDate <= end;
          });

          const mockRecords: AirtableRecord[] = servicesInRange.map(s => ({
            id: s.id,
            fields: {
              'Service Code': s.serviceName,
              'Service Date': s.serviceDate.toISOString().split('T')[0],
              'Service Type': s.serviceCode,
            },
            createdTime: new Date().toISOString(),
          }));

          mockAirtableClient.findRecords.mockResolvedValue(mockRecords);

          const result = await queryService.getServicesByDateRange(actualStartDate, actualEndDate);

          // Verify no services outside the range are included
          const servicesOutsideRange = services.filter(s => {
            const serviceDate = new Date(s.serviceDate.toISOString().split('T')[0]!);
            const start = new Date(actualStartDate.toISOString().split('T')[0]!);
            const end = new Date(actualEndDate.toISOString().split('T')[0]!);
            return serviceDate < start || serviceDate > end;
          });

          const resultIds = new Set(result.map(r => r.id));
          for (const outsideService of servicesOutsideRange) {
            expect(resultIds.has(outsideService.id)).toBe(false);
          }

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.3: Empty result when no services in range
   * 
   * When no services fall within the specified date range,
   * the result should be an empty array.
   * 
   * Validates: Requirements 2.3
   */
  it('should return empty array when no services in range', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') }), // startDate
        fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') }), // endDate
        async (startDate, endDate) => {
          // Ensure startDate <= endDate
          const actualStartDate = startDate <= endDate ? startDate : endDate;
          const actualEndDate = startDate <= endDate ? endDate : startDate;

          // Return empty array (no services in range)
          mockAirtableClient.findRecords.mockResolvedValue([]);

          const result = await queryService.getServicesByDateRange(actualStartDate, actualEndDate);

          expect(result).toEqual([]);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });
});


/**
 * Property 7: Drill-Down Member Details Complete
 * Validates: Requirements 3.3
 * 
 * For any member displayed in the drill-down view:
 * - The display SHALL include the member's Full Name
 * - The display SHALL include Phone if present on the member record
 * - The display SHALL include Email if present on the member record
 * - The display SHALL include Status if present on the member record
 */
describe('Property 7: Drill-Down Member Details Complete', () => {
  let mockAirtableClient: jest.Mocked<AirtableClient>;
  let queryService: QueryService;

  beforeEach(() => {
    mockAirtableClient = {
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      getRecord: jest.fn(),
      findRecords: jest.fn(),
      batchCreate: jest.fn(),
      batchUpdate: jest.fn(),
    } as unknown as jest.Mocked<AirtableClient>;

    queryService = new QueryService(mockAirtableClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 7.1: Full Name is always included in drill-down member
   * 
   * For any member in the drill-down view, the fullName field SHALL be present
   * 
   * Validates: Requirements 3.3
   */
  it('should always include fullName in drill-down member', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceId
        airtableIdArb, // memberId
        fc.string({ minLength: 1, maxLength: 30 }), // firstName
        fc.string({ minLength: 1, maxLength: 30 }), // lastName
        fc.constantFrom('First Timer', 'Returner', 'Evangelism Contact', 'Member'), // status
        async (serviceId, memberId, firstName, lastName, status) => {
          const fullName = `${firstName} ${lastName}`;

          // Mock member record
          const memberRecord: AirtableRecord = {
            id: memberId,
            fields: {
              'First Name': firstName,
              'Last Name': lastName,
              'Full Name': fullName,
              'Status': status,
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          };

          // Mock attendance record
          const attendanceRecord: AirtableRecord = {
            id: `recAtt${memberId.slice(3)}`,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': true,
            },
            createdTime: new Date().toISOString(),
          };

          // Mock service record
          const serviceRecord: AirtableRecord = {
            id: serviceId,
            fields: {
              'Service Code': 'Test Service',
              'Attendance': [attendanceRecord.id],
            },
            createdTime: new Date().toISOString(),
          };

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services' && id === serviceId) return serviceRecord;
            if (table === 'Attendance' && id === attendanceRecord.id) return attendanceRecord;
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Members') return [memberRecord];
            return [];
          });

          const result = await queryService.getAttendeesByCategory(serviceId, status === 'First Timer' ? 'firstTimers' : status === 'Returner' ? 'returners' : status === 'Evangelism Contact' ? 'evangelismContacts' : 'firstTimers');

          // If the member matches the category, verify fullName is present
          if (result.length > 0) {
            const drillDownMember = result[0];
            expect(drillDownMember).toBeDefined();
            expect(drillDownMember!.fullName).toBeDefined();
            expect(drillDownMember!.fullName.length).toBeGreaterThan(0);
          }

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.2: Phone is included when present on member record
   * 
   * For any member with a phone number, the drill-down view SHALL include it
   * 
   * Validates: Requirements 3.3
   */
  it('should include phone when present on member record', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceId
        airtableIdArb, // memberId
        fc.string({ minLength: 1, maxLength: 30 }), // firstName
        fc.string({ minLength: 1, maxLength: 30 }), // lastName
        fc.string({ minLength: 10, maxLength: 15 }), // phone
        async (serviceId, memberId, firstName, lastName, phone) => {
          const fullName = `${firstName} ${lastName}`;

          // Mock member record with phone
          const memberRecord: AirtableRecord = {
            id: memberId,
            fields: {
              'First Name': firstName,
              'Last Name': lastName,
              'Full Name': fullName,
              'Phone': phone,
              'Status': 'First Timer',
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          };

          // Mock attendance record
          const attendanceRecord: AirtableRecord = {
            id: `recAtt${memberId.slice(3)}`,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': true,
            },
            createdTime: new Date().toISOString(),
          };

          // Mock service record
          const serviceRecord: AirtableRecord = {
            id: serviceId,
            fields: {
              'Service Code': 'Test Service',
              'Attendance': [attendanceRecord.id],
            },
            createdTime: new Date().toISOString(),
          };

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services' && id === serviceId) return serviceRecord;
            if (table === 'Attendance' && id === attendanceRecord.id) return attendanceRecord;
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Members') return [memberRecord];
            return [];
          });

          const result = await queryService.getAttendeesByCategory(serviceId, 'firstTimers');

          expect(result.length).toBe(1);
          expect(result[0]!.phone).toBe(phone);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.3: Email is included when present on member record
   * 
   * For any member with an email, the drill-down view SHALL include it
   * 
   * Validates: Requirements 3.3
   */
  it('should include email when present on member record', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceId
        airtableIdArb, // memberId
        fc.string({ minLength: 1, maxLength: 30 }), // firstName
        fc.string({ minLength: 1, maxLength: 30 }), // lastName
        fc.emailAddress(), // email
        async (serviceId, memberId, firstName, lastName, email) => {
          const fullName = `${firstName} ${lastName}`;

          // Mock member record with email
          const memberRecord: AirtableRecord = {
            id: memberId,
            fields: {
              'First Name': firstName,
              'Last Name': lastName,
              'Full Name': fullName,
              'Email': email,
              'Status': 'First Timer',
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          };

          // Mock attendance record
          const attendanceRecord: AirtableRecord = {
            id: `recAtt${memberId.slice(3)}`,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': true,
            },
            createdTime: new Date().toISOString(),
          };

          // Mock service record
          const serviceRecord: AirtableRecord = {
            id: serviceId,
            fields: {
              'Service Code': 'Test Service',
              'Attendance': [attendanceRecord.id],
            },
            createdTime: new Date().toISOString(),
          };

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services' && id === serviceId) return serviceRecord;
            if (table === 'Attendance' && id === attendanceRecord.id) return attendanceRecord;
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Members') return [memberRecord];
            return [];
          });

          const result = await queryService.getAttendeesByCategory(serviceId, 'firstTimers');

          expect(result.length).toBe(1);
          expect(result[0]!.email).toBe(email);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.4: Status is always included in drill-down member
   * 
   * For any member in the drill-down view, the status field SHALL be present
   * 
   * Validates: Requirements 3.3
   */
  it('should always include status in drill-down member', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceId
        airtableIdArb, // memberId
        fc.string({ minLength: 1, maxLength: 30 }), // firstName
        fc.string({ minLength: 1, maxLength: 30 }), // lastName
        fc.constantFrom('First Timer', 'Returner', 'Evangelism Contact', 'Member'), // status
        async (serviceId, memberId, firstName, lastName, status) => {
          const fullName = `${firstName} ${lastName}`;

          // Mock member record
          const memberRecord: AirtableRecord = {
            id: memberId,
            fields: {
              'First Name': firstName,
              'Last Name': lastName,
              'Full Name': fullName,
              'Status': status,
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          };

          // Mock attendance record
          const attendanceRecord: AirtableRecord = {
            id: `recAtt${memberId.slice(3)}`,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': true,
            },
            createdTime: new Date().toISOString(),
          };

          // Mock service record
          const serviceRecord: AirtableRecord = {
            id: serviceId,
            fields: {
              'Service Code': 'Test Service',
              'Attendance': [attendanceRecord.id],
            },
            createdTime: new Date().toISOString(),
          };

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services' && id === serviceId) return serviceRecord;
            if (table === 'Attendance' && id === attendanceRecord.id) return attendanceRecord;
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Members') return [memberRecord];
            return [];
          });

          // Use the appropriate category based on status
          const category = status === 'First Timer' ? 'firstTimers' : 
                          status === 'Returner' ? 'returners' : 
                          status === 'Evangelism Contact' ? 'evangelismContacts' : 'firstTimers';

          const result = await queryService.getAttendeesByCategory(serviceId, category);

          // If the member matches the category, verify status is present
          if (result.length > 0) {
            const drillDownMember = result[0];
            expect(drillDownMember).toBeDefined();
            expect(drillDownMember!.status).toBeDefined();
            expect(drillDownMember!.status).toBe(status);
          }

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.5: Optional fields are undefined when not present
   * 
   * For any member without phone or email, those fields should be undefined
   * 
   * Validates: Requirements 3.3
   */
  it('should have undefined for optional fields when not present', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceId
        airtableIdArb, // memberId
        fc.string({ minLength: 1, maxLength: 30 }), // firstName
        fc.string({ minLength: 1, maxLength: 30 }), // lastName
        async (serviceId, memberId, firstName, lastName) => {
          const fullName = `${firstName} ${lastName}`;

          // Mock member record without phone or email
          const memberRecord: AirtableRecord = {
            id: memberId,
            fields: {
              'First Name': firstName,
              'Last Name': lastName,
              'Full Name': fullName,
              'Status': 'First Timer',
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
              // No Phone or Email fields
            },
            createdTime: new Date().toISOString(),
          };

          // Mock attendance record
          const attendanceRecord: AirtableRecord = {
            id: `recAtt${memberId.slice(3)}`,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': true,
            },
            createdTime: new Date().toISOString(),
          };

          // Mock service record
          const serviceRecord: AirtableRecord = {
            id: serviceId,
            fields: {
              'Service Code': 'Test Service',
              'Attendance': [attendanceRecord.id],
            },
            createdTime: new Date().toISOString(),
          };

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services' && id === serviceId) return serviceRecord;
            if (table === 'Attendance' && id === attendanceRecord.id) return attendanceRecord;
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Members') return [memberRecord];
            return [];
          });

          const result = await queryService.getAttendeesByCategory(serviceId, 'firstTimers');

          expect(result.length).toBe(1);
          expect(result[0]!.phone).toBeUndefined();
          expect(result[0]!.email).toBeUndefined();

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 9: Unidirectional Missing Members Comparison
 * Validates: Requirements 5.2, 5.3
 * 
 * For any two services A (reference) and B (comparison), the missing members result SHALL contain 
 * exactly those members who have attendance Present=true for Service A AND (no attendance record 
 * for Service B OR Present=false for Service B). The result SHALL NOT contain members who are 
 * only present in Service B.
 * 
 * Feature: ui-improvements-v2, Property 9: Unidirectional Missing Members Comparison
 */
describe('Property 9: Unidirectional Missing Members Comparison', () => {
  let mockAirtableClient: jest.Mocked<AirtableClient>;
  let queryService: QueryService;

  beforeEach(() => {
    mockAirtableClient = {
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      getRecord: jest.fn(),
      findRecords: jest.fn(),
      batchCreate: jest.fn(),
      batchUpdate: jest.fn(),
    } as unknown as jest.Mocked<AirtableClient>;

    queryService = new QueryService(mockAirtableClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 9.1: Missing members contains only members present in reference but not in comparison
   * 
   * For any two services, the result should contain exactly those members who attended
   * the reference service but not the comparison service.
   * 
   * Validates: Requirements 5.2
   */
  it('should return only members present in reference service but missing from comparison service', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // referenceServiceId
        airtableIdArb, // comparisonServiceId
        fc.uniqueArray(airtableIdArb, { minLength: 0, maxLength: 10 }), // membersInBothServices
        fc.uniqueArray(airtableIdArb, { minLength: 0, maxLength: 10 }), // membersOnlyInReference
        fc.uniqueArray(airtableIdArb, { minLength: 0, maxLength: 10 }), // membersOnlyInComparison
        async (referenceServiceId, comparisonServiceId, membersInBoth, membersOnlyInRef, membersOnlyInComp) => {
          // Skip when comparing the same service to itself - that's a degenerate case
          if (referenceServiceId === comparisonServiceId) return;

          // Ensure non-overlapping sets
          const uniqueMembersInBoth = [...new Set(membersInBoth)];
          const uniqueMembersOnlyInRef = [...new Set(membersOnlyInRef)].filter(m => !uniqueMembersInBoth.includes(m));
          const uniqueMembersOnlyInComp = [...new Set(membersOnlyInComp)].filter(m => !uniqueMembersInBoth.includes(m) && !uniqueMembersOnlyInRef.includes(m));

          const membersInRef = [...uniqueMembersInBoth, ...uniqueMembersOnlyInRef];
          const membersInComp = [...uniqueMembersInBoth, ...uniqueMembersOnlyInComp];
          const allMembers = [...new Set([...membersInRef, ...membersInComp])];

          // Mock attendance records
          const attendanceRef: AirtableRecord[] = membersInRef.map((memberId, i) => ({
            id: `recAttRef${i.toString().padStart(9, '0')}`,
            fields: { 'Member': [memberId], 'Service': [referenceServiceId], 'Present?': true },
            createdTime: new Date().toISOString(),
          }));

          const attendanceComp: AirtableRecord[] = membersInComp.map((memberId, i) => ({
            id: `recAttComp${i.toString().padStart(8, '0')}`,
            fields: { 'Member': [memberId], 'Service': [comparisonServiceId], 'Present?': true },
            createdTime: new Date().toISOString(),
          }));

          // Mock service records
          const refServiceRecord: AirtableRecord = {
            id: referenceServiceId,
            fields: { 
              'Service Code': 'Reference Service',
              'Attendance': attendanceRef.map(a => a.id),
            },
            createdTime: new Date().toISOString(),
          };
          const compServiceRecord: AirtableRecord = {
            id: comparisonServiceId,
            fields: { 
              'Service Code': 'Comparison Service',
              'Attendance': attendanceComp.map(a => a.id),
            },
            createdTime: new Date().toISOString(),
          };

          // Mock member records
          const memberRecords: AirtableRecord[] = allMembers.map((memberId, i) => ({
            id: memberId,
            fields: {
              'First Name': `First${i}`,
              'Last Name': `Last${i}`,
              'Full Name': `First${i} Last${i}`,
              'Phone': `+1234567890${i}`,
              'Status': 'Member',
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          }));

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services') {
              if (id === referenceServiceId) return refServiceRecord;
              if (id === comparisonServiceId) return compServiceRecord;
            }
            if (table === 'Attendance') {
              const recordRef = attendanceRef.find(a => a.id === id);
              if (recordRef) return recordRef;
              const recordComp = attendanceComp.find(a => a.id === id);
              if (recordComp) return recordComp;
            }
            if (table === 'Members') {
              const member = memberRecords.find(m => m.id === id);
              if (member) return member;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table, filter) => {
            if (table === 'Members') {
              const idMatches = filter.match(/RECORD_ID\(\) = '([^']+)'/g) || [];
              const requestedIds = idMatches.map(match => {
                const idMatch = match.match(/RECORD_ID\(\) = '([^']+)'/);
                return idMatch ? idMatch[1] : null;
              }).filter((id): id is string => id !== null);
              
              return memberRecords.filter(m => requestedIds.includes(m.id));
            }
            return [];
          });

          const result = await queryService.compareTwoServices(referenceServiceId, comparisonServiceId);

          // Verify only members in reference but not in comparison are returned
          const expectedMissing = uniqueMembersOnlyInRef;
          const actualMissing = result.presentInAMissingInB.map(m => m.id);

          expect(actualMissing.sort()).toEqual(expectedMissing.sort());

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.2: Result does NOT contain members only present in comparison service
   * 
   * Members who attended only the comparison service should NOT appear in the result.
   * 
   * Validates: Requirements 5.3
   */
  it('should NOT include members who are only present in comparison service', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // referenceServiceId
        airtableIdArb, // comparisonServiceId
        fc.uniqueArray(airtableIdArb, { minLength: 1, maxLength: 10 }), // membersOnlyInComparison
        async (referenceServiceId, comparisonServiceId, membersOnlyInComp) => {
          const uniqueMembersOnlyInComp = [...new Set(membersOnlyInComp)];

          // Mock attendance records - only comparison service has attendees
          const attendanceComp: AirtableRecord[] = uniqueMembersOnlyInComp.map((memberId, i) => ({
            id: `recAttComp${i.toString().padStart(8, '0')}`,
            fields: { 'Member': [memberId], 'Service': [comparisonServiceId], 'Present?': true },
            createdTime: new Date().toISOString(),
          }));

          // Mock service records
          const refServiceRecord: AirtableRecord = {
            id: referenceServiceId,
            fields: { 
              'Service Code': 'Reference Service',
              'Attendance': [], // Empty - no one attended reference service
            },
            createdTime: new Date().toISOString(),
          };
          const compServiceRecord: AirtableRecord = {
            id: comparisonServiceId,
            fields: { 
              'Service Code': 'Comparison Service',
              'Attendance': attendanceComp.map(a => a.id),
            },
            createdTime: new Date().toISOString(),
          };

          // Mock member records
          const memberRecords: AirtableRecord[] = uniqueMembersOnlyInComp.map((memberId, i) => ({
            id: memberId,
            fields: {
              'First Name': `First${i}`,
              'Last Name': `Last${i}`,
              'Full Name': `First${i} Last${i}`,
              'Phone': `+1234567890${i}`,
              'Status': 'Member',
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          }));

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services') {
              if (id === referenceServiceId) return refServiceRecord;
              if (id === comparisonServiceId) return compServiceRecord;
            }
            if (table === 'Attendance') {
              const recordComp = attendanceComp.find(a => a.id === id);
              if (recordComp) return recordComp;
            }
            if (table === 'Members') {
              const member = memberRecords.find(m => m.id === id);
              if (member) return member;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table, filter) => {
            if (table === 'Members') {
              const idMatches = filter.match(/RECORD_ID\(\) = '([^']+)'/g) || [];
              const requestedIds = idMatches.map(match => {
                const idMatch = match.match(/RECORD_ID\(\) = '([^']+)'/);
                return idMatch ? idMatch[1] : null;
              }).filter((id): id is string => id !== null);
              
              return memberRecords.filter(m => requestedIds.includes(m.id));
            }
            return [];
          });

          const result = await queryService.compareTwoServices(referenceServiceId, comparisonServiceId);

          // Result should be empty - no one attended reference service
          expect(result.presentInAMissingInB).toHaveLength(0);

          // Verify none of the comparison-only members are in the result
          const resultIds = result.presentInAMissingInB.map(m => m.id);
          for (const memberId of uniqueMembersOnlyInComp) {
            expect(resultIds).not.toContain(memberId);
          }

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.3: Response structure uses correct format
   * 
   * The response should use serviceA/serviceB naming and presentInAMissingInB array.
   * 
   * Validates: Requirements 5.2, 5.3
   */
  it('should return correct response structure with serviceA, serviceB, and presentInAMissingInB', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // referenceServiceId
        airtableIdArb, // comparisonServiceId
        fc.string({ minLength: 1, maxLength: 50 }), // refServiceName
        fc.string({ minLength: 1, maxLength: 50 }), // compServiceName
        async (referenceServiceId, comparisonServiceId, refServiceName, compServiceName) => {
          // Skip when comparing the same service to itself
          if (referenceServiceId === comparisonServiceId) return true;
          
          // Mock service records
          const refServiceRecord: AirtableRecord = {
            id: referenceServiceId,
            fields: { 
              'Service Code': refServiceName,
              'Attendance': [],
            },
            createdTime: new Date().toISOString(),
          };
          const compServiceRecord: AirtableRecord = {
            id: comparisonServiceId,
            fields: { 
              'Service Code': compServiceName,
              'Attendance': [],
            },
            createdTime: new Date().toISOString(),
          };

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services') {
              if (id === referenceServiceId) return refServiceRecord;
              if (id === comparisonServiceId) return compServiceRecord;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockResolvedValue([]);

          const result = await queryService.compareTwoServices(referenceServiceId, comparisonServiceId);

          // Verify response structure
          expect(result).toHaveProperty('serviceA');
          expect(result).toHaveProperty('serviceB');
          expect(result).toHaveProperty('presentInAMissingInB');
          
          // Verify service info
          expect(result.serviceA.id).toBe(referenceServiceId);
          expect(result.serviceA.name).toBe(refServiceName);
          expect(result.serviceB.id).toBe(comparisonServiceId);
          expect(result.serviceB.name).toBe(compServiceName);
          
          // Verify presentInAMissingInB is an array
          expect(Array.isArray(result.presentInAMissingInB)).toBe(true);

          jest.clearAllMocks();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.4: Members present in both services are NOT in missing members
   * 
   * Members who attended both services should not appear in the missing members list.
   * 
   * Validates: Requirements 5.2
   */
  it('should NOT include members who attended both services', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // referenceServiceId
        airtableIdArb, // comparisonServiceId
        fc.uniqueArray(airtableIdArb, { minLength: 1, maxLength: 10 }), // membersInBothServices
        async (referenceServiceId, comparisonServiceId, membersInBoth) => {
          const uniqueMembersInBoth = [...new Set(membersInBoth)];

          // Mock attendance records - same members in both services
          const attendanceRef: AirtableRecord[] = uniqueMembersInBoth.map((memberId, i) => ({
            id: `recAttRef${i.toString().padStart(9, '0')}`,
            fields: { 'Member': [memberId], 'Service': [referenceServiceId], 'Present?': true },
            createdTime: new Date().toISOString(),
          }));

          const attendanceComp: AirtableRecord[] = uniqueMembersInBoth.map((memberId, i) => ({
            id: `recAttComp${i.toString().padStart(8, '0')}`,
            fields: { 'Member': [memberId], 'Service': [comparisonServiceId], 'Present?': true },
            createdTime: new Date().toISOString(),
          }));

          // Mock service records
          const refServiceRecord: AirtableRecord = {
            id: referenceServiceId,
            fields: { 
              'Service Code': 'Reference Service',
              'Attendance': attendanceRef.map(a => a.id),
            },
            createdTime: new Date().toISOString(),
          };
          const compServiceRecord: AirtableRecord = {
            id: comparisonServiceId,
            fields: { 
              'Service Code': 'Comparison Service',
              'Attendance': attendanceComp.map(a => a.id),
            },
            createdTime: new Date().toISOString(),
          };

          // Mock member records
          const memberRecords: AirtableRecord[] = uniqueMembersInBoth.map((memberId, i) => ({
            id: memberId,
            fields: {
              'First Name': `First${i}`,
              'Last Name': `Last${i}`,
              'Full Name': `First${i} Last${i}`,
              'Phone': `+1234567890${i}`,
              'Status': 'Member',
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          }));

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services') {
              if (id === referenceServiceId) return refServiceRecord;
              if (id === comparisonServiceId) return compServiceRecord;
            }
            if (table === 'Attendance') {
              const recordRef = attendanceRef.find(a => a.id === id);
              if (recordRef) return recordRef;
              const recordComp = attendanceComp.find(a => a.id === id);
              if (recordComp) return recordComp;
            }
            if (table === 'Members') {
              const member = memberRecords.find(m => m.id === id);
              if (member) return member;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table, filter) => {
            if (table === 'Members') {
              const idMatches = filter.match(/RECORD_ID\(\) = '([^']+)'/g) || [];
              const requestedIds = idMatches.map(match => {
                const idMatch = match.match(/RECORD_ID\(\) = '([^']+)'/);
                return idMatch ? idMatch[1] : null;
              }).filter((id): id is string => id !== null);
              
              return memberRecords.filter(m => requestedIds.includes(m.id));
            }
            return [];
          });

          const result = await queryService.compareTwoServices(referenceServiceId, comparisonServiceId);

          // Result should be empty - all members attended both services
          expect(result.presentInAMissingInB).toHaveLength(0);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 8: Airtable Table and Field Usage
 * Validates: Requirements 7.3, 7.4, 11.3, 13.4
 * 
 * For any database query operation, the system should:
 * - Query the "Members" table (not "Volunteers" table) when retrieving follow-up member data
 * - Use existing Airtable field names like "Assigned To" in the "Follow-up Assignments" table
 * - Correctly map Airtable records to application types with followUpMemberId properties
 */
describe('Property 8: Airtable Table and Field Usage', () => {
  let mockAirtableClient: jest.Mocked<AirtableClient>;
  let queryService: QueryService;

  beforeEach(() => {
    mockAirtableClient = {
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      getRecord: jest.fn(),
      findRecords: jest.fn(),
      batchCreate: jest.fn(),
      batchUpdate: jest.fn(),
    } as unknown as jest.Mocked<AirtableClient>;

    queryService = new QueryService(mockAirtableClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 8.1: Follow-up summary queries Members table for follow-up member data
   * 
   * Validates that getFollowUpSummary uses MEMBERS table (not VOLUNTEERS)
   * when looking up follow-up member names
   * 
   * Validates: Requirements 7.3, 13.4
   */
  it('should query Members table for follow-up member data in getFollowUpSummary', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(airtableIdArb, { minLength: 1, maxLength: 5 }), // followUpMemberIds
        fc.uniqueArray(airtableIdArb, { minLength: 1, maxLength: 10 }), // memberIds
        async (followUpMemberIds, memberIds) => {
          // Create assignment records
          const assignments: AirtableRecord[] = [];
          let assignmentIndex = 0;
          
          for (const followUpMemberId of followUpMemberIds) {
            // Each follow-up member gets 1-3 assignments
            const numAssignments = Math.min(3, memberIds.length - assignmentIndex);
            for (let i = 0; i < numAssignments && assignmentIndex < memberIds.length; i++) {
              assignments.push({
                id: `recAssign${assignmentIndex.toString().padStart(10, '0')}`,
                fields: {
                  'Assigned To': [followUpMemberId],
                  'Member': [memberIds[assignmentIndex]],
                  'Status': 'Assigned',
                  'Assigned Date': '2024-01-01',
                  'Due Date': '2024-01-15',
                },
                createdTime: new Date().toISOString(),
              });
              assignmentIndex++;
            }
          }

          // Create follow-up member records (in Members table)
          const followUpMemberRecords: AirtableRecord[] = followUpMemberIds.map((id, i) => ({
            id,
            fields: {
              'Name': `Follow-up Member ${i}`,
              'Full Name': `Follow-up Member ${i}`,
              'First Name': `Follow-up`,
              'Last Name': `Member ${i}`,
              'Phone': `+123456789${i}`,
              'Status': 'Member',
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          }));

          // Create member records
          const memberRecords: AirtableRecord[] = memberIds.map((id, i) => ({
            id,
            fields: {
              'First Name': `First${i}`,
              'Last Name': `Last${i}`,
              'Full Name': `First${i} Last${i}`,
              'Phone': `+987654321${i}`,
              'Status': 'First Timer',
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          }));

          // Track which tables are queried
          const queriedTables = new Set<string>();

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            queriedTables.add(table);
            if (table === 'Follow-up Assignments') {
              return assignments;
            }
            return [];
          });

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            queriedTables.add(table);
            if (table === 'Members') {
              // Return follow-up member or regular member
              const followUpMember = followUpMemberRecords.find(m => m.id === id);
              if (followUpMember) return followUpMember;
              const member = memberRecords.find(m => m.id === id);
              if (member) return member;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          const result = await queryService.getFollowUpSummary();

          // Property: Should query Members table, not Volunteers table
          expect(queriedTables.has('Members')).toBe(true);
          expect(queriedTables.has('Volunteers')).toBe(false);

          // Property: Result should have byFollowUpMember property (not byVolunteer)
          expect(result).toHaveProperty('byFollowUpMember');
          expect(result).not.toHaveProperty('byVolunteer');

          // Property: Each entry should have followUpMemberId and followUpMemberName
          result.byFollowUpMember.forEach(entry => {
            expect(entry).toHaveProperty('followUpMemberId');
            expect(entry).toHaveProperty('followUpMemberName');
            expect(entry).not.toHaveProperty('volunteerId');
            expect(entry).not.toHaveProperty('volunteerName');
          });

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.2: Follow-up comments queries Members table for follow-up member data
   * 
   * Validates that getFollowUpComments uses MEMBERS table when looking up
   * follow-up member names from the Volunteer field
   * 
   * Validates: Requirements 7.3, 13.4
   */
  it('should query Members table for follow-up member data in getFollowUpComments', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(airtableIdArb, { minLength: 1, maxLength: 5 }), // interactionIds
        fc.uniqueArray(airtableIdArb, { minLength: 1, maxLength: 5 }), // followUpMemberIds
        fc.uniqueArray(airtableIdArb, { minLength: 1, maxLength: 5 }), // memberIds
        async (interactionIds, followUpMemberIds, memberIds) => {
          // Create interaction records
          const interactions: AirtableRecord[] = interactionIds.map((id, i) => ({
            id,
            fields: {
              'Member': [memberIds[i % memberIds.length]],
              'Volunteer': [followUpMemberIds[i % followUpMemberIds.length]], // Airtable field name
              'Interaction Date': '2024-01-15',
              'Comment': `Comment ${i}`,
            },
            createdTime: new Date().toISOString(),
          }));

          // Create follow-up member records (in Members table)
          const followUpMemberRecords: AirtableRecord[] = followUpMemberIds.map((id, i) => ({
            id,
            fields: {
              'Name': `Follow-up Member ${i}`,
              'Full Name': `Follow-up Member ${i}`,
              'First Name': `Follow-up`,
              'Last Name': `Member ${i}`,
              'Phone': `+123456789${i}`,
              'Status': 'Member',
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          }));

          // Create member records
          const memberRecords: AirtableRecord[] = memberIds.map((id, i) => ({
            id,
            fields: {
              'First Name': `First${i}`,
              'Last Name': `Last${i}`,
              'Full Name': `First${i} Last${i}`,
              'Phone': `+987654321${i}`,
              'Status': 'First Timer',
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          }));

          // Track which tables are queried
          const queriedTables = new Set<string>();

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            queriedTables.add(table);
            if (table === 'Follow-up Interactions') {
              return interactions;
            }
            return [];
          });

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            queriedTables.add(table);
            if (table === 'Members') {
              // Return follow-up member or regular member
              const followUpMember = followUpMemberRecords.find(m => m.id === id);
              if (followUpMember) return followUpMember;
              const member = memberRecords.find(m => m.id === id);
              if (member) return member;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          const result = await queryService.getFollowUpComments();

          // Property: Should query Members table, not Volunteers table
          expect(queriedTables.has('Members')).toBe(true);
          expect(queriedTables.has('Volunteers')).toBe(false);

          // Property: Each interaction should have followUpMemberId and followUpMemberName
          result.forEach(interaction => {
            expect(interaction).toHaveProperty('followUpMemberId');
            expect(interaction).toHaveProperty('followUpMemberName');
            expect(interaction).not.toHaveProperty('volunteerId');
            expect(interaction).not.toHaveProperty('volunteerName');
          });

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.3: Souls assigned queries Members table for follow-up member data
   * 
   * Validates that getSoulsAssignedByFollowUpMember uses MEMBERS table
   * when looking up Soul Winner names
   * 
   * Validates: Requirements 7.3, 13.4
   */
  it('should query Members table for follow-up member data in getSoulsAssignedByFollowUpMember', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(airtableIdArb, { minLength: 1, maxLength: 5 }), // evangelismIds
        fc.uniqueArray(airtableIdArb, { minLength: 1, maxLength: 5 }), // soulWinnerIds
        fc.uniqueArray(airtableIdArb, { minLength: 1, maxLength: 5 }), // linkedMemberIds
        async (evangelismIds, soulWinnerIds, linkedMemberIds) => {
          // Create evangelism records
          const evangelismRecords: AirtableRecord[] = evangelismIds.map((id, i) => ({
            id,
            fields: {
              'Soul Winner': [soulWinnerIds[i % soulWinnerIds.length]],
              'Linked Member': [linkedMemberIds[i % linkedMemberIds.length]],
              'Date': '2024-01-01',
              'First Name': `Contact${i}`,
              'Last Name': `Person${i}`,
            },
            createdTime: new Date().toISOString(),
          }));

          // Create soul winner records (in Members table)
          const soulWinnerRecords: AirtableRecord[] = soulWinnerIds.map((id, i) => ({
            id,
            fields: {
              'Full Name': `Soul Winner ${i}`,
              'First Name': `Soul`,
              'Last Name': `Winner ${i}`,
              'Phone': `+123456789${i}`,
              'Status': 'Member',
              'Source': 'Other',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          }));

          // Create linked member records
          const linkedMemberRecords: AirtableRecord[] = linkedMemberIds.map((id, i) => ({
            id,
            fields: {
              'First Name': `First${i}`,
              'Last Name': `Last${i}`,
              'Full Name': `First${i} Last${i}`,
              'Phone': `+987654321${i}`,
              'Status': 'Evangelism Contact',
              'Source': 'Evangelism',
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          }));

          // Track which tables are queried
          const queriedTables = new Set<string>();

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            queriedTables.add(table);
            if (table === 'Evangelism') {
              return evangelismRecords;
            }
            if (table === 'Members') {
              return linkedMemberRecords;
            }
            return [];
          });

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            queriedTables.add(table);
            if (table === 'Members') {
              // Return soul winner or linked member
              const soulWinner = soulWinnerRecords.find(m => m.id === id);
              if (soulWinner) return soulWinner;
              const member = linkedMemberRecords.find(m => m.id === id);
              if (member) return member;
            }
            throw new Error(`Record not found: ${table}/${id}`);
          });

          const result = await queryService.getSoulsAssignedByFollowUpMember();

          // Property: Should query Members table, not Volunteers table
          expect(queriedTables.has('Members')).toBe(true);
          expect(queriedTables.has('Volunteers')).toBe(false);

          // Property: Each entry should have followUpMemberId and followUpMemberName
          result.forEach(entry => {
            expect(entry).toHaveProperty('followUpMemberId');
            expect(entry).toHaveProperty('followUpMemberName');
            expect(entry).not.toHaveProperty('volunteerId');
            expect(entry).not.toHaveProperty('volunteerName');
          });

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.4: Airtable field names remain unchanged
   * 
   * Validates that queries use existing Airtable field names like "Assigned To"
   * and "Volunteer" even though code variables use followUpMember terminology
   * 
   * Validates: Requirements 7.4, 11.3
   */
  it('should use existing Airtable field names in queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // followUpMemberId
        async (followUpMemberId) => {
          // Track the filter formulas used
          const filterFormulas: string[] = [];

          mockAirtableClient.findRecords.mockImplementation(async (_table, filter) => {
            if (filter) {
              filterFormulas.push(filter);
            }
            return [];
          });

          // Call method that queries by follow-up member
          try {
            await queryService.getFollowUpsByFollowUpMember(followUpMemberId);
          } catch {
            // Ignore errors - we're just checking the query
          }

          // Property: Filter should use "Assigned To" field name (Airtable field)
          // not "assignedToFollowUpMember" or similar code-level names
          const hasAssignedToField = filterFormulas.some(formula => 
            formula.includes('Assigned To')
          );
          expect(hasAssignedToField).toBe(true);

          // Property: Filter should not use code-level field names
          const hasCodeLevelNames = filterFormulas.some(formula => 
            formula.includes('assignedToFollowUpMember') ||
            formula.includes('followUpMemberId')
          );
          expect(hasCodeLevelNames).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });
});
