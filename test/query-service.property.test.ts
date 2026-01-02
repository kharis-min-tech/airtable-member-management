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

          // Setup mocks
          mockAirtableClient.findRecords.mockImplementation(async (table, filter) => {
            if (table === 'Departments') {
              return [deptRecord];
            }
            if (table === 'Member Departments') {
              return memberDeptRecords;
            }
            if (table === 'Attendance') {
              // Check which member is being queried
              const memberMatch = filter.match(/FIND\('(recMember\d+)'/);
              if (memberMatch) {
                const memberId = memberMatch[1];
                if (presentMemberIds.includes(memberId!)) {
                  return [attendanceRecords.find(a => (a.fields['Member'] as string[])[0] === memberId)!];
                }
              }
              return [];
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

          // Setup mocks
          mockAirtableClient.findRecords.mockImplementation(async (table, filter) => {
            if (table === 'Departments') {
              return [deptRecord];
            }
            if (table === 'Member Departments') {
              // The query filters by Active = TRUE, so only return active members
              if (filter.includes('Active') && filter.includes('TRUE')) {
                return activeMemberDeptRecords;
              }
              return [];
            }
            if (table === 'Attendance') {
              return []; // No one attended for this test
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

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Departments') return [deptRecord];
            if (table === 'Member Departments') return memberDeptRecords;
            if (table === 'Attendance') return []; // No attendance
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

          mockAirtableClient.findRecords.mockImplementation(async (table, filter) => {
            if (table === 'Departments') return [deptRecord];
            if (table === 'Member Departments') return memberDeptRecords;
            if (table === 'Attendance') {
              const memberMatch = filter.match(/FIND\('(recMember\d+)'/);
              if (memberMatch) {
                const memberId = memberMatch[1];
                const record = attendanceRecords.find(a => (a.fields['Member'] as string[])[0] === memberId);
                return record ? [record] : [];
              }
              return [];
            }
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

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Departments') return [deptRecord];
            if (table === 'Member Departments') return []; // No active members
            if (table === 'Attendance') return [];
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

          mockAirtableClient.findRecords.mockImplementation(async (table, filter) => {
            if (table === 'Departments') return [deptRecord];
            if (table === 'Member Departments') return memberDeptRecords;
            if (table === 'Attendance') {
              const memberMatch = filter.match(/FIND\('(recMember\d+)'/);
              if (memberMatch) {
                const memberId = memberMatch[1];
                if (presentMemberIds.includes(memberId!)) {
                  return [{
                    id: `recAtt${memberId}`,
                    fields: { 'Member': [memberId], 'Service': [serviceId], 'Present?': true },
                    createdTime: new Date().toISOString(),
                  }];
                }
              }
              return [];
            }
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
 * Property 12: Service Comparison Bidirectional Correctness
 * Validates: Requirements 17.2, 17.3
 * 
 * For any two Services A and B:
 * - "Present in A, Missing in B" SHALL contain exactly those Members who have Attendance with Present? = true for Service A 
 *   AND (no Attendance record for Service B OR Present? = false for Service B)
 * - "Present in B, Missing in A" SHALL contain exactly those Members who have Attendance with Present? = true for Service B 
 *   AND (no Attendance record for Service A OR Present? = false for Service A)
 * - The union of both lists plus members present in both SHALL equal all members who attended either service
 */
describe('Property 12: Service Comparison Bidirectional Correctness', () => {
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
   * Validates: Requirements 17.2
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
          // Ensure non-overlapping sets by filtering
          const uniqueMembersInBoth = [...new Set(membersInBoth)];
          const uniqueMembersOnlyInA = [...new Set(membersOnlyInA)].filter(m => !uniqueMembersInBoth.includes(m));
          const uniqueMembersOnlyInB = [...new Set(membersOnlyInB)].filter(m => !uniqueMembersInBoth.includes(m) && !uniqueMembersOnlyInA.includes(m));

          const membersInA = [...uniqueMembersInBoth, ...uniqueMembersOnlyInA];
          const membersInB = [...uniqueMembersInBoth, ...uniqueMembersOnlyInB];
          const allMembers = [...new Set([...membersInA, ...membersInB])];

          // Mock service records
          const serviceARecord: AirtableRecord = {
            id: serviceAId,
            fields: { 'Service Name + Date': 'Service A' },
            createdTime: new Date().toISOString(),
          };
          const serviceBRecord: AirtableRecord = {
            id: serviceBId,
            fields: { 'Service Name + Date': 'Service B' },
            createdTime: new Date().toISOString(),
          };

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
            throw new Error(`Record not found: ${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table, filter) => {
            if (table === 'Attendance') {
              if (filter.includes(serviceAId)) return attendanceA;
              if (filter.includes(serviceBId)) return attendanceB;
            }
            if (table === 'Members') {
              // Parse RECORD_ID() = 'id' patterns from the filter formula
              // The filter looks like: OR(RECORD_ID() = 'recXXX', RECORD_ID() = 'recYYY')
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
   * Property 12.2: Members present in B but missing in A are correctly identified
   * 
   * Validates: Requirements 17.3
   */
  it('should correctly identify members present in B but missing in A', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceAId
        airtableIdArb, // serviceBId
        fc.uniqueArray(airtableIdArb, { minLength: 0, maxLength: 10 }), // membersInBothServices (unique)
        fc.uniqueArray(airtableIdArb, { minLength: 0, maxLength: 10 }), // membersOnlyInA (unique)
        fc.uniqueArray(airtableIdArb, { minLength: 0, maxLength: 10 }), // membersOnlyInB (unique)
        async (serviceAId, serviceBId, membersInBoth, membersOnlyInA, membersOnlyInB) => {
          // Ensure non-overlapping sets by filtering
          const uniqueMembersInBoth = [...new Set(membersInBoth)];
          const uniqueMembersOnlyInA = [...new Set(membersOnlyInA)].filter(m => !uniqueMembersInBoth.includes(m));
          const uniqueMembersOnlyInB = [...new Set(membersOnlyInB)].filter(m => !uniqueMembersInBoth.includes(m) && !uniqueMembersOnlyInA.includes(m));

          const membersInA = [...uniqueMembersInBoth, ...uniqueMembersOnlyInA];
          const membersInB = [...uniqueMembersInBoth, ...uniqueMembersOnlyInB];
          const allMembers = [...new Set([...membersInA, ...membersInB])];

          const serviceARecord: AirtableRecord = {
            id: serviceAId,
            fields: { 'Service Name + Date': 'Service A' },
            createdTime: new Date().toISOString(),
          };
          const serviceBRecord: AirtableRecord = {
            id: serviceBId,
            fields: { 'Service Name + Date': 'Service B' },
            createdTime: new Date().toISOString(),
          };

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
            throw new Error(`Record not found: ${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table, filter) => {
            if (table === 'Attendance') {
              if (filter.includes(serviceAId)) return attendanceA;
              if (filter.includes(serviceBId)) return attendanceB;
            }
            if (table === 'Members') {
              // Parse RECORD_ID() = 'id' patterns from the filter formula
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

          // Verify members in B but not in A
          const expectedInBNotA = uniqueMembersOnlyInB;
          const actualInBNotA = result.presentInBMissingInA.map(m => m.id);

          expect(actualInBNotA.sort()).toEqual(expectedInBNotA.sort());

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.3: The comparison is symmetric - swapping services swaps the results
   * 
   * Validates: Requirements 17.2, 17.3
   */
  it('should produce symmetric results when services are swapped', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceAId
        airtableIdArb, // serviceBId
        fc.uniqueArray(airtableIdArb, { minLength: 1, maxLength: 5 }), // membersOnlyInA (unique)
        fc.uniqueArray(airtableIdArb, { minLength: 1, maxLength: 5 }), // membersOnlyInB (unique)
        async (serviceAId, serviceBId, membersOnlyInA, membersOnlyInB) => {
          // Ensure unique and non-overlapping
          const uniqueA = [...new Set(membersOnlyInA)];
          const uniqueB = [...new Set(membersOnlyInB)].filter(m => !uniqueA.includes(m));

          if (uniqueB.length === 0) return; // Skip if no unique members in B

          const serviceARecord: AirtableRecord = {
            id: serviceAId,
            fields: { 'Service Name + Date': 'Service A' },
            createdTime: new Date().toISOString(),
          };
          const serviceBRecord: AirtableRecord = {
            id: serviceBId,
            fields: { 'Service Name + Date': 'Service B' },
            createdTime: new Date().toISOString(),
          };

          const attendanceA: AirtableRecord[] = uniqueA.map((memberId, i) => ({
            id: `recAttA${i.toString().padStart(10, '0')}`,
            fields: { 'Member': [memberId], 'Service': [serviceAId], 'Present?': true },
            createdTime: new Date().toISOString(),
          }));

          const attendanceB: AirtableRecord[] = uniqueB.map((memberId, i) => ({
            id: `recAttB${i.toString().padStart(10, '0')}`,
            fields: { 'Member': [memberId], 'Service': [serviceBId], 'Present?': true },
            createdTime: new Date().toISOString(),
          }));

          const allMembers = [...uniqueA, ...uniqueB];
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
            throw new Error(`Record not found: ${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table, filter) => {
            if (table === 'Attendance') {
              if (filter.includes(serviceAId)) return attendanceA;
              if (filter.includes(serviceBId)) return attendanceB;
            }
            if (table === 'Members') {
              // Parse RECORD_ID() = 'id' patterns from the filter formula
              const idMatches = filter.match(/RECORD_ID\(\) = '([^']+)'/g) || [];
              const requestedIds = idMatches.map(match => {
                const idMatch = match.match(/RECORD_ID\(\) = '([^']+)'/);
                return idMatch ? idMatch[1] : null;
              }).filter((id): id is string => id !== null);
              
              return memberRecords.filter(m => requestedIds.includes(m.id));
            }
            return [];
          });

          // Compare A to B
          const resultAB = await queryService.compareTwoServices(serviceAId, serviceBId);
          
          jest.clearAllMocks();

          // Reset mocks for second comparison
          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Services') {
              if (id === serviceAId) return serviceARecord;
              if (id === serviceBId) return serviceBRecord;
            }
            throw new Error(`Record not found: ${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table, filter) => {
            if (table === 'Attendance') {
              if (filter.includes(serviceAId)) return attendanceA;
              if (filter.includes(serviceBId)) return attendanceB;
            }
            if (table === 'Members') {
              // Parse RECORD_ID() = 'id' patterns from the filter formula
              const idMatches = filter.match(/RECORD_ID\(\) = '([^']+)'/g) || [];
              const requestedIds = idMatches.map(match => {
                const idMatch = match.match(/RECORD_ID\(\) = '([^']+)'/);
                return idMatch ? idMatch[1] : null;
              }).filter((id): id is string => id !== null);
              
              return memberRecords.filter(m => requestedIds.includes(m.id));
            }
            return [];
          });

          // Compare B to A
          const resultBA = await queryService.compareTwoServices(serviceBId, serviceAId);

          // Swapping services should swap the results
          const inANotB_AB = resultAB.presentInAMissingInB.map(m => m.id).sort();
          const inBNotA_AB = resultAB.presentInBMissingInA.map(m => m.id).sort();
          const inANotB_BA = resultBA.presentInAMissingInB.map(m => m.id).sort();
          const inBNotA_BA = resultBA.presentInBMissingInA.map(m => m.id).sort();

          // presentInAMissingInB when comparing A,B should equal presentInBMissingInA when comparing B,A
          expect(inANotB_AB).toEqual(inBNotA_BA);
          expect(inBNotA_AB).toEqual(inANotB_BA);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 12.4: Empty services produce correct results
   * 
   * Validates: Requirements 17.2, 17.3
   */
  it('should handle empty services correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb, // serviceAId
        airtableIdArb, // serviceBId
        fc.uniqueArray(airtableIdArb, { minLength: 0, maxLength: 10 }), // membersInA (unique)
        async (serviceAId, serviceBId, membersInA) => {
          const uniqueMembersInA = [...new Set(membersInA)];

          const serviceARecord: AirtableRecord = {
            id: serviceAId,
            fields: { 'Service Name + Date': 'Service A' },
            createdTime: new Date().toISOString(),
          };
          const serviceBRecord: AirtableRecord = {
            id: serviceBId,
            fields: { 'Service Name + Date': 'Service B' },
            createdTime: new Date().toISOString(),
          };

          const attendanceA: AirtableRecord[] = uniqueMembersInA.map((memberId, i) => ({
            id: `recAttA${i.toString().padStart(10, '0')}`,
            fields: { 'Member': [memberId], 'Service': [serviceAId], 'Present?': true },
            createdTime: new Date().toISOString(),
          }));

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
            throw new Error(`Record not found: ${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table, filter) => {
            if (table === 'Attendance') {
              if (filter.includes(serviceAId)) return attendanceA;
              if (filter.includes(serviceBId)) return []; // Service B is empty
            }
            if (table === 'Members') {
              // Parse RECORD_ID() = 'id' patterns from the filter formula
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
          // No members should be in "present in B, missing in A"
          expect(result.presentInBMissingInA).toHaveLength(0);

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

          // Create member record with milestone dates
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
            },
            createdTime: new Date().toISOString(),
          };

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
              'Date': dateStr,
            },
            createdTime: new Date().toISOString(),
          };

          // Create follow-up interaction record
          const followUpRecord: AirtableRecord = {
            id: 'recFollowUp0000001',
            fields: {
              'Member': [memberId],
              'Date': dateStr,
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

          // Create member program record with completed sessions
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

          mockAirtableClient.getRecord.mockImplementation(async (table, id) => {
            if (table === 'Members' && id === memberId) return memberRecord;
            if (table === 'Departments') return { id, fields: { 'Name': 'Test Dept' }, createdTime: new Date().toISOString() };
            if (table === 'Volunteers') return { id, fields: { 'Name': 'Test Volunteer' }, createdTime: new Date().toISOString() };
            throw new Error(`Record not found: ${id}`);
          });

          mockAirtableClient.findRecords.mockImplementation(async (table) => {
            if (table === 'Evangelism') return [evangelismRecord];
            if (table === 'First Timers Register') return [];
            if (table === 'Attendance') return [];
            if (table === 'Home Visits') return [homeVisitRecord];
            if (table === 'Follow-up Interactions') return [followUpRecord];
            if (table === 'Member Departments') return [memberDeptRecord];
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
  });

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
