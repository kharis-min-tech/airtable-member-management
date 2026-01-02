/**
 * Property-Based Tests for Follow-up Service
 * 
 * Property 6: Follow-up Assignment Creation
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 * 
 * Property 7: Follow-up Reassignment on Capacity
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 */

import * as fc from 'fast-check';
import { FollowUpService, FollowUpError } from '../src/services/follow-up-service';
import { AirtableClient } from '../src/services/airtable-client';
import { AirtableRecord, AssignmentStatus } from '../src/types';

/**
 * Arbitraries for generating test data
 */
const airtableIdArb = fc.stringMatching(/^rec[a-zA-Z0-9]{14}$/);

const assignmentRecordArb = fc.record({
  id: airtableIdArb,
  fields: fc.record({
    'Member': fc.array(airtableIdArb, { minLength: 1, maxLength: 1 }),
    'Assigned To': fc.array(airtableIdArb, { minLength: 1, maxLength: 1 }),
    'Assigned Date': fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString().split('T')[0]),
    'Due Date': fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString().split('T')[0]),
    'Status': fc.constantFrom('Assigned', 'In Progress', 'Completed', 'Reassigned') as fc.Arbitrary<AssignmentStatus>,
  }),
  createdTime: fc.date().map(d => d.toISOString()),
});

