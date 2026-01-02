/**
 * Property-based tests for Programs Handler
 * 
 * **Feature: airtable-church-automations, Property 9: Program Completion Triggers Member Update**
 * 
 * *For any* Member Programs record where all four Session Completed checkboxes become true:
 * - The linked Member's Membership Completed date SHALL be set to the latest session date (if not already set)
 * - If Membership Completed was already set, it SHALL NOT be overwritten
 * 
 * **Validates: Requirements 10.3, 10.4**
 */

import * as fc from 'fast-check';
import {
  parseProgramWebhook,
  processProgramEvent,
  areAllSessionsCompleted,
  calculateCompletionDate,
  ProgramEvent,
  ProgramWebhookPayload,
} from '../src/handlers/programs';
import { AirtableClient } from '../src/services/airtable-client';
import { AirtableConfig, AirtableRecord } from '../src/types';

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
  jest.spyOn(client, 'getRecord').mockImplementation(async (_table, id) => ({
    id,
    fields: {},
    createdTime: new Date().toISOString(),
  }));
  jest.spyOn(client, 'updateRecord').mockImplementation(async (_table, id, fields) => ({
    id,
    fields: fields as Record<string, unknown>,
    createdTime: new Date().toISOString(),
  }));
  jest.spyOn(client, 'createRecord').mockImplementation(async (_table, fields) => ({
    id: `rec${Math.random().toString(36).substr(2, 9)}`,
    fields: fields as Record<string, unknown>,
    createdTime: new Date().toISOString(),
  }));
  jest.spyOn(client, 'findRecords').mockResolvedValue([]);

  return client as jest.Mocked<AirtableClient>;
}

// Generators for test data
const recordIdGenerator = fc
  .string({ minLength: 10, maxLength: 20 })
  .map((s) => `rec${s.replace(/[^a-zA-Z0-9]/g, '')}`);

// Generate a valid date string in ISO format (YYYY-MM-DD)
const dateGenerator = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map((d) => d.toISOString().split('T')[0]);

// Generator for program event with all sessions completed
const completedProgramEventGenerator = fc.record({
  recordId: recordIdGenerator,
  memberId: recordIdGenerator,
  session1Completed: fc.constant(true),
  session2Completed: fc.constant(true),
  session3Completed: fc.constant(true),
  session4Completed: fc.constant(true),
  session1Date: dateGenerator,
  session2Date: dateGenerator,
  session3Date: dateGenerator,
  session4Date: dateGenerator,
}) as fc.Arbitrary<ProgramEvent>;

// Generator for program event with some sessions incomplete
const incompleteProgramEventGenerator = fc
  .record({
    recordId: recordIdGenerator,
    memberId: recordIdGenerator,
    session1Completed: fc.boolean(),
    session2Completed: fc.boolean(),
    session3Completed: fc.boolean(),
    session4Completed: fc.boolean(),
    session1Date: fc.option(dateGenerator, { nil: undefined }),
    session2Date: fc.option(dateGenerator, { nil: undefined }),
    session3Date: fc.option(dateGenerator, { nil: undefined }),
    session4Date: fc.option(dateGenerator, { nil: undefined }),
  })
  .filter(
    (event) =>
      !event.session1Completed ||
      !event.session2Completed ||
      !event.session3Completed ||
      !event.session4Completed
  ) as fc.Arbitrary<ProgramEvent>;


