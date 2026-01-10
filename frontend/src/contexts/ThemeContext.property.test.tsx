/**
 * Property-Based Tests for ThemeContext
 *
 * Feature: ui-ux-refresh
 * Property 1: Theme State Consistency
 * Validates: Requirements 3.1, 3.2, 3.6
 *
 * For any sequence of theme toggle operations, the theme state SHALL always be
 * either 'light' or 'dark', and the document root class SHALL match the current theme state.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme, type Theme } from './ThemeContext';

// Test component that exposes theme state
function ThemeTestComponent({
  onThemeChange,
}: {
  onThemeChange?: (theme: Theme) => void;
}) {
  const { theme, toggleTheme, setTheme } = useTheme();

  // Report theme changes
  if (onThemeChange) {
    onThemeChange(theme);
  }

  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button data-testid="toggle-btn" onClick={toggleTheme}>
        Toggle
      </button>
      <button data-testid="set-light-btn" onClick={() => setTheme('light')}>
        Set Light
      </button>
      <button data-testid="set-dark-btn" onClick={() => setTheme('dark')}>
        Set Dark
      </button>
    </div>
  );
}

describe('Property 1: Theme State Consistency', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset document class
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  /**
   * Property 1.1: Theme state is always valid
   *
   * For any sequence of toggle operations, the theme state SHALL always be
   * either 'light' or 'dark'.
   *
   * Validates: Requirements 3.1, 3.2
   */
  it('should always have a valid theme state after any sequence of toggles', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 0, maxLength: 50 }),
        (toggleSequence) => {
          localStorage.clear();
          document.documentElement.classList.remove('dark');

          let currentTheme: Theme = 'light';

          const { unmount } = render(
            <ThemeProvider>
              <ThemeTestComponent onThemeChange={(t) => (currentTheme = t)} />
            </ThemeProvider>
          );

          // Execute toggle sequence
          toggleSequence.forEach((shouldToggle) => {
            if (shouldToggle) {
              act(() => {
                screen.getByTestId('toggle-btn').click();
              });
            }
          });

          // Verify theme is always valid
          const themeValue = screen.getByTestId('theme-value').textContent;
          expect(themeValue === 'light' || themeValue === 'dark').toBe(true);
          expect(currentTheme === 'light' || currentTheme === 'dark').toBe(true);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.2: Document class matches theme state
   *
   * For any theme state, the document root SHALL have the 'dark' class
   * if and only if the theme is 'dark'.
   *
   * Validates: Requirements 3.6
   */
  it('should have document class matching theme state', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('toggle', 'setLight', 'setDark'), { minLength: 1, maxLength: 30 }),
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
                case 'toggle':
                  screen.getByTestId('toggle-btn').click();
                  break;
                case 'setLight':
                  screen.getByTestId('set-light-btn').click();
                  break;
                case 'setDark':
                  screen.getByTestId('set-dark-btn').click();
                  break;
              }
            });
          });

          // Verify document class matches theme
          const themeValue = screen.getByTestId('theme-value').textContent as Theme;
          const hasDarkClass = document.documentElement.classList.contains('dark');

          if (themeValue === 'dark') {
            expect(hasDarkClass).toBe(true);
          } else {
            expect(hasDarkClass).toBe(false);
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.3: Toggle is its own inverse
   *
   * For any initial theme state, toggling twice SHALL return to the original state.
   *
   * Validates: Requirements 3.1, 3.2
   */
  it('should return to original state after double toggle', () => {
    fc.assert(
      fc.property(fc.constantFrom('light', 'dark') as fc.Arbitrary<Theme>, (initialTheme) => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');

        // Set initial theme
        localStorage.setItem('kharis-theme', initialTheme);

        const { unmount } = render(
          <ThemeProvider>
            <ThemeTestComponent />
          </ThemeProvider>
        );

        // Get initial state
        const initialValue = screen.getByTestId('theme-value').textContent;
        expect(initialValue).toBe(initialTheme);

        // Toggle twice
        act(() => {
          screen.getByTestId('toggle-btn').click();
        });
        act(() => {
          screen.getByTestId('toggle-btn').click();
        });

        // Should be back to initial
        const finalValue = screen.getByTestId('theme-value').textContent;
        expect(finalValue).toBe(initialTheme);

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.4: setTheme is idempotent
   *
   * For any theme value, calling setTheme multiple times with the same value
   * SHALL result in the same state.
   *
   * Validates: Requirements 3.1
   */
  it('should be idempotent when setting the same theme multiple times', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark') as fc.Arbitrary<Theme>,
        fc.integer({ min: 1, max: 10 }),
        (targetTheme, repeatCount) => {
          localStorage.clear();
          document.documentElement.classList.remove('dark');

          const { unmount } = render(
            <ThemeProvider>
              <ThemeTestComponent />
            </ThemeProvider>
          );

          // Set theme multiple times
          for (let i = 0; i < repeatCount; i++) {
            act(() => {
              if (targetTheme === 'light') {
                screen.getByTestId('set-light-btn').click();
              } else {
                screen.getByTestId('set-dark-btn').click();
              }
            });
          }

          // Verify final state
          const finalValue = screen.getByTestId('theme-value').textContent;
          expect(finalValue).toBe(targetTheme);

          // Verify document class
          const hasDarkClass = document.documentElement.classList.contains('dark');
          expect(hasDarkClass).toBe(targetTheme === 'dark');

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
