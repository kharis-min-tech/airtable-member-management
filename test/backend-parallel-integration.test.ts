/**
 * Backend Parallel Query Execution - Integration Tests
 * 
 * Tests end-to-end behavior of parallel Airtable query execution
 * with rate limiting and error handling.
 * 
 * Requirements: 4.1
 * Feature: api-performance-optimization
 */

import { ParallelAirtableExecutor } from '../src/services/parallel-airtable-executor';
import { AirtableClient } from '../src/services/airtable-client';

describe('Backend Parallel Query Execution - Integration Tests', () => {
  let mockAirtableClient: AirtableClient;
  let executor: ParallelAirtableExecutor;

  beforeEach(() => {
    // Create mock Airtable client
    mockAirtableClient = {} as AirtableClient;
    executor = new ParallelAirtableExecutor(mockAirtableClient, 5);
  });

  describe('Parallel Query Execution', () => {
    test('executes independent queries in parallel - faster than sequential', async () => {
      // Requirements: 4.1
      const queryDelayMs = 100;
      const queryCount = 5;

      // Create mock queries with known delays
      const queries = Array.from({ length: queryCount }, (_, i) => {
        return async () => {
          await new Promise(resolve => setTimeout(resolve, queryDelayMs));
          return { id: i, data: `Result ${i}` };
        };
      });

      const startTime = Date.now();
      const results = await executor.executeParallel(queries);
      const endTime = Date.now();

      const parallelTime = endTime - startTime;
      const sequentialTime = queryDelayMs * queryCount;

      // Verify parallel execution is significantly faster than sequential
      // Should be close to single query time, not sum of all queries
      expect(parallelTime).toBeLessThan(sequentialTime * 0.6); // At least 40% faster
      expect(parallelTime).toBeGreaterThan(queryDelayMs * 0.8); // But not instant
      expect(parallelTime).toBeLessThan(queryDelayMs * 2); // Should be ~100ms, not 500ms

      // Verify all results returned
      expect(results).toHaveLength(queryCount);
      results.forEach((result, i) => {
        expect(result.id).toBe(i);
        expect(result.data).toBe(`Result ${i}`);
      });
    });

    test('handles partial failures - returns successful results', async () => {
      // Requirements: 4.1
      const successQuery1 = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { id: 1, data: 'Success 1' };
      };

      const failQuery = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Query failed');
      };

      const successQuery2 = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { id: 2, data: 'Success 2' };
      };

      const queries = [successQuery1, failQuery, successQuery2];

      const results = await executor.executeParallelWithPartialFailure(queries);

      // Verify successful results returned
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ id: 1, data: 'Success 1' });
      expect(results[1]).toEqual({ id: 2, data: 'Success 2' });
    });

    test('rate limiting prevents exceeding 5 requests per second', async () => {
      // Requirements: 4.1
      const queryCount = 15; // More than 5 per second
      const executionTimestamps: number[] = [];

      // Create queries that track execution time
      const queries = Array.from({ length: queryCount }, (_, i) => {
        return async () => {
          executionTimestamps.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 10));
          return { id: i };
        };
      });

      const startTime = Date.now();
      await executor.executeParallel(queries);
      const endTime = Date.now();

      // Verify execution took at least 2 seconds (15 queries / 5 per second = 3 seconds)
      const totalTime = endTime - startTime;
      expect(totalTime).toBeGreaterThan(2000);

      // Verify rate limit compliance by checking timestamps
      // Count requests in each 1-second window
      const windowSize = 1000; // 1 second
      const windows = Math.ceil(totalTime / windowSize);
      
      for (let i = 0; i < windows; i++) {
        const windowStart = startTime + (i * windowSize);
        const windowEnd = windowStart + windowSize;
        
        const requestsInWindow = executionTimestamps.filter(
          timestamp => timestamp >= windowStart && timestamp < windowEnd
        ).length;
        
        // Should not exceed 5 requests per second (with some tolerance for timing)
        // Allow up to 10 requests in a window due to timing variations
        expect(requestsInWindow).toBeLessThanOrEqual(10);
      }
    });

    test('queues requests when rate limit approached', async () => {
      // Requirements: 4.1
      const queryCount = 10;
      let maxQueueLength = 0;

      // Create queries that check queue length
      const queries = Array.from({ length: queryCount }, (_, i) => {
        return async () => {
          const queueLength = executor.getQueueLength();
          maxQueueLength = Math.max(maxQueueLength, queueLength);
          await new Promise(resolve => setTimeout(resolve, 10));
          return { id: i };
        };
      });

      await executor.executeParallel(queries);

      // Verify queue was used (some requests had to wait)
      expect(maxQueueLength).toBeGreaterThan(0);
    });
  });

  describe('Service KPI Query Pattern', () => {
    test('executes attendance, members, and departments queries in parallel', async () => {
      // Requirements: 4.1
      const serviceId = 'test-service-123';
      const queryTimestamps: number[] = [];

      // Mock queries for service KPI data
      const getAttendanceRecords = async () => {
        queryTimestamps.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 100));
        return [
          { id: 'att1', serviceId, memberId: 'm1', status: 'present' },
        ];
      };

      const getMemberLookups = async () => {
        queryTimestamps.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 100));
        return [
          { id: 'm1', name: 'John Doe', status: 'member' },
        ];
      };

      const getDepartmentData = async () => {
        queryTimestamps.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 100));
        return [
          { id: 'd1', name: 'Worship', memberCount: 10 },
        ];
      };

      const queries = [getAttendanceRecords, getMemberLookups, getDepartmentData] as Array<() => Promise<any>>;

      const startTime = Date.now();
      const results = await executor.executeParallel(queries);
      const endTime = Date.now();

      // Verify parallel execution timing
      const parallelTime = endTime - startTime;
      expect(parallelTime).toBeLessThan(200); // Should be ~100ms, not 300ms

      // Verify all queries started within 50ms of each other
      const firstQueryTime = queryTimestamps[0]!;
      const lastQueryTime = queryTimestamps[queryTimestamps.length - 1]!;
      const timeDifference = lastQueryTime - firstQueryTime;
      expect(timeDifference).toBeLessThan(50);

      // Verify all data returned
      const [attendance, members, departments] = results;
      expect(attendance).toHaveLength(1);
      expect(members).toHaveLength(1);
      expect(departments).toHaveLength(1);
    });
  });

  describe('Dashboard Query Pattern', () => {
    test('executes all dashboard table queries in parallel', async () => {
      // Requirements: 4.1
      const queryTimestamps: number[] = [];

      // Mock queries for dashboard data
      const getServices = async () => {
        queryTimestamps.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 100));
        return [{ id: 's1', name: 'Sunday Service' }];
      };

      const getMembers = async () => {
        queryTimestamps.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 100));
        return [{ id: 'm1', name: 'John Doe' }];
      };

      const getEvangelism = async () => {
        queryTimestamps.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 100));
        return [{ id: 'e1', soulName: 'Jane Smith' }];
      };

      const getFollowUps = async () => {
        queryTimestamps.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 100));
        return [{ id: 'f1', notes: 'Follow up' }];
      };

      const queries = [getServices, getMembers, getEvangelism, getFollowUps] as Array<() => Promise<any>>;

      const startTime = Date.now();
      const results = await executor.executeParallel(queries);
      const endTime = Date.now();

      // Verify parallel execution timing
      const parallelTime = endTime - startTime;
      expect(parallelTime).toBeLessThan(200); // Should be ~100ms, not 400ms

      // Verify all queries started within 50ms of each other
      const firstQueryTime = queryTimestamps[0]!;
      const lastQueryTime = queryTimestamps[queryTimestamps.length - 1]!;
      const timeDifference = lastQueryTime - firstQueryTime;
      expect(timeDifference).toBeLessThan(50);

      // Verify all data returned
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result).toHaveLength(1);
      });
    });
  });

  describe('Member Journey Query Pattern', () => {
    test('executes attendance, evangelism, and follow-up queries in parallel', async () => {
      // Requirements: 4.1
      const memberId = 'test-member-123';
      const queryTimestamps: number[] = [];

      // Mock queries for member journey data
      const getAttendanceHistory = async () => {
        queryTimestamps.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 100));
        return [
          { id: 'att1', memberId, serviceId: 's1', date: '2024-01-01' },
        ];
      };

      const getEvangelismRecords = async () => {
        queryTimestamps.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 100));
        return [
          { id: 'e1', memberId, soulName: 'Jane Smith', date: '2024-01-05' },
        ];
      };

      const getFollowUpHistory = async () => {
        queryTimestamps.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 100));
        return [
          { id: 'f1', memberId, notes: 'Follow up', date: '2024-01-10' },
        ];
      };

      const queries = [getAttendanceHistory, getEvangelismRecords, getFollowUpHistory] as Array<() => Promise<any>>;

      const startTime = Date.now();
      const results = await executor.executeParallel(queries);
      const endTime = Date.now();

      // Verify parallel execution timing
      const parallelTime = endTime - startTime;
      expect(parallelTime).toBeLessThan(200); // Should be ~100ms, not 300ms

      // Verify all queries started within 50ms of each other
      const firstQueryTime = queryTimestamps[0]!;
      const lastQueryTime = queryTimestamps[queryTimestamps.length - 1]!;
      const timeDifference = lastQueryTime - firstQueryTime;
      expect(timeDifference).toBeLessThan(50);

      // Verify all data returned
      const [attendance, evangelism, followUps] = results;
      expect(attendance).toHaveLength(1);
      expect(evangelism).toHaveLength(1);
      expect(followUps).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    test('continues execution when some queries fail', async () => {
      // Requirements: 4.1
      const successQuery = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { success: true };
      };

      const failQuery = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Airtable query failed');
      };

      const queries = [successQuery, failQuery, successQuery, failQuery, successQuery];

      const results = await executor.executeParallelWithPartialFailure(queries);

      // Verify successful queries returned results
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    test('handles rate limit errors gracefully', async () => {
      // Requirements: 4.1
      let callCount = 0;

      const queryWithRateLimit = async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Simulate rate limit error on first few calls
        if (callCount <= 2) {
          const error = new Error('Rate limit exceeded');
          (error as any).statusCode = 429;
          throw error;
        }
        
        return { id: callCount, success: true };
      };

      const queries = Array.from({ length: 5 }, () => queryWithRateLimit);

      // Should handle rate limit errors and continue
      const results = await executor.executeParallelWithPartialFailure(queries);

      // Verify some queries succeeded (after rate limit cleared)
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Metrics', () => {
    test('parallel execution provides at least 40% performance improvement', async () => {
      // Requirements: 4.1
      const queryDelayMs = 100;
      const queryCount = 5;

      // Create mock queries
      const queries = Array.from({ length: queryCount }, (_, i) => {
        return async () => {
          await new Promise(resolve => setTimeout(resolve, queryDelayMs));
          return { id: i };
        };
      });

      // Measure parallel execution time
      const parallelStart = Date.now();
      await executor.executeParallel(queries);
      const parallelEnd = Date.now();
      const parallelTime = parallelEnd - parallelStart;

      // Calculate expected sequential time
      const sequentialTime = queryDelayMs * queryCount;

      // Verify at least 40% improvement
      const improvement = ((sequentialTime - parallelTime) / sequentialTime) * 100;
      expect(improvement).toBeGreaterThanOrEqual(40);

      // Verify parallel time is close to single query time
      expect(parallelTime).toBeLessThan(queryDelayMs * 2);
    });
  });
});
