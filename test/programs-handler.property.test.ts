/**
 * Property-based tests for Programs Handler
 * 
 * Tests program session completion status logging.
 */

import * as fc from 'fast-check';
import {
  parseProgramWebhook,
  processProgramEvent,
  areAllSessionsCompleted,
  ProgramEvent,
  ProgramWebhookPayload,
} from '../src/handlers/programs';
import { AirtableClient } from '../src/services/airtable-client';
import { AirtableConfig } from '../src/types';

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

  return client as jest.Mocked<AirtableClient>;
}

// Generators for test data
const recordIdGenerator = fc
  .string({ minLength: 10, maxLength: 20 })
  .map((s: string) => `rec${s.replace(/[^a-zA-Z0-9]/g, '')}`);

// Generate a valid date string in ISO format (YYYY-MM-DD)
const dateGenerator = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map((d: Date) => d.toISOString().split('T')[0]);

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
        (s1: boolean, s2: boolean, s3: boolean, s4: boolean) => {
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
});

describe('Programs Handler - Webhook Parsing', () => {
  /**
   * Property: Webhook parsing extracts all fields correctly
   */
  it('should parse webhook payload and extract all fields', () => {
    fc.assert(
      fc.property(completedProgramEventGenerator, (data: ProgramEvent) => {
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

        expect(event.recordId).toBe(data.recordId);
        expect(event.memberId).toBe(data.memberId);
        expect(event.session1Completed).toBe(data.session1Completed);
        expect(event.session2Completed).toBe(data.session2Completed);
        expect(event.session3Completed).toBe(data.session3Completed);
        expect(event.session4Completed).toBe(data.session4Completed);

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
      fc.property(recordIdGenerator, (recordId: string) => {
        const payload: ProgramWebhookPayload = {
          base: { id: 'app123' },
          webhook: { id: 'wh123' },
          timestamp: new Date().toISOString(),
          record: {
            id: recordId,
            fields: {},
          },
        };

        const event = parseProgramWebhook(payload);

        expect(event.recordId).toBe(recordId);
        expect(event.memberId).toBeUndefined();
        expect(event.session1Completed).toBe(false);
        expect(event.session2Completed).toBe(false);
        expect(event.session3Completed).toBe(false);
        expect(event.session4Completed).toBe(false);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});


describe('Programs Handler - Processing', () => {
  let mockClient: jest.Mocked<AirtableClient>;

  beforeEach(() => {
    mockClient = createMockAirtableClient();
  });

  /**
   * Property: When all sessions are completed, result indicates completion
   */
  it('should indicate all sessions completed when they are', async () => {
    await fc.assert(
      fc.asyncProperty(completedProgramEventGenerator, async (event: ProgramEvent) => {
        const result = await processProgramEvent(event, mockClient);

        expect(result.success).toBe(true);
        expect(result.allSessionsCompleted).toBe(true);
        expect(result.memberId).toBe(event.memberId);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: When not all sessions are completed, result indicates incomplete
   */
  it('should indicate sessions incomplete when they are not all done', async () => {
    await fc.assert(
      fc.asyncProperty(incompleteProgramEventGenerator, async (event: ProgramEvent) => {
        const eventWithMember = { ...event, memberId: `recMember${Math.random().toString(36).substring(2, 11)}` };
        
        const result = await processProgramEvent(eventWithMember, mockClient);

        expect(result.success).toBe(true);
        expect(result.allSessionsCompleted).toBe(false);

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
    };

    const result = await processProgramEvent(event, mockClient);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Member ID is required');
  });
});
