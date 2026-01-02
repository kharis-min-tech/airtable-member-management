import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

/**
 * Cache entry with metadata for tracking freshness
 */
export interface CacheEntry<T> {
  data: T;
  lastUpdated: string;
  ttl: number;
}

/**
 * Result of a cache get operation with metadata
 */
export interface CacheGetResult<T> {
  data: T;
  lastUpdated: string;
  isStale: boolean;
}

/**
 * Cache Service for DynamoDB-based caching
 * Implements TTL-based caching with pattern-based invalidation
 * 
 * Requirements: 21.1, 21.2, 21.3, 21.4
 */
export class CacheService {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly defaultTtlSeconds: number;

  constructor(
    tableName?: string,
    defaultTtlSeconds = DEFAULT_TTL,
    dynamoClient?: DynamoDBDocumentClient
  ) {
    if (dynamoClient) {
      this.client = dynamoClient;
    } else {
      const client = new DynamoDBClient({});
      this.client = DynamoDBDocumentClient.from(client);
    }
    this.tableName = tableName || process.env.CACHE_TABLE_NAME || 'Cache';
    this.defaultTtlSeconds = defaultTtlSeconds;
  }

  /**
   * Get a cached value by key
   * Returns null if not found or expired
   */
  async get<T>(key: string): Promise<T | null> {
    const result = await this.getWithMetadata<T>(key);
    return result ? result.data : null;
  }

  /**
   * Get a cached value with metadata (last updated timestamp, staleness)
   * Validates: Requirements 21.2 (Last Updated timestamp)
   */
  async getWithMetadata<T>(key: string): Promise<CacheGetResult<T> | null> {
    try {
      const result = await this.client.send(
        new GetCommand({
          TableName: this.tableName,
          Key: {
            pk: key,
            sk: 'CACHE',
          },
        })
      );

      if (!result.Item) {
        return null;
      }

      // Check if TTL has expired (DynamoDB TTL is eventually consistent)
      const now = Math.floor(Date.now() / 1000);
      const ttl = result.Item.ttl as number;
      
      if (ttl && ttl < now) {
        return null;
      }

      const data = JSON.parse(result.Item.data as string) as T;
      const lastUpdated = result.Item.createdAt as string;
      
      // Check if data is stale (older than default TTL)
      const createdAtTime = new Date(lastUpdated).getTime();
      const isStale = (Date.now() - createdAtTime) > (this.defaultTtlSeconds * 1000);

      return {
        data,
        lastUpdated,
        isStale,
      };
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set a cached value with TTL
   * Validates: Requirements 21.1 (15 minute default cache)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const expirationTime = Math.floor(Date.now() / 1000) + ttl;
    const now = new Date().toISOString();

    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: {
            pk: key,
            sk: 'CACHE',
            data: JSON.stringify(value),
            ttl: expirationTime,
            createdAt: now,
          },
        })
      );
    } catch (error) {
      console.error('Cache set error:', error);
      throw error;
    }
  }

  /**
   * Invalidate a specific cache key
   * Validates: Requirements 21.3, 21.4 (Refresh Now functionality)
   */
  async invalidate(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: {
            pk: key,
            sk: 'CACHE',
          },
        })
      );
    } catch (error) {
      console.error('Cache invalidate error:', error);
      throw error;
    }
  }

  /**
   * Invalidate all cache keys matching a pattern prefix
   * Uses scan with filter since DynamoDB doesn't support begins_with on partition keys
   * Validates: Requirements 21.3, 21.4 (bulk invalidation for refresh)
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      let deletedCount = 0;
      let lastEvaluatedKey: Record<string, unknown> | undefined;

      do {
        // Scan for items matching the pattern
        const scanResult = await this.client.send(
          new ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'begins_with(pk, :pattern) AND sk = :sk',
            ExpressionAttributeValues: {
              ':pattern': pattern,
              ':sk': 'CACHE',
            },
            ExclusiveStartKey: lastEvaluatedKey,
          })
        );

        // Delete each matching item
        if (scanResult.Items && scanResult.Items.length > 0) {
          await Promise.all(
            scanResult.Items.map((item) =>
              this.client.send(
                new DeleteCommand({
                  TableName: this.tableName,
                  Key: {
                    pk: item.pk as string,
                    sk: item.sk as string,
                  },
                })
              )
            )
          );
          deletedCount += scanResult.Items.length;
        }

        lastEvaluatedKey = scanResult.LastEvaluatedKey as Record<string, unknown> | undefined;
      } while (lastEvaluatedKey);

      return deletedCount;
    } catch (error) {
      console.error('Cache invalidatePattern error:', error);
      throw error;
    }
  }

  /**
   * Check if a cache entry exists and is not expired
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.get(key);
    return result !== null;
  }

  /**
   * Get the last updated timestamp for a cache key
   * Validates: Requirements 21.2 (Last Updated timestamp display)
   */
  async getLastUpdated(key: string): Promise<string | null> {
    try {
      const result = await this.client.send(
        new GetCommand({
          TableName: this.tableName,
          Key: {
            pk: key,
            sk: 'CACHE',
          },
          ProjectionExpression: 'createdAt',
        })
      );

      if (!result.Item) {
        return null;
      }

      return result.Item.createdAt as string;
    } catch (error) {
      console.error('Cache getLastUpdated error:', error);
      return null;
    }
  }

  /**
   * Refresh a cache entry by fetching fresh data and updating the cache
   * Validates: Requirements 21.3, 21.4 (Refresh Now functionality)
   */
  async refresh<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<CacheGetResult<T>> {
    const data = await fetchFn();
    await this.set(key, data, ttlSeconds);
    
    return {
      data,
      lastUpdated: new Date().toISOString(),
      isStale: false,
    };
  }

  /**
   * Get or fetch: returns cached data if fresh, otherwise fetches and caches
   * Validates: Requirements 21.5 (automatic refresh on stale data)
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<CacheGetResult<T>> {
    const cached = await this.getWithMetadata<T>(key);
    
    if (cached && !cached.isStale) {
      return cached;
    }

    // Data is stale or doesn't exist, fetch fresh data
    return this.refresh(key, fetchFn, ttlSeconds);
  }
}

/**
 * Cache key patterns for consistent key generation
 */
export const CACHE_KEYS = {
  SERVICE_KPIS: (serviceId: string): string => `kpis:service:${serviceId}`,
  EVANGELISM_STATS: (period: string): string => `stats:evangelism:${period}`,
  MEMBER_JOURNEY: (memberId: string): string => `journey:member:${memberId}`,
  DEPARTMENT_ROSTER: (deptId: string): string => `roster:dept:${deptId}`,
  ATTENDANCE_BREAKDOWN: (serviceId: string): string => `attendance:breakdown:${serviceId}`,
  FOLLOW_UP_SUMMARY: (): string => 'follow-up:summary',
  DEPARTMENT_ATTENDANCE: (serviceId: string, deptId: string): string => 
    `attendance:dept:${serviceId}:${deptId}`,
  SERVICE_COMPARISON: (serviceAId: string, serviceBId: string): string =>
    `comparison:${serviceAId}:${serviceBId}`,
};

/**
 * Cache key pattern prefixes for bulk invalidation
 */
export const CACHE_PATTERNS = {
  ALL_KPIS: 'kpis:',
  ALL_STATS: 'stats:',
  ALL_JOURNEYS: 'journey:',
  ALL_ROSTERS: 'roster:',
  ALL_ATTENDANCE: 'attendance:',
  ALL_COMPARISONS: 'comparison:',
};

export const DEFAULT_TTL = 900; // 15 minutes in seconds
