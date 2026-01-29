import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { apiClient, clearCache } from './api-client';
import { requestDeduplicator } from './request-deduplicator';

// Mock aws-amplify/auth module
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(async () => ({
    tokens: null,
  })),
}));

describe('API Client + Request Deduplicator Integration Tests', () => {
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

  test('deduplication works with cache layer - multiple simultaneous requests execute only once', async () => {
    const endpoint = '/query/test-endpoint';
    const mockData = { id: 1, name: 'Test Data', value: 100 };
    
    let fetchCallCount = 0;
    const mockFetch = vi.fn(async () => {
      fetchCallCount++;
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 50));
      return new Response(
        JSON.stringify({ success: true, data: mockData }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });
    global.fetch = mockFetch;

    // Make 5 simultaneous requests
    const requests = Array.from({ length: 5 }, () =>
      apiClient.get(endpoint)
    );

    // Wait for all requests to complete
    const results = await Promise.all(requests);

    // Verify only one fetch call was made (deduplication worked)
    expect(fetchCallCount).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Verify all callers received the same result
    for (const result of results) {
      expect(result.data).toEqual(mockData);
    }

    // Verify deduplication metrics
    const metrics = requestDeduplicator.getMetrics();
    expect(metrics.totalSubscribers).toBeGreaterThanOrEqual(5);
  });

  test('deduplication works with cache - cached requests bypass deduplication', async () => {
    const endpoint = '/query/cached-endpoint';
    const mockData = { id: 2, name: 'Cached Data', value: 200 };
    
    let fetchCallCount = 0;
    const mockFetch = vi.fn(async () => {
      fetchCallCount++;
      return new Response(
        JSON.stringify({ success: true, data: mockData }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });
    global.fetch = mockFetch;

    // First request to populate cache
    const firstResponse = await apiClient.get(endpoint);
    expect(firstResponse.data).toEqual(mockData);
    expect(fetchCallCount).toBe(1);

    // Multiple simultaneous requests should all use cache (no deduplication needed)
    mockFetch.mockClear();
    const cachedRequests = Array.from({ length: 5 }, () =>
      apiClient.get(endpoint)
    );

    const cachedResults = await Promise.all(cachedRequests);

    // Verify no additional fetch calls (all used cache)
    expect(mockFetch).not.toHaveBeenCalled();
    expect(fetchCallCount).toBe(1); // Still only 1 from initial request

    // Verify all results came from cache
    for (const result of cachedResults) {
      expect(result.data).toEqual(mockData);
      expect(result.cached).toBe(true);
    }
  });

  test('error propagation works through deduplicator - all callers receive same error', async () => {
    const endpoint = '/query/error-endpoint';
    const errorMessage = 'Test error message';
    
    let fetchCallCount = 0;
    const mockFetch = vi.fn(async () => {
      fetchCallCount++;
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 50));
      return new Response(
        JSON.stringify({ message: errorMessage, code: 'TEST_ERROR' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    });
    global.fetch = mockFetch;

    // Make 5 simultaneous requests that will fail
    const requests = Array.from({ length: 5 }, () =>
      apiClient.get(endpoint).catch(error => error)
    );

    // Wait for all requests to complete
    const results = await Promise.all(requests);

    // Verify deduplication worked (fetch called once, but retries may occur)
    // With 3 retries, we expect up to 4 calls (1 initial + 3 retries)
    expect(fetchCallCount).toBeGreaterThanOrEqual(1);
    expect(fetchCallCount).toBeLessThanOrEqual(4);

    // Verify all callers received the same error
    for (const result of results) {
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain(errorMessage);
    }
  }, 15000); // Increase timeout to account for retries

  test('deduplication respects different endpoints and parameters', async () => {
    const endpoint1 = '/query/endpoint1';
    const endpoint2 = '/query/endpoint2';
    const mockData1 = { id: 1, name: 'Data 1' };
    const mockData2 = { id: 2, name: 'Data 2' };
    
    let fetchCallCount = 0;
    const mockFetch = vi.fn(async (url: string | URL | Request) => {
      fetchCallCount++;
      await new Promise(resolve => setTimeout(resolve, 50));
      const urlString = typeof url === 'string' ? url : url.toString();
      const data = urlString.includes('endpoint1') ? mockData1 : mockData2;
      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });
    global.fetch = mockFetch as any;

    // Make simultaneous requests to different endpoints
    const requests = [
      apiClient.get(endpoint1),
      apiClient.get(endpoint1),
      apiClient.get(endpoint2),
      apiClient.get(endpoint2),
    ];

    const results = await Promise.all(requests);

    // Verify two fetch calls were made (one per unique endpoint)
    expect(fetchCallCount).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Verify correct data for each endpoint
    expect(results[0].data).toEqual(mockData1);
    expect(results[1].data).toEqual(mockData1);
    expect(results[2].data).toEqual(mockData2);
    expect(results[3].data).toEqual(mockData2);
  });
});
