import { fetchAuthSession } from 'aws-amplify/auth';
import type { ApiResponse, ApiError } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000';
const DEFAULT_CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  skipCache?: boolean;
  forceRefresh?: boolean;
  cacheTtl?: number;
}

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

// In-memory cache
const cache = new Map<string, CacheEntry<unknown>>();

// Calculate exponential backoff delay with jitter
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

// Check if error is retryable
function isRetryableError(status: number): boolean {
  return status === 429 || status >= 500;
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get auth token from Amplify
async function getAuthToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch {
    return null;
  }
}

// Generate cache key from endpoint and params
function getCacheKey(endpoint: string, params?: Record<string, string>): string {
  const paramString = params ? `?${new URLSearchParams(params).toString()}` : '';
  return `${endpoint}${paramString}`;
}

// Check if cache entry is valid
function isCacheValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  if (!entry) return false;
  return Date.now() - entry.timestamp < entry.ttl;
}

// Get cached data
function getFromCache<T>(key: string): CacheEntry<T> | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && !isCacheValid(entry)) {
    cache.delete(key);
    return undefined;
  }
  return entry;
}

// Set cache data
function setCache<T>(key: string, data: T, ttl: number = DEFAULT_CACHE_TTL): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

// Invalidate cache by key or pattern
export function invalidateCache(keyOrPattern: string): void {
  if (keyOrPattern.includes('*')) {
    // Pattern matching - invalidate all matching keys
    const pattern = new RegExp(keyOrPattern.replace(/\*/g, '.*'));
    for (const key of cache.keys()) {
      if (pattern.test(key)) {
        cache.delete(key);
      }
    }
  } else {
    cache.delete(keyOrPattern);
  }
}

// Clear all cache
export function clearCache(): void {
  cache.clear();
}

// Get cache timestamp for a key
export function getCacheTimestamp(key: string): Date | null {
  const entry = cache.get(key);
  return entry ? new Date(entry.timestamp) : null;
}

// Main API request function with retry logic
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    skipCache = false,
    forceRefresh = false,
    cacheTtl = DEFAULT_CACHE_TTL,
  } = options;

  const cacheKey = getCacheKey(endpoint);

  // Check cache for GET requests
  if (method === 'GET' && !skipCache && !forceRefresh) {
    const cachedEntry = getFromCache<T>(cacheKey);
    if (cachedEntry) {
      return {
        data: cachedEntry.data,
        lastUpdated: new Date(cachedEntry.timestamp),
        cached: true,
      };
    }
  }

  // Get auth token
  const token = await getAuthToken();

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Build request options
  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  // Execute request with retry logic
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);

      if (!response.ok) {
        if (isRetryableError(response.status) && attempt < retryConfig.maxRetries) {
          const delay = calculateDelay(attempt, retryConfig);
          await sleep(delay);
          continue;
        }

        const errorData = await response.json().catch(() => ({})) as Partial<ApiError>;
        throw new ApiClientError(
          errorData.message || `Request failed with status ${response.status}`,
          errorData.code || 'API_ERROR',
          response.status,
          errorData.details
        );
      }

      const data = await response.json() as T;
      const timestamp = new Date();

      // Cache successful GET responses
      if (method === 'GET' && !skipCache) {
        setCache(cacheKey, data, cacheTtl);
      }

      // Invalidate related cache on mutations
      if (method !== 'GET') {
        invalidateRelatedCache(endpoint);
      }

      return {
        data,
        lastUpdated: timestamp,
        cached: false,
      };
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < retryConfig.maxRetries) {
        const delay = calculateDelay(attempt, retryConfig);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

// Invalidate related cache entries after mutations
function invalidateRelatedCache(endpoint: string): void {
  // Extract resource type from endpoint
  const resourceMatch = endpoint.match(/^\/([^/]+)/);
  if (resourceMatch) {
    const resource = resourceMatch[1];
    invalidateCache(`/${resource}*`);
  }
}

// Custom error class for API errors
export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// API Client class with typed methods
export const apiClient = {
  // Generic methods
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),

  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

  // Force refresh (bypass cache)
  refresh: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'GET', forceRefresh: true }),

  // Cache utilities
  invalidateCache,
  clearCache,
  getCacheTimestamp,
};

export default apiClient;
