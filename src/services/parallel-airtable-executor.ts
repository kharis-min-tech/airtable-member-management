/**
 * Parallel Airtable Executor
 * Executes independent Airtable queries in parallel with rate limiting
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 11.1, 11.3
 */

import { AirtableClient } from './airtable-client';

/**
 * Rate limiter using token bucket algorithm
 * Ensures compliance with Airtable's 5 requests/second rate limit
 */
class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private queue: Array<{ resolve: () => void; timestamp: number }> = [];
  private processingQueue = false;

  constructor(requestsPerSecond: number) {
    this.maxTokens = requestsPerSecond;
    this.tokens = requestsPerSecond;
    this.refillRate = requestsPerSecond;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token to execute a request
   * If no tokens available, queues the request
   */
  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.refill();

      if (this.tokens >= 1) {
        this.tokens -= 1;
        resolve();
      } else {
        // Queue the request
        this.queue.push({ resolve, timestamp: Date.now() });
        if (!this.processingQueue) {
          this.processQueue();
        }
      }
    });
  }

  /**
   * Process queued requests as tokens become available
   */
  private async processQueue(): Promise<void> {
    this.processingQueue = true;

    while (this.queue.length > 0) {
      this.refill();

      if (this.tokens >= 1) {
        this.tokens -= 1;
        const item = this.queue.shift();
        if (item) {
          item.resolve();
        }
      } else {
        // Wait for tokens to refill
        const waitTime = Math.ceil((1 - this.tokens) / this.refillRate * 1000);
        await this.sleep(Math.min(waitTime, 200)); // Cap wait time at 200ms
      }
    }

    this.processingQueue = false;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}

/**
 * Parallel Airtable Executor
 * Executes independent Airtable queries in parallel with rate limiting
 */
export class ParallelAirtableExecutor {
  private readonly rateLimiter: TokenBucketRateLimiter;

  constructor(
    _airtableClient: AirtableClient,
    requestsPerSecond: number = 5
  ) {
    this.rateLimiter = new TokenBucketRateLimiter(requestsPerSecond);
  }

  /**
   * Execute a single query with rate limiting
   */
  async execute<T>(query: () => Promise<T>): Promise<T> {
    await this.rateLimiter.acquire();
    return query();
  }

  /**
   * Execute multiple queries in parallel with rate limiting
   * Uses Promise.all() for parallel execution
   */
  async executeParallel<T>(queries: Array<() => Promise<T>>): Promise<T[]> {
    const wrappedQueries = queries.map(query => this.execute(query));
    return Promise.all(wrappedQueries);
  }

  /**
   * Execute multiple queries in parallel with partial failure handling
   * Uses Promise.allSettled() to capture all results
   * Returns successful results and logs failures
   */
  async executeParallelWithPartialFailure<T>(
    queries: Array<() => Promise<T>>
  ): Promise<T[]> {
    const wrappedQueries = queries.map(query => this.execute(query));
    const results = await Promise.allSettled(wrappedQueries);

    const successfulResults: T[] = [];
    const failures: Array<{ index: number; reason: unknown }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
      } else {
        failures.push({ index, reason: result.reason });
        console.error(`Query ${index} failed:`, result.reason);
      }
    });

    if (failures.length > 0) {
      console.warn(`${failures.length} out of ${queries.length} queries failed`);
    }

    return successfulResults;
  }

  /**
   * Get current queue length (for monitoring)
   */
  getQueueLength(): number {
    return this.rateLimiter.getQueueLength();
  }
}
