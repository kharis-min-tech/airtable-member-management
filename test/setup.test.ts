import * as fc from 'fast-check';

describe('Project Setup', () => {
  it('should have Jest configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should have fast-check integrated for property-based testing', () => {
    // Property: For any two positive numbers, their sum is greater than each individual number
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), fc.integer({ min: 1, max: 1000 }), (a, b) => {
        const sum = a + b;
        return sum > a && sum > b;
      }),
      { numRuns: 100 }
    );
  });

  it('should support async property tests', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (str) => {
        // Property: String length is always non-negative
        return str.length >= 0;
      }),
      { numRuns: 100 }
    );
  });
});
