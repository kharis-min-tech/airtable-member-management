/**
 * Property-based tests for MemberService
 * 
 * Tests member creation, update, and merge operations
 * 
 * **Validates: Requirements 2.2, 2.3, 2.6, 11.1, 11.2, 11.3, 11.4**
 */

import * as fc from 'fast-check';
import { MemberService } from '../src/services/member-service';
import { AirtableClient } from '../src/services/airtable-client';
import { AirtableConfig, AirtableRecord, MemberStatus, MemberSource } from '../src/types';

// Mock the Airtable module
jest.mock('airtable', () => {
  const mockBase = jest.fn();
  const mockConfigure = jest.fn();
  
  return {
    configure: mockConfigure,
    base: mockBase,
    default: {
      configure: mockConfigure,
      base: mockBase,
    },
  };
});

// Helper to create a mock AirtableClient
function createMockAirtableClient(): jest.Mocked<AirtableClient> {
  const config: AirtableConfig = {
    baseId: 'test-base',
    apiKey: 'test-key',
    rateLimitPerSecond: 5,
  };
  const client = new AirtableClient(config);
  
  // Mock all methods
  jest.spyOn(client, 'findByUniqueKey').mockResolvedValue(null);
  jest.spyOn(client, 'createRecord').mockImplementation(async (_table, fields) => ({
    id: `rec${Math.random().toString(36).substr(2, 9)}`,
    fields: fields as Record<string, unknown>,
    createdTime: new Date().toISOString(),
  }));
  jest.spyOn(client, 'updateRecord').mockImplementation(async (_table, id, fields) => ({
    id,
    fields: fields as Record<string, unknown>,
    createdTime: new Date().toISOString(),
  }));
  jest.spyOn(client, 'getRecord').mockImplementation(async (_table, id) => ({
    id,
    fields: {},
    createdTime: new Date().toISOString(),
  }));
  jest.spyOn(client, 'findRecords').mockResolvedValue([]);
  jest.spyOn(client, 'batchUpdate').mockResolvedValue([]);
  
  return client as jest.Mocked<AirtableClient>;
}

// Generators for test data
const nameGenerator = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

const phoneGenerator = fc.stringOf(
  fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
  { minLength: 10, maxLength: 15 }
);

const emailGenerator = fc.emailAddress();

const addressGenerator = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0);

const ghanaPostCodeGenerator = fc.stringOf(
  fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'),
  { minLength: 5, maxLength: 15 }
);

const dateGenerator = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2025-12-31'),
});

// Generator for existing member with Evangelism Contact status
const existingEvangelismMemberGenerator = fc.record({
  id: fc.string({ minLength: 10, maxLength: 20 }).map(s => `rec${s}`),
  firstName: nameGenerator,
  lastName: nameGenerator,
  phone: phoneGenerator,
  email: fc.option(emailGenerator, { nil: undefined }),
  address: fc.option(addressGenerator, { nil: undefined }),
  ghanaPostCode: fc.option(ghanaPostCodeGenerator, { nil: undefined }),
  dateFirstCaptured: dateGenerator,
  firstServiceAttended: fc.option(
    fc.string({ minLength: 10, maxLength: 20 }).map(s => `rec${s}`),
    { nil: undefined }
  ),
});

// Generator for First Timer registration data
const firstTimerDataGenerator = fc.record({
  firstName: nameGenerator,
  lastName: nameGenerator,
  phone: phoneGenerator,
  email: fc.option(emailGenerator, { nil: undefined }),
  address: fc.option(addressGenerator, { nil: undefined }),
  ghanaPostCode: fc.option(ghanaPostCodeGenerator, { nil: undefined }),
  serviceId: fc.string({ minLength: 10, maxLength: 20 }).map(s => `rec${s}`),
});


/**
 * Feature: airtable-church-automations, Property 3: First Timer Merge Preserves Existing Data
 * 
 * *For any* existing Member with Status "Evangelism Contact" and non-empty fields, 
 * when a First Timer registration matches by phone or email, the merge operation SHALL:
 * - Update Status to "First Timer"
 * - NOT change the Source field
 * - Fill any empty fields from the First Timer data
 * - NOT overwrite any non-empty fields
 * - Set First Service Attended if it was previously empty
 * 
 * **Validates: Requirements 2.2, 2.3, 2.6**
 */
