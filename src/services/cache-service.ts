import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

/**
 * Cache Service for DynamoDB-based caching
 * Implements TTL-based caching with pattern-based invalidation
 */
export class CacheService {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly defaultTtlSeconds: number;

  constructor(tableName?: string, defaultTtlSeconds = 900) {
    const dynamoClient = new DynamoDBClient({});
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = tableName || process.env.CACHE_TABLE_NAME || 'Cache';
    this.defaultTtlSeconds = defaultTtlSeconds;
  }

  /**
   * Get a cached value by key
   */
  async get<T>(key: string): Promise<T | null> {
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
      if (result.Item.ttl && result.Item.ttl < now) {
        return null;
      }

      return JSON.parse(result.Item.data as string) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set a cached value with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.defaultTtlSeconds;
    const expirationTime = Math.floor(Date.now() / 1000) + ttl;

    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: {
            pk: key,
            sk: 'CACHE',
            data: JSON.stringify(value),
            ttl: expirationTime,
            createdAt: new Date().toISOString(),
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
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Query all keys with the pattern prefix
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'begins_with(pk, :pattern) AND sk = :sk',
          ExpressionAttributeValues: {
            ':pattern': pattern,
            ':sk': 'CACHE',
          },
        })
      );

      // Delete each matching item
      if (result.Items) {
        await Promise.all(
          result.Items.map((item) =>
            this.client.send(
              new DeleteCommand({
                TableName: this.tableName,
                Key: {
                  pk: item.pk,
                  sk: item.sk,
                },
              })
            )
          )
        );
      }
    } catch (error) {
      console.error('Cache invalidatePattern error:', error);
      throw error;
    }
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
};

export const DEFAULT_TTL = 900; // 15 minutes
