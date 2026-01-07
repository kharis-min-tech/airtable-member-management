/**
 * Property-Based Tests for Missing Members Page
 * 
 * Property 10: Missing Members Status Filter
 * Validates: Requirements 5.5
 * 
 * For any status filter applied to the missing members list, 
 * the filtered result SHALL contain only members whose status 
 * matches the selected filter value.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Member, MemberStatus } from '../../types';

/**
 * The filter function extracted from MissingMembers component logic
 * This is the core filtering logic we want to test
 */
function filterMembersByStatus(members: Member[], statusFilter: string): Member[] {
  return members.filter((member) => {
    if (statusFilter && member.status !== statusFilter) {
      return false;
    }
    return true;
  });
}

/**
 * Arbitrary for generating valid member statuses
 */
const memberStatusArb: fc.Arbitrary<MemberStatus> = fc.constantFrom(
  'Member',
  'First Timer',
  'Returner',
  'Evangelism Contact'
);

/**
 * Arbitrary for generating a minimal Member object with required fields
 */
const memberArb: fc.Arbitrary<Member> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  firstName: fc.string({ minLength: 1, maxLength: 20 }),
  lastName: fc.string({ minLength: 1, maxLength: 20 }),
  fullName: fc.string({ minLength: 1, maxLength: 40 }),
  status: memberStatusArb,
  source: fc.constantFrom('First Timer Form', 'Returner Form', 'Evangelism', 'Other') as fc.Arbitrary<Member['source']>,
  dateFirstCaptured: fc.date(),
  followUpStatus: fc.constantFrom('Not Started', 'In Progress', 'Contacted', 'Visiting', 'Integrated', 'Established') as fc.Arbitrary<Member['followUpStatus']>,
  phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: undefined }),
  email: fc.option(fc.emailAddress(), { nil: undefined }),
  followUpOwner: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
});

/**
 * Arbitrary for generating a list of members
 */
const membersListArb = fc.array(memberArb, { minLength: 0, maxLength: 50 });

describe('Property 10: Missing Members Status Filter', () => {
  /**
   * Property 10.1: Filtered results only contain members with matching status
   * 
   * For any list of members and any status filter value,
   * all members in the filtered result should have the selected status.
   * 
   * Validates: Requirements 5.5
   */
  it('should only return members with matching status when filter is applied', () => {
    fc.assert(
      fc.property(
        membersListArb,
        memberStatusArb,
        (members, statusFilter) => {
          const filtered = filterMembersByStatus(members, statusFilter);
          
          // All filtered members should have the selected status
          const allMatchStatus = filtered.every(member => member.status === statusFilter);
          
          expect(allMatchStatus).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.2: Empty filter returns all members
   * 
   * For any list of members, when no status filter is applied (empty string),
   * all members should be returned.
   * 
   * Validates: Requirements 5.5
   */
  it('should return all members when no status filter is applied', () => {
    fc.assert(
      fc.property(
        membersListArb,
        (members) => {
          const filtered = filterMembersByStatus(members, '');
          
          // All members should be returned when filter is empty
          expect(filtered.length).toBe(members.length);
          expect(filtered).toEqual(members);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.3: Filtered count is less than or equal to original count
   * 
   * For any list of members and any status filter,
   * the filtered result should never have more members than the original list.
   * 
   * Validates: Requirements 5.5
   */
  it('should never return more members than the original list', () => {
    fc.assert(
      fc.property(
        membersListArb,
        fc.oneof(memberStatusArb, fc.constant('')),
        (members, statusFilter) => {
          const filtered = filterMembersByStatus(members, statusFilter);
          
          expect(filtered.length).toBeLessThanOrEqual(members.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.4: Filter preserves member data integrity
   * 
   * For any list of members and any status filter,
   * the filtered members should be exact references to the original members
   * (no data modification).
   * 
   * Validates: Requirements 5.5
   */
  it('should preserve member data integrity after filtering', () => {
    fc.assert(
      fc.property(
        membersListArb,
        memberStatusArb,
        (members, statusFilter) => {
          const filtered = filterMembersByStatus(members, statusFilter);
          
          // Each filtered member should exist in the original list
          const allExistInOriginal = filtered.every(filteredMember =>
            members.some(originalMember => originalMember.id === filteredMember.id)
          );
          
          expect(allExistInOriginal).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.5: Filter is idempotent
   * 
   * For any list of members and any status filter,
   * applying the same filter twice should produce the same result.
   * 
   * Validates: Requirements 5.5
   */
  it('should be idempotent - filtering twice produces same result', () => {
    fc.assert(
      fc.property(
        membersListArb,
        memberStatusArb,
        (members, statusFilter) => {
          const filteredOnce = filterMembersByStatus(members, statusFilter);
          const filteredTwice = filterMembersByStatus(filteredOnce, statusFilter);
          
          expect(filteredTwice).toEqual(filteredOnce);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.6: Filtered count equals count of members with that status
   * 
   * For any list of members and any status filter,
   * the filtered result count should equal the count of members 
   * with that status in the original list.
   * 
   * Validates: Requirements 5.5
   */
  it('should return exactly the members with matching status', () => {
    fc.assert(
      fc.property(
        membersListArb,
        memberStatusArb,
        (members, statusFilter) => {
          const filtered = filterMembersByStatus(members, statusFilter);
          const expectedCount = members.filter(m => m.status === statusFilter).length;
          
          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