describe('Property 3: First Timer Merge Preserves Existing Data', () => {
  let mockClient: jest.Mocked<AirtableClient>;
  let memberService: MemberService;

  beforeEach(() => {
    mockClient = createMockAirtableClient();
    memberService = new MemberService(mockClient);
  });

  /**
   * Property: Merge does not overwrite non-empty fields
   * For any existing member with non-empty fields, merging should preserve those values
   */
  it('should not overwrite non-empty fields during merge', async () => {
    await fc.assert(
      fc.asyncProperty(
        existingEvangelismMemberGenerator,
        firstTimerDataGenerator,
        async (existingMember, firstTimerData) => {
          // Setup: Create existing member record with non-empty fields
          const existingRecord: AirtableRecord = {
            id: existingMember.id,
            fields: {
              'First Name': existingMember.firstName,
              'Last Name': existingMember.lastName,
              'Phone': existingMember.phone,
              'Email': existingMember.email,
              'Address': existingMember.address,
              'GhanaPost Code': existingMember.ghanaPostCode,
              'Status': 'Evangelism Contact' as MemberStatus,
              'Source': 'Evangelism' as MemberSource,
              'Date First Captured': existingMember.dateFirstCaptured.toISOString().split('T')[0],
              'First Service Attended': existingMember.firstServiceAttended 
                ? [existingMember.firstServiceAttended] 
                : undefined,
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          };

          // Mock getRecord to return existing member
          jest.spyOn(mockClient, 'getRecord').mockResolvedValue(existingRecord);

          // Track what fields were updated
          let updatedFields: Record<string, unknown> = {};
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (_table, id, fields) => {
            updatedFields = fields;
            return {
              id,
              fields: { ...existingRecord.fields, ...fields },
              createdTime: existingRecord.createdTime,
            };
          });

          // Execute merge
          await memberService.mergeFieldsIntoMember(existingMember.id, {
            address: firstTimerData.address,
            ghanaPostCode: firstTimerData.ghanaPostCode,
            email: firstTimerData.email,
            phone: firstTimerData.phone,
            firstServiceAttended: firstTimerData.serviceId,
            status: 'First Timer',
          });

          // Verify: Non-empty fields should NOT be in the update
          if (existingMember.address) {
            expect(updatedFields['Address']).toBeUndefined();
          }
          if (existingMember.ghanaPostCode) {
            expect(updatedFields['GhanaPost Code']).toBeUndefined();
          }
          if (existingMember.email) {
            expect(updatedFields['Email']).toBeUndefined();
          }
          if (existingMember.phone) {
            expect(updatedFields['Phone']).toBeUndefined();
          }
          if (existingMember.firstServiceAttended) {
            expect(updatedFields['First Service Attended']).toBeUndefined();
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Merge fills empty fields from source
   * For any existing member with empty fields, merging should fill those from source
   */
  it('should fill empty fields from First Timer data', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate member with some empty fields
        fc.record({
          id: fc.string({ minLength: 10, maxLength: 20 }).map(s => `rec${s}`),
          firstName: nameGenerator,
          lastName: nameGenerator,
          phone: phoneGenerator,
          dateFirstCaptured: dateGenerator,
        }),
        firstTimerDataGenerator,
        async (existingMember, firstTimerData) => {
          // Setup: Create existing member record with empty optional fields
          const existingRecord: AirtableRecord = {
            id: existingMember.id,
            fields: {
              'First Name': existingMember.firstName,
              'Last Name': existingMember.lastName,
              'Phone': existingMember.phone,
              'Status': 'Evangelism Contact' as MemberStatus,
              'Source': 'Evangelism' as MemberSource,
              'Date First Captured': existingMember.dateFirstCaptured.toISOString().split('T')[0],
              'Follow-up Status': 'Not Started',
              // Intentionally empty: Address, GhanaPost Code, Email, First Service Attended
            },
            createdTime: new Date().toISOString(),
          };

          jest.spyOn(mockClient, 'getRecord').mockResolvedValue(existingRecord);

          let updatedFields: Record<string, unknown> = {};
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (_table, id, fields) => {
            updatedFields = fields;
            return {
              id,
              fields: { ...existingRecord.fields, ...fields },
              createdTime: existingRecord.createdTime,
            };
          });

          // Execute merge with First Timer data
          await memberService.mergeFieldsIntoMember(existingMember.id, {
            address: firstTimerData.address,
            ghanaPostCode: firstTimerData.ghanaPostCode,
            email: firstTimerData.email,
            firstServiceAttended: firstTimerData.serviceId,
            status: 'First Timer',
          });

          // Verify: Empty fields should be filled from source
          if (firstTimerData.address) {
            expect(updatedFields['Address']).toBe(firstTimerData.address);
          }
          if (firstTimerData.ghanaPostCode) {
            expect(updatedFields['GhanaPost Code']).toBe(firstTimerData.ghanaPostCode);
          }
          if (firstTimerData.email) {
            expect(updatedFields['Email']).toBe(firstTimerData.email.toLowerCase().trim());
          }
          // First Service Attended should be set
          expect(updatedFields['First Service Attended']).toEqual([firstTimerData.serviceId]);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Status is updated to First Timer
   * For any merge operation, the status should be updated to "First Timer"
   */
  it('should update status to First Timer during merge', async () => {
    await fc.assert(
      fc.asyncProperty(
        existingEvangelismMemberGenerator,
        async (existingMember) => {
          const existingRecord: AirtableRecord = {
            id: existingMember.id,
            fields: {
              'First Name': existingMember.firstName,
              'Last Name': existingMember.lastName,
              'Phone': existingMember.phone,
              'Status': 'Evangelism Contact' as MemberStatus,
              'Source': 'Evangelism' as MemberSource,
              'Date First Captured': existingMember.dateFirstCaptured.toISOString().split('T')[0],
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          };

          jest.spyOn(mockClient, 'getRecord').mockResolvedValue(existingRecord);

          let updatedFields: Record<string, unknown> = {};
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (_table, id, fields) => {
            updatedFields = fields;
            return {
              id,
              fields: { ...existingRecord.fields, ...fields },
              createdTime: existingRecord.createdTime,
            };
          });

          await memberService.mergeFieldsIntoMember(existingMember.id, {
            status: 'First Timer',
          });

          // Verify: Status should be updated to First Timer
          expect(updatedFields['Status']).toBe('First Timer');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Source field is NOT changed during merge
   * The Source field should remain "Evangelism" and not be changed to "First Timer Form"
   */
  it('should NOT change Source field during merge', async () => {
    await fc.assert(
      fc.asyncProperty(
        existingEvangelismMemberGenerator,
        firstTimerDataGenerator,
        async (existingMember, firstTimerData) => {
          const existingRecord: AirtableRecord = {
            id: existingMember.id,
            fields: {
              'First Name': existingMember.firstName,
              'Last Name': existingMember.lastName,
              'Phone': existingMember.phone,
              'Status': 'Evangelism Contact' as MemberStatus,
              'Source': 'Evangelism' as MemberSource,
              'Date First Captured': existingMember.dateFirstCaptured.toISOString().split('T')[0],
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          };

          jest.spyOn(mockClient, 'getRecord').mockResolvedValue(existingRecord);

          let updatedFields: Record<string, unknown> = {};
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (_table, id, fields) => {
            updatedFields = fields;
            return {
              id,
              fields: { ...existingRecord.fields, ...fields },
              createdTime: existingRecord.createdTime,
            };
          });

          await memberService.mergeFieldsIntoMember(existingMember.id, {
            address: firstTimerData.address,
            status: 'First Timer',
          });

          // Verify: Source field should NOT be in the update (preserving original)
          expect(updatedFields['Source']).toBeUndefined();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: First Service Attended is set only if previously empty
   * Requirement 2.6
   */
  it('should set First Service Attended only if previously empty', async () => {
    await fc.assert(
      fc.asyncProperty(
        existingEvangelismMemberGenerator,
        fc.string({ minLength: 10, maxLength: 20 }).map(s => `rec${s}`),
        async (existingMember, newServiceId) => {
          const existingRecord: AirtableRecord = {
            id: existingMember.id,
            fields: {
              'First Name': existingMember.firstName,
              'Last Name': existingMember.lastName,
              'Phone': existingMember.phone,
              'Status': 'Evangelism Contact' as MemberStatus,
              'Source': 'Evangelism' as MemberSource,
              'Date First Captured': existingMember.dateFirstCaptured.toISOString().split('T')[0],
              'Follow-up Status': 'Not Started',
              'First Service Attended': existingMember.firstServiceAttended 
                ? [existingMember.firstServiceAttended] 
                : undefined,
            },
            createdTime: new Date().toISOString(),
          };

          jest.spyOn(mockClient, 'getRecord').mockResolvedValue(existingRecord);

          let updatedFields: Record<string, unknown> = {};
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (_table, id, fields) => {
            updatedFields = fields;
            return {
              id,
              fields: { ...existingRecord.fields, ...fields },
              createdTime: existingRecord.createdTime,
            };
          });

          await memberService.mergeFieldsIntoMember(existingMember.id, {
            firstServiceAttended: newServiceId,
            status: 'First Timer',
          });

          // Verify: First Service Attended behavior
          if (existingMember.firstServiceAttended) {
            // Should NOT be updated if already set
            expect(updatedFields['First Service Attended']).toBeUndefined();
          } else {
            // Should be set if previously empty
            expect(updatedFields['First Service Attended']).toEqual([newServiceId]);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: airtable-church-automations, Property 10: Duplicate Detection and Merge Correctness
 * 
 * *For any* operation that would create a Member record:
 * - If a Member with matching Unique Key (phone or email) exists, records SHALL be merged rather than duplicated
 * - When merging, the oldest Date First Captured SHALL be preserved
 * - When merging, all linked records (Attendance, Home Visits, Follow-up Interactions) SHALL be consolidated under the surviving Member
 * - The total count of Members with the same phone/email SHALL never exceed 1
 * 
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4**
 */
describe('Property 10: Duplicate Detection and Merge Correctness', () => {
  let mockClient: jest.Mocked<AirtableClient>;
  let memberService: MemberService;

  beforeEach(() => {
    mockClient = createMockAirtableClient();
    memberService = new MemberService(mockClient);
  });

  /**
   * Property: Oldest Date First Captured is preserved during merge
   * For any two member records being merged, the oldest date should be kept
   */
  it('should preserve oldest Date First Captured during merge', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two dates where we know which is older
        fc.date({ min: new Date('2020-01-01'), max: new Date('2023-06-30') }),
        fc.date({ min: new Date('2023-07-01'), max: new Date('2025-12-31') }),
        nameGenerator,
        nameGenerator,
        phoneGenerator,
        async (olderDate, newerDate, firstName, lastName, phone) => {
          const targetId = `recTarget${Math.random().toString(36).substr(2, 9)}`;
          const sourceId = `recSource${Math.random().toString(36).substr(2, 9)}`;

          // Target has newer date, source has older date
          const targetRecord: AirtableRecord = {
            id: targetId,
            fields: {
              'First Name': firstName,
              'Last Name': lastName,
              'Phone': phone,
              'Status': 'First Timer' as MemberStatus,
              'Source': 'First Timer Form' as MemberSource,
              'Date First Captured': newerDate.toISOString().split('T')[0],
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          };

          const sourceRecord: AirtableRecord = {
            id: sourceId,
            fields: {
              'First Name': firstName,
              'Last Name': lastName,
              'Phone': phone,
              'Status': 'Evangelism Contact' as MemberStatus,
              'Source': 'Evangelism' as MemberSource,
              'Date First Captured': olderDate.toISOString().split('T')[0],
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          };

          jest.spyOn(mockClient, 'getRecord').mockImplementation(async (_table, id) => {
            if (id === targetId) return targetRecord;
            if (id === sourceId) return sourceRecord;
            throw new Error('Record not found');
          });

          let updatedFields: Record<string, unknown> = {};
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (_table, id, fields) => {
            updatedFields = fields;
            return {
              id,
              fields: { ...targetRecord.fields, ...fields },
              createdTime: targetRecord.createdTime,
            };
          });

          await memberService.mergeMembers(targetId, sourceId);

          // Verify: The older date should be preserved
          const expectedDate = olderDate.toISOString().split('T')[0];
          expect(updatedFields['Date First Captured']).toBe(expectedDate);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Linked records are consolidated during merge
   * For any merge operation, attendance and visit records should be combined
   */
  it('should consolidate linked records during merge', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arrays of linked record IDs
        fc.array(fc.string({ minLength: 10, maxLength: 20 }).map(s => `rec${s}`), { minLength: 0, maxLength: 5 }),
        fc.array(fc.string({ minLength: 10, maxLength: 20 }).map(s => `rec${s}`), { minLength: 0, maxLength: 5 }),
        fc.array(fc.string({ minLength: 10, maxLength: 20 }).map(s => `rec${s}`), { minLength: 0, maxLength: 5 }),
        fc.array(fc.string({ minLength: 10, maxLength: 20 }).map(s => `rec${s}`), { minLength: 0, maxLength: 5 }),
        async (targetAttendance, sourceAttendance, targetVisits, sourceVisits) => {
          const targetId = `recTarget${Math.random().toString(36).substr(2, 9)}`;
          const sourceId = `recSource${Math.random().toString(36).substr(2, 9)}`;

          const targetRecord: AirtableRecord = {
            id: targetId,
            fields: {
              'First Name': 'John',
              'Last Name': 'Doe',
              'Phone': '1234567890',
              'Status': 'First Timer' as MemberStatus,
              'Source': 'First Timer Form' as MemberSource,
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
              'Attendance': targetAttendance,
              'Home Visits': targetVisits,
            },
            createdTime: new Date().toISOString(),
          };

          const sourceRecord: AirtableRecord = {
            id: sourceId,
            fields: {
              'First Name': 'John',
              'Last Name': 'Doe',
              'Phone': '1234567890',
              'Status': 'Evangelism Contact' as MemberStatus,
              'Source': 'Evangelism' as MemberSource,
              'Date First Captured': '2023-06-01',
              'Follow-up Status': 'Not Started',
              'Attendance': sourceAttendance,
              'Home Visits': sourceVisits,
            },
            createdTime: new Date().toISOString(),
          };

          jest.spyOn(mockClient, 'getRecord').mockImplementation(async (_table, id) => {
            if (id === targetId) return targetRecord;
            if (id === sourceId) return sourceRecord;
            throw new Error('Record not found');
          });

          let updatedFields: Record<string, unknown> = {};
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (_table, id, fields) => {
            updatedFields = fields;
            return {
              id,
              fields: { ...targetRecord.fields, ...fields },
              createdTime: targetRecord.createdTime,
            };
          });

          await memberService.mergeMembers(targetId, sourceId);

          // Verify: All unique attendance records should be consolidated
          const expectedAttendance = [...new Set([...targetAttendance, ...sourceAttendance])];
          if (expectedAttendance.length > targetAttendance.length) {
            expect(updatedFields['Attendance']).toEqual(expect.arrayContaining(expectedAttendance));
            expect((updatedFields['Attendance'] as string[]).length).toBe(expectedAttendance.length);
          }

          // Verify: All unique visit records should be consolidated
          const expectedVisits = [...new Set([...targetVisits, ...sourceVisits])];
          if (expectedVisits.length > targetVisits.length) {
            expect(updatedFields['Home Visits']).toEqual(expect.arrayContaining(expectedVisits));
            expect((updatedFields['Home Visits'] as string[]).length).toBe(expectedVisits.length);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty fields are filled from source without overwriting
   * For any merge, empty fields in target should be filled from source
   */
  it('should fill empty fields from source without overwriting existing values', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Target has some fields, source has different fields
        fc.record({
          targetAddress: fc.option(addressGenerator, { nil: undefined }),
          sourceAddress: fc.option(addressGenerator, { nil: undefined }),
          targetGhanaPost: fc.option(ghanaPostCodeGenerator, { nil: undefined }),
          sourceGhanaPost: fc.option(ghanaPostCodeGenerator, { nil: undefined }),
        }),
        async ({ targetAddress, sourceAddress, targetGhanaPost, sourceGhanaPost }) => {
          const targetId = `recTarget${Math.random().toString(36).substr(2, 9)}`;
          const sourceId = `recSource${Math.random().toString(36).substr(2, 9)}`;

          const targetRecord: AirtableRecord = {
            id: targetId,
            fields: {
              'First Name': 'John',
              'Last Name': 'Doe',
              'Phone': '1234567890',
              'Status': 'First Timer' as MemberStatus,
              'Source': 'First Timer Form' as MemberSource,
              'Date First Captured': '2024-01-01',
              'Follow-up Status': 'Not Started',
              'Address': targetAddress,
              'GhanaPost Code': targetGhanaPost,
            },
            createdTime: new Date().toISOString(),
          };

          const sourceRecord: AirtableRecord = {
            id: sourceId,
            fields: {
              'First Name': 'John',
              'Last Name': 'Doe',
              'Phone': '1234567890',
              'Status': 'Evangelism Contact' as MemberStatus,
              'Source': 'Evangelism' as MemberSource,
              'Date First Captured': '2023-06-01',
              'Follow-up Status': 'Not Started',
              'Address': sourceAddress,
              'GhanaPost Code': sourceGhanaPost,
            },
            createdTime: new Date().toISOString(),
          };

          jest.spyOn(mockClient, 'getRecord').mockImplementation(async (_table, id) => {
            if (id === targetId) return targetRecord;
            if (id === sourceId) return sourceRecord;
            throw new Error('Record not found');
          });

          let updatedFields: Record<string, unknown> = {};
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (_table, id, fields) => {
            updatedFields = fields;
            return {
              id,
              fields: { ...targetRecord.fields, ...fields },
              createdTime: targetRecord.createdTime,
            };
          });

          await memberService.mergeMembers(targetId, sourceId);

          // Verify: If target had address, it should NOT be overwritten
          if (targetAddress) {
            expect(updatedFields['Address']).toBeUndefined();
          } else if (sourceAddress) {
            // If target was empty and source has value, it should be filled
            expect(updatedFields['Address']).toBe(sourceAddress);
          }

          // Verify: If target had GhanaPost, it should NOT be overwritten
          if (targetGhanaPost) {
            expect(updatedFields['GhanaPost Code']).toBeUndefined();
          } else if (sourceGhanaPost) {
            // If target was empty and source has value, it should be filled
            expect(updatedFields['GhanaPost Code']).toBe(sourceGhanaPost);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Duplicate creation is prevented
   * For any attempt to create a member with existing phone/email, an error should be thrown
   */
  it('should prevent duplicate member creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        phoneGenerator,
        async (firstName, lastName, phone) => {
          // Setup: Mock that a member already exists with this phone
          const existingRecord: AirtableRecord = {
            id: `recExisting${Math.random().toString(36).substr(2, 9)}`,
            fields: {
              'First Name': 'Existing',
              'Last Name': 'Member',
              'Phone': phone,
              'Status': 'Member' as MemberStatus,
              'Source': 'Other' as MemberSource,
              'Date First Captured': '2023-01-01',
              'Follow-up Status': 'Integrated',
            },
            createdTime: new Date().toISOString(),
          };

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(existingRecord);

          // Attempt to create a new member with the same phone
          try {
            await memberService.createMember({
              firstName,
              lastName,
              phone,
              status: 'First Timer',
              source: 'First Timer Form',
              dateFirstCaptured: new Date(),
            });
            // Should not reach here
            return false;
          } catch (error) {
            // Verify: Error should indicate duplicate
            expect(error).toBeDefined();
            return true;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
