/**
 * Property-based tests for Returner Handler
 * 
 * **Feature: airtable-church-automations, Property 5: Returner Processing Rules**
 * 
 * *For any* Returner registration:
 * - If a matching Member exists with Status "First Timer" or "Evangelism Contact", 
 *   the Status SHALL be updated to "Returner"
 * - If a matching Member exists with Status "Member" or "Returner", 
 *   the Status SHALL remain unchanged
 * - If no matching Member exists, the operation SHALL fail with an appropriate error 
 *   indicating First Timer form should be used
 * 
 * **Validates: Requirements 3.2, 3.3, 3.4**
 */

import * as fc from 'fast-check';
import {
  parseReturnerWebhook,
  processReturnerEvent,
  ReturnerEvent,
  ReturnerWebhookPayload,
} from '../src/handlers/returner';
import { AirtableClient } from '../src/services/airtable-client';
import { MemberService } from '../src/services/member-service';
import { AttendanceService } from '../src/services/attendance-service';
import { AirtableConfig, AirtableRecord, MemberStatus } from '../src/types';

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
const nameGenerator = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

const phoneGenerator = fc.stringOf(
  fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
  { minLength: 10, maxLength: 15 }
);

const emailGenerator = fc.emailAddress();

const recordIdGenerator = fc
  .string({ minLength: 10, maxLength: 20 })
  .map((s) => `rec${s.replace(/[^a-zA-Z0-9]/g, '')}`);

// Generator for valid returner event (must have phone or email)
const returnerEventGenerator = fc
  .record({
    recordId: recordIdGenerator,
    name: nameGenerator,
    phone: fc.option(phoneGenerator, { nil: undefined }),
    email: fc.option(emailGenerator, { nil: undefined }),
    serviceId: fc.option(recordIdGenerator, { nil: undefined }),
  })
  .filter((event) => event.phone !== undefined || event.email !== undefined) as fc.Arbitrary<ReturnerEvent>;

// Generator for member status that should be updated to "Returner"
const statusToUpdateGenerator = fc.constantFrom<MemberStatus>('First Timer', 'Evangelism Contact');

// Generator for member status that should NOT be updated
const statusToKeepGenerator = fc.constantFrom<MemberStatus>('Member', 'Returner');

// Generator for webhook payload
const webhookPayloadGenerator = fc
  .record({
    name: nameGenerator,
    phone: fc.option(phoneGenerator, { nil: undefined }),
    email: fc.option(emailGenerator, { nil: undefined }),
    serviceId: fc.option(recordIdGenerator, { nil: undefined }),
    recordId: recordIdGenerator,
  })
  .filter((event) => event.phone !== undefined || event.email !== undefined);

