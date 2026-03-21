import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { apiClient, clearCache } from './api-client';
import { requestDeduplicator } from './request-deduplicator';

// Mock aws-amplify/auth module
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(async () => ({
    tokens: null,
  })),
}));

describe('Parallel Dashboard Loading Property Tests', () => {
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

  // Feature: api-performance-optimization, Property 1: Parallel API Execution Timing
  test('Property 1: parallel API calls start within 50ms of each other', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.string({ minLength: 5, maxLength: 20 }).map(s => `/query/${s}`),
          { minLength: 2, maxLength: 5 }
        ), // Random API endpoints
        async (endpoints) => {
          // Clear cache and deduplicator before each property test iteration
          clearCache();
          requestDeduplicator.clear();

          const startTimes: number[] = [];
          let fetchCallCount = 0;

          // Mock fetch to track start times
          const mockFetch = vi.fn(async (url: string) => {
            startTimes.push(performance.now());
            fetchCallCount++;
            
            // Simulate minimal network delay
            await new Promise(resolve => setTimeout(resolve, 10));
            
            return new Response(
              JSON.stringify({ 
                success: true, 
                data: { id: fetchCallCount, endpoint: url } 
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          });
          global.fetch = mockFetch as any;

          // Execute all API calls in parallel using Promise.all()
          const promises = endpoints.map(endpoint => apiClient.get(endpoint));
          await Promise.all(promises);

          // Verify all calls started within 50ms of each other
          if (startTimes.length >= 2) {
            const minStart = Math.min(...startTimes);
            const maxStart = Math.max(...startTimes);
            const timeDiff = maxStart - minStart;
            
            // All parallel calls should start within 50ms
            expect(timeDiff).toBeLessThan(50);
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000); // 30 second timeout

  // Feature: api-performance-optimization, Property 2: Parallel Execution Performance Gain
  test('Property 2: parallel execution is at least 40% faster than sequential', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            endpoint: fc.string({ minLength: 5, maxLength: 20 }).map(s => `/query/${s}`),
            delay: fc.integer({ min: 50, max: 200 })
          }),
          { minLength: 3, maxLength: 5 }
        ), // Random API endpoints with known delays
        async (apiCalls) => {
          // Clear cache and deduplicator before each property test iteration
          clearCache();
          requestDeduplicator.clear();

          // Calculate expected sequential time (sum of all delays)
          const expectedSequentialTime = apiCalls.reduce((sum, call) => sum + call.delay, 0);

          // Mock fetch with specific delays
          const mockFetch = vi.fn(async (url: string) => {
            const call = apiCalls.find(c => url.includes(c.endpoint));
            const delay = call?.delay || 50;
            
            await new Promise(resolve => setTimeout(resolve, delay));
            
            return new Response(
              JSON.stringify({ 
                success: true, 
                data: { endpoint: url, delay } 
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          });
          global.fetch = mockFetch as any;

          // Execute in parallel
          const parallelStart = performance.now();
          const promises = apiCalls.map(call => apiClient.get(call.endpoint));
          await Promise.all(promises);
          const parallelTime = performance.now() - parallelStart;

          // Verify parallel execution is at least 40% faster than sequential
          // Sequential time = sum of delays, Parallel time ≈ max delay
          // Parallel should be at most 60% of sequential time (40% faster)
          const maxAllowedParallelTime = expectedSequentialTime * 0.6;
          
          // Add some tolerance for execution overhead (100ms)
          expect(parallelTime).toBeLessThan(maxAllowedParallelTime + 100);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000); // 30 second timeout

  // Feature: api-performance-optimization, Property 3: Partial Failure Resilience
  test('Property 3: successful results returned without blocking on failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            endpoint: fc.string({ minLength: 5, maxLength: 20 }).map(s => `/query/${s}`),
            shouldFail: fc.boolean()
          }),
          { minLength: 3, maxLength: 5 }
        ), // Random API endpoints with success/failure flags
        async (apiCalls) => {
          // Ensure we have at least one success and one failure
          if (!apiCalls.some(c => c.shouldFail) || !apiCalls.some(c => !c.shouldFail)) {
            return; // Skip this iteration
          }

          // Clear cache and deduplicator before each property test iteration
          clearCache();
          requestDeduplicator.clear();

          const expectedSuccesses = apiCalls.filter(c => !c.shouldFail).length;

          // Mock fetch with mixed success/failure responses (use 400 to avoid retry logic)
          const mockFetch = vi.fn(async (url: string) => {
            const call = apiCalls.find(c => url.includes(c.endpoint));
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            if (call?.shouldFail) {
              // Use 400 (Bad Request) instead of 500 to avoid exponential backoff retries
              return new Response(
                JSON.stringify({ error: 'Bad Request', code: 'BAD_REQUEST' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
              );
            }
            
            return new Response(
              JSON.stringify({ 
                success: true, 
                data: { endpoint: url } 
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          });
          global.fetch = mockFetch as any;

          // Execute all API calls in parallel using Promise.allSettled()
          const promises = apiCalls.map(call => 
            apiClient.get(call.endpoint).catch(error => ({ error }))
          );
          const results = await Promise.allSettled(promises);

          // Count successful and failed results
          let successCount = 0;
          let failureCount = 0;

          results.forEach(result => {
            if (result.status === 'fulfilled') {
              const value = result.value;
              if (value && typeof value === 'object' && 'error' in value) {
                failureCount++;
              } else {
                successCount++;
              }
            } else {
              failureCount++;
            }
          });

          // Verify we got all results (no blocking)
          expect(results.length).toBe(apiCalls.length);
          
          // Verify successful results were returned
          expect(successCount).toBeGreaterThan(0);
          
          // Verify failures were captured
          expect(failureCount).toBeGreaterThan(0);
          
          // Verify counts match expectations (with some tolerance for retries)
          expect(successCount).toBeGreaterThanOrEqual(expectedSuccesses);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000); // 60 second timeout
});