describe('Property 6: Follow-up Assignment Creation', () => {
  let mockAirtableClient: jest.Mocked<AirtableClient>;
  let followUpService: FollowUpService;

  beforeEach(() => {
    mockAirtableClient = {
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      getRecord: jest.fn(),
      findRecords: jest.fn(),
      deleteRecord: jest.fn(),
    } as unknown as jest.Mocked<AirtableClient>;

    followUpService = new FollowUpService(mockAirtableClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 6.1: For any valid member and volunteer IDs, createAssignment
   * should create an assignment with Due Date = Assigned Date + 3 days
   * 
   * Validates: Requirements 4.2, 4.3
   */
  it('should create assignment with due date 3 days after assigned date', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        airtableIdArb,
        assignmentRecordArb,
        async (memberId, volunteerId, mockRecord) => {
          mockAirtableClient.createRecord.mockResolvedValue(mockRecord as AirtableRecord);

          const beforeCreate = new Date();
          await followUpService.createAssignment(memberId, volunteerId);
          const afterCreate = new Date();

          // Verify createRecord was called with correct parameters
          expect(mockAirtableClient.createRecord).toHaveBeenCalledWith(
            'Follow-up Assignments',
            expect.objectContaining({
              'Member': [memberId],
              'Assigned To': [volunteerId],
              'Status': 'Assigned',
            })
          );

          // Verify the dates passed to createRecord
          const createCall = mockAirtableClient.createRecord.mock.calls[0];
          const fields = createCall?.[1] as Record<string, unknown>;
          
          const assignedDateStr = fields['Assigned Date'] as string;
          const dueDateStr = fields['Due Date'] as string;
          
          const assignedDate = new Date(assignedDateStr);
          const dueDate = new Date(dueDateStr);

          // Assigned date should be today (within the test execution window)
          expect(assignedDate.getTime()).toBeGreaterThanOrEqual(beforeCreate.setHours(0, 0, 0, 0));
          expect(assignedDate.getTime()).toBeLessThanOrEqual(afterCreate.setHours(23, 59, 59, 999));

          // Due date should be exactly 3 days after assigned date
          const expectedDueDate = new Date(assignedDate);
          expectedDueDate.setDate(expectedDueDate.getDate() + 3);
          expect(dueDate.toISOString().split('T')[0]).toBe(expectedDueDate.toISOString().split('T')[0]);

          mockAirtableClient.createRecord.mockReset();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 6.2: createAssignment should always set Status to "Assigned"
   * 
   * Validates: Requirement 4.2
   */
  it('should always set status to Assigned for new assignments', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        airtableIdArb,
        assignmentRecordArb,
        async (memberId, volunteerId, mockRecord) => {
          mockAirtableClient.createRecord.mockResolvedValue(mockRecord as AirtableRecord);

          await followUpService.createAssignment(memberId, volunteerId);

          expect(mockAirtableClient.createRecord).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
              'Status': 'Assigned',
            })
          );

          mockAirtableClient.createRecord.mockReset();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 6.3: createAssignment should reject empty member or volunteer IDs
   * 
   * Validates: Input validation for Requirements 4.1
   */
  it('should reject empty member or volunteer IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('', ' ', '  '),
        airtableIdArb,
        async (emptyMemberId, volunteerId) => {
          await expect(
            followUpService.createAssignment(emptyMemberId.trim() || '', volunteerId)
          ).rejects.toThrow(FollowUpError);
        }
      ),
      { numRuns: 10 }
    );

    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        fc.constantFrom('', ' ', '  '),
        async (memberId, emptyVolunteerId) => {
          await expect(
            followUpService.createAssignment(memberId, emptyVolunteerId.trim() || '')
          ).rejects.toThrow(FollowUpError);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 6.4: Custom due days should be respected
   * 
   * Validates: Configurable due date calculation
   */
  it('should respect custom due days parameter', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        airtableIdArb,
        fc.integer({ min: 1, max: 30 }),
        assignmentRecordArb,
        async (memberId, volunteerId, customDueDays, mockRecord) => {
          mockAirtableClient.createRecord.mockResolvedValue(mockRecord as AirtableRecord);

          await followUpService.createAssignment(memberId, volunteerId, customDueDays);

          const createCall = mockAirtableClient.createRecord.mock.calls[0];
          const fields = createCall?.[1] as Record<string, unknown>;
          
          const assignedDateStr = fields['Assigned Date'] as string;
          const dueDateStr = fields['Due Date'] as string;
          
          const assignedDate = new Date(assignedDateStr);
          const dueDate = new Date(dueDateStr);

          // Calculate expected due date
          const expectedDueDate = new Date(assignedDate);
          expectedDueDate.setDate(expectedDueDate.getDate() + customDueDays);

          expect(dueDate.toISOString().split('T')[0]).toBe(expectedDueDate.toISOString().split('T')[0]);

          mockAirtableClient.createRecord.mockReset();
        }
      ),
      { numRuns: 30 }
    );
  });
});


describe('Property 7: Follow-up Reassignment on Capacity', () => {
  let mockAirtableClient: jest.Mocked<AirtableClient>;
  let followUpService: FollowUpService;

  beforeEach(() => {
    mockAirtableClient = {
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      getRecord: jest.fn(),
      findRecords: jest.fn(),
      deleteRecord: jest.fn(),
    } as unknown as jest.Mocked<AirtableClient>;

    followUpService = new FollowUpService(mockAirtableClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 7.1: When volunteer has capacity (< 20 assignments), 
   * no reassignment should occur
   * 
   * Validates: Requirement 5.1
   */
  it('should not reassign when volunteer has capacity', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        airtableIdArb,
        fc.integer({ min: 0, max: 19 }), // Under capacity
        assignmentRecordArb,
        async (memberId, volunteerId, currentAssignments, mockAssignmentRecord) => {
          // Mock volunteer with capacity
          mockAirtableClient.getRecord.mockResolvedValue({
            id: volunteerId,
            fields: {
              'Name': 'Test Volunteer',
              'Role': 'Follow-up',
              'Active': true,
              'Capacity': 20,
            },
            createdTime: new Date().toISOString(),
          } as AirtableRecord);

          // Mock current assignments (under capacity)
          const mockAssignments = Array(currentAssignments).fill(null).map((_, i) => ({
            id: `rec${String(i).padStart(14, '0')}`,
            fields: { 'Status': 'Assigned' },
            createdTime: new Date().toISOString(),
          }));
          mockAirtableClient.findRecords.mockResolvedValue(mockAssignments as AirtableRecord[]);
          mockAirtableClient.createRecord.mockResolvedValue(mockAssignmentRecord as AirtableRecord);

          const result = await followUpService.assignWithCapacityCheck(memberId, volunteerId);

          // Should assign to preferred volunteer without reassignment
          expect(result.wasReassigned).toBe(false);
          expect(result.assignedVolunteerId).toBe(volunteerId);
          expect(result.assignment).toBeDefined();

          jest.clearAllMocks();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 7.2: When volunteer is at capacity (>= 20 assignments) and 
   * another volunteer is available, reassignment should occur
   * 
   * Validates: Requirements 5.1, 5.2, 5.3
   */
  it('should reassign when volunteer at capacity and alternative available', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        airtableIdArb,
        airtableIdArb,
        fc.integer({ min: 20, max: 30 }), // At or over capacity
        assignmentRecordArb,
        async (memberId, preferredVolunteerId, alternativeVolunteerId, currentAssignments, mockAssignmentRecord) => {
          // Ensure IDs are different
          fc.pre(preferredVolunteerId !== alternativeVolunteerId);

          // Mock preferred volunteer at capacity
          mockAirtableClient.getRecord.mockImplementation(async (_table: string, id: string) => {
            if (id === preferredVolunteerId) {
              return {
                id: preferredVolunteerId,
                fields: {
                  'Name': 'Preferred Volunteer',
                  'Role': 'Follow-up',
                  'Active': true,
                  'Capacity': 20,
                },
                createdTime: new Date().toISOString(),
              } as AirtableRecord;
            }
            return {
              id: alternativeVolunteerId,
              fields: {
                'Name': 'Alternative Volunteer',
                'Role': 'Follow-up',
                'Active': true,
                'Capacity': 20,
              },
              createdTime: new Date().toISOString(),
            } as AirtableRecord;
          });

          let findRecordsCallCount = 0;
          mockAirtableClient.findRecords.mockImplementation(async () => {
            findRecordsCallCount++;
            // First call: check preferred volunteer's assignments (at capacity)
            if (findRecordsCallCount === 1) {
              return Array(currentAssignments).fill(null).map((_, i) => ({
                id: `rec${String(i).padStart(14, '0')}`,
                fields: { 'Status': 'Assigned' },
                createdTime: new Date().toISOString(),
              })) as AirtableRecord[];
            }
            // Second call: find available volunteers
            if (findRecordsCallCount === 2) {
              return [{
                id: alternativeVolunteerId,
                fields: {
                  'Name': 'Alternative Volunteer',
                  'Role': 'Follow-up',
                  'Active': true,
                  'Capacity': 20,
                },
                createdTime: new Date().toISOString(),
              }] as AirtableRecord[];
            }
            // Third call: check alternative volunteer's capacity (has capacity)
            return [] as AirtableRecord[];
          });

          mockAirtableClient.createRecord.mockResolvedValue(mockAssignmentRecord as AirtableRecord);

          const result = await followUpService.assignWithCapacityCheck(memberId, preferredVolunteerId);

          // Should reassign to alternative volunteer
          expect(result.wasReassigned).toBe(true);
          expect(result.assignedVolunteerId).toBe(alternativeVolunteerId);
          expect(result.assignment).toBeDefined();
          expect(result.warning).toBeDefined();

          jest.clearAllMocks();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 7.3: When volunteer is at capacity and no alternative available,
   * should still assign but with warning
   * 
   * Validates: Requirement 5.4
   */
  it('should assign with warning when no alternative volunteer available', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        airtableIdArb,
        fc.integer({ min: 20, max: 30 }), // At or over capacity
        assignmentRecordArb,
        async (memberId, volunteerId, currentAssignments, mockAssignmentRecord) => {
          // Mock volunteer at capacity
          mockAirtableClient.getRecord.mockResolvedValue({
            id: volunteerId,
            fields: {
              'Name': 'Test Volunteer',
              'Role': 'Follow-up',
              'Active': true,
              'Capacity': 20,
            },
            createdTime: new Date().toISOString(),
          } as AirtableRecord);

          let findRecordsCallCount = 0;
          mockAirtableClient.findRecords.mockImplementation(async () => {
            findRecordsCallCount++;
            // First call: check volunteer's assignments (at capacity)
            if (findRecordsCallCount === 1) {
              return Array(currentAssignments).fill(null).map((_, i) => ({
                id: `rec${String(i).padStart(14, '0')}`,
                fields: { 'Status': 'Assigned' },
                createdTime: new Date().toISOString(),
              })) as AirtableRecord[];
            }
            // Second call: find available volunteers (none available)
            if (findRecordsCallCount === 2) {
              return [] as AirtableRecord[];
            }
            // Any subsequent calls
            return Array(currentAssignments).fill(null).map((_, i) => ({
              id: `rec${String(i).padStart(14, '0')}`,
              fields: { 'Status': 'Assigned' },
              createdTime: new Date().toISOString(),
            })) as AirtableRecord[];
          });

          mockAirtableClient.createRecord.mockResolvedValue(mockAssignmentRecord as AirtableRecord);

          const result = await followUpService.assignWithCapacityCheck(memberId, volunteerId);

          // Should still assign to preferred volunteer but with warning
          expect(result.wasReassigned).toBe(false);
          expect(result.assignedVolunteerId).toBe(volunteerId);
          expect(result.assignment).toBeDefined();
          expect(result.warning).toBeDefined();
          expect(result.warning).toContain('capacity');

          jest.clearAllMocks();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 7.4: processCapacityReassignment should mark old assignment as "Reassigned"
   * when creating new assignment
   * 
   * Validates: Requirement 5.3
   */
  it('should mark old assignment as Reassigned when reassigning', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        airtableIdArb,
        airtableIdArb,
        airtableIdArb,
        assignmentRecordArb,
        async (memberId, currentOwnerId, newOwnerId, existingAssignmentId, mockAssignmentRecord) => {
          // Ensure IDs are different
          fc.pre(currentOwnerId !== newOwnerId);

          // Mock current owner at capacity
          mockAirtableClient.getRecord.mockImplementation(async (_table: string, id: string) => {
            if (id === currentOwnerId) {
              return {
                id: currentOwnerId,
                fields: {
                  'Name': 'Current Owner',
                  'Role': 'Follow-up',
                  'Active': true,
                  'Capacity': 20,
                },
                createdTime: new Date().toISOString(),
              } as AirtableRecord;
            }
            return {
              id: newOwnerId,
              fields: {
                'Name': 'New Owner',
                'Role': 'Follow-up',
                'Active': true,
                'Capacity': 20,
              },
              createdTime: new Date().toISOString(),
            } as AirtableRecord;
          });

          let findRecordsCallCount = 0;
          mockAirtableClient.findRecords.mockImplementation(async () => {
            findRecordsCallCount++;
            // First call: check current owner's capacity (at capacity)
            if (findRecordsCallCount === 1) {
              return Array(20).fill(null).map((_, i) => ({
                id: `rec${String(i).padStart(14, '0')}`,
                fields: { 'Status': 'Assigned' },
                createdTime: new Date().toISOString(),
              })) as AirtableRecord[];
            }
            // Second call: find available volunteers
            if (findRecordsCallCount === 2) {
              return [{
                id: newOwnerId,
                fields: {
                  'Name': 'New Owner',
                  'Role': 'Follow-up',
                  'Active': true,
                  'Capacity': 20,
                },
                createdTime: new Date().toISOString(),
              }] as AirtableRecord[];
            }
            // Third call: check new owner's capacity (has capacity)
            if (findRecordsCallCount === 3) {
              return [] as AirtableRecord[];
            }
            // Fourth call: find existing assignment for member
            if (findRecordsCallCount === 4) {
              return [{
                id: existingAssignmentId,
                fields: {
                  'Member': [memberId],
                  'Assigned To': [currentOwnerId],
                  'Status': 'Assigned',
                },
                createdTime: new Date().toISOString(),
              }] as AirtableRecord[];
            }
            return [] as AirtableRecord[];
          });

          mockAirtableClient.updateRecord.mockResolvedValue({
            id: existingAssignmentId,
            fields: { 'Status': 'Reassigned' },
            createdTime: new Date().toISOString(),
          } as AirtableRecord);

          mockAirtableClient.createRecord.mockResolvedValue(mockAssignmentRecord as AirtableRecord);

          const result = await followUpService.processCapacityReassignment(memberId, currentOwnerId);

          // Should have reassigned
          expect(result.reassigned).toBe(true);
          expect(result.newOwnerId).toBe(newOwnerId);

          // Should have marked old assignment as Reassigned
          expect(mockAirtableClient.updateRecord).toHaveBeenCalledWith(
            'Follow-up Assignments',
            existingAssignmentId,
            { 'Status': 'Reassigned' }
          );

          jest.clearAllMocks();
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property 7.5: Input validation should reject empty IDs
   * 
   * Validates: Input validation for Requirements 5.1-5.4
   */
  it('should reject empty IDs for capacity check operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        async (validId) => {
          // Empty member ID
          await expect(
            followUpService.assignWithCapacityCheck('', validId)
          ).rejects.toThrow(FollowUpError);

          // Empty volunteer ID
          await expect(
            followUpService.assignWithCapacityCheck(validId, '')
          ).rejects.toThrow(FollowUpError);

          // Empty member ID for processCapacityReassignment
          await expect(
            followUpService.processCapacityReassignment('', validId)
          ).rejects.toThrow(FollowUpError);

          // Empty owner ID for processCapacityReassignment
          await expect(
            followUpService.processCapacityReassignment(validId, '')
          ).rejects.toThrow(FollowUpError);
        }
      ),
      { numRuns: 10 }
    );
  });
});
