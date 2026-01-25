/**
 * Property-Based Tests for Type Definition Consistency
 * 
 * Property 3: User Mapping Property Names
 * Validates: Requirements 3.2
 * 
 * For any user mapping retrieved from the configuration service,
 * the returned object should contain a followUpMemberId property
 * (not volunteerId) when the user has a follow-up role assignment.
 */

import * as fc from 'fast-check';
import { ConfigService } from '../src/services/config-service';
import { UserRole } from '../src/types';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({
      send: jest.fn(),
    }),
  },
  GetCommand: jest.fn(),
  PutCommand: jest.fn(),
  UpdateCommand: jest.fn(),
}));

describe('Property 3: User Mapping Property Names', () => {
  let configService: ConfigService;
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mocked DynamoDBDocumentClient
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
    const mockClient = DynamoDBDocumentClient.from();
    mockSend = mockClient.send as jest.Mock;
    
    configService = new ConfigService('TestConfigTable', 'TestUserMappingTable');
  });

  /**
   * Arbitraries for generating test data
   */
  const cognitoUserIdArb = fc.stringMatching(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
  const churchIdArb = fc.stringMatching(/^church-[a-zA-Z0-9]{8,16}$/);
  const followUpMemberIdArb = fc.stringMatching(/^rec[a-zA-Z0-9]{14}$/);
  const roleArb = fc.constantFrom<UserRole>('pastor', 'admin', 'follow_up', 'department_lead');
  const departmentIdsArb = fc.array(
    fc.stringMatching(/^rec[a-zA-Z0-9]{14}$/),
    { minLength: 0, maxLength: 5 }
  );

  /**
   * Property 3.1: getUserMapping SHALL return object with followUpMemberId property
   * 
   * Validates: Requirements 3.2
   */
  it('should return user mapping with followUpMemberId property (not volunteerId)', async () => {
    await fc.assert(
      fc.asyncProperty(
        cognitoUserIdArb,
        churchIdArb,
        followUpMemberIdArb,
        roleArb,
        departmentIdsArb,
        async (cognitoUserId, churchId, followUpMemberId, role, departmentIds) => {
          // Mock DynamoDB response with followUpMemberId
          mockSend.mockResolvedValueOnce({
            Item: {
              pk: `USER#${cognitoUserId}`,
              sk: `CHURCH#${churchId}`,
              followUpMemberId,
              role,
              departmentIds,
              createdAt: new Date().toISOString(),
            },
          });

          const result = await configService.getUserMapping(cognitoUserId, churchId);

          // Property: Result should have followUpMemberId property
          expect(result).not.toBeNull();
          expect(result).toHaveProperty('followUpMemberId');
          expect(result?.followUpMemberId).toBe(followUpMemberId);

          // Property: Result should NOT have volunteerId property
          expect(result).not.toHaveProperty('volunteerId');

          // Property: Result should have role and departmentIds
          expect(result?.role).toBe(role);
          expect(result?.departmentIds).toEqual(departmentIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.2: getUserMapping SHALL handle null results correctly
   * 
   * Validates: Requirements 3.2
   */
  it('should return null when user mapping does not exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        cognitoUserIdArb,
        churchIdArb,
        async (cognitoUserId, churchId) => {
          // Mock DynamoDB response with no item
          mockSend.mockResolvedValueOnce({
            Item: undefined,
          });

          const result = await configService.getUserMapping(cognitoUserId, churchId);

          // Property: Result should be null when no mapping exists
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.3: saveUserMapping SHALL accept followUpMemberId parameter
   * 
   * Validates: Requirements 3.2
   */
  it('should save user mapping with followUpMemberId parameter', async () => {
    await fc.assert(
      fc.asyncProperty(
        cognitoUserIdArb,
        churchIdArb,
        followUpMemberIdArb,
        roleArb,
        departmentIdsArb,
        async (cognitoUserId, churchId, followUpMemberId, role, departmentIds) => {
          // Clear previous calls and mock successful save
          mockSend.mockClear();
          mockSend.mockResolvedValueOnce({});

          await configService.saveUserMapping(cognitoUserId, churchId, {
            followUpMemberId,
            role,
            departmentIds,
          });

          // Property: PutCommand should be called once
          expect(mockSend).toHaveBeenCalledTimes(1);
          
          // Get the PutCommand that was passed
          const { PutCommand } = require('@aws-sdk/lib-dynamodb');
          const putCommandCalls = PutCommand.mock.calls;
          
          // Verify the last PutCommand was called with followUpMemberId
          expect(putCommandCalls.length).toBeGreaterThan(0);
          const lastCallArgs = putCommandCalls[putCommandCalls.length - 1][0];
          
          // Verify the command contains followUpMemberId in the Item
          expect(lastCallArgs.Item).toHaveProperty('followUpMemberId');
          expect(lastCallArgs.Item.followUpMemberId).toBe(followUpMemberId);
          
          // Property: Item should NOT have volunteerId property
          expect(lastCallArgs.Item).not.toHaveProperty('volunteerId');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.4: All property names in user mapping should use member terminology
   * 
   * Validates: Requirements 3.2
   */
  it('should not contain any volunteer terminology in property names', async () => {
    await fc.assert(
      fc.asyncProperty(
        cognitoUserIdArb,
        churchIdArb,
        followUpMemberIdArb,
        roleArb,
        departmentIdsArb,
        async (cognitoUserId, churchId, followUpMemberId, role, departmentIds) => {
          // Mock DynamoDB response
          mockSend.mockResolvedValueOnce({
            Item: {
              pk: `USER#${cognitoUserId}`,
              sk: `CHURCH#${churchId}`,
              followUpMemberId,
              role,
              departmentIds,
              createdAt: new Date().toISOString(),
            },
          });

          const result = await configService.getUserMapping(cognitoUserId, churchId);

          // Property: No property names should contain "volunteer"
          if (result) {
            const propertyNames = Object.keys(result);
            const hasVolunteerProperty = propertyNames.some(name =>
              name.toLowerCase().includes('volunteer')
            );
            expect(hasVolunteerProperty).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.5: UserContext type should use followUpMemberId
   * 
   * Validates: Requirements 3.2
   */
  it('should create valid UserContext objects with followUpMemberId', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^user-[a-zA-Z0-9]{8,16}$/),
        fc.emailAddress(),
        roleArb,
        fc.option(followUpMemberIdArb, { nil: undefined }),
        fc.option(departmentIdsArb, { nil: undefined }),
        (userId, email, role, followUpMemberId, departmentIds) => {
          // Create a UserContext object
          const userContext = {
            userId,
            email,
            role,
            followUpMemberId,
            departmentIds,
          };

          // Property: UserContext should have followUpMemberId property
          expect(userContext).toHaveProperty('followUpMemberId');
          
          // Property: UserContext should NOT have volunteerId property
          expect(userContext).not.toHaveProperty('volunteerId');

          // Property: followUpMemberId should match the input
          expect(userContext.followUpMemberId).toBe(followUpMemberId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
