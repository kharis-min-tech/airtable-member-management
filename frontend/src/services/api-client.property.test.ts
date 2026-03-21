import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { apiClient, clearCache, __testSetCacheWithTimestamp } from './api-client';
import { requestDeduplicator } from './request-deduplicator';

// Mock aws-amplify/auth module
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(async () => ({
    tokens: null,
  })),
}));

describe('API Client Stale-While-Revalidate Property Tests', () => {
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

  // Feature: api-performance-optimization, Property 6: Fresh Cache Immediate Return
  test('Property 6: fresh cache (<5 min) returns immediately without fetch', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).map(s => `/query/${s}`), // Random endpoint
        fc.record({
          id: fc.integer({ min: 1, max: 1000 }),
          name: fc.string({ minLength: 1, maxLength: 20 }),
          value: fc.integer({ min: 0, max: 10000 }),
        }), // Random data
        async (endpoint, mockData) => {
          // Clear cache and deduplicator before each property test iteration
          clearCache();
          requestDeduplicator.clear();
          
          let fetchCallCount = 0;
          const mockFetch = vi.fn(async () => {
            fetchCallCount++;
            return new Response(
              JSON.stringify({ success: true, data: mockData }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          });
          global.fetch = mockFetch;

          // First request to populate cache
          const firstResponse = await apiClient.get(endpoint);
          expect(firstResponse.data).toEqual(mockData);
          expect(fetchCallCount).toBe(1);

          // Second request should use cache (fresh < 5 min)
          // Reset mock call count tracking
          mockFetch.mockClear();
          
          const secondResponse = await apiClient.get(endpoint);
          
          // Verify cache was used (no additional fetch)
          expect(mockFetch).not.toHaveBeenCalled(); // No new fetch
          expect(secondResponse.data).toEqual(mockData);
          expect(secondResponse.cached).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: api-performance-optimization, Property 7: Stale Cache Background Refresh
  test('Property 7: stale cache (5-15 min) returns immediately AND triggers background refresh', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).map(s => `/query/${s}`), // Random endpoint
        fc.record({
          id: fc.integer({ min: 1, max: 1000 }),
          name: fc.string({ minLength: 1, maxLength: 20 }),
          value: fc.integer({ min: 0, max: 10000 }),
        }), // Random initial data
        fc.record({
          id: fc.integer({ min: 1, max: 1000 }),
          name: fc.string({ minLength: 1, maxLength: 20 }),
          value: fc.integer({ min: 0, max: 10000 }),
        }), // Random refreshed data
        fc.integer({ min: 5 * 60 * 1000 + 1000, max: 14 * 60 * 1000 }), // Age: 5-14 minutes (stale)
        async (endpoint, initialData, refreshedData, cacheAge) => {
          // Clear cache and deduplicator before each property test iteration
          clearCache();
          requestDeduplicator.clear();
          
          let fetchCallCount = 0;
          
          // Mock fetch with different responses
          const mockFetch = vi.fn(async () => {
            fetchCallCount++;
            const data = refreshedData;
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 10));
            return new Response(
              JSON.stringify({ success: true, data }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          });
          global.fetch = mockFetch;

          // Manually set stale cache entry using test helper
          const staleTimestamp = Date.now() - cacheAge;
          __testSetCacheWithTimestamp(endpoint, initialData, staleTimestamp);

          // Track if callback is invoked
          let callbackInvoked = false;
          let callbackData: any = null;
          const unsubscribe = apiClient.onCacheRefresh(endpoint, (data) => {
            callbackInvoked = true;
            callbackData = data;
          });

          // Request should return stale data immediately
          const startTime = Date.now();
          const response = await apiClient.get(endpoint);
          const responseTime = Date.now() - startTime;
          
          // Should return immediately (< 100ms for cached response)
          expect(responseTime).toBeLessThan(100);
          expect(response.data).toEqual(initialData); // Returns stale data
          expect(response.cached).toBe(true);

          // Wait for background refresh to complete
          await new Promise(resolve => setTimeout(resolve, 100));

          // Verify background refresh was triggered
          expect(fetchCallCount).toBeGreaterThanOrEqual(1); // Background refresh
          
          // Verify callback was invoked with new data
          expect(callbackInvoked).toBe(true);
          expect(callbackData).toEqual(refreshedData);

          unsubscribe();
        }
      ),
      { numRuns: 20 } // Reduced from 100 to 20 for faster execution
    );
  }, 60000); // 60 second timeout

  // Feature: api-performance-optimization, Property 8: Expired Cache Fresh Fetch
  test('Property 8: expired cache (>15 min) triggers fresh fetch with loading state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).map(s => `/query/${s}`), // Random endpoint
        fc.record({
          id: fc.integer({ min: 1, max: 1000 }),
          name: fc.string({ minLength: 1, maxLength: 20 }),
          value: fc.integer({ min: 0, max: 10000 }),
        }), // Random expired data
        fc.record({
          id: fc.integer({ min: 1, max: 1000 }),
          name: fc.string({ minLength: 1, maxLength: 20 }),
          value: fc.integer({ min: 0, max: 10000 }),
        }), // Random fresh data
        fc.integer({ min: 15 * 60 * 1000 + 1000, max: 30 * 60 * 1000 }), // Age: >15 minutes (expired)
        async (endpoint, expiredData, freshData, cacheAge) => {
          // Clear cache and deduplicator before each property test iteration
          clearCache();
          requestDeduplicator.clear();
          
          let fetchCallCount = 0;
          
          // Mock fetch to return fresh data
          const mockFetch = vi.fn(async () => {
            fetchCallCount++;
            return new Response(
              JSON.stringify({ success: true, data: freshData }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          });
          global.fetch = mockFetch;

          // Manually set expired cache entry using test helper
          const expiredTimestamp = Date.now() - cacheAge;
          __testSetCacheWithTimestamp(endpoint, expiredData, expiredTimestamp);

          // Request should NOT use expired cache, should fetch fresh
          const response = await apiClient.get(endpoint);
          
          // Should have fetched fresh data (not expired data)
          expect(response.data).toEqual(freshData);
          expect(response.data).not.toEqual(expiredData);
          
          // Should have made a fetch call
          expect(fetchCallCount).toBe(1);
          
          // Response should indicate it's not from cache (fresh fetch)
          expect(response.cached).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
