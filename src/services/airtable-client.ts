/**
 * Airtable Service Client
 * Provides rate-limited, retry-capable access to Airtable API
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */

import Airtable from 'airtable';
import { AirtableConfig, AirtableRecord } from '../types';

/**
 * Error codes for Airtable operations
 */
export enum AirtableErrorCode {
  RATE_LIMITED = 'AIRTABLE_RATE_LIMITED',
  API_ERROR = 'AIRTABLE_API_ERROR',
  NOT_FOUND = 'AIRTABLE_NOT_FOUND',
  INVALID_REQUEST = 'AIRTABLE_INVALID_REQUEST',
}

/**
 * Custom error class for Airtable operations
 */
export class AirtableError extends Error {
  constructor(
    public readonly code: AirtableErrorCode,
    message: string,
    public readonly retryable: boolean = false,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AirtableError';
  }
}

/**
 * Retry configuration for exponential backoff
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Rate limiter using token bucket algorithm
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(requestsPerSecond: number) {
    this.maxTokens = requestsPerSecond;
    this.tokens = requestsPerSecond;
    this.refillRate = requestsPerSecond;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token, waiting if necessary
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate wait time for next token
    const waitTime = Math.ceil((1 - this.tokens) / this.refillRate * 1000);
    await this.sleep(waitTime);
    this.refill();
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * AirtableClient - Main client for Airtable API operations
 * Implements rate limiting (5 req/sec) and exponential backoff retry
 */
export class AirtableClient {
  private readonly base: Airtable.Base;
  private readonly rateLimiter: RateLimiter;
  private readonly retryConfig: RetryConfig;

