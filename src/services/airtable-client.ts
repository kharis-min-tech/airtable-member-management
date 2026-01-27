/**
 * Airtable Service Client
 * Provides rate-limited, retry-capable access to Airtable API
 * Uses native fetch instead of airtable npm package for Lambda compatibility
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */

import { AirtableConfig, AirtableRecord } from '../types';

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

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
  private readonly refillRate: number;

  constructor(requestsPerSecond: number) {
    this.maxTokens = requestsPerSecond;
    this.tokens = requestsPerSecond;
    this.refillRate = requestsPerSecond;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

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
 * Airtable API response types
 */
interface AirtableApiRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface AirtableListResponse {
  records: AirtableApiRecord[];
  offset?: string;
}

/**
 * AirtableClient - Main client for Airtable API operations
 * Uses native fetch for Lambda compatibility
 */
export class AirtableClient {
  private readonly baseId: string;
  private readonly apiKey: string;
  private readonly rateLimiter: RateLimiter;
  private readonly retryConfig: RetryConfig;

  constructor(config: AirtableConfig, retryConfig?: Partial<RetryConfig>) {
    this.baseId = config.baseId;
    this.apiKey = config.apiKey;
    this.rateLimiter = new RateLimiter(config.rateLimitPerSecond || 5);
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private buildUrl(tableId: string, recordId?: string): string {
    const base = `${AIRTABLE_API_BASE}/${this.baseId}/${encodeURIComponent(tableId)}`;
    return recordId ? `${base}/${recordId}` : base;
  }

  /**
   * Get a single record by ID
   */
  async getRecord(tableId: string, recordId: string): Promise<AirtableRecord> {
    return this.executeWithRetry(async () => {
      await this.rateLimiter.acquire();
      
      const response = await fetch(this.buildUrl(tableId, recordId), {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const data = await response.json() as AirtableApiRecord;
      return this.mapRecord(data);
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
      
      const response = await fetch(this.buildUrl(tableId), {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const data = await response.json() as AirtableApiRecord;
      return this.mapRecord(data);
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
      
      const response = await fetch(this.buildUrl(tableId, recordId), {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const data = await response.json() as AirtableApiRecord;
      return this.mapRecord(data);
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
      
      const params = new URLSearchParams();
      params.append('filterByFormula', filterFormula);
      
      if (options?.maxRecords) {
        params.append('maxRecords', options.maxRecords.toString());
      }
      
      if (options?.sort) {
        options.sort.forEach((s, i) => {
          params.append(`sort[${i}][field]`, s.field);
          params.append(`sort[${i}][direction]`, s.direction);
        });
      }

      const response = await fetch(`${this.buildUrl(tableId)}?${params.toString()}`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const data = await response.json() as AirtableListResponse;
      return data.records.map((record) => this.mapRecord(record));
    });
  }

  /**
   * Find a member by unique key (phone or email)
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
      conditions.push(`{Phone} = '${normalizedPhone}'`);
    }

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      conditions.push(`LOWER({Email}) = '${normalizedEmail}'`);
    }

    const filterFormula = conditions.length > 1
      ? `OR(${conditions.join(', ')})`
      : conditions[0] || '';

    const records = await this.findRecords(tableId, filterFormula, { maxRecords: 1 });
    return records[0] || null;
  }

  /**
   * Batch create multiple records (up to 10 at a time)
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
        
        const response = await fetch(this.buildUrl(tableId), {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            records: batch.map((fields) => ({ fields })),
          }),
        });

        if (!response.ok) {
          throw await this.handleErrorResponse(response);
        }

        const data = await response.json() as AirtableListResponse;
        return data.records.map((record) => this.mapRecord(record));
      });
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Batch update multiple records (up to 10 at a time)
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
        
        const response = await fetch(this.buildUrl(tableId), {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({
            records: batch.map((update) => ({
              id: update.id,
              fields: update.fields,
            })),
          }),
        });

        if (!response.ok) {
          throw await this.handleErrorResponse(response);
        }

        const data = await response.json() as AirtableListResponse;
        return data.records.map((record) => this.mapRecord(record));
      });
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Normalize phone number for consistent matching
   */
  normalizePhone(phone: string): string {
    if (!phone) return '';
    const hasPlus = phone.startsWith('+');
    const digits = phone.replace(/\D/g, '');
    return hasPlus ? `+${digits}` : digits;
  }

  private async handleErrorResponse(response: Response): Promise<AirtableError> {
    let errorData: { error?: { type?: string; message?: string } } = {};
    try {
      errorData = await response.json() as typeof errorData;
    } catch {
      // Ignore JSON parse errors
    }

    const message = errorData.error?.message || response.statusText || 'Unknown error';

    if (response.status === 429) {
      return new AirtableError(AirtableErrorCode.RATE_LIMITED, 'Rate limit exceeded', true);
    }

    if (response.status === 404) {
      return new AirtableError(AirtableErrorCode.NOT_FOUND, message, false);
    }

    if (response.status === 400 || response.status === 422) {
      return new AirtableError(AirtableErrorCode.INVALID_REQUEST, message, false);
    }

    if (response.status >= 500) {
      return new AirtableError(AirtableErrorCode.API_ERROR, message, true);
    }

    return new AirtableError(AirtableErrorCode.API_ERROR, message, false);
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof AirtableError && !error.retryable) {
          throw error;
        }

        if (attempt === this.retryConfig.maxRetries) {
          throw error;
        }

        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError || new AirtableError(AirtableErrorCode.API_ERROR, 'Unknown error', false);
  }

  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, this.retryConfig.maxDelayMs);
  }

  private mapRecord(record: AirtableApiRecord): AirtableRecord {
    return {
      id: record.id,
      fields: record.fields,
      createdTime: record.createdTime,
    };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Table name constants for the church member management system
 * 
 * Note: Follow-up members are stored in the Members table, not a separate table.
 * Members with follow-up roles are identified by their role field in the Members table.
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
  DEPARTMENTS: 'Departments',
  MEMBER_DEPARTMENTS: 'Member Departments',
  MEMBER_PROGRAMS: 'Member Programs',
} as const;
