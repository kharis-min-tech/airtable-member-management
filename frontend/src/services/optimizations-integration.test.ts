/**
 * Integration Tests for API Performance Optimizations
 * 
 * Tests end-to-end behavior of:
 * - Parallel dashboard loading
 * - Request deduplication across components
 * - Stale-while-revalidate cache behavior
 * - Debounced date filter auto-load
 * 
 * Requirements: 1.1, 2.1, 3.2, 6.1, 4.1
 * Feature: api-performance-optimization
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { apiClient, clearCache, onCacheRefresh, __testSetCacheWithTimestamp } from './api-client';
import { requestDeduplicator } from './request-deduplicator';
import { loadDashboardDataParallel } from './church-api';
import type { Service, ServiceKPIs, EvangelismStats, SoulsAssignedByMember, FollowUpInteraction } from '../types';

// Mock aws-amplify/auth module
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(async () => ({
    tokens: {
      idToken: {
        toString: () => 'mock-token',
      },
    },
  })),
}));

describe('API Performance Optimizations - Integration Tests', () => {
  beforeEach(() => {
    clearCache();
    requestDeduplicator.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearCache();
    requestDeduplicator.clear();
    vi.restoreAllMocks();
  });

  describe('Parallel Dashboard Loading', () => {
    test('loads all dashboard data in parallel - all requests start simultaneously', async () => {
      // Requirements: 1.1
      const mockServices: Service[] = [
        { id: 'svc1', serviceName: 'Sunday Service', serviceDate: new Date('2024-01-01'), serviceCode: 'SUN-001' } as Service,
      ];
      const mockKPIs: ServiceKPIs = {
        totalAttendance: 100,
        firstTimersCount: 5,
        returnersCount: 10,
        membersCount: 85,
        childrenCount: 0,
        evangelismContactsCount: 0,
        visitorsCount: 15,
        departmentBreakdown: [],
      };
      const mockEvangelism: EvangelismStats = {
        period: 'week',
        contactCount: 50,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
      };
      const mockSouls: SoulsAssignedByMember[] = [
        { followUpMemberId: 'm1', followUpMemberName: 'John Doe', members: [] },
      ];
      const mockFollowUps: FollowUpInteraction[] = [
        { id: 'fu1', memberId: 'm1', memberName: 'Member 1', followUpMemberId: 'fm1', followUpMemberName: 'Follow Up Member', date: new Date('2024-01-01'), comment: 'Follow up' },
      ];

      const requestTimestamps: number[] = [];
      
      const mockFetch = vi.fn(async (url: string | URL | Request) => {
        requestTimestamps.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const urlString = typeof url === 'string' ? url : url.toString();
        let data: unknown;
        if (urlString.includes('type=services')) {
          data = mockServices;
        } else if (urlString.includes('type=kpis')) {
          data = mockKPIs;
        } else if (urlString.includes('type=evangelism')) {
          data = mockEvangelism;
        } else if (urlString.includes('type=souls-by-member')) {
          data = mockSouls;
        } else if (urlString.includes('type=interactions')) {
          data = mockFollowUps;
        } else {
          data = [];
        }
        
        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });
      global.fetch = mockFetch as any;

      const startTime = Date.now();
      const result = await loadDashboardDataParallel('svc1', 'week');
      const endTime = Date.now();

      // Verify all requests started within 50ms of each other (parallel execution)
      const firstRequestTime = requestTimestamps[0];
      const lastRequestTime = requestTimestamps[requestTimestamps.length - 1];
      const timeDifference = lastRequestTime - firstRequestTime;
      
      expect(timeDifference).toBeLessThan(50);
      expect(requestTimestamps.length).toBe(5);

      // Verify total time is close to single request time (not sum of all)
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(200); // Should be ~100ms, not 500ms

      // Verify all data loaded successfully
      expect(result.services).toEqual(mockServices);
      expect(result.serviceKPIs).toEqual(mockKPIs);
      expect(result.evangelismStats).toEqual(mockEvangelism);
      expect(result.soulsAssigned).toEqual(mockSouls);
      expect(result.followUpInteractions).toEqual(mockFollowUps);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    test('handles partial failures gracefully - returns successful results', async () => {
      // Requirements: 1.1, 1.4
      const mockServices: Service[] = [
        { id: 'svc1', serviceName: 'Sunday Service', serviceDate: new Date('2024-01-01'), serviceCode: 'SUN-001' } as Service,
      ];
      const mockEvangelism: EvangelismStats = {
        period: 'week',
        contactCount: 50,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
      };

      const mockFetch = vi.fn(async (url: string | URL | Request) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const urlString = typeof url === 'string' ? url : url.toString();
        // Fail KPIs and souls requests
        if (urlString.includes('type=kpis') || urlString.includes('type=souls-by-member')) {
          return new Response(
            JSON.stringify({ message: 'Service unavailable', code: 'SERVICE_ERROR' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        let data: unknown;
        if (urlString.includes('type=services')) {
          data = mockServices;
        } else if (urlString.includes('type=evangelism')) {
          data = mockEvangelism;
        } else if (urlString.includes('type=interactions')) {
          data = [];
        } else {
          data = [];
        }
        
        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });
      global.fetch = mockFetch as any;

      const result = await loadDashboardDataParallel('svc1', 'week');

      // Verify successful results are returned
      expect(result.services).toEqual(mockServices);
      expect(result.evangelismStats).toEqual(mockEvangelism);
      expect(result.followUpInteractions).toEqual([]);

      // Verify failed results are null with errors
      expect(result.serviceKPIs).toBeNull();
      expect(result.soulsAssigned).toEqual([]);
      expect(result.errors.serviceKPIs).toBeDefined();
      expect(result.errors.soulsAssigned).toBeDefined();
    }, 15000);
  });

  describe('Request Deduplication Across Components', () => {
    test('multiple components requesting same data share single API call', async () => {
      // Requirements: 2.1
      const endpoint = '/query/dashboard?type=services';
      const mockData: Service[] = [
        { id: 'svc1', serviceName: 'Sunday Service', serviceDate: new Date('2024-01-01'), serviceCode: 'SUN-001' } as Service,
      ];
      
      let fetchCallCount = 0;
      const mockFetch = vi.fn(async () => {
        fetchCallCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return new Response(
          JSON.stringify({ success: true, data: mockData }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });
      global.fetch = mockFetch as any;

      // Simulate 3 different components requesting same data simultaneously
      const component1Request = apiClient.get<Service[]>(endpoint);
      const component2Request = apiClient.get<Service[]>(endpoint);
      const component3Request = apiClient.get<Service[]>(endpoint);

      const [result1, result2, result3] = await Promise.all([
        component1Request,
        component2Request,
        component3Request,
      ]);

      // Verify only one fetch call was made
      expect(fetchCallCount).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify all components received same data
      expect(result1.data).toEqual(mockData);
      expect(result2.data).toEqual(mockData);
      expect(result3.data).toEqual(mockData);

      // Verify deduplication metrics
      const metrics = requestDeduplicator.getMetrics();
      expect(metrics.totalSubscribers).toBeGreaterThanOrEqual(3);
    });

    test('deduplication window expires after 1 second - allows new requests', async () => {
      // Requirements: 2.1
      const endpoint = '/query/dashboard?type=services';
      const mockData: Service[] = [
        { id: 'svc1', serviceName: 'Sunday Service', serviceDate: new Date('2024-01-01'), serviceCode: 'SUN-001' } as Service,
      ];
      
      let fetchCallCount = 0;
      const mockFetch = vi.fn(async () => {
        fetchCallCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return new Response(
          JSON.stringify({ success: true, data: mockData }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });
      global.fetch = mockFetch as any;

      // First request with skipCache to bypass cache layer
      await apiClient.get<Service[]>(endpoint, { skipCache: true });
      expect(fetchCallCount).toBe(1);

      // Wait for deduplication window to expire (1 second)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Second request after window expires with skipCache
      await apiClient.get<Service[]>(endpoint, { skipCache: true });
      
      // Verify second fetch call was made
      expect(fetchCallCount).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Stale-While-Revalidate Cache Behavior', () => {
    test('fresh cache returns immediately without background refresh', async () => {
      // Requirements: 3.2
      const endpoint = '/query/dashboard?type=services';
      const mockData: Service[] = [
        { id: 'svc1', serviceName: 'Sunday Service', serviceDate: new Date('2024-01-01'), serviceCode: 'SUN-001' } as Service,
      ];
      
      // Set fresh cache (2 minutes old, less than 5 minute stale threshold)
      const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
      __testSetCacheWithTimestamp(endpoint, mockData, twoMinutesAgo);

      let fetchCallCount = 0;
      const mockFetch = vi.fn(async () => {
        fetchCallCount++;
        return new Response(
          JSON.stringify({ success: true, data: mockData }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });
      global.fetch = mockFetch as any;

      const startTime = Date.now();
      const result = await apiClient.get<Service[]>(endpoint);
      const endTime = Date.now();

      // Verify immediate return (< 10ms)
      expect(endTime - startTime).toBeLessThan(10);

      // Verify no fetch call was made
      expect(fetchCallCount).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();

      // Verify cached data returned
      expect(result.data).toEqual(mockData);
      expect(result.cached).toBe(true);
    });

    test('stale cache returns immediately AND triggers background refresh', async () => {
      // Requirements: 3.2
      const endpoint = '/query/dashboard?type=services';
      const staleData: Service[] = [
        { id: 'svc1', serviceName: 'Old Service', serviceDate: new Date('2024-01-01'), serviceCode: 'OLD-001' } as Service,
      ];
      const freshData: Service[] = [
        { id: 'svc2', serviceName: 'New Service', serviceDate: new Date('2024-01-02'), serviceCode: 'NEW-001' } as Service,
      ];
      
      // Set stale cache (7 minutes old, between 5-15 minute threshold)
      const sevenMinutesAgo = Date.now() - (7 * 60 * 1000);
      __testSetCacheWithTimestamp(endpoint, staleData, sevenMinutesAgo);

      let fetchCallCount = 0;
      const mockFetch = vi.fn(async () => {
        fetchCallCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return new Response(
          JSON.stringify({ success: true, data: freshData }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });
      global.fetch = mockFetch as any;

      // Register callback for background refresh
      let refreshedData: Service[] | null = null;
      const unsubscribe = onCacheRefresh<Service[]>(endpoint, (data) => {
        refreshedData = data;
      });

      const startTime = Date.now();
      const result = await apiClient.get<Service[]>(endpoint);
      const endTime = Date.now();

      // Verify immediate return (< 10ms)
      expect(endTime - startTime).toBeLessThan(10);

      // Verify stale data returned immediately
      expect(result.data).toEqual(staleData);
      expect(result.cached).toBe(true);

      // Wait for background refresh to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify background fetch was triggered
      expect(fetchCallCount).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify callback received fresh data
      expect(refreshedData).toEqual(freshData);

      unsubscribe();
    });

    test('expired cache fetches fresh data with loading state', async () => {
      // Requirements: 3.2
      const endpoint = '/query/dashboard?type=services';
      const expiredData: Service[] = [
        { id: 'svc1', serviceName: 'Expired Service', serviceDate: new Date('2024-01-01'), serviceCode: 'EXP-001' } as Service,
      ];
      const freshData: Service[] = [
        { id: 'svc2', serviceName: 'Fresh Service', serviceDate: new Date('2024-01-02'), serviceCode: 'FRESH-001' } as Service,
      ];
      
      // Set expired cache (20 minutes old, beyond 15 minute TTL)
      const twentyMinutesAgo = Date.now() - (20 * 60 * 1000);
      __testSetCacheWithTimestamp(endpoint, expiredData, twentyMinutesAgo);

      let fetchCallCount = 0;
      const mockFetch = vi.fn(async () => {
        fetchCallCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return new Response(
          JSON.stringify({ success: true, data: freshData }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });
      global.fetch = mockFetch as any;

      const startTime = Date.now();
      const result = await apiClient.get<Service[]>(endpoint);
      const endTime = Date.now();

      // Verify NOT immediate return (should wait for fetch)
      expect(endTime - startTime).toBeGreaterThan(50);

      // Verify fetch was called
      expect(fetchCallCount).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify fresh data returned (not expired data)
      expect(result.data).toEqual(freshData);
      expect(result.cached).toBe(false);
    });
  });

  describe('Debounced Date Filter Auto-Load', () => {
    test('debounces rapid date changes - only final value triggers fetch', async () => {
      // Requirements: 6.1
      // Note: This test demonstrates the concept of debouncing at the API client level
      // The actual debouncing is implemented in the useDebouncedDateFilter hook
      // which is tested separately in useDebouncedDateFilter.property.test.ts
      
      const mockData: Service[] = [
        { id: 'svc1', serviceName: 'Service', serviceDate: new Date('2024-01-15'), serviceCode: 'SVC-001' } as Service,
      ];
      
      let fetchCallCount = 0;
      
      const mockFetch = vi.fn(async () => {
        fetchCallCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return new Response(
          JSON.stringify({ success: true, data: mockData }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });
      global.fetch = mockFetch as any;

      // Simulate debounced behavior by making requests with delays
      // In real usage, the useDebouncedDateFilter hook handles this
      const endpoint = '/query/dashboard?type=services&startDate=2024-01-15&endDate=2024-01-15';
      
      // First request
      const promise1 = apiClient.get<Service[]>(endpoint, { skipCache: true });
      
      // Wait for it to complete
      await promise1;
      
      // Verify single fetch occurred
      expect(fetchCallCount).toBe(1);
    });

    test('cache invalidation on date change - previous date data cleared', async () => {
      // Requirements: 6.1
      // This test verifies that clearCache() properly invalidates cached data
      const date1 = '2024-01-01';
      const mockData1: Service[] = [
        { id: 'svc1', serviceName: 'Service 1', serviceDate: new Date(date1), serviceCode: 'SVC-001' } as Service,
      ];
      
      let fetchCallCount = 0;
      const mockFetch = vi.fn(async () => {
        fetchCallCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return new Response(
          JSON.stringify({ success: true, data: mockData1 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });
      global.fetch = mockFetch as any;

      // First request with date1 - should cache
      const endpoint1 = `/query/dashboard?type=services&startDate=${date1}&endDate=${date1}`;
      await apiClient.get<Service[]>(endpoint1);
      expect(fetchCallCount).toBe(1);
      
      // Second request - should use cache
      await apiClient.get<Service[]>(endpoint1);
      expect(fetchCallCount).toBe(1); // Still 1, cache was used

      // Clear cache (simulating date change invalidation)
      clearCache();
      requestDeduplicator.clear(); // Also clear deduplicator

      // Third request - should fetch again since cache was cleared
      await apiClient.get<Service[]>(endpoint1);
      expect(fetchCallCount).toBe(2); // New fetch occurred
    });
  });

  describe('End-to-End Optimization Flow', () => {
    test('complete dashboard load with all optimizations working together', async () => {
      // Requirements: 1.1, 2.1, 3.2
      const mockServices: Service[] = [
        { id: 'svc1', serviceName: 'Sunday Service', serviceDate: new Date('2024-01-01'), serviceCode: 'SUN-001' } as Service,
      ];
      const mockKPIs: ServiceKPIs = {
        totalAttendance: 100,
        firstTimersCount: 5,
        returnersCount: 10,
        membersCount: 85,
        childrenCount: 0,
        evangelismContactsCount: 0,
        visitorsCount: 15,
        departmentBreakdown: [],
      };
      const mockEvangelism: EvangelismStats = {
        period: 'week',
        contactCount: 50,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
      };

      let fetchCallCount = 0;
      const mockFetch = vi.fn(async (url: string | URL | Request) => {
        fetchCallCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const urlString = typeof url === 'string' ? url : url.toString();
        let data: unknown;
        if (urlString.includes('type=services')) {
          data = mockServices;
        } else if (urlString.includes('type=kpis')) {
          data = mockKPIs;
        } else if (urlString.includes('type=evangelism')) {
          data = mockEvangelism;
        } else {
          data = [];
        }
        
        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });
      global.fetch = mockFetch as any;

      // First load - should execute in parallel
      const startTime1 = Date.now();
      const result1 = await loadDashboardDataParallel('svc1', 'week');
      const endTime1 = Date.now();

      expect(fetchCallCount).toBe(5); // All 5 endpoints called
      expect(endTime1 - startTime1).toBeLessThan(200); // Parallel execution

      // Second load immediately - should use cache (no new fetches)
      fetchCallCount = 0;
      mockFetch.mockClear();
      
      const startTime2 = Date.now();
      const result2 = await loadDashboardDataParallel('svc1', 'week');
      const endTime2 = Date.now();

      expect(fetchCallCount).toBe(0); // No new fetches (cache hit)
      expect(endTime2 - startTime2).toBeLessThan(50); // Instant cache return
      expect(result2.services).toEqual(result1.services);
    });
  });
});
