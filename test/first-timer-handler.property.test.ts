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

// Generators for new Age Bracket and Visitor fields
const ageBracketGenerator = fc.oneof(
  fc.constant('Child'),
  fc.constant('Adult'),
  fc.constant('Senior'),
  fc.constant(null),
  fc.constant(undefined)
);

const visitorGenerator = fc.oneof(
  fc.constant(true),
  fc.constant(false),
  fc.constant(null),
  fc.constant(undefined)
);

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
   * Feature: first-timer-age-visitor-fields, Property 1: Webhook Parsing Extracts New Fields
   * 
   * *For any* webhook payload containing Age Bracket and/or Visitor fields, parsing the webhook 
   * SHALL produce a FirstTimerEvent with the correct ageBracket and visitor values matching 
   * the input payload.
   * 
   * **Validates: Requirements 1.1, 1.3, 2.1**
   */
  it('should parse webhook payload and extract Age Bracket and Visitor fields correctly', () => {
    fc.assert(
      fc.property(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        ageBracketGenerator,
        visitorGenerator,
        (firstName, lastName, recordId, ageBracket, visitor) => {
          const payload: FirstTimerWebhookPayload = {
            base: { id: 'app123' },
            webhook: { id: 'wh123' },
            timestamp: new Date().toISOString(),
            record: {
              id: recordId,
              fields: {
                'First Name': firstName,
                'Last Name': lastName,
                'Age Bracket': ageBracket ?? undefined,
                'Visitor?': visitor ?? undefined,
              },
            },
          };

          const event = parseFirstTimerWebhook(payload);

          // Verify Age Bracket is extracted correctly (Requirement 1.1, 1.3)
          // null/undefined in payload should result in null in event
          if (ageBracket === null || ageBracket === undefined) {
            expect(event.ageBracket).toBeNull();
          } else {
            expect(event.ageBracket).toBe(ageBracket);
          }

          // Verify Visitor is extracted correctly (Requirement 2.1)
          // null/undefined in payload should result in null in event
          // false should be preserved as false
          if (visitor === null || visitor === undefined) {
            expect(event.visitor).toBeNull();
          } else {
            expect(event.visitor).toBe(visitor);
          }

          return true;
        }
      ),
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


/**
 * Feature: first-timer-age-visitor-fields, Property 3: Validation Relaxed for Children and Visitors
 * 
 * *For any* first-timer registration where ageBracket equals "Child" OR visitor equals true, 
 * the handler SHALL successfully process the registration even when phone, email, and address 
 * are all missing.
 * 
 * **Validates: Requirements 3.1, 4.1, 5.1**
 */
describe('Property 3: Validation Relaxed for Children and Visitors', () => {
  let mockClient: jest.Mocked<AirtableClient>;
  let memberService: MemberService;
  let attendanceService: AttendanceService;

  beforeEach(() => {
    mockClient = createMockAirtableClient();
    memberService = new MemberService(mockClient);
    attendanceService = new AttendanceService(mockClient);
  });

  /**
   * Property: Children can register without contact information
   * Requirement 3.1
   */
  it('should allow registration without contact info when ageBracket is Child', async () => {
    // Test various case variations of "Child"
    const childVariations = ['Child', 'child', 'CHILD', 'ChIlD'];
    
    for (const childValue of childVariations) {
      await fc.assert(
        fc.asyncProperty(nameGenerator, nameGenerator, recordIdGenerator, async (firstName, lastName, recordId) => {
          const event: FirstTimerEvent = {
            recordId,
            firstName,
            lastName,
            ageBracket: childValue,
            // No phone, email, or address
          };

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
          jest.spyOn(mockClient, 'createRecord').mockResolvedValue({
            id: `recNew${Math.random().toString(36).substr(2, 9)}`,
            fields: {},
            createdTime: new Date().toISOString(),
          });
          jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
            id: recordId,
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

          // Should succeed without contact info for children
          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();

          return true;
        }),
        { numRuns: 25 }
      );
    }
  });

  /**
   * Property: Visitors can register without contact information
   * Requirement 4.1
   */
  it('should allow registration without contact info when visitor is true', async () => {
    await fc.assert(
      fc.asyncProperty(nameGenerator, nameGenerator, recordIdGenerator, async (firstName, lastName, recordId) => {
        const event: FirstTimerEvent = {
          recordId,
          firstName,
          lastName,
          visitor: true,
          // No phone, email, or address
        };

        jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
        jest.spyOn(mockClient, 'createRecord').mockResolvedValue({
          id: `recNew${Math.random().toString(36).substr(2, 9)}`,
          fields: {},
          createdTime: new Date().toISOString(),
        });
        jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
          id: recordId,
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

        // Should succeed without contact info for visitors
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Child visitors can register without contact information
   * Requirement 5.1
   */
  it('should allow registration without contact info when both child and visitor', async () => {
    await fc.assert(
      fc.asyncProperty(nameGenerator, nameGenerator, recordIdGenerator, async (firstName, lastName, recordId) => {
        const event: FirstTimerEvent = {
          recordId,
          firstName,
          lastName,
          ageBracket: 'Child',
          visitor: true,
          // No phone, email, or address
        };

        jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
        jest.spyOn(mockClient, 'createRecord').mockResolvedValue({
          id: `recNew${Math.random().toString(36).substr(2, 9)}`,
          fields: {},
          createdTime: new Date().toISOString(),
        });
        jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
          id: recordId,
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

        // Should succeed without contact info
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();

        return true;
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: first-timer-age-visitor-fields, Property 4: Validation Requires Contact for Non-Children Non-Visitors
 * 
 * *For any* first-timer registration where ageBracket does NOT equal "Child" AND visitor is NOT true, 
 * the handler SHALL require at least phone or email, returning a validation error if both are missing.
 * 
 * **Validates: Requirements 3.3, 4.3, 5.2**
 */
describe('Property 4: Validation Requires Contact for Non-Children Non-Visitors', () => {
  let mockClient: jest.Mocked<AirtableClient>;
  let memberService: MemberService;
  let attendanceService: AttendanceService;

  beforeEach(() => {
    mockClient = createMockAirtableClient();
    memberService = new MemberService(mockClient);
    attendanceService = new AttendanceService(mockClient);
  });

  // Generator for non-child age brackets
  const nonChildAgeBracketGenerator = fc.oneof(
    fc.constant('Adult'),
    fc.constant('Senior'),
    fc.constant('Youth'),
    fc.constant(null),
    fc.constant(undefined)
  );

  // Generator for non-true visitor values
  const nonTrueVisitorGenerator = fc.oneof(
    fc.constant(false),
    fc.constant(null),
    fc.constant(undefined)
  );

  /**
   * Property: Non-children non-visitors must have contact info
   * Requirements 3.3, 4.3, 5.2
   */
  it('should require contact info when not a child and not a visitor', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        nonChildAgeBracketGenerator,
        nonTrueVisitorGenerator,
        async (firstName, lastName, recordId, ageBracket, visitor) => {
          const event: FirstTimerEvent = {
            recordId,
            firstName,
            lastName,
            ageBracket,
            visitor,
            // No phone, email, or address
          };

          const result = await processFirstTimerEvent(
            event,
            mockClient,
            memberService,
            undefined,
            attendanceService
          );

          // Should fail without contact info for non-children non-visitors
          expect(result.success).toBe(false);
          expect(result.error).toBe('At least one of phone or email is required');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Non-children non-visitors succeed with phone
   */
  it('should succeed when non-child non-visitor provides phone', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        phoneGenerator,
        nonChildAgeBracketGenerator,
        nonTrueVisitorGenerator,
        async (firstName, lastName, recordId, phone, ageBracket, visitor) => {
          const event: FirstTimerEvent = {
            recordId,
            firstName,
            lastName,
            phone,
            ageBracket,
            visitor,
          };

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
          jest.spyOn(mockClient, 'createRecord').mockResolvedValue({
            id: `recNew${Math.random().toString(36).substr(2, 9)}`,
            fields: {},
            createdTime: new Date().toISOString(),
          });
          jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
            id: recordId,
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

          // Should succeed with phone
          expect(result.success).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Non-children non-visitors succeed with email
   */
  it('should succeed when non-child non-visitor provides email', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        emailGenerator,
        nonChildAgeBracketGenerator,
        nonTrueVisitorGenerator,
        async (firstName, lastName, recordId, email, ageBracket, visitor) => {
          const event: FirstTimerEvent = {
            recordId,
            firstName,
            lastName,
            email,
            ageBracket,
            visitor,
          };

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
          jest.spyOn(mockClient, 'createRecord').mockResolvedValue({
            id: `recNew${Math.random().toString(36).substr(2, 9)}`,
            fields: {},
            createdTime: new Date().toISOString(),
          });
          jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
            id: recordId,
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

          // Should succeed with email
          expect(result.success).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: first-timer-age-visitor-fields, Property 2: Status Determination Based on Visitor Flag
 * 
 * *For any* first-timer registration where visitor equals true, the handler SHALL create or update 
 * the member with Status "Visitor". When visitor is false/null/undefined, the status SHALL be 
 * "First Timer".
 * 
 * **Validates: Requirements 2.2, 2.3, 2.4**
 */
describe('Property 2: Status Determination Based on Visitor Flag', () => {
  let mockClient: jest.Mocked<AirtableClient>;
  let memberService: MemberService;
  let attendanceService: AttendanceService;

  beforeEach(() => {
    mockClient = createMockAirtableClient();
    memberService = new MemberService(mockClient);
    attendanceService = new AttendanceService(mockClient);
  });

  /**
   * Property: New member gets Status "Visitor" when visitor flag is true
   * Requirement 2.2
   */
  it('should create member with Status "Visitor" when visitor is true', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        fc.option(phoneGenerator, { nil: undefined }),
        fc.option(emailGenerator, { nil: undefined }),
        async (firstName, lastName, recordId, phone, email) => {
          // Skip if no contact info (visitors don't need it, but we test with it for simplicity)
          let createdMemberFields: Record<string, unknown> = {};

          const event: FirstTimerEvent = {
            recordId,
            firstName,
            lastName,
            phone,
            email,
            visitor: true,
          };

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
          jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
            if (table === 'Members') {
              createdMemberFields = fields;
            }
            return {
              id: `recNew${Math.random().toString(36).substr(2, 9)}`,
              fields: fields as Record<string, unknown>,
              createdTime: new Date().toISOString(),
            };
          });
          jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
            id: recordId,
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

          expect(result.success).toBe(true);
          expect(createdMemberFields['Status']).toBe('Visitor');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: New member gets Status "First Timer" when visitor is false/null/undefined
   * Requirement 2.3
   */
  it('should create member with Status "First Timer" when visitor is not true', async () => {
    const nonTrueVisitorValues = [false, null, undefined];

    for (const visitorValue of nonTrueVisitorValues) {
      await fc.assert(
        fc.asyncProperty(
          nameGenerator,
          nameGenerator,
          recordIdGenerator,
          phoneGenerator,
          async (firstName, lastName, recordId, phone) => {
            let createdMemberFields: Record<string, unknown> = {};

            const event: FirstTimerEvent = {
              recordId,
              firstName,
              lastName,
              phone,
              visitor: visitorValue,
            };

            jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
            jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
              if (table === 'Members') {
                createdMemberFields = fields;
              }
              return {
                id: `recNew${Math.random().toString(36).substr(2, 9)}`,
                fields: fields as Record<string, unknown>,
                createdTime: new Date().toISOString(),
              };
            });
            jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
              id: recordId,
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

            expect(result.success).toBe(true);
            expect(createdMemberFields['Status']).toBe('First Timer');

            return true;
          }
        ),
        { numRuns: 30 }
      );
    }
  });

  /**
   * Property: Existing Evangelism Contact gets Status "Visitor" when visitor is true
   * Requirement 2.4
   */
  it('should update existing Evangelism Contact to Status "Visitor" when visitor is true', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        phoneGenerator,
        async (firstName, lastName, recordId, phone) => {
          const existingMemberId = `recExisting${Math.random().toString(36).substr(2, 9)}`;
          let updatedStatus: string | undefined;

          const existingRecord: AirtableRecord = {
            id: existingMemberId,
            fields: {
              'First Name': firstName,
              'Last Name': lastName,
              'Phone': phone,
              'Status': 'Evangelism Contact',
              'Source': 'Evangelism',
              'Date First Captured': '2023-01-01',
              'Follow-up Status': 'Not Started',
            },
            createdTime: new Date().toISOString(),
          };

          const event: FirstTimerEvent = {
            recordId,
            firstName,
            lastName,
            phone,
            visitor: true,
          };

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(existingRecord);
          jest.spyOn(mockClient, 'getRecord').mockResolvedValue(existingRecord);
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (table, id, fields) => {
            if (table === 'Members' && fields['Status']) {
              updatedStatus = fields['Status'] as string;
            }
            return {
              id,
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

          expect(result.success).toBe(true);
          expect(result.memberMerged).toBe(true);
          expect(updatedStatus).toBe('Visitor');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: first-timer-age-visitor-fields, Property 5: Age Bracket Flows to Linked Member
 * 
 * *For any* first-timer registration with an Age Bracket value, when a new member is created, 
 * the Age Bracket SHALL be stored in the member record.
 * 
 * **Validates: Requirements 1.2**
 */
describe('Property 5: Age Bracket Flows to Linked Member', () => {
  let mockClient: jest.Mocked<AirtableClient>;
  let memberService: MemberService;
  let attendanceService: AttendanceService;

  beforeEach(() => {
    mockClient = createMockAirtableClient();
    memberService = new MemberService(mockClient);
    attendanceService = new AttendanceService(mockClient);
  });

  /**
   * Property: Age Bracket is stored in member record when creating new member
   * Requirement 1.2
   */
  it('should store Age Bracket in member record when provided', async () => {
    const ageBracketValues = ['Child', 'Adult', 'Senior', 'Youth'];

    for (const ageBracket of ageBracketValues) {
      await fc.assert(
        fc.asyncProperty(
          nameGenerator,
          nameGenerator,
          recordIdGenerator,
          async (firstName, lastName, recordId) => {
            let createdMemberFields: Record<string, unknown> = {};

            const event: FirstTimerEvent = {
              recordId,
              firstName,
              lastName,
              ageBracket,
              // Children don't need contact info
              visitor: ageBracket === 'Child' ? undefined : undefined,
              phone: ageBracket === 'Child' ? undefined : '1234567890',
            };

            jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
            jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
              if (table === 'Members') {
                createdMemberFields = fields;
              }
              return {
                id: `recNew${Math.random().toString(36).substr(2, 9)}`,
                fields: fields as Record<string, unknown>,
                createdTime: new Date().toISOString(),
              };
            });
            jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
              id: recordId,
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

            expect(result.success).toBe(true);
            expect(createdMemberFields['Age Bracket']).toBe(ageBracket);

            return true;
          }
        ),
        { numRuns: 25 }
      );
    }
  });

  /**
   * Property: Age Bracket is not set when not provided
   */
  it('should not set Age Bracket when not provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        phoneGenerator,
        async (firstName, lastName, recordId, phone) => {
          let createdMemberFields: Record<string, unknown> = {};

          const event: FirstTimerEvent = {
            recordId,
            firstName,
            lastName,
            phone,
            // No ageBracket
          };

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
          jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
            if (table === 'Members') {
              createdMemberFields = fields;
            }
            return {
              id: `recNew${Math.random().toString(36).substr(2, 9)}`,
              fields: fields as Record<string, unknown>,
              createdTime: new Date().toISOString(),
            };
          });
          jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
            id: recordId,
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

          expect(result.success).toBe(true);
          expect(createdMemberFields['Age Bracket']).toBeUndefined();

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});


/**
 * Feature: first-timer-age-visitor-fields, Property 6: Member Creation Succeeds Without Contact for Children/Visitors
 * 
 * *For any* first-timer registration where ageBracket equals "Child" OR visitor equals true, 
 * the MemberService.createMember SHALL successfully create a member record even when phone, 
 * email, and address are all missing.
 * 
 * **Validates: Requirements 3.2, 4.2**
 */
describe('Property 6: Member Creation Succeeds Without Contact for Children/Visitors', () => {
  let mockClient: jest.Mocked<AirtableClient>;
  let memberService: MemberService;
  let attendanceService: AttendanceService;

  beforeEach(() => {
    mockClient = createMockAirtableClient();
    memberService = new MemberService(mockClient);
    attendanceService = new AttendanceService(mockClient);
  });

  /**
   * Property: Child member can be created without contact info
   * Requirement 3.2
   */
  it('should create child member without contact info', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        async (firstName, lastName, recordId) => {
          let memberCreated = false;

          const event: FirstTimerEvent = {
            recordId,
            firstName,
            lastName,
            ageBracket: 'Child',
            // No phone, email, or address
          };

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
          jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
            if (table === 'Members') {
              memberCreated = true;
            }
            return {
              id: `recNew${Math.random().toString(36).substr(2, 9)}`,
              fields: fields as Record<string, unknown>,
              createdTime: new Date().toISOString(),
            };
          });
          jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
            id: recordId,
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

          expect(result.success).toBe(true);
          expect(memberCreated).toBe(true);
          expect(result.memberCreated).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Visitor member can be created without contact info
   * Requirement 4.2
   */
  it('should create visitor member without contact info', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        async (firstName, lastName, recordId) => {
          let memberCreated = false;

          const event: FirstTimerEvent = {
            recordId,
            firstName,
            lastName,
            visitor: true,
            // No phone, email, or address
          };

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
          jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
            if (table === 'Members') {
              memberCreated = true;
            }
            return {
              id: `recNew${Math.random().toString(36).substr(2, 9)}`,
              fields: fields as Record<string, unknown>,
              createdTime: new Date().toISOString(),
            };
          });
          jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
            id: recordId,
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

          expect(result.success).toBe(true);
          expect(memberCreated).toBe(true);
          expect(result.memberCreated).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Child visitor member can be created without contact info
   */
  it('should create child visitor member without contact info', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        async (firstName, lastName, recordId) => {
          let memberCreated = false;
          let createdMemberFields: Record<string, unknown> = {};

          const event: FirstTimerEvent = {
            recordId,
            firstName,
            lastName,
            ageBracket: 'Child',
            visitor: true,
            // No phone, email, or address
          };

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
          jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
            if (table === 'Members') {
              memberCreated = true;
              createdMemberFields = fields;
            }
            return {
              id: `recNew${Math.random().toString(36).substr(2, 9)}`,
              fields: fields as Record<string, unknown>,
              createdTime: new Date().toISOString(),
            };
          });
          jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
            id: recordId,
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

          expect(result.success).toBe(true);
          expect(memberCreated).toBe(true);
          expect(result.memberCreated).toBe(true);
          // Child visitor should have Status "Visitor" (visitor flag takes precedence)
          expect(createdMemberFields['Status']).toBe('Visitor');
          expect(createdMemberFields['Age Bracket']).toBe('Child');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: first-timer-age-visitor-fields, Integration Tests
 * 
 * These tests verify backward compatibility and complete flow integration
 * for the Age Bracket and Visitor fields feature.
 * 
 * **Validates: Requirements 5.2**
 */
describe('Integration: Backward Compatibility with Existing Webhooks', () => {
  let mockClient: jest.Mocked<AirtableClient>;
  let memberService: MemberService;
  let attendanceService: AttendanceService;

  beforeEach(() => {
    mockClient = createMockAirtableClient();
    memberService = new MemberService(mockClient);
    attendanceService = new AttendanceService(mockClient);
  });

  /**
   * Integration Test: Webhooks without Age Bracket/Visitor fields still work
   * Requirement 5.2
   */
  it('should process webhooks without Age Bracket and Visitor fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        phoneGenerator,
        async (firstName, lastName, recordId, phone) => {
          // Webhook payload without new fields (simulating old webhook format)
          const payload: FirstTimerWebhookPayload = {
            base: { id: 'app123' },
            webhook: { id: 'wh123' },
            timestamp: new Date().toISOString(),
            record: {
              id: recordId,
              fields: {
                'First Name': firstName,
                'Last Name': lastName,
                'Phone': phone,
                // No 'Age Bracket' or 'Visitor?' fields
              },
            },
          };

          // Parse webhook
          const event = parseFirstTimerWebhook(payload);

          // Verify new fields default to null
          expect(event.ageBracket).toBeNull();
          expect(event.visitor).toBeNull();

          // Process the event
          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
          jest.spyOn(mockClient, 'createRecord').mockResolvedValue({
            id: `recNew${Math.random().toString(36).substr(2, 9)}`,
            fields: {},
            createdTime: new Date().toISOString(),
          });
          jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
            id: recordId,
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

          // Should succeed with existing validation rules
          expect(result.success).toBe(true);
          expect(result.memberCreated).toBe(true);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Integration Test: Existing validation rules apply when new fields are absent
   * Requirement 5.2
   */
  it('should require contact info when Age Bracket and Visitor are absent', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        async (firstName, lastName, recordId) => {
          // Webhook payload without contact info and without new fields
          const payload: FirstTimerWebhookPayload = {
            base: { id: 'app123' },
            webhook: { id: 'wh123' },
            timestamp: new Date().toISOString(),
            record: {
              id: recordId,
              fields: {
                'First Name': firstName,
                'Last Name': lastName,
                // No phone, email, Age Bracket, or Visitor
              },
            },
          };

          const event = parseFirstTimerWebhook(payload);

          const result = await processFirstTimerEvent(
            event,
            mockClient,
            memberService,
            undefined,
            attendanceService
          );

          // Should fail - existing validation rules require contact info
          expect(result.success).toBe(false);
          expect(result.error).toBe('At least one of phone or email is required');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Integration Test: Status defaults to "First Timer" when Visitor field is absent
   * Requirement 5.2
   */
  it('should default to Status "First Timer" when Visitor field is absent', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        phoneGenerator,
        async (firstName, lastName, recordId, phone) => {
          let createdMemberFields: Record<string, unknown> = {};

          const payload: FirstTimerWebhookPayload = {
            base: { id: 'app123' },
            webhook: { id: 'wh123' },
            timestamp: new Date().toISOString(),
            record: {
              id: recordId,
              fields: {
                'First Name': firstName,
                'Last Name': lastName,
                'Phone': phone,
                // No Visitor field
              },
            },
          };

          const event = parseFirstTimerWebhook(payload);

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
          jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
            if (table === 'Members') {
              createdMemberFields = fields;
            }
            return {
              id: `recNew${Math.random().toString(36).substr(2, 9)}`,
              fields: fields as Record<string, unknown>,
              createdTime: new Date().toISOString(),
            };
          });
          jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
            id: recordId,
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

          expect(result.success).toBe(true);
          // Should default to "First Timer" status
          expect(createdMemberFields['Status']).toBe('First Timer');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});


/**
 * Feature: first-timer-age-visitor-fields, Complete Flow Integration Tests
 * 
 * These tests verify the complete registration flow for different scenarios.
 * 
 * **Validates: Requirements 3.1, 4.1, 5.1, 5.2**
 */
describe('Integration: Complete Registration Flow', () => {
  let mockClient: jest.Mocked<AirtableClient>;
  let memberService: MemberService;
  let attendanceService: AttendanceService;

  beforeEach(() => {
    mockClient = createMockAirtableClient();
    memberService = new MemberService(mockClient);
    attendanceService = new AttendanceService(mockClient);
  });

  /**
   * Integration Test: Child registration without contact info
   * Requirement 3.1
   */
  it('should complete child registration flow without contact info', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        async (firstName, lastName, recordId) => {
          let createdMemberFields: Record<string, unknown> = {};
          let linkedMemberId: string | undefined;
          let createdMemberId: string | undefined;

          // Full webhook payload for child registration
          const payload: FirstTimerWebhookPayload = {
            base: { id: 'app123' },
            webhook: { id: 'wh123' },
            timestamp: new Date().toISOString(),
            record: {
              id: recordId,
              fields: {
                'First Name': firstName,
                'Last Name': lastName,
                'Age Bracket': 'Child',
                // No contact info
              },
            },
          };

          const event = parseFirstTimerWebhook(payload);

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
          jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
            const newId = `recNew${Math.random().toString(36).substr(2, 9)}`;
            if (table === 'Members') {
              createdMemberFields = fields;
              createdMemberId = newId;
            }
            return {
              id: newId,
              fields: fields as Record<string, unknown>,
              createdTime: new Date().toISOString(),
            };
          });
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (table, id, fields) => {
            if (table === 'First Timers Register') {
              const linked = fields['Linked Member'] as string[];
              if (linked && linked.length > 0) {
                linkedMemberId = linked[0];
              }
            }
            return {
              id,
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

          // Verify complete flow
          expect(result.success).toBe(true);
          expect(result.memberCreated).toBe(true);
          expect(result.firstTimerRecordLinked).toBe(true);
          expect(linkedMemberId).toBe(createdMemberId);
          expect(createdMemberFields['First Name']).toBe(firstName);
          expect(createdMemberFields['Last Name']).toBe(lastName);
          expect(createdMemberFields['Age Bracket']).toBe('Child');
          expect(createdMemberFields['Status']).toBe('First Timer');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Integration Test: Visitor registration without contact info
   * Requirement 4.1
   */
  it('should complete visitor registration flow without contact info', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        async (firstName, lastName, recordId) => {
          let createdMemberFields: Record<string, unknown> = {};
          let linkedMemberId: string | undefined;
          let createdMemberId: string | undefined;

          const payload: FirstTimerWebhookPayload = {
            base: { id: 'app123' },
            webhook: { id: 'wh123' },
            timestamp: new Date().toISOString(),
            record: {
              id: recordId,
              fields: {
                'First Name': firstName,
                'Last Name': lastName,
                'Visitor?': true,
                // No contact info
              },
            },
          };

          const event = parseFirstTimerWebhook(payload);

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
          jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
            const newId = `recNew${Math.random().toString(36).substr(2, 9)}`;
            if (table === 'Members') {
              createdMemberFields = fields;
              createdMemberId = newId;
            }
            return {
              id: newId,
              fields: fields as Record<string, unknown>,
              createdTime: new Date().toISOString(),
            };
          });
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (table, id, fields) => {
            if (table === 'First Timers Register') {
              const linked = fields['Linked Member'] as string[];
              if (linked && linked.length > 0) {
                linkedMemberId = linked[0];
              }
            }
            return {
              id,
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

          // Verify complete flow
          expect(result.success).toBe(true);
          expect(result.memberCreated).toBe(true);
          expect(result.firstTimerRecordLinked).toBe(true);
          expect(linkedMemberId).toBe(createdMemberId);
          expect(createdMemberFields['First Name']).toBe(firstName);
          expect(createdMemberFields['Last Name']).toBe(lastName);
          expect(createdMemberFields['Status']).toBe('Visitor');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Integration Test: Normal registration requiring contact info
   * Requirement 5.2
   */
  it('should complete normal registration flow with contact info', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        phoneGenerator,
        emailGenerator,
        async (firstName, lastName, recordId, phone, email) => {
          let createdMemberFields: Record<string, unknown> = {};
          let linkedMemberId: string | undefined;
          let createdMemberId: string | undefined;

          const payload: FirstTimerWebhookPayload = {
            base: { id: 'app123' },
            webhook: { id: 'wh123' },
            timestamp: new Date().toISOString(),
            record: {
              id: recordId,
              fields: {
                'First Name': firstName,
                'Last Name': lastName,
                'Phone': phone,
                'Email': email,
                'Age Bracket': 'Adult',
                'Visitor?': false,
              },
            },
          };

          const event = parseFirstTimerWebhook(payload);

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
          jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
            const newId = `recNew${Math.random().toString(36).substr(2, 9)}`;
            if (table === 'Members') {
              createdMemberFields = fields;
              createdMemberId = newId;
            }
            return {
              id: newId,
              fields: fields as Record<string, unknown>,
              createdTime: new Date().toISOString(),
            };
          });
          jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (table, id, fields) => {
            if (table === 'First Timers Register') {
              const linked = fields['Linked Member'] as string[];
              if (linked && linked.length > 0) {
                linkedMemberId = linked[0];
              }
            }
            return {
              id,
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

          // Verify complete flow
          expect(result.success).toBe(true);
          expect(result.memberCreated).toBe(true);
          expect(result.firstTimerRecordLinked).toBe(true);
          expect(linkedMemberId).toBe(createdMemberId);
          expect(createdMemberFields['First Name']).toBe(firstName);
          expect(createdMemberFields['Last Name']).toBe(lastName);
          expect(createdMemberFields['Age Bracket']).toBe('Adult');
          expect(createdMemberFields['Status']).toBe('First Timer');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Integration Test: Child visitor registration (combined scenario)
   * Requirement 5.1
   */
  it('should complete child visitor registration flow', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        async (firstName, lastName, recordId) => {
          let createdMemberFields: Record<string, unknown> = {};

          const payload: FirstTimerWebhookPayload = {
            base: { id: 'app123' },
            webhook: { id: 'wh123' },
            timestamp: new Date().toISOString(),
            record: {
              id: recordId,
              fields: {
                'First Name': firstName,
                'Last Name': lastName,
                'Age Bracket': 'Child',
                'Visitor?': true,
                // No contact info
              },
            },
          };

          const event = parseFirstTimerWebhook(payload);

          jest.spyOn(mockClient, 'findByUniqueKey').mockResolvedValue(null);
          jest.spyOn(mockClient, 'createRecord').mockImplementation(async (table, fields) => {
            if (table === 'Members') {
              createdMemberFields = fields;
            }
            return {
              id: `recNew${Math.random().toString(36).substr(2, 9)}`,
              fields: fields as Record<string, unknown>,
              createdTime: new Date().toISOString(),
            };
          });
          jest.spyOn(mockClient, 'updateRecord').mockResolvedValue({
            id: recordId,
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

          // Verify complete flow
          expect(result.success).toBe(true);
          expect(result.memberCreated).toBe(true);
          expect(createdMemberFields['Age Bracket']).toBe('Child');
          // Visitor flag takes precedence for status
          expect(createdMemberFields['Status']).toBe('Visitor');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
