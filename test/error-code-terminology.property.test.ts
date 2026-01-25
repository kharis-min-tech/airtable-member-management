/**
 * Property-Based Test for Error Code Terminology Consistency
 * 
 * Property 2: Error Code Terminology Consistency
 * Validates: Requirements 2.5, 10.2
 * 
 * For any error condition related to follow-up member operations, the system 
 * should throw error codes using "FOLLOW_UP_MEMBER" or "MEMBER" terminology 
 * (e.g., FOLLOW_UP_MEMBER_NOT_FOUND, NO_AVAILABLE_FOLLOW_UP_MEMBER) rather 
 * than "VOLUNTEER" terminology.
 */

import * as fc from 'fast-check';
import { FollowUpService, FollowUpErrorCode, FollowUpError } from '../src/services/follow-up-service';
import { AirtableClient } from '../src/services/airtable-client';
import { AirtableRecord } from '../src/types';

/**
 * Arbitraries for generating test data
 */
const airtableIdArb = fc.stringMatching(/^rec[a-zA-Z0-9]{14}$/);

describe('Property 2: Error Code Terminology Consistency', () => {
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
   * Property 2.1: Error codes should not contain "VOLUNTEER" terminology
   * 
   * Validates: Requirements 2.5, 10.2
   */
  it('should not have error codes with VOLUNTEER terminology', () => {
    // Get all error code values
    const errorCodes = Object.values(FollowUpErrorCode);

    // Property: No error code should contain "VOLUNTEER"
    errorCodes.forEach(code => {
      expect(code).not.toContain('VOLUNTEER');
    });

    // Property: Should have FOLLOW_UP_MEMBER terminology instead
    expect(errorCodes).toContain('FOLLOW_UP_MEMBER_NOT_FOUND');
    expect(errorCodes).toContain('NO_AVAILABLE_FOLLOW_UP_MEMBER');

    // Property: Should NOT have old volunteer error codes
    expect(errorCodes).not.toContain('VOLUNTEER_NOT_FOUND');
    expect(errorCodes).not.toContain('NO_AVAILABLE_VOLUNTEER');
  });

  /**
   * Property 2.2: Invalid input errors should use correct terminology
   * 
   * Validates: Requirements 2.5, 10.2
   */
  it('should throw errors with member terminology for invalid inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('', ' ', '  '),
        airtableIdArb,
        async (emptyId, validId) => {
          // Test createAssignment with empty member ID
          try {
            await followUpService.createAssignment(emptyId.trim() || '', validId);
            expect(true).toBe(false); // Should not reach here
          } catch (error) {
            expect(error).toBeInstanceOf(FollowUpError);
            const followUpError = error as FollowUpError;
            expect(followUpError.code).toBe(FollowUpErrorCode.INVALID_INPUT);
            // Error message should reference "member" not "volunteer"
            expect(followUpError.message.toLowerCase()).toContain('member');
            expect(followUpError.message.toLowerCase()).not.toContain('volunteer');
          }

          // Test createAssignment with empty follow-up member ID
          try {
            await followUpService.createAssignment(validId, emptyId.trim() || '');
            expect(true).toBe(false); // Should not reach here
          } catch (error) {
            expect(error).toBeInstanceOf(FollowUpError);
            const followUpError = error as FollowUpError;
            expect(followUpError.code).toBe(FollowUpErrorCode.INVALID_INPUT);
            // Error message should reference "follow-up member" not "volunteer"
            expect(followUpError.message.toLowerCase()).toContain('follow-up member');
            expect(followUpError.message.toLowerCase()).not.toContain('volunteer');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.3: Capacity check errors should use member terminology
   * 
   * Validates: Requirements 2.5, 10.2
   */
  it('should use member terminology in capacity check errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('', ' ', '  '),
        airtableIdArb,
        async (emptyId, validId) => {
          // Test getFollowUpMemberCapacity with empty ID
          try {
            await followUpService.getFollowUpMemberCapacity(emptyId.trim() || '');
            expect(true).toBe(false); // Should not reach here
          } catch (error) {
            expect(error).toBeInstanceOf(FollowUpError);
            const followUpError = error as FollowUpError;
            expect(followUpError.code).toBe(FollowUpErrorCode.INVALID_INPUT);
            // Error message should reference "follow-up member" not "volunteer"
            expect(followUpError.message.toLowerCase()).toContain('follow-up member');
            expect(followUpError.message.toLowerCase()).not.toContain('volunteer');
          }

          // Test getAssignmentsByFollowUpMember with empty ID
          try {
            await followUpService.getAssignmentsByFollowUpMember(emptyId.trim() || '');
            expect(true).toBe(false); // Should not reach here
          } catch (error) {
            expect(error).toBeInstanceOf(FollowUpError);
            const followUpError = error as FollowUpError;
            expect(followUpError.code).toBe(FollowUpErrorCode.INVALID_INPUT);
            // Error message should reference "follow-up member" not "volunteer"
            expect(followUpError.message.toLowerCase()).toContain('follow-up member');
            expect(followUpError.message.toLowerCase()).not.toContain('volunteer');
          }

          // Test assignWithCapacityCheck with empty IDs
          try {
            await followUpService.assignWithCapacityCheck(emptyId.trim() || '', validId);
            expect(true).toBe(false); // Should not reach here
          } catch (error) {
            expect(error).toBeInstanceOf(FollowUpError);
            const followUpError = error as FollowUpError;
            expect(followUpError.code).toBe(FollowUpErrorCode.INVALID_INPUT);
            expect(followUpError.message.toLowerCase()).toContain('member');
            expect(followUpError.message.toLowerCase()).not.toContain('volunteer');
          }

          try {
            await followUpService.assignWithCapacityCheck(validId, emptyId.trim() || '');
            expect(true).toBe(false); // Should not reach here
          } catch (error) {
            expect(error).toBeInstanceOf(FollowUpError);
            const followUpError = error as FollowUpError;
            expect(followUpError.code).toBe(FollowUpErrorCode.INVALID_INPUT);
            expect(followUpError.message.toLowerCase()).toContain('follow-up member');
            expect(followUpError.message.toLowerCase()).not.toContain('volunteer');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.4: Reassignment errors should use member terminology
   * 
   * Validates: Requirements 2.5, 10.2
   */
  it('should use member terminology in reassignment errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('', ' ', '  '),
        airtableIdArb,
        async (emptyId, validId) => {
          // Test reassignMember with empty member ID
          try {
            await followUpService.reassignMember(emptyId.trim() || '', validId, 'test reason');
            expect(true).toBe(false); // Should not reach here
          } catch (error) {
            expect(error).toBeInstanceOf(FollowUpError);
            const followUpError = error as FollowUpError;
            expect(followUpError.code).toBe(FollowUpErrorCode.INVALID_INPUT);
            expect(followUpError.message.toLowerCase()).toContain('member');
            expect(followUpError.message.toLowerCase()).not.toContain('volunteer');
          }

          // Test reassignMember with empty new follow-up member ID
          try {
            await followUpService.reassignMember(validId, emptyId.trim() || '', 'test reason');
            expect(true).toBe(false); // Should not reach here
          } catch (error) {
            expect(error).toBeInstanceOf(FollowUpError);
            const followUpError = error as FollowUpError;
            expect(followUpError.code).toBe(FollowUpErrorCode.INVALID_INPUT);
            expect(followUpError.message.toLowerCase()).toContain('follow-up member');
            expect(followUpError.message.toLowerCase()).not.toContain('volunteer');
          }

          // Test processCapacityReassignment with empty IDs
          try {
            await followUpService.processCapacityReassignment(emptyId.trim() || '', validId);
            expect(true).toBe(false); // Should not reach here
          } catch (error) {
            expect(error).toBeInstanceOf(FollowUpError);
            const followUpError = error as FollowUpError;
            expect(followUpError.code).toBe(FollowUpErrorCode.INVALID_INPUT);
            expect(followUpError.message.toLowerCase()).toContain('member');
            expect(followUpError.message.toLowerCase()).not.toContain('volunteer');
          }

          try {
            await followUpService.processCapacityReassignment(validId, emptyId.trim() || '');
            expect(true).toBe(false); // Should not reach here
          } catch (error) {
            expect(error).toBeInstanceOf(FollowUpError);
            const followUpError = error as FollowUpError;
            expect(followUpError.code).toBe(FollowUpErrorCode.INVALID_INPUT);
            expect(followUpError.message.toLowerCase()).not.toContain('volunteer');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.5: All FollowUpError instances should use member terminology in messages
   * 
   * Validates: Requirements 2.5, 10.2
   */
  it('should never use volunteer terminology in error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        airtableIdArb,
        fc.integer({ min: 20, max: 30 }),
        async (memberId, followUpMemberId, atCapacityCount) => {
          // Mock follow-up member at capacity
          mockAirtableClient.getRecord.mockResolvedValue({
            id: followUpMemberId,
            fields: {
              'Name': 'Test Member',
              'Role': 'Follow-up',
              'Active': true,
              'Capacity': 20,
            },
            createdTime: new Date().toISOString(),
          } as AirtableRecord);

          let findRecordsCallCount = 0;
          mockAirtableClient.findRecords.mockImplementation(async () => {
            findRecordsCallCount++;
            if (findRecordsCallCount === 1) {
              // Return at-capacity assignments
              return Array(atCapacityCount).fill(null).map((_, i) => ({
                id: `rec${String(i).padStart(14, '0')}`,
                fields: { 'Status': 'Assigned' },
                createdTime: new Date().toISOString(),
              })) as AirtableRecord[];
            }
            // No available members
            return [] as AirtableRecord[];
          });

          mockAirtableClient.createRecord.mockResolvedValue({
            id: 'recNewAssignment01',
            fields: {
              'Member': [memberId],
              'Assigned To': [followUpMemberId],
              'Status': 'Assigned',
            },
            createdTime: new Date().toISOString(),
          } as AirtableRecord);

          const result = await followUpService.assignWithCapacityCheck(memberId, followUpMemberId);

          // Property: Warning message should use "member" terminology, not "volunteer"
          if (result.warning) {
            expect(result.warning.toLowerCase()).not.toContain('volunteer');
            expect(result.warning.toLowerCase()).toContain('member');
          }

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});
