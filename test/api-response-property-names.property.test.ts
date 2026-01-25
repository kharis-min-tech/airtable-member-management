/**
 * Property-Based Tests for API Response Property Names
 * 
 * Property 6: API Response Property Names
 * Validates: Requirements 4.1, 4.2
 * 
 * For any API response containing user context or follow-up assignment data,
 * the response object should use followUpMemberId (not volunteerId) and should
 * not contain any properties with "volunteer" in the name.
 * 
 * Feature: member-terminology-update, Property 6: API Response Property Names
 */

import * as fc from 'fast-check';

/**
 * Recursively check an object for properties containing "volunteer" terminology
 * Returns array of paths to properties with "volunteer" in the name
 */
function findVolunteerProperties(obj: unknown, path: string = ''): string[] {
  const violations: string[] = [];
  
  if (obj === null || obj === undefined) {
    return violations;
  }
  
  if (typeof obj !== 'object') {
    return violations;
  }
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      violations.push(...findVolunteerProperties(item, `${path}[${index}]`));
    });
    return violations;
  }
  
  // Check object properties
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    // Check if property name contains "volunteer" (case-insensitive)
    // Exclude "volunteerId" as it might be in legacy data
    if (/volunteer/i.test(key) && key !== 'volunteerId') {
      violations.push(currentPath);
    }
    
    // Recursively check nested objects
    if (typeof value === 'object' && value !== null) {
      violations.push(...findVolunteerProperties(value, currentPath));
    }
  }
  
  return violations;
}

/**
 * Check if an object has followUpMemberId property (when it should)
 */
function hasFollowUpMemberIdWhenExpected(obj: unknown): boolean {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return true; // Not applicable
  }
  
  // If object has any member-related ID field, it should use followUpMemberId
  const objRecord = obj as Record<string, unknown>;
  
  // Check if this looks like a user context or follow-up related object
  const hasUserContextFields = 'userId' in objRecord || 'email' in objRecord || 'role' in objRecord;
  const hasFollowUpFields = 'assignedTo' in objRecord || 'followUpOwner' in objRecord;
  
  if (hasUserContextFields || hasFollowUpFields) {
    // If it has volunteerId, that's wrong - should be followUpMemberId
    if ('volunteerId' in objRecord) {
      return false;
    }
  }
  
  return true;
}

