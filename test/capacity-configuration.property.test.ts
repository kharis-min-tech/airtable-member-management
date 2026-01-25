/**
 * Property-Based Test for Capacity Configuration Consistency
 * 
 * Property 1: Capacity Configuration Consistency
 * Validates: Requirements 2.2, 9.1
 * 
 * For any follow-up member capacity check, the system should use the 
 * memberCapacityLimit configuration value (not volunteerCapacityLimit) 
 * when determining if a member has reached their assignment limit.
 */

import * as fc from 'fast-check';
import { FollowUpService } from '../src/services/follow-up-service';
import { AirtableClient } from '../src/services/airtable-client';
import { AirtableRecord } from '../src/types';

/**
 * Arbitraries for generating test data
 */
const airtableIdArb = fc.stringMatching(/^rec[a-zA-Z0-9]{14}$/);

describe('Property 1: Capacity Configuration Consistency', () => {
  let mockAirtableClient: jest.Mocked<AirtableClient>;

  beforeEach(() => {
    mockAirtableClient = {
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      getRecord: jest.fn(),
      findRecords: jest.fn(),
      deleteRecord: jest.fn(),
    } as unknown as jest.Mocked<AirtableClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 1.1: When memberCapacityLimit is configured, the system should use it
   * to determine capacity limits (not volunteerCapacityLimit)
   * 
   * Validates: Requirements 2.2, 9.1
   */
  it('should use memberCapacityLimit configuration for capacity checks', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        fc.integer({ min: 5, max: 50 }), // Custom capacity limit
        fc.integer({ min: 0, max: 100 }), // Current assignments
        async (followUpMemberId, customCapacityLimit, currentAssignments) => {
          // Create service with custom memberCapacityLimit
          const followUpService = new FollowUpService(mockAirtableClient, {
            memberCapacityLimit: customCapacityLimit,
          });

          // Mock follow-up member record without explicit capacity field
          mockAirtableClient.getRecord.mockResolvedValue({
            id: followUpMemberId,
            fields: {
              'Name': 'Test Member',
              'Role': 'Follow-up',
              'Active': true,
              // No 'Capacity' field - should use config default
            },
            createdTime: new Date().toISOString(),
          } as AirtableRecord);

          // Mock current assignments
          const mockAssignments = Array(currentAssignments).fill(null).map((_, i) => ({
            id: `rec${String(i).padStart(14, '0')}`,
            fields: { 'Status': 'Assigned' },
            createdTime: new Date().toISOString(),
          }));
          mockAirtableClient.findRecords.mockResolvedValue(mockAssignments as AirtableRecord[]);

          const capacityInfo = await followUpService.getFollowUpMemberCapacity(followUpMemberId);

          // Property: Should use memberCapacityLimit from config
          expect(capacityInfo.capacity).toBe(customCapacityLimit);
          expect(capacityInfo.currentAssignments).toBe(currentAssignments);
          expect(capacityInfo.availableSlots).toBe(Math.max(0, customCapacityLimit - currentAssignments));
          expect(capacityInfo.hasCapacity).toBe(currentAssignments < customCapacityLimit);

          // Property: Should use memberId and memberName (not volunteerId/volunteerName)
          expect(capacityInfo.memberId).toBe(followUpMemberId);
          expect(capacityInfo.memberName).toBeDefined();
          expect(capacityInfo).not.toHaveProperty('volunteerId');
          expect(capacityInfo).not.toHaveProperty('volunteerName');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.2: When no memberCapacityLimit is configured, should use DEFAULT_MEMBER_CAPACITY (20)
   * 
   * Validates: Requirements 2.2, 9.1
   */
  it('should use DEFAULT_MEMBER_CAPACITY when no config provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        fc.integer({ min: 0, max: 50 }), // Current assignments
        async (followUpMemberId, currentAssignments) => {
          // Create service without custom capacity config
          const followUpService = new FollowUpService(mockAirtableClient);

          // Mock follow-up member record without explicit capacity field
          mockAirtableClient.getRecord.mockResolvedValue({
            id: followUpMemberId,
            fields: {
              'Name': 'Test Member',
              'Role': 'Follow-up',
              'Active': true,
              // No 'Capacity' field
            },
            createdTime: new Date().toISOString(),
          } as AirtableRecord);

          // Mock current assignments
          const mockAssignments = Array(currentAssignments).fill(null).map((_, i) => ({
            id: `rec${String(i).padStart(14, '0')}`,
            fields: { 'Status': 'Assigned' },
            createdTime: new Date().toISOString(),
          }));
          mockAirtableClient.findRecords.mockResolvedValue(mockAssignments as AirtableRecord[]);

          const capacityInfo = await followUpService.getFollowUpMemberCapacity(followUpMemberId);

          // Property: Should use default capacity of 20
          expect(capacityInfo.capacity).toBe(20);
          expect(capacityInfo.currentAssignments).toBe(currentAssignments);
          expect(capacityInfo.hasCapacity).toBe(currentAssignments < 20);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.3: Member-specific capacity should override config default
   * 
   * Validates: Requirements 2.2, 9.1
   */
  it('should use member-specific capacity when available', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        fc.integer({ min: 5, max: 50 }), // Config capacity
        fc.integer({ min: 5, max: 50 }), // Member-specific capacity
        fc.integer({ min: 0, max: 100 }), // Current assignments
        async (followUpMemberId, configCapacity, memberCapacity, currentAssignments) => {
          // Ensure they're different to test override
          fc.pre(configCapacity !== memberCapacity);

          const followUpService = new FollowUpService(mockAirtableClient, {
            memberCapacityLimit: configCapacity,
          });

          // Mock follow-up member record WITH explicit capacity field
          mockAirtableClient.getRecord.mockResolvedValue({
            id: followUpMemberId,
            fields: {
              'Name': 'Test Member',
              'Role': 'Follow-up',
              'Active': true,
              'Capacity': memberCapacity, // Member-specific capacity
            },
            createdTime: new Date().toISOString(),
          } as AirtableRecord);

          // Mock current assignments
          const mockAssignments = Array(currentAssignments).fill(null).map((_, i) => ({
            id: `rec${String(i).padStart(14, '0')}`,
            fields: { 'Status': 'Assigned' },
            createdTime: new Date().toISOString(),
          }));
          mockAirtableClient.findRecords.mockResolvedValue(mockAssignments as AirtableRecord[]);

          const capacityInfo = await followUpService.getFollowUpMemberCapacity(followUpMemberId);

          // Property: Should use member-specific capacity, not config default
          expect(capacityInfo.capacity).toBe(memberCapacity);
          expect(capacityInfo.hasCapacity).toBe(currentAssignments < memberCapacity);
        }
      ),
      { numRuns: 100 }
    );
  });
});