describe('Returner Handler - Webhook Parsing', () => {
  /**
   * Property: Webhook parsing extracts all fields correctly
   */
  it('should parse webhook payload and extract all fields', () => {
    fc.assert(
      fc.property(webhookPayloadGenerator, (data) => {
        const payload: ReturnerWebhookPayload = {
          base: { id: 'app123' },
          webhook: { id: 'wh123' },
          timestamp: new Date().toISOString(),
          record: {
            id: data.recordId,
            fields: {
              'Name': data.name,
              'Phone': data.phone,
              'Email': data.email,
              'Service': data.serviceId ? [data.serviceId] : undefined,
            },
          },
        };

        const event = parseReturnerWebhook(payload);

        // Verify all fields are extracted correctly
        expect(event.recordId).toBe(data.recordId);
        expect(event.name).toBe(data.name);
        expect(event.phone).toBe(data.phone);
        expect(event.email).toBe(data.email);
        expect(event.serviceId).toBe(data.serviceId);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: airtable-church-automations, Property 5: Returner Processing Rules
 *
 * *For any* Returner registration:
 * - If a matching Member exists with Status "First Timer" or "Evangelism Contact",
 *   the Status SHALL be updated to "Returner"
 * - If a matching Member exists with Status "Member" or "Returner",
 *   the Status SHALL remain unchanged
 * - If no matching Member exists, the operation SHALL fail with an appropriate error
 *   indicating First Timer form should be used
 *
 * **Validates: Requirements 3.2, 3.3, 3.4**
 */
describe('Property 5: Returner Processing Rules', () => {
  let mockClient: jest.Mocked<AirtableClient>;
  let memberService: MemberService;
  let attendanceService: AttendanceService;

  beforeEach(() => {
    mockClient = createMockAirtableClient();
    memberService = new MemberService(mockClient);
    attendanceService = new AttendanceService(mockClient);
  });

  /**
   * Property: Status is updated to "Returner" when existing member has status "First Timer" or "Evangelism Contact"
   * Requirement 3.2
   */
  it('should update status to "Returner" when member has status "First Timer" or "Evangelism Contact"', async () => {
    await fc.assert(
      fc.asyncProperty(
        returnerEventGenerator,
        statusToUpdateGenerator,
        async (event, originalStatus) => {
          const existingMemberId = `recExisting${Math.random().toString(36).substr(2, 9)}`;
          let updatedStatus: MemberStatus | undefined;

          // Mock existing member found with status that should be updated
          const existingRecord: AirtableRecord = {
            id: existingMemberId,
            fields: {
              'First Name': 'John',
              'Last Name': 'Doe',
              'Phone': event.phone,
              'Email': event.email,
              'Status': originalStatus,
              'Source': 'Evangelism',
              'Date First Captured': '2023-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          };

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(existingRecord);
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (table, _id, fields) => {
            if (table === 'Members' && fields['Status']) {
              updatedStatus = fields['Status'] as MemberStatus;
            }
            return {
              id: existingMemberId,
              fields: fields as Record<string, unknown>,
              createdTime: new Date().toISOString(),
            };
          });

          const result = await processReturnerEvent(
            event,
            mockClient,
            memberService,
            attendanceService
          );

          // Verify success
          expect(result.success).toBe(true);
          expect(result.memberId).toBe(existingMemberId);

          // Verify status was updated to "Returner" (Requirement 3.2)
          expect(result.statusUpdated).toBe(true);
          expect(updatedStatus).toBe('Returner');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * Property: Status remains unchanged when existing member has status "Member" or "Returner"
   * Requirement 3.2
   */
  it('should NOT update status when member has status "Member" or "Returner"', async () => {
    await fc.assert(
      fc.asyncProperty(
        returnerEventGenerator,
        statusToKeepGenerator,
        async (event, originalStatus) => {
          const existingMemberId = `recExisting${Math.random().toString(36).substr(2, 9)}`;
          let memberUpdateCalled = false;

          // Mock existing member found with status that should NOT be updated
          const existingRecord: AirtableRecord = {
            id: existingMemberId,
            fields: {
              'First Name': 'John',
              'Last Name': 'Doe',
              'Phone': event.phone,
              'Email': event.email,
              'Status': originalStatus,
              'Source': 'First Timer Form',
              'Date First Captured': '2023-01-01',
              'Follow-up Status': 'Contacted',
            },
            createdTime: new Date().toISOString(),
          };

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(existingRecord);
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (table, _id, fields) => {
            if (table === 'Members' && fields['Status']) {
              memberUpdateCalled = true;
            }
            return {
              id: existingMemberId,
              fields: fields as Record<string, unknown>,
              createdTime: new Date().toISOString(),
            };
          });

          const result = await processReturnerEvent(
            event,
            mockClient,
            memberService,
            attendanceService
          );

          // Verify success
          expect(result.success).toBe(true);
          expect(result.memberId).toBe(existingMemberId);

          // Verify status was NOT updated (Requirement 3.2)
          expect(result.statusUpdated).toBe(false);
          expect(memberUpdateCalled).toBe(false);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Operation fails when no matching member exists
   * Requirement 3.4
   */
  it('should fail with error when no matching member exists', async () => {
    await fc.assert(
      fc.asyncProperty(returnerEventGenerator, async (event) => {
        // Mock: no existing member found
        jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);

        const result = await processReturnerEvent(
          event,
          mockClient,
          memberService,
          attendanceService
        );

        // Verify failure (Requirement 3.4)
        expect(result.success).toBe(false);
        expect(result.memberId).toBeUndefined();
        expect(result.statusUpdated).toBe(false);
        expect(result.returnerRecordLinked).toBe(false);

        // Verify error message indicates First Timer form should be used
        expect(result.error).toBeDefined();
        expect(result.error).toContain('First Timer');

        return true;
      }),
      { numRuns: 100 }
    );
  });


  /**
   * Property: Returner record is linked to existing member
   * Requirement 3.3
   */
  it('should link returner record to existing member', async () => {
    await fc.assert(
      fc.asyncProperty(
        returnerEventGenerator,
        fc.constantFrom<MemberStatus>('First Timer', 'Evangelism Contact', 'Member', 'Returner'),
        async (event, originalStatus) => {
          const existingMemberId = `recExisting${Math.random().toString(36).substr(2, 9)}`;
          let linkedMemberId: string | undefined;
          let linkedReturnerRecordId: string | undefined;

          // Mock existing member found
          const existingRecord: AirtableRecord = {
            id: existingMemberId,
            fields: {
              'First Name': 'John',
              'Last Name': 'Doe',
              'Phone': event.phone,
              'Email': event.email,
              'Status': originalStatus,
              'Source': 'Evangelism',
              'Date First Captured': '2023-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          };

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(existingRecord);
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (table, recordId, fields) => {
            if (table === 'Returners Register') {
              linkedReturnerRecordId = recordId;
              const linkedMember = fields['Linked Member'] as string[];
              if (linkedMember && linkedMember.length > 0) {
                linkedMemberId = linkedMember[0];
              }
            }
            return {
              id: recordId,
              fields: fields as Record<string, unknown>,
              createdTime: new Date().toISOString(),
            };
          });

          const result = await processReturnerEvent(
            event,
            mockClient,
            memberService,
            attendanceService
          );

          // Verify success
          expect(result.success).toBe(true);

          // Verify the returner record was updated (Requirement 3.3)
          expect(linkedReturnerRecordId).toBe(event.recordId);

          // Verify the linked member ID matches the existing member (Requirement 3.3)
          expect(linkedMemberId).toBe(existingMemberId);
          expect(linkedMemberId).toBe(result.memberId);

          // Verify result indicates linking was successful
          expect(result.returnerRecordLinked).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Validation fails for missing contact information
   */
  it('should fail when both phone and email are missing', async () => {
    const eventMissingContact: ReturnerEvent = {
      recordId: 'rec123',
      name: 'John Doe',
    };

    const result = await processReturnerEvent(
      eventMissingContact,
      mockClient,
      memberService,
      attendanceService
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('At least one of phone or email is required');
  });
});