describe('Programs Handler - Helper Functions', () => {
  /**
   * Property: areAllSessionsCompleted returns true only when all four sessions are completed
   */
  it('should return true only when all four sessions are completed', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (s1, s2, s3, s4) => {
          const event: ProgramEvent = {
            recordId: 'rec123',
            memberId: 'recMember123',
            session1Completed: s1,
            session2Completed: s2,
            session3Completed: s3,
            session4Completed: s4,
          };

          const result = areAllSessionsCompleted(event);
          const expected = s1 && s2 && s3 && s4;

          expect(result).toBe(expected);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: calculateCompletionDate returns the latest date among all session dates
   */
  it('should return the latest date among all session dates', () => {
    fc.assert(
      fc.property(completedProgramEventGenerator, (event) => {
        const result = calculateCompletionDate(event);

        // Get all dates as Date objects
        const dates = [
          event.session1Date,
          event.session2Date,
          event.session3Date,
          event.session4Date,
        ]
          .filter((d): d is string => d !== undefined)
          .map((d) => new Date(d));

        if (dates.length === 0) {
          expect(result).toBeNull();
          return true;
        }

        // Find the expected latest date
        const expectedLatest = dates.reduce((latest, current) =>
          current > latest ? current : latest
        );
        const expectedDateStr = expectedLatest.toISOString().split('T')[0];

        expect(result).toBe(expectedDateStr);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: calculateCompletionDate returns null when no dates are provided
   */
  it('should return null when no session dates are provided', () => {
    const event: ProgramEvent = {
      recordId: 'rec123',
      memberId: 'recMember123',
      session1Completed: true,
      session2Completed: true,
      session3Completed: true,
      session4Completed: true,
      // No dates provided
    };

    const result = calculateCompletionDate(event);
    expect(result).toBeNull();
  });
});

describe('Programs Handler - Webhook Parsing', () => {
  /**
   * Property: Webhook parsing extracts all fields correctly
   */
  it('should parse webhook payload and extract all fields', () => {
    fc.assert(
      fc.property(completedProgramEventGenerator, (data) => {
        const payload: ProgramWebhookPayload = {
          base: { id: 'app123' },
          webhook: { id: 'wh123' },
          timestamp: new Date().toISOString(),
          record: {
            id: data.recordId,
            fields: {
              'Member': data.memberId ? [data.memberId] : undefined,
              'Session 1 Completed': data.session1Completed,
              'Session 2 Completed': data.session2Completed,
              'Session 3 Completed': data.session3Completed,
              'Session 4 Completed': data.session4Completed,
              'Session 1 Date': data.session1Date,
              'Session 2 Date': data.session2Date,
              'Session 3 Date': data.session3Date,
              'Session 4 Date': data.session4Date,
            },
          },
        };

        const event = parseProgramWebhook(payload);

        // Verify all fields are extracted correctly
        expect(event.recordId).toBe(data.recordId);
        expect(event.memberId).toBe(data.memberId);
        expect(event.session1Completed).toBe(data.session1Completed);
        expect(event.session2Completed).toBe(data.session2Completed);
        expect(event.session3Completed).toBe(data.session3Completed);
        expect(event.session4Completed).toBe(data.session4Completed);
        expect(event.session1Date).toBe(data.session1Date);
        expect(event.session2Date).toBe(data.session2Date);
        expect(event.session3Date).toBe(data.session3Date);
        expect(event.session4Date).toBe(data.session4Date);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Missing optional fields default correctly
   */
  it('should handle missing optional fields with defaults', () => {
    fc.assert(
      fc.property(recordIdGenerator, (recordId) => {
        const payload: ProgramWebhookPayload = {
          base: { id: 'app123' },
          webhook: { id: 'wh123' },
          timestamp: new Date().toISOString(),
          record: {
            id: recordId,
            fields: {
              // All optional fields missing
            },
          },
        };

        const event = parseProgramWebhook(payload);

        // Verify defaults
        expect(event.recordId).toBe(recordId);
        expect(event.memberId).toBeUndefined();
        expect(event.session1Completed).toBe(false);
        expect(event.session2Completed).toBe(false);
        expect(event.session3Completed).toBe(false);
        expect(event.session4Completed).toBe(false);
        expect(event.session1Date).toBeUndefined();
        expect(event.session2Date).toBeUndefined();
        expect(event.session3Date).toBeUndefined();
        expect(event.session4Date).toBeUndefined();

        return true;
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: airtable-church-automations, Property 9: Program Completion Triggers Member Update
 *
 * *For any* Member Programs record where all four Session Completed checkboxes become true:
 * - The linked Member's Membership Completed date SHALL be set to the latest session date (if not already set)
 * - If Membership Completed was already set, it SHALL NOT be overwritten
 *
 * **Validates: Requirements 10.3, 10.4**
 */
describe('Property 9: Program Completion Triggers Member Update', () => {
  let mockClient: jest.Mocked<AirtableClient>;

  beforeEach(() => {
    mockClient = createMockAirtableClient();
  });

  /**
   * Property: When all sessions are completed and member has no Membership Completed date,
   * the member's Membership Completed date SHALL be set to the latest session date
   * Requirement 10.4
   */
  it('should set Membership Completed date when all sessions completed and not already set', async () => {
    await fc.assert(
      fc.asyncProperty(completedProgramEventGenerator, async (event) => {
        let updatedMemberFields: Record<string, unknown> = {};
        let memberUpdateCalled = false;

        // Mock: member has no Membership Completed date
        const memberRecord: AirtableRecord = {
          id: event.memberId!,
          fields: {
            'First Name': 'John',
            'Last Name': 'Doe',
            // No 'Membership Completed' field
          },
          createdTime: new Date().toISOString(),
        };

        jest.spyOn(mockClient, 'getRecord').mockResolvedValue(memberRecord);
        jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (table, id, fields) => {
          if (table === 'Members' && id === event.memberId) {
            memberUpdateCalled = true;
            updatedMemberFields = fields;
          }
          return {
            id,
            fields: fields as Record<string, unknown>,
            createdTime: new Date().toISOString(),
          };
        });

        const result = await processProgramEvent(event, mockClient);

        // Verify success
        expect(result.success).toBe(true);
        expect(result.allSessionsCompleted).toBe(true);
        expect(result.membershipCompletedUpdated).toBe(true);

        // Verify member was updated
        expect(memberUpdateCalled).toBe(true);

        // Verify Membership Completed date is set to the latest session date
        const expectedDate = calculateCompletionDate(event);
        expect(updatedMemberFields['Membership Completed']).toBe(expectedDate);
        expect(result.membershipCompletedDate).toBe(expectedDate);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: When all sessions are completed but member already has Membership Completed date,
   * the existing date SHALL NOT be overwritten
   * Requirement 10.4
   */
  it('should NOT overwrite existing Membership Completed date', async () => {
    await fc.assert(
      fc.asyncProperty(
        completedProgramEventGenerator,
        dateGenerator,
        async (event, existingDate) => {
          let memberUpdateCalled = false;

          // Mock: member already has Membership Completed date
          const memberRecord: AirtableRecord = {
            id: event.memberId!,
            fields: {
              'First Name': 'John',
              'Last Name': 'Doe',
              'Membership Completed': existingDate,
            },
            createdTime: new Date().toISOString(),
          };

          jest.spyOn(mockClient, 'getRecord').mockResolvedValue(memberRecord);
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (_table, id, fields) => {
            memberUpdateCalled = true;
            return {
              id,
              fields: fields as Record<string, unknown>,
              createdTime: new Date().toISOString(),
            };
          });

          const result = await processProgramEvent(event, mockClient);

          // Verify success
          expect(result.success).toBe(true);
          expect(result.allSessionsCompleted).toBe(true);

          // Verify member was NOT updated (existing date preserved)
          expect(result.membershipCompletedUpdated).toBe(false);
          expect(memberUpdateCalled).toBe(false);

          // Verify the existing date is returned
          expect(result.membershipCompletedDate).toBe(existingDate);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: When not all sessions are completed, member's Membership Completed date
   * SHALL NOT be updated
   * Requirement 10.3
   */
  it('should NOT update member when not all sessions are completed', async () => {
    await fc.assert(
      fc.asyncProperty(incompleteProgramEventGenerator, async (event) => {
        // Ensure memberId is set for this test
        const eventWithMember = { ...event, memberId: `recMember${Math.random().toString(36).substr(2, 9)}` };
        
        let memberGetCalled = false;
        let memberUpdateCalled = false;

        jest.spyOn(mockClient, 'getRecord').mockImplementation(async (_table, id) => {
          memberGetCalled = true;
          return {
            id,
            fields: {},
            createdTime: new Date().toISOString(),
          };
        });
        jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (_table, id, fields) => {
          memberUpdateCalled = true;
          return {
            id,
            fields: fields as Record<string, unknown>,
            createdTime: new Date().toISOString(),
          };
        });

        const result = await processProgramEvent(eventWithMember, mockClient);

        // Verify success (processing succeeded, just nothing to update)
        expect(result.success).toBe(true);
        expect(result.allSessionsCompleted).toBe(false);
        expect(result.membershipCompletedUpdated).toBe(false);

        // Verify member record was NOT fetched or updated
        expect(memberGetCalled).toBe(false);
        expect(memberUpdateCalled).toBe(false);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Processing fails gracefully when member ID is missing
   */
  it('should fail when member ID is missing', async () => {
    const event: ProgramEvent = {
      recordId: 'rec123',
      memberId: undefined,
      session1Completed: true,
      session2Completed: true,
      session3Completed: true,
      session4Completed: true,
      session1Date: '2024-01-01',
      session2Date: '2024-01-08',
      session3Date: '2024-01-15',
      session4Date: '2024-01-22',
    };

    const result = await processProgramEvent(event, mockClient);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Member ID is required');
  });

  /**
   * Property: The completion date is always the latest among all session dates
   * Requirement 10.2
   */
  it('should use the latest session date as completion date', async () => {
    await fc.assert(
      fc.asyncProperty(completedProgramEventGenerator, async (event) => {
        let updatedMemberFields: Record<string, unknown> = {};

        // Mock: member has no Membership Completed date
        const memberRecord: AirtableRecord = {
          id: event.memberId!,
          fields: {},
          createdTime: new Date().toISOString(),
        };

        jest.spyOn(mockClient, 'getRecord').mockResolvedValue(memberRecord);
        jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (_table, id, fields) => {
          updatedMemberFields = fields;
          return {
            id,
            fields: fields as Record<string, unknown>,
            createdTime: new Date().toISOString(),
          };
        });

        await processProgramEvent(event, mockClient);

        // Calculate expected latest date
        const dates = [
          event.session1Date,
          event.session2Date,
          event.session3Date,
          event.session4Date,
        ]
          .filter((d): d is string => d !== undefined)
          .map((d) => new Date(d));

        const expectedLatest = dates.reduce((latest, current) =>
          current > latest ? current : latest
        );
        const expectedDateStr = expectedLatest.toISOString().split('T')[0];

        // Verify the completion date matches the latest session date
        expect(updatedMemberFields['Membership Completed']).toBe(expectedDateStr);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
