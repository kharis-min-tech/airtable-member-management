/**
 * Property-based tests for Evangelism Handler
 * 
 * **Feature: airtable-church-automations, Property 1: Evangelism to Member Creation Completeness**
 * 
 * *For any* valid evangelism record with First Name, Last Name, Phone, Email, GhanaPost Code, 
 * and Date, when processed by the Automation_Service, the resulting Member record SHALL contain 
 * all these fields copied exactly, have Status "Evangelism Contact", Source "Evangelism", 
 * Date First Captured matching the evangelism Date, and the Evangelism record's Linked Member 
 * field SHALL reference the created Member.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 */

import * as fc from 'fast-check';
import { 
  parseEvangelismWebhook, 
  processEvangelismEvent 
} from '../src/handlers/evangelism';
import { AirtableClient } from '../src/services/airtable-client';
import { MemberService } from '../src/services/member-service';
import { 
  AirtableConfig, 
  AirtableRecord, 
  EvangelismWebhookPayload,
  EvangelismEvent,
} from '../src/types';

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

const ghanaPostCodeGenerator = fc.stringOf(
  fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'),
  { minLength: 5, maxLength: 15 }
);

const dateGenerator = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2025-12-31'),
}).map(d => d.toISOString().split('T')[0]);

const recordIdGenerator = fc.string({ minLength: 10, maxLength: 20 })
  .map(s => `rec${s.replace(/[^a-zA-Z0-9]/g, '')}`);

// Generator for valid evangelism event
const evangelismEventGenerator = fc.record({
  recordId: recordIdGenerator,
  firstName: nameGenerator,
  lastName: nameGenerator,
  phone: fc.option(phoneGenerator, { nil: undefined }),
  email: fc.option(emailGenerator, { nil: undefined }),
  ghanaPostCode: fc.option(ghanaPostCodeGenerator, { nil: undefined }),
  date: dateGenerator, // Always required
  capturedBy: fc.option(recordIdGenerator, { nil: undefined }),
}).filter(event => event.phone !== undefined || event.email !== undefined)
  .map(event => ({
    ...event,
    date: event.date, // Ensure date is always a string
  })) as fc.Arbitrary<{
    recordId: string;
    firstName: string;
    lastName: string;
    phone: string | undefined;
    email: string | undefined;
    ghanaPostCode: string | undefined;
    date: string;
    capturedBy: string | undefined;
  }>;

// Generator for webhook payload
const webhookPayloadGenerator = fc.record({
  firstName: nameGenerator,
  lastName: nameGenerator,
  phone: fc.option(phoneGenerator, { nil: undefined }),
  email: fc.option(emailGenerator, { nil: undefined }),
  ghanaPostCode: fc.option(ghanaPostCodeGenerator, { nil: undefined }),
  date: dateGenerator,
  capturedBy: fc.option(recordIdGenerator, { nil: undefined }),
  recordId: recordIdGenerator,
}).filter(event => event.phone !== undefined || event.email !== undefined);


