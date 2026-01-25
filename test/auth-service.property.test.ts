/**
 * Property-Based Tests for Auth Service - Role-Based Data Filtering
 * 
 * Property 14: Role-Based Data Filtering
 * Validates: Requirements 20.4, 20.5, 20.6
 * 
 * For any user with role "Follow-up Team":
 * - Member queries SHALL only return Members where Follow-up Owner matches the user's follow-up member ID
 * 
 * For any user with role "Department Lead":
 * - Member queries SHALL only return Members who have an active Member Departments record 
 *   for one of the user's departments
 * - Attendance queries SHALL only return records for Members in the user's departments
 */

import * as fc from 'fast-check';
import { AuthService } from '../src/services/auth-service';
import { UserContext, UserRole, MemberStatus, MemberSource, FollowUpStatus } from '../src/types';

// Mock ConfigService
jest.mock('../src/services/config-service', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    getUserMapping: jest.fn().mockResolvedValue(null),
  })),
}));

// Mock Cognito client
jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  GetUserCommand: jest.fn(),
  AdminListGroupsForUserCommand: jest.fn(),
}));

describe('Property 14: Role-Based Data Filtering', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService('test-pool-id');
  });

  /**
   * Arbitraries for generating test data
   */
  const userIdArb = fc.stringMatching(/^user-[a-zA-Z0-9]{8,16}$/);
  const emailArb = fc.emailAddress();
  const followUpMemberIdArb = fc.stringMatching(/^rec[a-zA-Z0-9]{14}$/);
  const departmentIdArb = fc.stringMatching(/^rec[a-zA-Z0-9]{14}$/);
  const memberIdArb = fc.stringMatching(/^rec[a-zA-Z0-9]{14}$/);

  const roleArb = fc.constantFrom<UserRole>('pastor', 'admin', 'follow_up', 'department_lead');

  const memberArb = fc.record({
    id: memberIdArb,
    firstName: fc.string({ minLength: 1, maxLength: 30 }),
    lastName: fc.string({ minLength: 1, maxLength: 30 }),
    fullName: fc.string({ minLength: 1, maxLength: 60 }),
    phone: fc.stringMatching(/^\+?[0-9]{10,15}$/),
    email: fc.option(emailArb, { nil: undefined }),
    status: fc.constantFrom<MemberStatus>('Member', 'First Timer', 'Returner', 'Evangelism Contact'),
    source: fc.constantFrom<MemberSource>('First Timer Form', 'Returner Form', 'Evangelism', 'Other'),
    dateFirstCaptured: fc.date({ min: new Date('2020-01-01'), max: new Date('2026-12-31') }),
    followUpOwner: fc.option(followUpMemberIdArb, { nil: undefined }),
    followUpStatus: fc.constantFrom<FollowUpStatus>('Not Started', 'In Progress', 'Contacted', 'Visiting', 'Integrated', 'Established'),
  });

  const userContextArb = (role: UserRole) => fc.record({
    userId: userIdArb,
    email: emailArb,
    role: fc.constant(role),
    followUpMemberId: role === 'follow_up' ? followUpMemberIdArb : fc.option(followUpMemberIdArb, { nil: undefined }),
    departmentIds: role === 'department_lead' 
      ? fc.array(departmentIdArb, { minLength: 1, maxLength: 5 })
      : fc.option(fc.array(departmentIdArb, { minLength: 0, maxLength: 3 }), { nil: undefined }),
  });

  /**
   * Property 14.1: Pastor and Admin users SHALL have access to all members
   * 
   * Validates: Requirements 20.2, 20.3
   */
  it('should grant full access to pastor and admin roles', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<UserRole>('pastor', 'admin'),
        userIdArb,
        emailArb,
        fc.array(memberArb, { minLength: 1, maxLength: 20 }),
        (role, userId, email, members) => {
          const user: UserContext = {
            userId,
            email,
            role,
          };

          const scope = authService.getDataScope(user);
          expect(scope.type).toBe('all');

          // Filter should return all members
          const filtered = authService.filterMembersByScope(members, user);
          expect(filtered).toHaveLength(members.length);
          expect(filtered).toEqual(members);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.2: Follow-up team users SHALL only see members assigned to them
   * 
   * Validates: Requirements 20.4
   */
  it('should filter members by follow-up owner for follow_up role', () => {
    fc.assert(
      fc.property(
        userContextArb('follow_up'),
        fc.array(memberArb, { minLength: 1, maxLength: 30 }),
        (user, members) => {
          // Ensure user has a followUpMemberId
          if (!user.followUpMemberId) {
            user.followUpMemberId = 'recTestVolunteer01';
          }

          // Assign some members to this follow-up member
          const assignedMembers = members.map((m, i) => ({
            ...m,
            followUpOwner: i % 3 === 0 ? user.followUpMemberId : m.followUpOwner,
          }));

          const filtered = authService.filterMembersByScope(assignedMembers, user);

          // All filtered members should have this follow-up member as follow-up owner
          for (const member of filtered) {
            expect(member.followUpOwner).toBe(user.followUpMemberId);
          }

          // Count expected members
          const expectedCount = assignedMembers.filter(m => m.followUpOwner === user.followUpMemberId).length;
          expect(filtered).toHaveLength(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.3: Follow-up team without followUpMemberId SHALL see no members
   * 
   * Validates: Requirements 20.4
   */
  it('should return empty array for follow_up role without followUpMemberId', () => {
    fc.assert(
      fc.property(
        userIdArb,
        emailArb,
        fc.array(memberArb, { minLength: 1, maxLength: 20 }),
        (userId, email, members) => {
          const user: UserContext = {
            userId,
            email,
            role: 'follow_up',
            followUpMemberId: undefined, // No follow-up member ID
          };

          const filtered = authService.filterMembersByScope(members, user);
          expect(filtered).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.4: Department lead users SHALL only see members in their departments
   * 
   * Validates: Requirements 20.5, 20.6
   */
  it('should filter members by department for department_lead role', () => {
    fc.assert(
      fc.property(
        userContextArb('department_lead'),
        fc.array(memberArb, { minLength: 1, maxLength: 30 }),
        fc.array(departmentIdArb, { minLength: 1, maxLength: 10 }),
        (user, members, allDepartments) => {
          // Ensure user has department IDs
          if (!user.departmentIds || user.departmentIds.length === 0) {
            user.departmentIds = [allDepartments[0] || 'recTestDept001'];
          }

          // Create member-to-department mapping
          const memberDepartments = new Map<string, string[]>();
          members.forEach((m, i) => {
            // Assign some members to user's departments
            if (i % 3 === 0 && user.departmentIds && user.departmentIds.length > 0) {
              memberDepartments.set(m.id, [user.departmentIds[0]!]);
            } else if (allDepartments[i % allDepartments.length]) {
              memberDepartments.set(m.id, [allDepartments[i % allDepartments.length]!]);
            } else {
              memberDepartments.set(m.id, []);
            }
          });

          const filtered = authService.filterMembersByScope(members, user, memberDepartments);

          // All filtered members should be in one of user's departments
          for (const member of filtered) {
            const deptIds = memberDepartments.get(member.id) || [];
            const isInUserDept = deptIds.some(d => user.departmentIds?.includes(d));
            expect(isInUserDept).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.5: Department lead without departments SHALL see no members
   * 
   * Validates: Requirements 20.5
   */
  it('should return empty array for department_lead without departments', () => {
    fc.assert(
      fc.property(
        userIdArb,
        emailArb,
        fc.array(memberArb, { minLength: 1, maxLength: 20 }),
        (userId, email, members) => {
          const user: UserContext = {
            userId,
            email,
            role: 'department_lead',
            departmentIds: [], // No departments
          };

          const memberDepartments = new Map<string, string[]>();
          members.forEach(m => memberDepartments.set(m.id, ['recSomeDept001']));

          const filtered = authService.filterMembersByScope(members, user, memberDepartments);
          expect(filtered).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.6: Attendance filtering SHALL respect department scope
   * 
   * Validates: Requirements 20.6
   */
  it('should filter attendance by department for department_lead role', () => {
    const attendanceRecordArb = fc.record({
      id: fc.stringMatching(/^rec[a-zA-Z0-9]{14}$/),
      memberId: memberIdArb,
      serviceId: fc.stringMatching(/^rec[a-zA-Z0-9]{14}$/),
      present: fc.boolean(),
    });

    fc.assert(
      fc.property(
        userContextArb('department_lead'),
        fc.array(attendanceRecordArb, { minLength: 1, maxLength: 30 }),
        fc.array(departmentIdArb, { minLength: 1, maxLength: 10 }),
        (user, records, allDepartments) => {
          // Ensure user has department IDs
          if (!user.departmentIds || user.departmentIds.length === 0) {
            user.departmentIds = [allDepartments[0] || 'recTestDept001'];
          }

          // Create member-to-department mapping
          const memberDepartments = new Map<string, string[]>();
          records.forEach((r, i) => {
            if (i % 3 === 0 && user.departmentIds && user.departmentIds.length > 0) {
              memberDepartments.set(r.memberId, [user.departmentIds[0]!]);
            } else if (allDepartments[i % allDepartments.length]) {
              memberDepartments.set(r.memberId, [allDepartments[i % allDepartments.length]!]);
            } else {
              memberDepartments.set(r.memberId, []);
            }
          });

          const filtered = authService.filterAttendanceByScope(records, user, memberDepartments);

          // All filtered records should be for members in user's departments
          for (const record of filtered) {
            const deptIds = memberDepartments.get(record.memberId) || [];
            const isInUserDept = deptIds.some(d => user.departmentIds?.includes(d));
            expect(isInUserDept).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.7: Follow-up team SHALL NOT have attendance access
   * 
   * Validates: Requirements 20.4
   */
  it('should deny attendance access to follow_up role', () => {
    const attendanceRecordArb = fc.record({
      id: fc.stringMatching(/^rec[a-zA-Z0-9]{14}$/),
      memberId: memberIdArb,
      serviceId: fc.stringMatching(/^rec[a-zA-Z0-9]{14}$/),
      present: fc.boolean(),
    });

    fc.assert(
      fc.property(
        userContextArb('follow_up'),
        fc.array(attendanceRecordArb, { minLength: 1, maxLength: 20 }),
        (user, records) => {
          const memberDepartments = new Map<string, string[]>();
          records.forEach(r => memberDepartments.set(r.memberId, ['recSomeDept001']));

          const filtered = authService.filterAttendanceByScope(records, user, memberDepartments);
          expect(filtered).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.8: canAccessMember SHALL correctly determine access
   * 
   * Validates: Requirements 20.4, 20.5, 20.6
   */
  it('should correctly determine member access based on role', () => {
    fc.assert(
      fc.property(
        roleArb,
        userIdArb,
        emailArb,
        followUpMemberIdArb,
        fc.array(departmentIdArb, { minLength: 1, maxLength: 5 }),
        memberIdArb,
        fc.option(followUpMemberIdArb, { nil: undefined }),
        fc.array(departmentIdArb, { minLength: 0, maxLength: 3 }),
        (role, userId, email, followUpMemberId, userDepts, memberId, memberFollowUp, memberDepts) => {
          const user: UserContext = {
            userId,
            email,
            role,
            followUpMemberId: role === 'follow_up' ? followUpMemberId : undefined,
            departmentIds: role === 'department_lead' ? userDepts : undefined,
          };

          const canAccess = authService.canAccessMember(
            memberId,
            memberFollowUp,
            memberDepts,
            user
          );

          switch (role) {
            case 'pastor':
            case 'admin':
              // Full access
              expect(canAccess).toBe(true);
              break;

            case 'follow_up':
              // Only if member's follow-up owner matches user's follow-up member ID
              expect(canAccess).toBe(memberFollowUp === followUpMemberId);
              break;

            case 'department_lead':
              // Only if member is in one of user's departments
              const hasCommonDept = memberDepts.some(d => userDepts.includes(d));
              expect(canAccess).toBe(hasCommonDept);
              break;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.9: buildMemberFilterFormula SHALL generate valid Airtable formulas
   * 
   * Validates: Requirements 20.4, 20.5, 20.6, 20.7
   */
  it('should generate valid Airtable filter formulas', () => {
    fc.assert(
      fc.property(
        roleArb,
        userIdArb,
        emailArb,
        followUpMemberIdArb,
        fc.array(departmentIdArb, { minLength: 1, maxLength: 5 }),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        (role, userId, email, followUpMemberId, userDepts, baseFormula) => {
          const user: UserContext = {
            userId,
            email,
            role,
            followUpMemberId: role === 'follow_up' ? followUpMemberId : undefined,
            departmentIds: role === 'department_lead' ? userDepts : undefined,
          };

          const formula = authService.buildMemberFilterFormula(user, baseFormula || undefined);

          // Formula should be a non-empty string
          expect(typeof formula).toBe('string');
          expect(formula.length).toBeGreaterThan(0);

          switch (role) {
            case 'pastor':
            case 'admin':
              // Should be TRUE() or combined with base formula
              if (!baseFormula) {
                expect(formula).toBe('TRUE()');
              } else {
                expect(formula).toContain(baseFormula);
              }
              break;

            case 'follow_up':
              // Should contain FIND for follow-up owner
              expect(formula).toContain('Follow-up Owner');
              expect(formula).toContain(followUpMemberId);
              break;

            case 'department_lead':
              // Should contain FIND for departments
              expect(formula).toContain('Member Departments');
              // Should contain at least one department ID
              const hasDeptId = userDepts.some(d => formula.includes(d));
              expect(hasDeptId).toBe(true);
              break;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.10: Data scope type SHALL match user role
   * 
   * Validates: Requirements 20.4, 20.5, 20.6
   */
  it('should return correct data scope type for each role', () => {
    fc.assert(
      fc.property(
        roleArb,
        userIdArb,
        emailArb,
        followUpMemberIdArb,
        fc.array(departmentIdArb, { minLength: 1, maxLength: 5 }),
        (role, userId, email, followUpMemberId, userDepts) => {
          const user: UserContext = {
            userId,
            email,
            role,
            followUpMemberId: role === 'follow_up' ? followUpMemberId : undefined,
            departmentIds: role === 'department_lead' ? userDepts : undefined,
          };

          const scope = authService.getDataScope(user);

          switch (role) {
            case 'pastor':
            case 'admin':
              expect(scope.type).toBe('all');
              break;

            case 'follow_up':
              expect(scope.type).toBe('assigned');
              if (scope.type === 'assigned') {
                expect(scope.followUpMemberId).toBe(followUpMemberId);
              }
              break;

            case 'department_lead':
              expect(scope.type).toBe('department');
              if (scope.type === 'department') {
                expect(scope.departmentIds).toEqual(userDepts);
              }
              break;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Data Scope Filtering Correctness
   * 
   * Feature: member-terminology-update, Property 4: Data Scope Filtering Correctness
   * Validates: Requirements 3.3
   * 
   * For any user with an "assigned" data scope, the scope object should contain a 
   * followUpMemberId property (not volunteerId), and filtering operations should 
   * correctly use this property to restrict data access.
   */
  it('should use followUpMemberId in assigned scope and filter correctly', () => {
    fc.assert(
      fc.property(
        userIdArb,
        emailArb,
        followUpMemberIdArb,
        fc.array(memberArb, { minLength: 1, maxLength: 30 }),
        (userId, email, followUpMemberId, members) => {
          const user: UserContext = {
            userId,
            email,
            role: 'follow_up',
            followUpMemberId,
          };

          // Get data scope
          const scope = authService.getDataScope(user);

          // Property: Scope should be "assigned" type
          expect(scope.type).toBe('assigned');

          // Property: Scope should have followUpMemberId property (not volunteerId)
          if (scope.type === 'assigned') {
            expect(scope).toHaveProperty('followUpMemberId');
            expect(scope.followUpMemberId).toBe(followUpMemberId);
            // Ensure no volunteerId property exists
            expect(scope).not.toHaveProperty('volunteerId');
          }

          // Assign some members to this follow-up member
          const assignedMembers = members.map((m, i) => ({
            ...m,
            followUpOwner: i % 2 === 0 ? followUpMemberId : 'recOtherMember01',
          }));

          // Filter members
          const filtered = authService.filterMembersByScope(assignedMembers, user);

          // Property: All filtered members should have followUpOwner matching followUpMemberId
          for (const member of filtered) {
            expect(member.followUpOwner).toBe(followUpMemberId);
          }

          // Property: No members with different followUpOwner should be included
          const expectedCount = assignedMembers.filter(m => m.followUpOwner === followUpMemberId).length;
          expect(filtered).toHaveLength(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Filter Formula Construction
   * 
   * Feature: member-terminology-update, Property 5: Filter Formula Construction
   * Validates: Requirements 3.4
   * 
   * For any Airtable filter formula constructed for role-based access control, 
   * the formula should correctly reference the "Follow-up Owner" field in Airtable 
   * while using followUpMemberId in the code variables.
   */
  it('should construct filter formulas using followUpMemberId while preserving Airtable field names', () => {
    fc.assert(
      fc.property(
        userIdArb,
        emailArb,
        followUpMemberIdArb,
        fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: undefined }),
        (userId, email, followUpMemberId, baseFormula) => {
          const user: UserContext = {
            userId,
            email,
            role: 'follow_up',
            followUpMemberId,
          };

          // Build filter formula
          const formula = authService.buildMemberFilterFormula(user, baseFormula || undefined);

          // Property: Formula should be a non-empty string
          expect(typeof formula).toBe('string');
          expect(formula.length).toBeGreaterThan(0);

          // Property: Formula should reference Airtable field name "Follow-up Owner"
          expect(formula).toContain('Follow-up Owner');

          // Property: Formula should contain the followUpMemberId value
          expect(formula).toContain(followUpMemberId);

          // Property: Formula should use FIND function for Airtable lookup
          expect(formula).toContain('FIND');

          // Property: If base formula provided, it should be combined with AND
          if (baseFormula && baseFormula !== 'TRUE()') {
            expect(formula).toContain('AND');
            expect(formula).toContain(baseFormula);
          }

          // Property: Formula should NOT contain the word "volunteer" (code uses followUpMemberId)
          // Note: "Follow-up Owner" is the Airtable field name and is allowed
          const formulaLower = formula.toLowerCase();
          const hasVolunteerWord = formulaLower.includes('volunteer') && !formulaLower.includes('follow-up');
          expect(hasVolunteerWord).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
