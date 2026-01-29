/**
 * Property-based tests for Exponential Backoff Retry
 * 
 * Feature: api-performance-optimization, Property 25: Exponential Backoff Retry
 * 
 * *For any* Airtable API call that receives a 429 rate limit error, the system should 
 * retry with exponentially increasing delays (1s, 2s, 4s, 8s), demonstrating proper 
 * retry logic.
 * 
 * **Validates: Requirements 11.4**
 */

import * as fc from 'fast-check';
import { AirtableClient, AirtableError, AirtableErrorCode } from '../src/services/airtable-client';
import { AirtableConfig } from '../src/types';

// Mock fetch globally
global.fetch = jest.fn();

describe('Property 25: Exponential Backoff Retry', () => {
  let client: AirtableClient;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    
    const config: AirtableConfig = {
      baseId: 'test-base',
      apiKey: 'test-key',
      rateLimitPerSecond: 5,
    };
    client = new AirtableClient(config);
  });

  /**
   * Property: Exponential backoff follows 1s, 2s, 4s, 8s, 16s pattern
   * For any sequence of 429 errors, retry delays should follow exponential pattern
   */
  it('should follow exponential backoff pattern (1s, 2s, 4s, 8s, 16s) for 429 errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Number of retries before success
        async (retriesBeforeSuccess) => {
          const retryDelays: number[] = [];
          let callCount = 0;

          // Mock fetch to return 429 errors, then success
          mockFetch.mockImplementation(async () => {
            callCount++;
            
            if (callCount <= retriesBeforeSuccess) {
              // Return 429 error
              return {
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                json: async () => ({ error: { message: 'Rate limit exceeded' } }),
              } as Response;
            }
            
            // Return success
            return {
              ok: true,
              status: 200,
              json: async () => ({
                id: 'rec123',
                fields: { Name: 'Test' },
                createdTime: new Date().toISOString(),
              }),
            } as Response;
          });

          // Mock sleep to capture delays and speed up execution
          jest.spyOn(client as any, 'sleep').mockImplementation(async (...args: any[]) => {
            const ms = args[0] as number;
            // Capture the original delay value BEFORE modifying it
            retryDelays.push(ms);
            // Use a shorter delay for testing (divide by 100)
            await new Promise(resolve => setTimeout(resolve, ms / 100));
          });

          try {
            await client.getRecord('Members', 'rec123');
          } catch (error) {
            // If it fails after max retries, that's expected
          }

          // Verify exponential backoff pattern
          const expectedDelays = [1000, 2000, 4000, 8000, 16000];
          const actualDelays = retryDelays.slice(0, retriesBeforeSuccess);
          
          // Check that delays match expected exponential pattern
          for (let i = 0; i < actualDelays.length; i++) {
            expect(actualDelays[i]).toBe(expectedDelays[i]);
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Maximum 5 retries before failing
   * For any continuous sequence of 429 errors, system should fail after 5 retries
   */
  it('should fail after maximum 5 retries for continuous 429 errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // No randomization needed for this test
        async () => {
          let callCount = 0;

          // Mock fetch to always return 429 errors
          mockFetch.mockImplementation(async () => {
            callCount++;
            return {
              ok: false,
              status: 429,
              statusText: 'Too Many Requests',
              json: async () => ({ error: { message: 'Rate limit exceeded' } }),
            } as Response;
          });

          // Speed up sleep for testing
          jest.spyOn(client as any, 'sleep').mockImplementation(async (...args: any[]) => {
            const ms = args[0] as number;
            await new Promise(resolve => setTimeout(resolve, ms / 100));
          });

          try {
            await client.getRecord('Members', 'rec123');
            // Should not reach here
            return false;
          } catch (error) {
            // Should fail after 6 total attempts (1 initial + 5 retries)
            expect(callCount).toBe(6);
            expect(error).toBeInstanceOf(AirtableError);
            expect((error as AirtableError).code).toBe(AirtableErrorCode.RATE_LIMITED);
            return true;
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Non-retryable errors should not trigger retry
   * For any non-retryable error (404, 400), system should fail immediately
   */
  it('should not retry for non-retryable errors (404, 400)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(404, 400, 422), // Non-retryable status codes
        async (statusCode) => {
          let callCount = 0;

          mockFetch.mockImplementation(async () => {
            callCount++;
            return {
              ok: false,
              status: statusCode,
              statusText: 'Error',
              json: async () => ({ error: { message: 'Error occurred' } }),
            } as Response;
          });

          try {
            await client.getRecord('Members', 'rec123');
            return false;
          } catch (error) {
            // Should fail immediately without retries
            expect(callCount).toBe(1);
            expect(error).toBeInstanceOf(AirtableError);
            return true;
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Successful request after retries should return data
   * For any number of 429 errors followed by success, system should return data
   */
  it('should return data successfully after retries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Number of 429 errors before success
        fc.string({ minLength: 1, maxLength: 20 }), // Random record ID
        fc.record({
          Name: fc.string({ minLength: 1, maxLength: 50 }),
          Email: fc.emailAddress(),
        }), // Random record data
        async (errorCount, recordId, recordFields) => {
          let callCount = 0;

          mockFetch.mockImplementation(async () => {
            callCount++;
            
            if (callCount <= errorCount) {
              return {
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                json: async () => ({ error: { message: 'Rate limit exceeded' } }),
              } as Response;
            }
            
            return {
              ok: true,
              status: 200,
              json: async () => ({
                id: recordId,
                fields: recordFields,
                createdTime: new Date().toISOString(),
              }),
            } as Response;
          });

          // Speed up sleep for testing
          jest.spyOn(client as any, 'sleep').mockImplementation(async (...args: any[]) => {
            const ms = args[0] as number;
            await new Promise(resolve => setTimeout(resolve, ms / 100));
          });

          const result = await client.getRecord('Members', recordId);
          
          // Verify we got the expected data
          expect(result.id).toBe(recordId);
          expect(result.fields).toEqual(recordFields);
          expect(callCount).toBe(errorCount + 1);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Retry delays should be deterministic (no jitter)
   * For any sequence of retries, delays should be exactly 1s, 2s, 4s, 8s, 16s
   */
  it('should use deterministic delays without jitter', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const retryDelays: number[] = [];
          let callCount = 0;

          // Mock to return 5 consecutive 429 errors
          mockFetch.mockImplementation(async () => {
            callCount++;
            if (callCount <= 5) {
              return {
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                json: async () => ({ error: { message: 'Rate limit exceeded' } }),
              } as Response;
            }
            return {
              ok: true,
              status: 200,
              json: async () => ({
                id: 'rec123',
                fields: {},
                createdTime: new Date().toISOString(),
              }),
            } as Response;
          });

          jest.spyOn(client as any, 'sleep').mockImplementation(async (...args: any[]) => {
            const ms = args[0] as number;
            retryDelays.push(ms);
            await new Promise(resolve => setTimeout(resolve, ms / 100));
          });

          await client.getRecord('Members', 'rec123');

          // Verify exact delays (no jitter)
          expect(retryDelays).toEqual([1000, 2000, 4000, 8000, 16000]);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Retry logic should work for all API methods
   * For any API method (getRecord, createRecord, updateRecord, findRecords),
   * retry logic should apply consistently
   */
  it('should apply retry logic consistently across all API methods', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('getRecord', 'createRecord', 'updateRecord', 'findRecords'),
        fc.integer({ min: 1, max: 3 }), // Number of retries before success
        async (method: string, retriesBeforeSuccess: number) => {
          let callCount = 0;

          mockFetch.mockImplementation(async () => {
            callCount++;
            
            if (callCount <= retriesBeforeSuccess) {
              return {
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                json: async () => ({ error: { message: 'Rate limit exceeded' } }),
              } as Response;
            }
            
            return {
              ok: true,
              status: 200,
              json: async () => {
                if (method === 'findRecords') {
                  return {
                    records: [{
                      id: 'rec123',
                      fields: { Name: 'Test' },
                      createdTime: new Date().toISOString(),
                    }],
                  };
                }
                return {
                  id: 'rec123',
                  fields: { Name: 'Test' },
                  createdTime: new Date().toISOString(),
                };
              },
            } as Response;
          });

          jest.spyOn(client as any, 'sleep').mockImplementation(async (...args: any[]) => {
            const ms = args[0] as number;
            await new Promise(resolve => setTimeout(resolve, ms / 100));
          });

          try {
            switch (method) {
              case 'getRecord':
                await client.getRecord('Members', 'rec123');
                break;
              case 'createRecord':
                await client.createRecord('Members', { Name: 'Test' });
                break;
              case 'updateRecord':
                await client.updateRecord('Members', 'rec123', { Name: 'Test' });
                break;
              case 'findRecords':
                await client.findRecords('Members', '{Name} = "Test"');
                break;
            }
            
            // Verify retry happened
            expect(callCount).toBe(retriesBeforeSuccess + 1);
            return true;
          } catch (error) {
            return false;
          }
        }
      ),
      { numRuns: 5 }
    );
  });
});
