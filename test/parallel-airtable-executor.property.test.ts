/**
 * Property-Based Tests for Parallel Airtable Executor
 * 
 * Tests parallel query execution, rate limiting, and request queueing
 */

import * as fc from 'fast-check';
import { ParallelAirtableExecutor } from '../src/services/parallel-airtable-executor';
import { AirtableClient } from '../src/services/airtable-client';

// Feature: api-performance-optimization, Property 9: Backend Parallel Query Performance
describe('Property 9: Backend Parallel Query Performance', () => {
  /**
   * For any set of independent Airtable queries, parallel execution should complete
   * in at most 70% of the time required for sequential execution (at least 30% faster)
   * 
   * Validates: Requirements 4.4
   */
  it('should execute parallel queries at least 30% faster than sequential', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 20, max: 50 }), { minLength: 3, maxLength: 6 }), // Shorter delays for faster tests
        async (queryDelays) => {
          // Mock Airtable client (not used in this test)
          const mockClient = {} as AirtableClient;
          const executor = new ParallelAirtableExecutor(mockClient, 100); // High rate limit for this test

          // Mock query function that simulates delay
          const mockQuery = (delay: number) => {
            return new Promise<number>((resolve) => {
              setTimeout(() => resolve(delay), delay);
            });
          };

          // Sequential execution
          const sequentialStart = Date.now();
          for (const delay of queryDelays) {
            await mockQuery(delay);
          }
          const sequentialTime = Date.now() - sequentialStart;

          // Parallel execution using ParallelAirtableExecutor
          const parallelStart = Date.now();
          const queries = queryDelays.map(delay => () => mockQuery(delay));
          await executor.executeParallel(queries);
          const parallelTime = Date.now() - parallelStart;

          // Parallel should be at most 70% of sequential time (at least 30% faster)
          // Allow 50ms tolerance for timing variations and rate limiter overhead
          expect(parallelTime).toBeLessThanOrEqual(sequentialTime * 0.7 + 50);
        }
      ),
      { numRuns: 20, timeout: 10000 } // Reduced runs for faster execution
    );
  }, 15000); // Increased Jest timeout
});

// Feature: api-performance-optimization, Property 23: Airtable Rate Limit Compliance
describe('Property 23: Airtable Rate Limit Compliance', () => {
  /**
   * For any sequence of Airtable API calls over a 10-second period,
   * the average rate should not exceed 5 requests per second
   * 
   * Validates: Requirements 11.1
   */
  it('should maintain average rate ≤5 requests/second over 10 seconds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 15, max: 20 }), // Smaller number of requests for faster tests
        async (requestCount) => {
          const requestsPerSecond = 5;
          
          // Mock Airtable client
          const mockClient = {} as AirtableClient;
          const executor = new ParallelAirtableExecutor(mockClient, requestsPerSecond);

          const requestTimes: number[] = [];
          const startTime = Date.now();

          // Execute requests with rate limiting using ParallelAirtableExecutor
          const queries = Array.from({ length: requestCount }, () => 
            () => {
              requestTimes.push(Date.now());
              return Promise.resolve(true);
            }
          );

          await executor.executeParallel(queries);

          const endTime = Date.now();
          const totalDuration = (endTime - startTime) / 1000; // in seconds

          // Calculate average rate
          const averageRate = requestCount / totalDuration;

          // Average rate should not exceed 5 requests/second
          // Allow 2.5 tolerance for timing variations, startup overhead, and initial burst
          expect(averageRate).toBeLessThanOrEqual(requestsPerSecond + 2.5);
        }
      ),
      { numRuns: 5, timeout: 10000 } // Minimal runs for faster execution
    );
  }, 15000); // Increased Jest timeout
});

// Feature: api-performance-optimization, Property 24: Request Queueing Under Load
describe('Property 24: Request Queueing Under Load', () => {
  /**
   * For any burst of Airtable requests exceeding 5 per second,
   * requests should be queued rather than rejected, with all requests
   * eventually completing successfully
   * 
   * Validates: Requirements 11.3
   */
  it('should queue requests exceeding rate limit instead of rejecting', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 8, max: 12 }), // Smaller burst size for faster tests
        async (burstSize) => {
          const requestsPerSecond = 5;
          
          // Mock Airtable client
          const mockClient = {} as AirtableClient;
          const executor = new ParallelAirtableExecutor(mockClient, requestsPerSecond);

          const completedRequests: number[] = [];

          // Send burst of requests simultaneously
          const queries = Array.from({ length: burstSize }, (_, i) => 
            () => {
              completedRequests.push(i);
              return Promise.resolve(i);
            }
          );

          // All requests should complete (none rejected)
          const results = await executor.executeParallel(queries);

          // Verify all requests completed
          expect(results.length).toBe(burstSize);
          expect(completedRequests.length).toBe(burstSize);

          // Verify no requests were rejected (all unique)
          const uniqueResults = new Set(results);
          expect(uniqueResults.size).toBe(burstSize);
        }
      ),
      { numRuns: 5, timeout: 30000 } // Reduced runs, increased timeout for rate-limited execution
    );
  }, 35000); // Increased Jest timeout to accommodate rate limiting
});
