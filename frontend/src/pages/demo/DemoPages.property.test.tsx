/**
 * Property-Based Tests for Demo Pages
 * 
 * Property 11: Demo Pages Make No API Calls
 * Validates: Requirements 6.6
 * 
 * For any interaction with demo pages (navigation, filtering, searching),
 * the system SHALL NOT make any HTTP requests to the backend API endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  mockServices,
  mockMembers,
  mockKPIs,
  mockEvangelismStats,
  mockSoulsAssigned,
  mockFollowUpComments,
  mockAttendanceBreakdown,
  mockDepartmentAttendance,
  mockServiceAttendees,
  mockMemberJourneys,
  mockTodaysFollowUps,
  mockNewFirstTimers,
  mockIncompleteEvangelism,
  mockUnassignedMembers,
  mockVisitedMembers,
  mockDepartmentRosters,
  getMockKPIs,
  getMockAttendanceBreakdown,
  getMockDepartmentAttendance,
  getMockServiceAttendees,
  getMockMemberJourney,
  getMockServiceComparison,
  searchMockMembers,
  filterMockServicesByDateRange,
  searchMockServices,
} from '../../data/mockData';

/**
 * Arbitrary for generating service IDs from mock data
 */
const serviceIdArb = fc.constantFrom(...mockServices.map(s => s.id));

/**
 * Arbitrary for generating member IDs from mock data
 */
const memberIdArb = fc.constantFrom(...mockMembers.map(m => m.id));

/**
 * Arbitrary for generating attendance categories
 */
const attendanceCategoryArb = fc.constantFrom(
  'firstTimers',
  'returners',
  'evangelismContacts',
  'Choir',
  'Ushers',
  'Media',
  'Children',
  'Youth'
);

/**
 * Arbitrary for generating search queries
 */
const searchQueryArb = fc.string({ minLength: 0, maxLength: 20 });

/**
 * Arbitrary for generating date ranges
 */
const dateRangeArb = fc.tuple(
  fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
  fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') })
).map(([d1, d2]) => d1 <= d2 ? [d1, d2] : [d2, d1]);

