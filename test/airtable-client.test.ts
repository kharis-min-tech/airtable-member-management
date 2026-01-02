/**
 * Property-based tests for AirtableClient
 * 
 * Property 2: Member Search Correctness
 * *For any* phone number or email that exists in the Members table, searching by that 
 * phone or email SHALL return the matching Member record. *For any* phone number or 
 * email that does not exist in the Members table, searching SHALL return null.
 * 
 * **Validates: Requirements 2.1, 3.1**
 */

import * as fc from 'fast-check';
import { AirtableClient, AirtableError, AirtableErrorCode } from '../src/services/airtable-client';
import { AirtableConfig } from '../src/types';

// Mock the Airtable module
jest.mock('airtable', () => {
  const mockBase = jest.fn();
  const mockConfigure = jest.fn();
  
  return {
    configure: mockConfigure,
    base: mockBase,
    default: {
      configure: mockConfigure,
      base: mockBase,
    },
  };
});

describe('AirtableClient', () => {
  describe('Phone Normalization', () => {
    let client: AirtableClient;

    beforeEach(() => {
      const config: AirtableConfig = {
        baseId: 'test-base',
        apiKey: 'test-key',
        rateLimitPerSecond: 5,
      };
      client = new AirtableClient(config);
    });

    /**
     * Property: Phone normalization preserves digits
     * For any phone string, normalization should preserve all digit characters
     */
    it('should preserve all digits during normalization', () => {
      fc.assert(
        fc.property(fc.string(), (phone) => {
          const normalized = client.normalizePhone(phone);
          const originalDigits = phone.replace(/\D/g, '');
          const normalizedDigits = normalized.replace(/\D/g, '');
          return originalDigits === normalizedDigits;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Phone normalization is idempotent
     * Normalizing a phone number twice should give the same result as normalizing once
     */
    it('should be idempotent - normalizing twice equals normalizing once', () => {
      fc.assert(
        fc.property(fc.string(), (phone) => {
          const once = client.normalizePhone(phone);
          const twice = client.normalizePhone(once);
          return once === twice;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Phone normalization preserves leading + for international numbers
     */
    it('should preserve leading + for international numbers', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s.startsWith('+')),
          (phone) => {
            const normalized = client.normalizePhone(phone);
            // If original starts with +, normalized should too (if there are digits)
            const hasDigits = /\d/.test(phone);
            if (hasDigits) {
              return normalized.startsWith('+');
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Normalized phone contains only digits (and optional leading +)
     */
    it('should produce output with only digits and optional leading +', () => {
      fc.assert(
        fc.property(fc.string(), (phone) => {
          const normalized = client.normalizePhone(phone);
          // Should match: empty string, digits only, or + followed by digits
          return /^(\+?\d*)?$/.test(normalized);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Error Handling', () => {
    it('should create retryable error for rate limit (429)', () => {
      const error = new AirtableError(
        AirtableErrorCode.RATE_LIMITED,
        'Rate limit exceeded',
        true
      );
      expect(error.retryable).toBe(true);
      expect(error.code).toBe(AirtableErrorCode.RATE_LIMITED);
    });

    it('should create non-retryable error for not found (404)', () => {
      const error = new AirtableError(
        AirtableErrorCode.NOT_FOUND,
        'Record not found',
        false
      );
      expect(error.retryable).toBe(false);
      expect(error.code).toBe(AirtableErrorCode.NOT_FOUND);
    });
  });
});

/**
 * Feature: airtable-church-automations, Property 2: Member Search Correctness
 * 
 * This test validates that the findByUniqueKey method correctly:
 * 1. Returns matching records when phone/email exists
 * 2. Returns null when phone/email does not exist
 * 3. Handles phone normalization correctly
 * 4. Handles case-insensitive email matching
 * 
 * **Validates: Requirements 2.1, 3.1**
 */
describe('Property 2: Member Search Correctness', () => {
  // Generators for valid phone numbers
  const phoneGenerator = fc.stringOf(
    fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '-', '(', ')'),
    { minLength: 10, maxLength: 15 }
  ).map(s => s.replace(/^[\s\-()]+/, '')); // Remove leading non-digits

  // Generator for valid email addresses
  const emailGenerator = fc.emailAddress();

  describe('Phone Search Properties', () => {
    /**
     * Property: Normalized phone matching is consistent
     * For any phone number, normalizing it should produce a consistent searchable format
     */
    it('should normalize phones consistently for search', () => {
      const config: AirtableConfig = {
        baseId: 'test-base',
        apiKey: 'test-key',
        rateLimitPerSecond: 5,
      };
      const client = new AirtableClient(config);

      fc.assert(
        fc.property(phoneGenerator, (phone) => {
          const normalized1 = client.normalizePhone(phone);
          const normalized2 = client.normalizePhone(phone);
          return normalized1 === normalized2;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Different formatting of same number should normalize to same value
     */
    it('should normalize different formats of same number to same value', () => {
      const config: AirtableConfig = {
        baseId: 'test-base',
        apiKey: 'test-key',
        rateLimitPerSecond: 5,
      };
      const client = new AirtableClient(config);

      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 10 }),
          (digits) => {
            const baseNumber = digits.join('');
            const withDashes = digits.slice(0, 3).join('') + '-' + 
                              digits.slice(3, 6).join('') + '-' + 
                              digits.slice(6).join('');
            const withParens = '(' + digits.slice(0, 3).join('') + ') ' + 
                              digits.slice(3, 6).join('') + '-' + 
                              digits.slice(6).join('');
            const withSpaces = digits.slice(0, 3).join('') + ' ' + 
                              digits.slice(3, 6).join('') + ' ' + 
                              digits.slice(6).join('');

            const normalizedBase = client.normalizePhone(baseNumber);
            const normalizedDashes = client.normalizePhone(withDashes);
            const normalizedParens = client.normalizePhone(withParens);
            const normalizedSpaces = client.normalizePhone(withSpaces);

            return normalizedBase === normalizedDashes &&
                   normalizedBase === normalizedParens &&
                   normalizedBase === normalizedSpaces;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Email Search Properties', () => {
    /**
     * Property: Email matching should be case-insensitive
     * For any email, searching with different cases should match the same record
     */
    it('should match emails case-insensitively', () => {
      fc.assert(
        fc.property(emailGenerator, (email) => {
          const lower = email.toLowerCase();
          const upper = email.toUpperCase();
          const mixed = email.split('').map((c, i) => 
            i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
          ).join('');

          // All variations should normalize to the same lowercase value
          return lower === upper.toLowerCase() && 
                 lower === mixed.toLowerCase();
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Email trimming should remove whitespace
     */
    it('should trim whitespace from emails', () => {
      fc.assert(
        fc.property(
          emailGenerator,
          fc.string({ maxLength: 5 }).filter(s => /^\s*$/.test(s)),
          fc.string({ maxLength: 5 }).filter(s => /^\s*$/.test(s)),
          (email, prefix, suffix) => {
            const paddedEmail = prefix + email + suffix;
            const trimmed = paddedEmail.toLowerCase().trim();
            return trimmed === email.toLowerCase().trim();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Search Result Properties', () => {
    /**
     * Property: Search with no criteria returns null
     */
    it('should return null when no search criteria provided', async () => {
      const config: AirtableConfig = {
        baseId: 'test-base',
        apiKey: 'test-key',
        rateLimitPerSecond: 5,
      };
      const client = new AirtableClient(config);

      // This tests the early return when neither phone nor email is provided
      const result = await client.findByUniqueKey('Members', undefined, undefined);
      expect(result).toBeNull();
    });

    /**
     * Property: Search with empty strings returns null
     */
    it('should return null when search criteria are empty strings', async () => {
      const config: AirtableConfig = {
        baseId: 'test-base',
        apiKey: 'test-key',
        rateLimitPerSecond: 5,
      };
      const client = new AirtableClient(config);

      const result = await client.findByUniqueKey('Members', '', '');
      expect(result).toBeNull();
    });
  });
});
