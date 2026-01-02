/**
 * Property-based tests for First Timer Handler
 * 
 * **Feature: airtable-church-automations, Property 4: First Timer New Member Creation**
 * 
 * *For any* First Timer registration where no matching Member exists by phone or email, 
 * the Automation_Service SHALL create a new Member with Status "First Timer" and 
 * Source "First Timer Form", and link the First Timers Register record to the new Member.
 * 
 * **Validates: Requirements 2.4, 2.5**
 */

import * as fc from 'fast-check';
import {
  parseFirstTimerWebhook,
  processFirstTimerEvent,
  FirstTimerEvent,
  FirstTimerWebhookPayload,
} from '../src/handlers/first-timer';
import { AirtableClient } from '../src/services/airtable-client';
import { MemberService } from '../src/services/member-service';
import { AttendanceService } from '../src/services/attendance-service';
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

const addressGenerator = fc.string({ minLength: 5, maxLength: 100 });

const ghanaPostCodeGenerator = fc.stringOf(
  fc.constantFrom(
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'
  ),
  { minLength: 5, maxLength: 15 }
);

const recordIdGenerator = fc
  .string({ minLength: 10, maxLength: 20 })
  .map((s) => `rec${s.replace(/[^a-zA-Z0-9]/g, '')}`);

// Generator for valid first timer event (must have phone or email)
const firstTimerEventGenerator = fc
  .record({
    recordId: recordIdGenerator,
    firstName: nameGenerator,
    lastName: nameGenerator,
    phone: fc.option(phoneGenerator, { nil: undefined }),
    email: fc.option(emailGenerator, { nil: undefined }),
    address: fc.option(addressGenerator, { nil: undefined }),
    ghanaPostCode: fc.option(ghanaPostCodeGenerator, { nil: undefined }),
    serviceId: fc.option(recordIdGenerator, { nil: undefined }),
  })
  .filter((event) => event.phone !== undefined || event.email !== undefined) as fc.Arbitrary<FirstTimerEvent>;

// Generator for webhook payload
const webhookPayloadGenerator = fc
  .record({
    firstName: nameGenerator,
    lastName: nameGenerator,
    phone: fc.option(phoneGenerator, { nil: undefined }),
    email: fc.option(emailGenerator, { nil: undefined }),
    address: fc.option(addressGenerator, { nil: undefined }),
    ghanaPostCode: fc.option(ghanaPostCodeGenerator, { nil: undefined }),
    serviceId: fc.option(recordIdGenerator, { nil: undefined }),
    recordId: recordIdGenerator,
  })
  .filter((event) => event.phone !== undefined || event.email !== undefined);