describe('Evangelism Handler - Webhook Parsing', () => {
  /**
   * Property: Webhook parsing extracts all fields correctly
   */
  it('should parse webhook payload and extract all fields', () => {
    fc.assert(
      fc.property(webhookPayloadGenerator, (data) => {
        const payload: EvangelismWebhookPayload = {
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
              'GhanaPost Code': data.ghanaPostCode,
              'Date': data.date,
              'Captured By': data.capturedBy ? [data.capturedBy] : undefined,
            },
          },
        };

        const event = parseEvangelismWebhook(payload);

        // Verify all fields are extracted correctly
        expect(event.recordId).toBe(data.recordId);
        expect(event.firstName).toBe(data.firstName);
        expect(event.lastName).toBe(data.lastName);
        expect(event.phone).toBe(data.phone);
        expect(event.email).toBe(data.email);
        expect(event.ghanaPostCode).toBe(data.ghanaPostCode);
        expect(event.date).toBe(data.date);
        expect(event.capturedBy).toBe(data.capturedBy);

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
      fc.property(
        nameGenerator,
        nameGenerator,
        recordIdGenerator,
        (firstName, lastName, recordId) => {
          const payload: EvangelismWebhookPayload = {
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

          const event = parseEvangelismWebhook(payload);

          // Verify defaults
          expect(event.recordId).toBe(recordId);
          expect(event.firstName).toBe(firstName);
          expect(event.lastName).toBe(lastName);
          expect(event.phone).toBeUndefined();
          expect(event.email).toBeUndefined();
          expect(event.ghanaPostCode).toBeUndefined();
          expect(event.date).toBeDefined(); // Should have default date
          expect(event.capturedBy).toBeUndefined();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: airtable-church-automations, Property 1: Evangelism to Member Creation Completeness
 * 
 * *For any* valid evangelism record with First Name, Last Name, Phone, Email, GhanaPost Code, 
 * and Date, when processed by the Automation_Service, the resulting Member record SHALL contain 
 * all these fields copied exactly, have Status "Evangelism Contact", Source "Evangelism", 
 * Date First Captured matching the evangelism Date, and the Evangelism record's Linked Member 
 * field SHALL reference the created Member.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 */
describe('Property 1: Evangelism to Member Creation Completeness', () => {
  let mockClient: jest.Mocked<AirtableClient>;
  let memberService: MemberService;

  beforeEach(() => {
    mockClient = createMockAirtableClient();
    memberService = new MemberService(mockClient);
  });

  /**
   * Property: New member is created with Status "Evangelism Contact" and Source "Evangelism"
   * Requirement 1.1
   */
  it('should create member with Status "Evangelism Contact" and Source "Evangelism"', async () => {
    await fc.assert(
      fc.asyncProperty(evangelismEventGenerator, async (event) => {
        // Track created member fields
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

        const result = await processEvangelismEvent(event, mockClient, memberService);

        // Verify success
        expect(result.success).toBe(true);
        expect(result.memberCreated).toBe(true);

        // Verify Status is "Evangelism Contact" (Requirement 1.1)
        expect(createdMemberFields['Status']).toBe('Evangelism Contact');

        // Verify Source is "Evangelism" (Requirement 1.1)
        expect(createdMemberFields['Source']).toBe('Evangelism');

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All fields are copied from evangelism record to member
   * Requirement 1.2
   */
  it('should copy all fields from evangelism record to member', async () => {
    await fc.assert(
      fc.asyncProperty(evangelismEventGenerator, async (event) => {
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

        await processEvangelismEvent(event, mockClient, memberService);

        // Verify First Name is copied (Requirement 1.2)
        expect(createdMemberFields['First Name']).toBe(event.firstName);

        // Verify Last Name is copied (Requirement 1.2)
        expect(createdMemberFields['Last Name']).toBe(event.lastName);

        // Verify Phone is copied if provided (Requirement 1.2)
        if (event.phone) {
          // Phone is normalized, so we check it contains the digits
          const normalizedPhone = event.phone.replace(/\D/g, '');
          expect((createdMemberFields['Phone'] as string).replace(/\D/g, '')).toBe(normalizedPhone);
        }

        // Verify Email is copied if provided (Requirement 1.2)
        if (event.email) {
          expect((createdMemberFields['Email'] as string).toLowerCase()).toBe(event.email.toLowerCase().trim());
        }

        // Verify GhanaPost Code is copied if provided (Requirement 1.2)
        if (event.ghanaPostCode) {
          expect(createdMemberFields['GhanaPost Code']).toBe(event.ghanaPostCode);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Evangelism record is linked to member
   * Requirement 1.3
   */
  it('should link evangelism record to created member', async () => {
    await fc.assert(
      fc.asyncProperty(evangelismEventGenerator, async (event) => {
        let linkedMemberId: string | undefined;
        let linkedEvangelismRecordId: string | undefined;
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
          if (table === 'Evangelism') {
            linkedEvangelismRecordId = recordId;
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

        const result = await processEvangelismEvent(event, mockClient, memberService);

        // Verify the evangelism record was updated (Requirement 1.3)
        expect(linkedEvangelismRecordId).toBe(event.recordId);

        // Verify the linked member ID matches the created member (Requirement 1.3)
        expect(linkedMemberId).toBe(createdMemberId);
        expect(linkedMemberId).toBe(result.memberId);

        // Verify result indicates linking was successful
        expect(result.evangelismRecordLinked).toBe(true);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Date First Captured is set from evangelism Date
   * Requirement 1.4
   */
  it('should set Date First Captured from evangelism Date', async () => {
    await fc.assert(
      fc.asyncProperty(evangelismEventGenerator, async (event) => {
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

        await processEvangelismEvent(event, mockClient, memberService);

        // Verify Date First Captured matches evangelism Date (Requirement 1.4)
        const dateFirstCaptured = createdMemberFields['Date First Captured'] as string;
        expect(dateFirstCaptured).toBe(event.date);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Existing member is reused, not duplicated
   * This tests the deduplication behavior when a member already exists
   */
  it('should reuse existing member instead of creating duplicate', async () => {
    await fc.assert(
      fc.asyncProperty(evangelismEventGenerator, async (event) => {
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
            'Status': 'Member',
            'Source': 'Other',
            'Date First Captured': '2023-01-01',
            'Follow-up Status': 'Integrated',
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
        jest.spyOn(mockClient, 'updateRecord').mockImplementation(async (table, recordId, fields) => {
          if (table === 'Evangelism') {
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

        const result = await processEvangelismEvent(event, mockClient, memberService);

        // Verify no new member was created
        expect(memberCreateCalled).toBe(false);
        expect(result.memberCreated).toBe(false);

        // Verify existing member ID is used
        expect(result.memberId).toBe(existingMemberId);
        expect(linkedMemberId).toBe(existingMemberId);

        // Verify evangelism record was still linked
        expect(result.evangelismRecordLinked).toBe(true);

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
    const eventMissingFirstName: EvangelismEvent = {
      recordId: 'rec123',
      firstName: '',
      lastName: 'Doe',
      phone: '1234567890',
      date: '2024-01-01',
    };

    const result1 = await processEvangelismEvent(eventMissingFirstName, mockClient, memberService);
    expect(result1.success).toBe(false);
    expect(result1.error).toContain('First name and last name are required');

    // Test missing last name
    const eventMissingLastName: EvangelismEvent = {
      recordId: 'rec123',
      firstName: 'John',
      lastName: '',
      phone: '1234567890',
      date: '2024-01-01',
    };

    const result2 = await processEvangelismEvent(eventMissingLastName, mockClient, memberService);
    expect(result2.success).toBe(false);
    expect(result2.error).toContain('First name and last name are required');

    // Test missing both phone and email
    const eventMissingContact: EvangelismEvent = {
      recordId: 'rec123',
      firstName: 'John',
      lastName: 'Doe',
      date: '2024-01-01',
    };

    const result3 = await processEvangelismEvent(eventMissingContact, mockClient, memberService);
    expect(result3.success).toBe(false);
    expect(result3.error).toContain('At least one of phone or email is required');
  });
});
