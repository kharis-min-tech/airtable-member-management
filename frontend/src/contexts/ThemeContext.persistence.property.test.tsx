/**
 * Property-Based Tests for ThemeContext Persistence
 *
 * Feature: ui-ux-refresh
 * Property 2: Theme Persistence Round-Trip
 * Validates: Requirements 3.3, 3.4
 *
 * For any theme value set by the user, saving to localStorage and then reloading
 * the application SHALL restore the exact same theme value.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ThemeProvider, useTheme, type Theme } from './ThemeContext';

const STORAGE_KEY = 'kharis-theme';

// Test component that exposes theme state
function ThemeTestComponent() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button data-testid="set-light-btn" onClick={() => setTheme('light')}>
        Set Light
      </button>
      <button data-testid="set-dark-btn" onClick={() => setTheme('dark')}>
        Set Dark
      </button>
    </div>
  );
}

describe('Property 2: Theme Persistence Round-Trip', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  /**
   * Property 2.1: Theme persists to localStorage
   *
   * For any theme value, setting the theme SHALL persist it to localStorage.
   *
   * Validates: Requirements 3.3
   */
  it('should persist theme to localStorage when set', () => {
    fc.assert(
      fc.property(fc.constantFrom('light', 'dark') as fc.Arbitrary<Theme>, (targetTheme) => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');

        const { unmount } = render(
          <ThemeProvider>
            <ThemeTestComponent />
          </ThemeProvider>
        );

        // Set theme
        act(() => {
          if (targetTheme === 'light') {
            screen.getByTestId('set-light-btn').click();
          } else {
            screen.getByTestId('set-dark-btn').click();
          }
        });

        // Verify localStorage
        const storedTheme = localStorage.getItem(STORAGE_KEY);
        expect(storedTheme).toBe(targetTheme);

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.2: Theme restores from localStorage on mount
   *
   * For any theme value stored in localStorage, mounting the ThemeProvider
   * SHALL restore that exact theme value.
   *
   * Validates: Requirements 3.4
   */
  it('should restore theme from localStorage on mount', () => {
    fc.assert(
      fc.property(fc.constantFrom('light', 'dark') as fc.Arbitrary<Theme>, (storedTheme) => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');

        // Pre-set localStorage
        localStorage.setItem(STORAGE_KEY, storedTheme);

        const { unmount } = render(
          <ThemeProvider>
            <ThemeTestComponent />
          </ThemeProvider>
        );

        // Verify theme was restored
        const themeValue = screen.getByTestId('theme-value').textContent;
        expect(themeValue).toBe(storedTheme);

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.3: Round-trip persistence
   *
   * For any sequence of theme changes, unmounting and remounting the provider
   * SHALL restore the last set theme value.
   *
   * Validates: Requirements 3.3, 3.4
   */
  it('should maintain theme across unmount/remount cycles', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('light', 'dark') as fc.Arbitrary<Theme>, {
          minLength: 1,
          maxLength: 10,
        }),
        (themeSequence) => {
          localStorage.clear();
          document.documentElement.classList.remove('dark');

          // First mount - set themes
          const { unmount: unmount1 } = render(
            <ThemeProvider>
              <ThemeTestComponent />
            </ThemeProvider>
          );

          // Apply theme sequence
          themeSequence.forEach((theme) => {
            act(() => {
              if (theme === 'light') {
                screen.getByTestId('set-light-btn').click();
              } else {
                screen.getByTestId('set-dark-btn').click();
              }
            });
          });

          // Get final theme before unmount
          const finalTheme = screen.getByTestId('theme-value').textContent;
          const expectedTheme = themeSequence[themeSequence.length - 1];
          expect(finalTheme).toBe(expectedTheme);

          // Unmount
          unmount1();

          // Clear document class to simulate fresh page load
          document.documentElement.classList.remove('dark');

          // Remount
          const { unmount: unmount2 } = render(
            <ThemeProvider>
              <ThemeTestComponent />
            </ThemeProvider>
          );

          // Verify theme was restored
          const restoredTheme = screen.getByTestId('theme-value').textContent;
          expect(restoredTheme).toBe(expectedTheme);

          unmount2();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.4: localStorage value is always valid
   *
   * For any sequence of theme operations, the localStorage value SHALL always
   * be either 'light' or 'dark'.
   *
   * Validates: Requirements 3.3
   */
  it('should always store valid theme values in localStorage', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('setLight', 'setDark', 'toggle'), { minLength: 1, maxLength: 20 }),
        (operations) => {
          localStorage.clear();
          document.documentElement.classList.remove('dark');

          const { unmount } = render(
            <ThemeProvider>
              <ThemeTestComponent />
            </ThemeProvider>
          );

          // Execute operations
          operations.forEach((op) => {
            act(() => {
              switch (op) {
                case 'setLight':
                  screen.getByTestId('set-light-btn').click();
                  break;
                case 'setDark':
                  screen.getByTestId('set-dark-btn').click();
                  break;
                case 'toggle':
                  // Toggle by setting opposite of current
                  const current = screen.getByTestId('theme-value').textContent;
                  if (current === 'light') {
                    screen.getByTestId('set-dark-btn').click();
                  } else {
                    screen.getByTestId('set-light-btn').click();
                  }
                  break;
              }
            });
          });

          // Verify localStorage has valid value
          const storedValue = localStorage.getItem(STORAGE_KEY);
          expect(storedValue === 'light' || storedValue === 'dark').toBe(true);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.5: Theme and localStorage are always in sync
   *
   * For any theme operation, the current theme state SHALL match the localStorage value.
   *
   * Validates: Requirements 3.3, 3.4
   */
  it('should keep theme state and localStorage in sync', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('light', 'dark') as fc.Arbitrary<Theme>, {
          minLength: 1,
          maxLength: 15,
        }),
        (themeSequence) => {
          localStorage.clear();
          document.documentElement.classList.remove('dark');

          const { unmount } = render(
            <ThemeProvider>
              <ThemeTestComponent />
            </ThemeProvider>
          );

          // Apply each theme and verify sync
          themeSequence.forEach((theme) => {
            act(() => {
              if (theme === 'light') {
                screen.getByTestId('set-light-btn').click();
              } else {
                screen.getByTestId('set-dark-btn').click();
              }
            });

            // Verify sync after each operation
            const currentTheme = screen.getByTestId('theme-value').textContent;
            const storedTheme = localStorage.getItem(STORAGE_KEY);
            expect(currentTheme).toBe(storedTheme);
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