describe('First Timer Handler - Webhook Parsing', () => {
  /**
   * Property: Webhook parsing extracts all fields correctly
   */
  it('should parse webhook payload and extract all fields', () => {
    fc.assert(
      fc.property(webhookPayloadGenerator, (data) => {
        const payload: FirstTimerWebhookPayload = {
          base: { id: 'app123' },
          webhook: { id: 'wh123' },
          timestamp: new Date().toISOString(),
          record: {
            id: data.recordId,
            fields: {
              'First Name': data.firstName,
              'Last Name': data.lastName,
              'Phone': data.phone,
              'Email': data.email,
              'Address': data.address,
              'GhanaPost Code': data.ghanaPostCode,
              'Service': data.serviceId ? [data.serviceId] : undefined,
            },
          },
        };

        const event = parseFirstTimerWebhook(payload);

        // Verify all fields are extracted correctly
        expect(event.recordId).toBe(data.recordId);
        expect(event.firstName).toBe(data.firstName);
        expect(event.lastName).toBe(data.lastName);
        expect(event.phone).toBe(data.phone);
        expect(event.email).toBe(data.email);
        expect(event.address).toBe(data.address);
        expect(event.ghanaPostCode).toBe(data.ghanaPostCode);
        expect(event.serviceId).toBe(data.serviceId);

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
      fc.property(nameGenerator, nameGenerator, recordIdGenerator, (firstName, lastName, recordId) => {
        const payload: FirstTimerWebhookPayload = {
          base: { id: 'app123' },
          webhook: { id: 'wh123' },
          timestamp: new Date().toISOString(),
          record: {
            id: recordId,
            fields: {
              'First Name': firstName,
              'Last Name': lastName,
              // All optional fields missing
            },
          },
        };

        const event = parseFirstTimerWebhook(payload);

        // Verify defaults
        expect(event.recordId).toBe(recordId);
        expect(event.firstName).toBe(firstName);
        expect(event.lastName).toBe(lastName);
        expect(event.phone).toBeUndefined();
        expect(event.email).toBeUndefined();
        expect(event.address).toBeUndefined();
        expect(event.ghanaPostCode).toBeUndefined();
        expect(event.serviceId).toBeUndefined();

        return true;
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: airtable-church-automations, Property 4: First Timer New Member Creation
 *
 * *For any* First Timer registration where no matching Member exists by phone or email,
 * the Automation_Service SHALL create a new Member with Status "First Timer" and
 * Source "First Timer Form", and link the First Timers Register record to the new Member.
 *
 * **Validates: Requirements 2.4, 2.5**
 */
describe('Property 4: First Timer New Member Creation', () => {
  let mockClient: jest.Mocked<AirtableClient>;
  let memberService: MemberService;
  let attendanceService: AttendanceService;

  beforeEach(() => {
    mockClient = createMockAirtableClient();
    memberService = new MemberService(mockClient);
    attendanceService = new AttendanceService(mockClient);
  });

  /**
   * Property: New member is created with Status "First Timer" and Source "First Timer Form"
   * Requirement 2.4
   */
  it('should create member with Status "First Timer" and Source "First Timer Form" when no match exists', async () => {
    await fc.assert(
      fc.asyncProperty(firstTimerEventGenerator, async (event) => {
        // Track created member fields
        let createdMemberFields: Record<string, unknown> = {};

        // Mock: no existing member found
        jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
        jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
          if (table === 'Members') {
            createdMemberFields = fields;
          }
          return {
            id: `recNewMember${Math.random().toString(36).substr(2, 9)}`,
            fields: fields as Record<string, unknown>,
            createdTime: new Date().toISOString(),
          };
        });
        jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
          id: event.recordId,
          fields: {},
          createdTime: new Date().toISOString(),
        });

        const result = await processFirstTimerEvent(
          event,
          mockClient,
          memberService,
          undefined,
          attendanceService
        );

        // Verify success
        expect(result.success).toBe(true);
        expect(result.memberCreated).toBe(true);
        expect(result.memberMerged).toBe(false);

        // Verify Status is "First Timer" (Requirement 2.4)
        expect(createdMemberFields['Status']).toBe('First Timer');

        // Verify Source is "First Timer Form" (Requirement 2.4)
        expect(createdMemberFields['Source']).toBe('First Timer Form');

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All fields are copied from first timer registration to member
   * Requirement 2.4
   */
  it('should copy all fields from first timer registration to member', async () => {
    await fc.assert(
      fc.asyncProperty(firstTimerEventGenerator, async (event) => {
        let createdMemberFields: Record<string, unknown> = {};

        jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
        jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
          if (table === 'Members') {
            createdMemberFields = fields;
          }
          return {
            id: `recNewMember${Math.random().toString(36).substr(2, 9)}`,
            fields: fields as Record<string, unknown>,
            createdTime: new Date().toISOString(),
          };
        });
        jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
          id: event.recordId,
          fields: {},
          createdTime: new Date().toISOString(),
        });

        await processFirstTimerEvent(event, mockClient, memberService, undefined, attendanceService);

        // Verify First Name is copied
        expect(createdMemberFields['First Name']).toBe(event.firstName);

        // Verify Last Name is copied
        expect(createdMemberFields['Last Name']).toBe(event.lastName);

        // Verify Phone is copied if provided
        if (event.phone) {
          const normalizedPhone = event.phone.replace(/\D/g, '');
          expect((createdMemberFields['Phone'] as string).replace(/\D/g, '')).toBe(normalizedPhone);
        }

        // Verify Email is copied if provided
        if (event.email) {
          expect((createdMemberFields['Email'] as string).toLowerCase()).toBe(
            event.email.toLowerCase().trim()
          );
        }

        // Verify Address is copied if provided
        if (event.address) {
          expect(createdMemberFields['Address']).toBe(event.address);
        }

        // Verify GhanaPost Code is copied if provided
        if (event.ghanaPostCode) {
          expect(createdMemberFields['GhanaPost Code']).toBe(event.ghanaPostCode);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: First timer record is linked to created member
   * Requirement 2.5
   */
  it('should link first timer record to created member', async () => {
    await fc.assert(
      fc.asyncProperty(firstTimerEventGenerator, async (event) => {
        let linkedMemberId: string | undefined;
        let linkedFirstTimerRecordId: string | undefined;
        let createdMemberId: string | undefined;

        jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
        jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
          const newId = `recNewMember${Math.random().toString(36).substr(2, 9)}`;
          if (table === 'Members') {
            createdMemberId = newId;
          }
          return {
            id: newId,
            fields: fields as Record<string, unknown>,
            createdTime: new Date().toISOString(),
          };
        });
        jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (table, recordId, fields) => {
          if (table === 'First Timers Register') {
            linkedFirstTimerRecordId = recordId;
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

        const result = await processFirstTimerEvent(
          event,
          mockClient,
          memberService,
          undefined,
          attendanceService
        );

        // Verify the first timer record was updated (Requirement 2.5)
        expect(linkedFirstTimerRecordId).toBe(event.recordId);

        // Verify the linked member ID matches the created member (Requirement 2.5)
        expect(linkedMemberId).toBe(createdMemberId);
        expect(linkedMemberId).toBe(result.memberId);

        // Verify result indicates linking was successful
        expect(result.firstTimerRecordLinked).toBe(true);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Validation fails for missing required fields
   */
  it('should fail when required fields are missing', async () => {
    // Test missing first name
    const eventMissingFirstName: FirstTimerEvent = {
      recordId: 'rec123',
      firstName: '',
      lastName: 'Doe',
      phone: '1234567890',
    };

    const result1 = await processFirstTimerEvent(
      eventMissingFirstName,
      mockClient,
      memberService,
      undefined,
      attendanceService
    );
    expect(result1.success).toBe(false);
    expect(result1.error).toContain('First name and last name are required');

    // Test missing last name
    const eventMissingLastName: FirstTimerEvent = {
      recordId: 'rec123',
      firstName: 'John',
      lastName: '',
      phone: '1234567890',
    };

    const result2 = await processFirstTimerEvent(
      eventMissingLastName,
      mockClient,
      memberService,
      undefined,
      attendanceService
    );
    expect(result2.success).toBe(false);
    expect(result2.error).toContain('First name and last name are required');

    // Test missing both phone and email
    const eventMissingContact: FirstTimerEvent = {
      recordId: 'rec123',
      firstName: 'John',
      lastName: 'Doe',
    };

    const result3 = await processFirstTimerEvent(
      eventMissingContact,
      mockClient,
      memberService,
      undefined,
      attendanceService
    );
    expect(result3.success).toBe(false);
    expect(result3.error).toContain('At least one of phone or email is required');
  });

  /**
   * Property: Existing member is reused when found (not duplicated)
   * This tests that when a member already exists, no new member is created
   */
  it('should reuse existing member instead of creating duplicate', async () => {
    await fc.assert(
      fc.asyncProperty(firstTimerEventGenerator, async (event) => {
        const existingMemberId = `recExisting${Math.random().toString(36).substr(2, 9)}`;
        let memberCreateCalled = false;
        let linkedMemberId: string | undefined;

        // Mock existing member found
        const existingRecord: AirtableRecord = {
          id: existingMemberId,
          fields: {
            'First Name': event.firstName,
            'Last Name': event.lastName,
            'Phone': event.phone,
            'Email': event.email,
            'Status': 'Evangelism Contact',
            'Source': 'Evangelism',
            'Date First Captured': '2023-01-01',
            'Follow-up Status': 'Not Started',
          },
          createdTime: new Date().toISOString(),
        };

        jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(existingRecord);
        jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
          if (table === 'Members') {
            memberCreateCalled = true;
          }
          return {
            id: `recNew${Math.random().toString(36).substr(2, 9)}`,
            fields: fields as Record<string, unknown>,
            createdTime: new Date().toISOString(),
          };
        });
        jest.spyOn(mockClient, 'getRecord').mockResolvedValue(existingRecord);
        jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (table, recordId, fields) => {
          if (table === 'First Timers Register') {
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

        const result = await processFirstTimerEvent(
          event,
          mockClient,
          memberService,
          undefined,
          attendanceService
        );

        // Verify no new member was created
        expect(memberCreateCalled).toBe(false);
        expect(result.memberCreated).toBe(false);

        // Verify existing member ID is used
        expect(result.memberId).toBe(existingMemberId);
        expect(linkedMemberId).toBe(existingMemberId);

        // Verify first timer record was still linked
        expect(result.firstTimerRecordLinked).toBe(true);

        // Verify merge occurred (since existing was Evangelism Contact)
        expect(result.memberMerged).toBe(true);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
