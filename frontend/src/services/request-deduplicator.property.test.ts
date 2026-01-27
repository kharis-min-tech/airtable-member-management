import { describe, test, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { RequestDeduplicator } from './request-deduplicator';

describe('RequestDeduplicator Property Tests', () => {
  let deduplicator: RequestDeduplicator;

  beforeEach(() => {
    deduplicator = new RequestDeduplicator(1000);
  });

  // Feature: api-performance-optimization, Property 4: Request Deduplication Effectiveness
  test('Property 4: multiple identical requests within 1s window execute only once', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Random endpoint
        fc.record({
          id: fc.integer({ min: 1, max: 1000 }),
          filter: fc.string({ minLength: 0, maxLength: 20 }),
        }), // Random parameters
        fc.integer({ min: 2, max: 10 }), // Number of simultaneous requests
        async (endpoint, params, requestCount) => {
          let apiCallCount = 0;
          const expectedResult = { data: 'test-result', timestamp: Date.now() };

          // Mock fetcher that tracks call count
          const mockFetcher = vi.fn(async () => {
            apiCallCount++;
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 10));
            return expectedResult;
          });

          // Make multiple simultaneous requests
          const requests = Array.from({ length: requestCount }, () =>
            deduplicator.fetch(endpoint, params, mockFetcher)
          );

          // Wait for all requests to complete
          const results = await Promise.all(requests);

          // Verify only one API call was made
          expect(apiCallCount).toBe(1);
          expect(mockFetcher).toHaveBeenCalledTimes(1);

          // Verify all callers received the same result
          for (const result of results) {
            expect(result).toEqual(expectedResult);
            expect(result).toBe(expectedResult); // Same reference
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: api-performance-optimization, Property 5: Deduplication Window Expiration
  test('Property 5: requests made >1s apart result in separate API calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // Random endpoint
        fc.record({
          id: fc.integer({ min: 1, max: 1000 }),
          filter: fc.string({ minLength: 0, maxLength: 20 }),
        }), // Random parameters
        async (endpoint, params) => {
          let apiCallCount = 0;
          const results: any[] = [];

          // Mock fetcher that tracks call count and returns unique results
          const mockFetcher = vi.fn(async () => {
            const callNumber = ++apiCallCount;
            const result = { data: `result-${callNumber}`, timestamp: Date.now() };
            results.push(result);
            await new Promise(resolve => setTimeout(resolve, 10));
            return result;
          });

          // Make first request
          const firstResult = await deduplicator.fetch(endpoint, params, mockFetcher);
          expect(apiCallCount).toBe(1);

          // Wait for deduplication window to expire (1100ms to be safe)
          await new Promise(resolve => setTimeout(resolve, 1100));

          // Make second request with same endpoint and params
          const secondResult = await deduplicator.fetch(endpoint, params, mockFetcher);

          // Verify two separate API calls occurred
          expect(apiCallCount).toBe(2);
          expect(mockFetcher).toHaveBeenCalledTimes(2);

          // Verify results are different (not deduplicated)
          expect(firstResult).not.toEqual(secondResult);
          expect(firstResult.data).toBe('result-1');
          expect(secondResult.data).toBe('result-2');
        }
      ),
      { numRuns: 100 }
    );
  }, 150000); // 150 second timeout for 100 iterations with 1.1s wait each
});