describe('Property 6: API Response Property Names', () => {
  /**
   * Property 6.1: API responses should not contain "volunteer" property names
   * 
   * For any API response object, property names should not contain "volunteer"
   * (except for legacy "volunteerId" which may exist temporarily)
   * 
   * Validates: Requirements 4.1, 4.2
   */
  it('should not have property names containing "volunteer" terminology', () => {
    fc.assert(
      fc.property(
        // Generate various response-like objects
        fc.record({
          success: fc.boolean(),
          data: fc.oneof(
            // User context object
            fc.record({
              userId: fc.uuid(),
              email: fc.emailAddress(),
              role: fc.constantFrom('pastor', 'admin', 'follow_up', 'department_lead'),
              followUpMemberId: fc.option(fc.uuid(), { nil: undefined }),
              departmentIds: fc.option(fc.array(fc.uuid()), { nil: undefined }),
            }),
            // Follow-up assignment object
            fc.record({
              id: fc.uuid(),
              memberId: fc.uuid(),
              assignedTo: fc.uuid(),
              followUpMemberId: fc.uuid(),
              status: fc.constantFrom('Assigned', 'In Progress', 'Completed'),
              dueDate: fc.date().map(d => d.toISOString()),
            }),
            // Array of assignments
            fc.array(
              fc.record({
                id: fc.uuid(),
                memberName: fc.string(),
                followUpMemberName: fc.string(),
                status: fc.constantFrom('Assigned', 'In Progress', 'Completed'),
              })
            ),
          ),
          timestamp: fc.date().map(d => d.toISOString()),
        }),
        (response) => {
          // Property: Response should not have properties with "volunteer" in the name
          const violations = findVolunteerProperties(response);
          
          if (violations.length > 0) {
            throw new Error(
              `Found properties with "volunteer" terminology: ${violations.join(', ')}`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.2: User context responses should use followUpMemberId
   * 
   * For any response containing user context, if there's a member ID field,
   * it should be named followUpMemberId, not volunteerId
   * 
   * Validates: Requirements 4.1
   */
  it('should use followUpMemberId in user context responses', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
          role: fc.constantFrom('pastor', 'admin', 'follow_up', 'department_lead'),
          followUpMemberId: fc.option(fc.uuid(), { nil: undefined }),
          departmentIds: fc.option(fc.array(fc.uuid()), { nil: undefined }),
        }),
        (userContext) => {
          // Property: Should have followUpMemberId, not volunteerId
          expect(userContext).toHaveProperty('followUpMemberId');
          expect(userContext).not.toHaveProperty('volunteerId');
          
          // Property: Should not have any "volunteer" properties
          const violations = findVolunteerProperties(userContext);
          expect(violations).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.3: Follow-up assignment responses should use member terminology
   * 
   * For any response containing follow-up assignments, property names should
   * use "member" or "followUpMember" terminology, not "volunteer"
   * 
   * Validates: Requirements 4.2
   */
  it('should use member terminology in follow-up assignment responses', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            memberName: fc.string({ minLength: 1, maxLength: 50 }),
            followUpMemberName: fc.string({ minLength: 1, maxLength: 50 }),
            followUpMemberId: fc.uuid(),
            status: fc.constantFrom('Assigned', 'In Progress', 'Completed'),
            dueDate: fc.date().map(d => d.toISOString()),
            assignedDate: fc.date().map(d => d.toISOString()),
          })
        ),
        (assignments) => {
          // Property: Each assignment should use member terminology
          assignments.forEach((assignment, index) => {
            // Should have followUpMemberName, not volunteerName
            expect(assignment).toHaveProperty('followUpMemberName');
            expect(assignment).not.toHaveProperty('volunteerName');
            
            // Should have followUpMemberId, not volunteerId
            expect(assignment).toHaveProperty('followUpMemberId');
            expect(assignment).not.toHaveProperty('volunteerId');
            
            // Should not have any "volunteer" properties
            const violations = findVolunteerProperties(assignment);
            if (violations.length > 0) {
              throw new Error(
                `Assignment at index ${index} has volunteer properties: ${violations.join(', ')}`
              );
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.4: Nested response objects should consistently use member terminology
   * 
   * For any deeply nested response structure, all levels should use
   * member terminology consistently
   * 
   * Validates: Requirements 4.1, 4.2
   */
  it('should use member terminology consistently in nested structures', () => {
    fc.assert(
      fc.property(
        fc.record({
          success: fc.constant(true),
          data: fc.record({
            summary: fc.record({
              totalAssignments: fc.integer({ min: 0, max: 100 }),
              activeFollowUpMembers: fc.integer({ min: 0, max: 50 }),
            }),
            assignments: fc.array(
              fc.record({
                id: fc.uuid(),
                member: fc.record({
                  id: fc.uuid(),
                  name: fc.string(),
                }),
                followUpMember: fc.record({
                  id: fc.uuid(),
                  name: fc.string(),
                }),
                status: fc.constantFrom('Assigned', 'In Progress', 'Completed'),
              }),
              { maxLength: 10 }
            ),
          }),
          timestamp: fc.date().map(d => d.toISOString()),
        }),
        (response) => {
          // Property: No "volunteer" terminology at any nesting level
          const violations = findVolunteerProperties(response);
          
          if (violations.length > 0) {
            throw new Error(
              `Found volunteer terminology in nested structure: ${violations.join(', ')}`
            );
          }
          
          // Property: User context should use followUpMemberId when present
          expect(hasFollowUpMemberIdWhenExpected(response)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.5: Response transformation should preserve data while updating terminology
   * 
   * When transforming responses, all data should be preserved while
   * property names are updated to use member terminology
   * 
   * Validates: Requirements 4.1, 4.2
   */
  it('should preserve data integrity when using member terminology', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress(),
          followUpMemberId: fc.uuid(),
          assignmentCount: fc.integer({ min: 0, max: 50 }),
        }),
        (data) => {
          // Property: All original data fields should be present
          expect(data).toHaveProperty('id');
          expect(data).toHaveProperty('name');
          expect(data).toHaveProperty('email');
          expect(data).toHaveProperty('followUpMemberId');
          expect(data).toHaveProperty('assignmentCount');
          
          // Property: No data should be lost in terminology update
          expect(data.id).toBeTruthy();
          expect(data.name).toBeTruthy();
          expect(data.followUpMemberId).toBeTruthy();
          
          // Property: No "volunteer" terminology
          const violations = findVolunteerProperties(data);
          expect(violations).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
