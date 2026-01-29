/**
 * RequestDeduplicator - Prevents duplicate simultaneous API requests
 * 
 * This class implements a global request deduplication mechanism that ensures
 * multiple identical requests made within a 1-second window share the same
 * underlying API call, reducing backend load and improving performance.
 */

interface InFlightRequest {
  promise: Promise<any>;
  timestamp: number;
  subscribers: number;
}

export class RequestDeduplicator {
  private inFlightRequests: Map<string, InFlightRequest>;
  private deduplicationWindow: number;

  constructor(deduplicationWindowMs: number = 1000) {
    this.inFlightRequests = new Map();
    this.deduplicationWindow = deduplicationWindowMs;
  }

  /**
   * Execute a request with deduplication
   * If an identical request is in-flight, returns the existing promise
   * Otherwise, creates a new request
   */
  async fetch<T>(
    endpoint: string,
    params: Record<string, any>,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const key = this.generateKey(endpoint, params);
    
    // Clean up expired entries before checking
    this.cleanupExpired();

    // Check if request is already in-flight
    const existing = this.inFlightRequests.get(key);
    if (existing) {
      existing.subscribers++;
      return existing.promise as Promise<T>;
    }

    // Create new request
    const promise = fetcher()
      .then((result) => {
        // Keep in map for deduplication window
        setTimeout(() => {
          this.inFlightRequests.delete(key);
        }, this.deduplicationWindow);
        return result;
      })
      .catch((error) => {
        // Keep error in map for deduplication window to prevent retry storms
        setTimeout(() => {
          this.inFlightRequests.delete(key);
        }, this.deduplicationWindow);
        throw error;
      });

    // Store in-flight request
    this.inFlightRequests.set(key, {
      promise,
      timestamp: Date.now(),
      subscribers: 1,
    });

    return promise;
  }

  /**
   * Generate unique key from endpoint and parameters
   * Uses stable JSON serialization for consistent keys
   */
  private generateKey(endpoint: string, params: Record<string, any>): string {
    // Sort keys for stable serialization
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);

    const paramString = JSON.stringify(sortedParams);
    return `${endpoint}::${paramString}`;
  }

  /**
   * Remove expired deduplication entries
   * Called before each new request to prevent memory leaks
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, request] of this.inFlightRequests.entries()) {
      if (now - request.timestamp > this.deduplicationWindow) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.inFlightRequests.delete(key);
    }
  }

  /**
   * Get current deduplication metrics
   * Useful for monitoring and debugging
   */
  getMetrics() {
    let totalSubscribers = 0;
    for (const request of this.inFlightRequests.values()) {
      totalSubscribers += request.subscribers;
    }

    return {
      inFlightRequests: this.inFlightRequests.size,
      totalSubscribers,
      savingsPercent: this.inFlightRequests.size > 0 
        ? ((totalSubscribers - this.inFlightRequests.size) / totalSubscribers) * 100 
        : 0,
    };
  }

  /**
   * Clear all in-flight requests
   * Useful for testing and cleanup
   */
  clear(): void {
    this.inFlightRequests.clear();
  }
}

// Global singleton instance
export const requestDeduplicator = new RequestDeduplicator();