  constructor(config: AirtableConfig, retryConfig?: Partial<RetryConfig>) {
    Airtable.configure({
      apiKey: config.apiKey,
    });
    this.base = Airtable.base(config.baseId);
    this.rateLimiter = new RateLimiter(config.rateLimitPerSecond || 5);
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Get a single record by ID
   */
  async getRecord(tableId: string, recordId: string): Promise<AirtableRecord> {
    return this.executeWithRetry(async () => {
      await this.rateLimiter.acquire();
      const record = await this.base(tableId).find(recordId);
      return this.mapRecord(record);
    });
  }

  /**
   * Create a new record
   */
  async createRecord(
    tableId: string,
    fields: Record<string, unknown>
  ): Promise<AirtableRecord> {
    return this.executeWithRetry(async () => {
      await this.rateLimiter.acquire();
      const record = await this.base(tableId).create(fields as Airtable.FieldSet);
      return this.mapRecord(record);
    });
  }

  /**
   * Update an existing record
   */
  async updateRecord(
    tableId: string,
    recordId: string,
    fields: Record<string, unknown>
  ): Promise<AirtableRecord> {
    return this.executeWithRetry(async () => {
      await this.rateLimiter.acquire();
      const record = await this.base(tableId).update(recordId, fields as Airtable.FieldSet);
      return this.mapRecord(record);
    });
  }

  /**
   * Find records using a filter formula
   */
  async findRecords(
    tableId: string,
    filterFormula: string,
    options?: { maxRecords?: number; sort?: Array<{ field: string; direction: 'asc' | 'desc' }> }
  ): Promise<AirtableRecord[]> {
    return this.executeWithRetry(async () => {
      await this.rateLimiter.acquire();
      
      const queryOptions: Airtable.SelectOptions<Airtable.FieldSet> = {
        filterByFormula: filterFormula,
      };

      if (options?.maxRecords) {
        queryOptions.maxRecords = options.maxRecords;
      }

      if (options?.sort) {
        queryOptions.sort = options.sort;
      }

      const records = await this.base(tableId)
        .select(queryOptions)
        .all();

      return records.map((record) => this.mapRecord(record));
    });
  }


  /**
   * Find a member by unique key (phone or email)
   * Implements phone normalization and case-insensitive email matching
   * Requirements: 11.1, 2.1, 3.1
   */
  async findByUniqueKey(
    tableId: string,
    phone?: string,
    email?: string
  ): Promise<AirtableRecord | null> {
    if (!phone && !email) {
      return null;
    }

    const conditions: string[] = [];

    if (phone) {
      const normalizedPhone = this.normalizePhone(phone);
      // Search with normalized phone - Airtable formula for phone matching
      conditions.push(`{Phone} = '${normalizedPhone}'`);
    }

    if (email) {
      // Case-insensitive email matching using LOWER()
      const normalizedEmail = email.toLowerCase().trim();
      conditions.push(`LOWER({Email}) = '${normalizedEmail}'`);
    }

    // Combine conditions with OR
    const filterFormula = conditions.length > 1
      ? `OR(${conditions.join(', ')})`
      : conditions[0] || '';

    const records = await this.findRecords(tableId, filterFormula, { maxRecords: 1 });
    return records[0] || null;
  }

  /**
   * Batch create multiple records (up to 10 at a time per Airtable limit)
   */
  async batchCreate(
    tableId: string,
    records: Array<Record<string, unknown>>
  ): Promise<AirtableRecord[]> {
    const results: AirtableRecord[] = [];
    const batches = this.chunkArray(records, 10);

    for (const batch of batches) {
      const batchResults = await this.executeWithRetry(async () => {
        await this.rateLimiter.acquire();
        const created = await this.base(tableId).create(
          batch.map((fields) => ({ fields: fields as Airtable.FieldSet }))
        );
        return created.map((record) => this.mapRecord(record));
      });
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Batch update multiple records (up to 10 at a time per Airtable limit)
   */
  async batchUpdate(
    tableId: string,
    updates: Array<{ id: string; fields: Record<string, unknown> }>
  ): Promise<AirtableRecord[]> {
    const results: AirtableRecord[] = [];
    const batches = this.chunkArray(updates, 10);

    for (const batch of batches) {
      const batchResults = await this.executeWithRetry(async () => {
        await this.rateLimiter.acquire();
        const updated = await this.base(tableId).update(
          batch.map((update) => ({
            id: update.id,
            fields: update.fields as Airtable.FieldSet,
          }))
        );
        return updated.map((record) => this.mapRecord(record));
      });
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Normalize phone number for consistent matching
   * Removes all non-digit characters except leading +
   */
  normalizePhone(phone: string): string {
    if (!phone) return '';
    
    // Preserve leading + for international numbers
    const hasPlus = phone.startsWith('+');
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    return hasPlus ? `+${digits}` : digits;
  }

  /**
   * Execute an operation with exponential backoff retry
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const airtableError = this.mapError(error);

        // Only retry if the error is retryable
        if (!airtableError.retryable || attempt === this.retryConfig.maxRetries) {
          throw airtableError;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError || new AirtableError(
      AirtableErrorCode.API_ERROR,
      'Unknown error occurred',
      false
    );
  }

  /**
   * Calculate delay for exponential backoff with jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, this.retryConfig.maxDelayMs);
  }

  /**
   * Map Airtable SDK record to our interface
   */
  private mapRecord(record: Airtable.Record<Airtable.FieldSet>): AirtableRecord {
    return {
      id: record.id,
      fields: record.fields as Record<string, unknown>,
      createdTime: record._rawJson?.createdTime || new Date().toISOString(),
    };
  }

  /**
   * Map errors to our error types
   */
  private mapError(error: unknown): AirtableError {
    if (error instanceof AirtableError) {
      return error;
    }

    const err = error as { statusCode?: number; message?: string; error?: string };
    
    // Rate limit error (429)
    if (err.statusCode === 429) {
      return new AirtableError(
        AirtableErrorCode.RATE_LIMITED,
        'Airtable rate limit exceeded',
        true,
        { originalError: err.message }
      );
    }

    // Not found error (404)
    if (err.statusCode === 404) {
      return new AirtableError(
        AirtableErrorCode.NOT_FOUND,
        err.message || 'Record not found',
        false
      );
    }

    // Invalid request (400, 422)
    if (err.statusCode === 400 || err.statusCode === 422) {
      return new AirtableError(
        AirtableErrorCode.INVALID_REQUEST,
        err.message || 'Invalid request',
        false,
        { originalError: err.error }
      );
    }

    // Server errors (5xx) are retryable
    if (err.statusCode && err.statusCode >= 500) {
      return new AirtableError(
        AirtableErrorCode.API_ERROR,
        err.message || 'Airtable server error',
        true,
        { statusCode: err.statusCode }
      );
    }

    // Default to non-retryable API error
    return new AirtableError(
      AirtableErrorCode.API_ERROR,
      err.message || 'Unknown Airtable error',
      false,
      { originalError: error }
    );
  }

  /**
   * Split array into chunks of specified size
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Table name constants for the church member management system
 */
export const AIRTABLE_TABLES = {
  MEMBERS: 'Members',
  SERVICES: 'Services',
  ATTENDANCE: 'Attendance',
  EVANGELISM: 'Evangelism',
  FIRST_TIMERS_REGISTER: 'First Timers Register',
  RETURNERS_REGISTER: 'Returners Register',
  FOLLOW_UP_ASSIGNMENTS: 'Follow-up Assignments',
  FOLLOW_UP_INTERACTIONS: 'Follow-up Interactions',
  HOME_VISITS: 'Home Visits',
  VOLUNTEERS: 'Volunteers',
  DEPARTMENTS: 'Departments',
  MEMBER_DEPARTMENTS: 'Member Departments',
  MEMBER_PROGRAMS: 'Member Programs',
} as const;
