/**
 * Property-Based Tests for Cache Service
 * 
 * Property 15: Cache Invalidation on Refresh
 * Validates: Requirements 21.3, 21.4, 21.5
 * 
 * For any cached data item:
 * - After a "Refresh Now" action, the returned data SHALL reflect the current state in Airtable
 * - The "Last Updated" timestamp SHALL be updated to the current time
 * - Cached data older than 15 minutes SHALL be automatically refreshed on access
 */

import * as fc from 'fast-check';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { CacheService, CACHE_KEYS, CACHE_PATTERNS, DEFAULT_TTL } from '../src/services/cache-service';

// Mock DynamoDB client
const mockSend = jest.fn();
const mockDynamoClient = {
  send: mockSend,
} as unknown as DynamoDBDocumentClient;

describe('Property 15: Cache Invalidation on Refresh', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new CacheService('TestCache', DEFAULT_TTL, mockDynamoClient);
  });

  /**
   * Arbitraries for generating test data
   */
  const cacheKeyArb = fc.stringMatching(/^[a-z]+:[a-z]+:[a-zA-Z0-9]{8,16}$/);
  
  const cacheValueArb = fc.oneof(
    fc.record({
      totalAttendance: fc.integer({ min: 0, max: 1000 }),
      firstTimersCount: fc.integer({ min: 0, max: 100 }),
      returnersCount: fc.integer({ min: 0, max: 100 }),
    }),
    fc.record({
      memberId: fc.stringMatching(/^rec[a-zA-Z0-9]{14}$/),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      status: fc.constantFrom('Member', 'First Timer', 'Returner', 'Evangelism Contact'),
    }),
    fc.array(fc.string(), { minLength: 0, maxLength: 10 })
  );

  const ttlSecondsArb = fc.integer({ min: 60, max: 3600 });

  /**
   * Property 15.1: After refresh(), the returned data SHALL reflect the fresh data
   * and the "Last Updated" timestamp SHALL be updated to the current time
   * 
   * Validates: Requirements 21.3, 21.4
   */
  it('should return fresh data and update timestamp after refresh', async () => {
    await fc.assert(
      fc.asyncProperty(
        cacheKeyArb,
        cacheValueArb,
        async (key, newValue) => {
          // Setup: Mock the set operation
          mockSend.mockImplementation(async (command) => {
            if (command instanceof PutCommand) {
              return {};
            }
            return {};
          });

          const beforeRefresh = Date.now();
          
          // Perform refresh with a fetch function that returns new value
          const result = await cacheService.refresh(key, async () => newValue);
          
          const afterRefresh = Date.now();

          // Verify the returned data is the fresh data
          expect(result.data).toEqual(newValue);
          
          // Verify the timestamp is updated to current time
          const lastUpdatedTime = new Date(result.lastUpdated).getTime();
          expect(lastUpdatedTime).toBeGreaterThanOrEqual(beforeRefresh);
          expect(lastUpdatedTime).toBeLessThanOrEqual(afterRefresh);
          
          // Verify isStale is false after refresh
          expect(result.isStale).toBe(false);

          // Verify set was called with the new value
          expect(mockSend).toHaveBeenCalledWith(
            expect.objectContaining({
              input: expect.objectContaining({
                TableName: 'TestCache',
                Item: expect.objectContaining({
                  pk: key,
                  sk: 'CACHE',
                  data: JSON.stringify(newValue),
                }),
              }),
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.2: After invalidate(), the cache entry SHALL be removed
   * 
   * Validates: Requirements 21.3, 21.4
   */
  it('should remove cache entry after invalidate', async () => {
    await fc.assert(
      fc.asyncProperty(
        cacheKeyArb,
        async (key) => {
          mockSend.mockResolvedValue({});

          await cacheService.invalidate(key);

          // Verify delete was called with correct key
          expect(mockSend).toHaveBeenCalledWith(
            expect.objectContaining({
              input: expect.objectContaining({
                TableName: 'TestCache',
                Key: {
                  pk: key,
                  sk: 'CACHE',
                },
              }),
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.3: getOrFetch SHALL return cached data if not stale,
   * otherwise fetch fresh data
   * 
   * Validates: Requirements 21.5
   */
  it('should return cached data if fresh, fetch if stale', async () => {
    await fc.assert(
      fc.asyncProperty(
        cacheKeyArb,
        cacheValueArb,
        cacheValueArb,
        fc.boolean(),
        async (key, cachedValue, freshValue, isStale) => {
          const now = Date.now();
          const ttlSeconds = DEFAULT_TTL;
          
          // Calculate timestamps based on staleness
          const createdAt = isStale 
            ? new Date(now - (ttlSeconds + 60) * 1000).toISOString() // Older than TTL
            : new Date(now - 60 * 1000).toISOString(); // Recent (1 minute ago)
          
          const ttl = Math.floor(now / 1000) + (isStale ? -60 : ttlSeconds); // Expired or valid

          let fetchCalled = false;
          const fetchFn = async () => {
            fetchCalled = true;
            return freshValue;
          };

          mockSend.mockImplementation(async (command) => {
            if (command instanceof GetCommand) {
              // Return cached item if not stale
              if (!isStale) {
                return {
                  Item: {
                    pk: key,
                    sk: 'CACHE',
                    data: JSON.stringify(cachedValue),
                    ttl: ttl,
                    createdAt: createdAt,
                  },
                };
              }
              // Return stale item (TTL expired)
              return {
                Item: {
                  pk: key,
                  sk: 'CACHE',
                  data: JSON.stringify(cachedValue),
                  ttl: ttl,
                  createdAt: createdAt,
                },
              };
            }
            if (command instanceof PutCommand) {
              return {};
            }
            return {};
          });

          const result = await cacheService.getOrFetch(key, fetchFn);

          if (isStale) {
            // Should have fetched fresh data
            expect(fetchCalled).toBe(true);
            expect(result.data).toEqual(freshValue);
            expect(result.isStale).toBe(false);
          } else {
            // Should have returned cached data
            expect(fetchCalled).toBe(false);
            expect(result.data).toEqual(cachedValue);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.4: invalidatePattern SHALL remove all matching cache entries
   * 
   * Validates: Requirements 21.3, 21.4
   */
  it('should invalidate all entries matching pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...Object.values(CACHE_PATTERNS)),
        fc.integer({ min: 0, max: 5 }),
        async (pattern, numItems) => {
          // Generate mock items matching the pattern
          const mockItems = Array.from({ length: numItems }, (_, i) => ({
            pk: `${pattern}item${i}`,
            sk: 'CACHE',
          }));

          let scanCalled = false;
          let deleteCalls = 0;

          mockSend.mockImplementation(async (command) => {
            if (command instanceof ScanCommand) {
              scanCalled = true;
              return { Items: mockItems };
            }
            if (command instanceof DeleteCommand) {
              deleteCalls++;
              return {};
            }
            return {};
          });

          const deletedCount = await cacheService.invalidatePattern(pattern);

          expect(scanCalled).toBe(true);
          expect(deletedCount).toBe(numItems);
          expect(deleteCalls).toBe(numItems);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 15.5: getWithMetadata SHALL return lastUpdated timestamp
   * 
   * Validates: Requirements 21.2
   */
  it('should return lastUpdated timestamp with cached data', async () => {
    await fc.assert(
      fc.asyncProperty(
        cacheKeyArb,
        cacheValueArb,
        fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
        async (key, value, createdDate) => {
          const createdAt = createdDate.toISOString();
          const ttl = Math.floor(Date.now() / 1000) + DEFAULT_TTL;

          mockSend.mockImplementation(async (command) => {
            if (command instanceof GetCommand) {
              return {
                Item: {
                  pk: key,
                  sk: 'CACHE',
                  data: JSON.stringify(value),
                  ttl: ttl,
                  createdAt: createdAt,
                },
              };
            }
            return {};
          });

          const result = await cacheService.getWithMetadata(key);

          expect(result).not.toBeNull();
          expect(result!.data).toEqual(value);
          expect(result!.lastUpdated).toBe(createdAt);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.6: Expired cache entries SHALL return null
   * 
   * Validates: Requirements 21.1, 21.5
   */
  it('should return null for expired cache entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        cacheKeyArb,
        cacheValueArb,
        async (key, value) => {
          const now = Math.floor(Date.now() / 1000);
          const expiredTtl = now - 60; // Expired 1 minute ago

          mockSend.mockImplementation(async (command) => {
            if (command instanceof GetCommand) {
              return {
                Item: {
                  pk: key,
                  sk: 'CACHE',
                  data: JSON.stringify(value),
                  ttl: expiredTtl,
                  createdAt: new Date(Date.now() - 3600000).toISOString(),
                },
              };
            }
            return {};
          });

          const result = await cacheService.get(key);

          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.7: set() SHALL store data with correct TTL
   * 
   * Validates: Requirements 21.1
   */
  it('should store data with correct TTL', async () => {
    await fc.assert(
      fc.asyncProperty(
        cacheKeyArb,
        cacheValueArb,
        ttlSecondsArb,
        async (key, value, customTtl) => {
          jest.clearAllMocks();
          mockSend.mockResolvedValue({});

          const beforeSet = Math.floor(Date.now() / 1000);
          await cacheService.set(key, value, customTtl);
          const afterSet = Math.floor(Date.now() / 1000);

          // Verify put was called
          expect(mockSend).toHaveBeenCalledTimes(1);
          
          // Extract the actual TTL from the call
          const putCall = mockSend.mock.calls[0];
          const actualTtl = putCall?.[0]?.input?.Item?.ttl as number;
          
          // TTL should be between beforeSet + customTtl and afterSet + customTtl
          expect(actualTtl).toBeGreaterThanOrEqual(beforeSet + customTtl);
          expect(actualTtl).toBeLessThanOrEqual(afterSet + customTtl + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.8: Default TTL should be 15 minutes (900 seconds)
   * 
   * Validates: Requirements 21.1
   */
  it('should use default TTL of 15 minutes when not specified', async () => {
    await fc.assert(
      fc.asyncProperty(
        cacheKeyArb,
        cacheValueArb,
        async (key, value) => {
          const beforeSet = Math.floor(Date.now() / 1000);
          
          mockSend.mockResolvedValue({});

          await cacheService.set(key, value); // No TTL specified

          const afterSet = Math.floor(Date.now() / 1000);

          // Extract the actual TTL from the call
          const putCall = mockSend.mock.calls.find(
            call => call[0] instanceof PutCommand
          );
          const actualTtl = putCall?.[0]?.input?.Item?.ttl as number;
          
          // TTL should be default (900 seconds = 15 minutes)
          expect(actualTtl).toBeGreaterThanOrEqual(beforeSet + DEFAULT_TTL);
          expect(actualTtl).toBeLessThanOrEqual(afterSet + DEFAULT_TTL + 1);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 15.9: CACHE_KEYS helpers should generate consistent keys
   * 
   * Validates: Consistent cache key generation
   */
  it('should generate consistent cache keys', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^rec[a-zA-Z0-9]{14}$/),
        (id) => {
          // Same input should always produce same key
          const key1 = CACHE_KEYS.SERVICE_KPIS(id);
          const key2 = CACHE_KEYS.SERVICE_KPIS(id);
          expect(key1).toBe(key2);

          const journey1 = CACHE_KEYS.MEMBER_JOURNEY(id);
          const journey2 = CACHE_KEYS.MEMBER_JOURNEY(id);
          expect(journey1).toBe(journey2);

          // Keys should contain the ID
          expect(key1).toContain(id);
          expect(journey1).toContain(id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.10: exists() should return true for valid entries, false for missing/expired
   * 
   * Validates: Cache existence check
   */
  it('should correctly report cache entry existence', async () => {
    await fc.assert(
      fc.asyncProperty(
        cacheKeyArb,
        cacheValueArb,
        fc.boolean(),
        async (key, value, entryExists) => {
          const now = Math.floor(Date.now() / 1000);

          mockSend.mockImplementation(async (command) => {
            if (command instanceof GetCommand) {
              if (entryExists) {
                return {
                  Item: {
                    pk: key,
                    sk: 'CACHE',
                    data: JSON.stringify(value),
                    ttl: now + DEFAULT_TTL,
                    createdAt: new Date().toISOString(),
                  },
                };
              }
              return { Item: undefined };
            }
            return {};
          });

          const exists = await cacheService.exists(key);

          expect(exists).toBe(entryExists);
        }
      ),
      { numRuns: 100 }
    );
  });
});
