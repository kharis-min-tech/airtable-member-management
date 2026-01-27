/**
 * Property-Based Tests for AuthContext
 *
 * Feature: member-terminology-update
 * Property 7: Authentication Context Property Extraction
 * Validates: Requirements 6.2
 *
 * For any authentication token processed by the frontend auth context,
 * the extracted user context SHALL contain a followUpMemberId property
 * (not volunteerId) when the custom attribute is present in the token.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthContext';
import AuthContext from './AuthContext';
import type { UserRole } from '../types';
import { useContext, useEffect } from 'react';

// Mock AWS Amplify auth functions
vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
  confirmSignIn: vi.fn(),
}));

import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

describe('Property 7: Authentication Context Property Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 7.1: followUpMemberId is extracted from custom:followUpMemberId
   *
   * For any authentication token with custom:followUpMemberId attribute,
   * the user context SHALL contain followUpMemberId property.
   *
   * Validates: Requirements 6.2
   */
  it('should extract followUpMemberId from custom:followUpMemberId token attribute', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1 }),
          email: fc.emailAddress(),
          role: fc.constantFrom('pastor', 'admin', 'follow_up', 'department_lead') as fc.Arbitrary<UserRole>,
          followUpMemberId: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          departmentIds: fc.option(fc.array(fc.string({ minLength: 1 })), { nil: undefined }),
        }),
        async (mockUserData) => {
          // Mock getCurrentUser
          vi.mocked(getCurrentUser).mockResolvedValue({
            userId: mockUserData.userId,
            username: mockUserData.email,
            signInDetails: {
              loginId: mockUserData.email,
            },
          } as any);

          // Mock fetchAuthSession with custom:followUpMemberId
          const groups = [mockUserData.role];
          const departmentIdsString = mockUserData.departmentIds?.join(',');

          vi.mocked(fetchAuthSession).mockResolvedValue({
            tokens: {
              idToken: {
                payload: {
                  'cognito:groups': groups,
                  'custom:followUpMemberId': mockUserData.followUpMemberId,
                  'custom:departmentIds': departmentIdsString,
                },
                toString: () => 'mock-token',
              },
            },
          } as any);

          let capturedUserContext: any = null;

          // Test component that captures user context
          function TestComponent() {
            const context = useContext(AuthContext);

            useEffect(() => {
              if (context?.user) {
                capturedUserContext = context.user;
              }
            }, [context]);

            return null;
          }

          const { unmount } = render(
            <AuthProvider>
              <TestComponent />
            </AuthProvider>
          );

          // Wait for auth state to be set
          await waitFor(
            () => {
              expect(capturedUserContext).not.toBeNull();
            },
            { timeout: 2000 }
          );

          // Property: User context should have followUpMemberId, not volunteerId
          expect(capturedUserContext).toHaveProperty('followUpMemberId');
          expect(capturedUserContext).not.toHaveProperty('volunteerId');

          // Property: followUpMemberId value should match the token attribute
          expect(capturedUserContext.followUpMemberId).toBe(mockUserData.followUpMemberId);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property 7.2: No volunteerId property in user context
   *
   * For any authentication token, the user context SHALL NOT contain
   * a volunteerId property.
   *
   * Validates: Requirements 6.2
   */
  it('should never have volunteerId property in user context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1 }),
          email: fc.emailAddress(),
          role: fc.constantFrom('pastor', 'admin', 'follow_up', 'department_lead') as fc.Arbitrary<UserRole>,
          followUpMemberId: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        }),
        async (mockUserData) => {
          // Mock getCurrentUser
          vi.mocked(getCurrentUser).mockResolvedValue({
            userId: mockUserData.userId,
            username: mockUserData.email,
            signInDetails: {
              loginId: mockUserData.email,
            },
          } as any);

          // Mock fetchAuthSession
          vi.mocked(fetchAuthSession).mockResolvedValue({
            tokens: {
              idToken: {
                payload: {
                  'cognito:groups': [mockUserData.role],
                  'custom:followUpMemberId': mockUserData.followUpMemberId,
                },
                toString: () => 'mock-token',
              },
            },
          } as any);

          let capturedUserContext: any = null;

          function TestComponent() {
            const context = useContext(AuthContext);

            useEffect(() => {
              if (context?.user) {
                capturedUserContext = context.user;
              }
            }, [context]);

            return null;
          }

          const { unmount } = render(
            <AuthProvider>
              <TestComponent />
            </AuthProvider>
          );

          await waitFor(
            () => {
              expect(capturedUserContext).not.toBeNull();
            },
            { timeout: 2000 }
          );

          // Property: No property should contain "volunteer" in the name
          const propertyNames = Object.keys(capturedUserContext);
          const hasVolunteerProperty = propertyNames.some((name) =>
            name.toLowerCase().includes('volunteer')
          );
          expect(hasVolunteerProperty).toBe(false);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property 7.3: Handles missing followUpMemberId gracefully
   *
   * For any authentication token without custom:followUpMemberId attribute,
   * the user context SHALL have followUpMemberId as undefined.
   *
   * Validates: Requirements 6.2
   */
  it('should handle missing followUpMemberId gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1 }),
          email: fc.emailAddress(),
          role: fc.constantFrom('pastor', 'admin', 'follow_up', 'department_lead') as fc.Arbitrary<UserRole>,
        }),
        async (mockUserData) => {
          // Mock getCurrentUser
          vi.mocked(getCurrentUser).mockResolvedValue({
            userId: mockUserData.userId,
            username: mockUserData.email,
            signInDetails: {
              loginId: mockUserData.email,
            },
          } as any);

          // Mock fetchAuthSession WITHOUT custom:followUpMemberId
          vi.mocked(fetchAuthSession).mockResolvedValue({
            tokens: {
              idToken: {
                payload: {
                  'cognito:groups': [mockUserData.role],
                  // No custom:followUpMemberId attribute
                },
                toString: () => 'mock-token',
              },
            },
          } as any);

          let capturedUserContext: any = null;

          function TestComponent() {
            const context = useContext(AuthContext);

            useEffect(() => {
              if (context?.user) {
                capturedUserContext = context.user;
              }
            }, [context]);

            return null;
          }

          const { unmount } = render(
            <AuthProvider>
              <TestComponent />
            </AuthProvider>
          );

          await waitFor(
            () => {
              expect(capturedUserContext).not.toBeNull();
            },
            { timeout: 2000 }
          );

          // Property: followUpMemberId should be undefined when not in token
          expect(capturedUserContext.followUpMemberId).toBeUndefined();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