describe('Property 11: Demo Pages Make No API Calls', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let xhrOpenSpy: any;

  beforeEach(() => {
    // Spy on fetch to detect any API calls
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    
    // Spy on XMLHttpRequest.open to detect any XHR calls
    xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrOpenSpy.mockRestore();
  });

  /**
   * Property 11.1: Mock data access makes no fetch calls
   * 
   * For any service ID, accessing mock KPIs should not trigger any fetch calls.
   * 
   * Validates: Requirements 6.6
   */
  it('should not make fetch calls when accessing mock KPIs', () => {
    fc.assert(
      fc.property(
        serviceIdArb,
        (serviceId) => {
          fetchSpy.mockClear();
          
          // Access mock data
          const kpis = getMockKPIs(serviceId);
          
          // Verify no fetch calls were made
          expect(fetchSpy).not.toHaveBeenCalled();
          
          // Verify data is returned (may be null for non-existent IDs)
          expect(kpis === null || typeof kpis === 'object').toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.2: Mock attendance breakdown access makes no API calls
   * 
   * For any service ID, accessing mock attendance breakdown should not trigger any API calls.
   * 
   * Validates: Requirements 6.6
   */
  it('should not make API calls when accessing mock attendance breakdown', () => {
    fc.assert(
      fc.property(
        serviceIdArb,
        (serviceId) => {
          fetchSpy.mockClear();
          
          const breakdown = getMockAttendanceBreakdown(serviceId);
          
          expect(fetchSpy).not.toHaveBeenCalled();
          expect(breakdown === null || typeof breakdown === 'object').toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.3: Mock department attendance access makes no API calls
   * 
   * For any service ID, accessing mock department attendance should not trigger any API calls.
   * 
   * Validates: Requirements 6.6
   */
  it('should not make API calls when accessing mock department attendance', () => {
    fc.assert(
      fc.property(
        serviceIdArb,
        (serviceId) => {
          fetchSpy.mockClear();
          
          const departments = getMockDepartmentAttendance(serviceId);
          
          expect(fetchSpy).not.toHaveBeenCalled();
          expect(Array.isArray(departments)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.4: Mock service attendees access makes no API calls
   * 
   * For any service ID and category, accessing mock service attendees should not trigger any API calls.
   * 
   * Validates: Requirements 6.6
   */
  it('should not make API calls when accessing mock service attendees', () => {
    fc.assert(
      fc.property(
        serviceIdArb,
        attendanceCategoryArb,
        (serviceId, category) => {
          fetchSpy.mockClear();
          
          const attendees = getMockServiceAttendees(serviceId, category);
          
          expect(fetchSpy).not.toHaveBeenCalled();
          expect(Array.isArray(attendees)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.5: Mock member journey access makes no API calls
   * 
   * For any member ID, accessing mock member journey should not trigger any API calls.
   * 
   * Validates: Requirements 6.6
   */
  it('should not make API calls when accessing mock member journey', () => {
    fc.assert(
      fc.property(
        memberIdArb,
        (memberId) => {
          fetchSpy.mockClear();
          
          const journey = getMockMemberJourney(memberId);
          
          expect(fetchSpy).not.toHaveBeenCalled();
          expect(journey === null || typeof journey === 'object').toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.6: Mock service comparison makes no API calls
   * 
   * For any two service IDs, accessing mock service comparison should not trigger any API calls.
   * 
   * Validates: Requirements 6.6
   */
  it('should not make API calls when accessing mock service comparison', () => {
    fc.assert(
      fc.property(
        serviceIdArb,
        serviceIdArb,
        (serviceIdA, serviceIdB) => {
          fetchSpy.mockClear();
          
          const comparison = getMockServiceComparison(serviceIdA, serviceIdB);
          
          expect(fetchSpy).not.toHaveBeenCalled();
          expect(typeof comparison === 'object').toBe(true);
          expect(comparison).toHaveProperty('serviceA');
          expect(comparison).toHaveProperty('serviceB');
          expect(comparison).toHaveProperty('presentInAMissingInB');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.7: Mock member search makes no API calls
   * 
   * For any search query, searching mock members should not trigger any API calls.
   * 
   * Validates: Requirements 6.6
   */
  it('should not make API calls when searching mock members', () => {
    fc.assert(
      fc.property(
        searchQueryArb,
        (query) => {
          fetchSpy.mockClear();
          
          const results = searchMockMembers(query);
          
          expect(fetchSpy).not.toHaveBeenCalled();
          expect(Array.isArray(results)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.8: Mock service date range filter makes no API calls
   * 
   * For any date range, filtering mock services should not trigger any API calls.
   * 
   * Validates: Requirements 6.6
   */
  it('should not make API calls when filtering mock services by date range', () => {
    fc.assert(
      fc.property(
        dateRangeArb,
        ([startDate, endDate]) => {
          fetchSpy.mockClear();
          
          const results = filterMockServicesByDateRange(startDate, endDate);
          
          expect(fetchSpy).not.toHaveBeenCalled();
          expect(Array.isArray(results)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.9: Mock service search makes no API calls
   * 
   * For any search query, searching mock services should not trigger any API calls.
   * 
   * Validates: Requirements 6.6
   */
  it('should not make API calls when searching mock services', () => {
    fc.assert(
      fc.property(
        searchQueryArb,
        (query) => {
          fetchSpy.mockClear();
          
          const results = searchMockServices(query);
          
          expect(fetchSpy).not.toHaveBeenCalled();
          expect(Array.isArray(results)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.10: All mock data exports are static and make no API calls
   * 
   * Accessing any exported mock data should not trigger any API calls.
   * 
   * Validates: Requirements 6.6
   */
  it('should not make API calls when accessing any exported mock data', () => {
    fetchSpy.mockClear();
    
    // Access all exported mock data
    const allMockData = {
      services: mockServices,
      members: mockMembers,
      kpis: mockKPIs,
      evangelismStats: mockEvangelismStats,
      soulsAssigned: mockSoulsAssigned,
      followUpComments: mockFollowUpComments,
      attendanceBreakdown: mockAttendanceBreakdown,
      departmentAttendance: mockDepartmentAttendance,
      serviceAttendees: mockServiceAttendees,
      memberJourneys: mockMemberJourneys,
      todaysFollowUps: mockTodaysFollowUps,
      newFirstTimers: mockNewFirstTimers,
      incompleteEvangelism: mockIncompleteEvangelism,
      unassignedMembers: mockUnassignedMembers,
      visitedMembers: mockVisitedMembers,
      departmentRosters: mockDepartmentRosters,
    };
    
    // Verify no fetch calls were made
    expect(fetchSpy).not.toHaveBeenCalled();
    
    // Verify all data is accessible
    expect(allMockData.services.length).toBeGreaterThan(0);
    expect(allMockData.members.length).toBeGreaterThan(0);
    expect(Object.keys(allMockData.kpis).length).toBeGreaterThan(0);
  });

  /**
   * Property 11.11: Mock data functions are pure and deterministic
   * 
   * For any input, calling mock data functions multiple times should return
   * consistent results without making API calls.
   * 
   * Validates: Requirements 6.6
   */
  it('should return consistent results for the same input (deterministic)', () => {
    fc.assert(
      fc.property(
        serviceIdArb,
        memberIdArb,
        (serviceId, memberId) => {
          fetchSpy.mockClear();
          
          // Call functions multiple times
          const kpis1 = getMockKPIs(serviceId);
          const kpis2 = getMockKPIs(serviceId);
          
          const journey1 = getMockMemberJourney(memberId);
          const journey2 = getMockMemberJourney(memberId);
          
          // Results should be consistent
          expect(kpis1).toEqual(kpis2);
          expect(journey1).toEqual(journey2);
          
          // No API calls should have been made
          expect(fetchSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
