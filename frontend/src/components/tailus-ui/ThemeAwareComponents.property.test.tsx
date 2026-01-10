/**
 * Property-Based Tests for Theme-Aware Component Styling
 *
 * Feature: ui-ux-refresh
 * Property 4: Theme-Aware Component Styling
 * Validates: Requirements 7.2, 9.2, 10.4, 11.4, 11.5
 *
 * For any theme-aware component (Card, Table, EmptyState, Logo), the component's
 * background/foreground colors SHALL match the current theme's color palette.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme, type Theme } from '../../contexts/ThemeContext';
import { Card } from './Card';
import { Table, TableHeader, TableBody, TableRow, TableCell } from './Table';

// Theme toggle helper component
function ThemeController({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button data-testid="set-light" onClick={() => setTheme('light')}>Light</button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>Dark</button>
      {children}
    </div>
  );
}

// Helper to check if element has light mode surface color
function hasLightSurfaceClass(element: HTMLElement): boolean {
  const className = element.className;
  return className.includes('bg-surface-light') || className.includes('bg-gray-50');
}

// Helper to check if element has dark mode surface color
function hasDarkSurfaceClass(element: HTMLElement): boolean {
  const className = element.className;
  return className.includes('dark:bg-surface-dark') || className.includes('dark:bg-gray-800');
}

describe('Property 4: Theme-Aware Component Styling', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  /**
   * Property 4.1: Card component has theme-aware background classes
   *
   * For any Card variant, the component SHALL have both light and dark mode
   * background color classes defined.
   *
   * Validates: Requirements 7.2
   */
  it('Card component should have theme-aware background classes for all variants', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('default', 'elevated', 'outlined') as fc.Arbitrary<'default' | 'elevated' | 'outlined'>,
        fc.constantFrom('light', 'dark') as fc.Arbitrary<Theme>,
        (variant, theme) => {
          localStorage.clear();
          document.documentElement.classList.remove('dark');
          localStorage.setItem('kharis-theme', theme);

          const { unmount } = render(
            <ThemeProvider>
              <ThemeController>
                <Card variant={variant} data-testid="test-card">
                  Card Content
                </Card>
              </ThemeController>
            </ThemeProvider>
          );

          const card = screen.getByTestId('test-card');
          
          // Card should have both light and dark mode classes
          expect(hasLightSurfaceClass(card)).toBe(true);
          expect(hasDarkSurfaceClass(card)).toBe(true);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.2: Table component has theme-aware background classes
   *
   * For any Table, the component and its subcomponents SHALL have both light
   * and dark mode background color classes defined.
   *
   * Validates: Requirements 9.2
   */
  it('Table component should have theme-aware background classes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark') as fc.Arbitrary<Theme>,
        fc.array(fc.record({ name: fc.string(), value: fc.string() }), { minLength: 1, maxLength: 5 }),
        (theme, rows) => {
          localStorage.clear();
          document.documentElement.classList.remove('dark');
          localStorage.setItem('kharis-theme', theme);

          const { unmount } = render(
            <ThemeProvider>
              <ThemeController>
                <Table data-testid="test-table">
                  <TableHeader>
                    <TableRow>
                      <TableCell header>Name</TableCell>
                      <TableCell header>Value</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody data-testid="test-tbody">
                    {rows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ThemeController>
            </ThemeProvider>
          );

          const table = screen.getByTestId('test-table');
          const tbody = screen.getByTestId('test-tbody');
          
          // Table should have theme-aware classes
          expect(hasLightSurfaceClass(table)).toBe(true);
          expect(hasDarkSurfaceClass(table)).toBe(true);
          
          // TableBody should have alternating row color classes for both themes
          const tbodyClass = tbody.className;
          expect(tbodyClass.includes('dark:')).toBe(true);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.3: Theme switching updates document class
   *
   * For any sequence of theme changes, the document root class SHALL be updated
   * to match the current theme, enabling CSS dark mode selectors.
   *
   * Validates: Requirements 7.2, 9.2, 10.4
   */
  it('Theme switching should update document class for CSS selectors', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('light', 'dark') as fc.Arbitrary<Theme>, { minLength: 1, maxLength: 20 }),
        (themeSequence) => {
          localStorage.clear();
          document.documentElement.classList.remove('dark');

          const { unmount } = render(
            <ThemeProvider>
              <ThemeController>
                <Card data-testid="test-card">Content</Card>
              </ThemeController>
            </ThemeProvider>
          );

          // Apply each theme in sequence
          themeSequence.forEach((theme) => {
            act(() => {
              if (theme === 'light') {
                screen.getByTestId('set-light').click();
              } else {
                screen.getByTestId('set-dark').click();
              }
            });
          });

          // Final theme should match document class
          const finalTheme = themeSequence[themeSequence.length - 1];
          const hasDarkClass = document.documentElement.classList.contains('dark');
          
          expect(hasDarkClass).toBe(finalTheme === 'dark');

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.4: All Card variants maintain consistent padding and border-radius
   *
   * For any Card variant, the component SHALL have consistent padding and
   * border-radius classes applied.
   *
   * Validates: Requirements 7.3
   */
  it('All Card variants should have consistent padding and border-radius', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('default', 'elevated', 'outlined') as fc.Arbitrary<'default' | 'elevated' | 'outlined'>,
        (variant) => {
          localStorage.clear();
          document.documentElement.classList.remove('dark');

          const { unmount } = render(
            <ThemeProvider>
              <Card variant={variant} data-testid="test-card">
                Card Content
              </Card>
            </ThemeProvider>
          );

          const card = screen.getByTestId('test-card');
          const className = card.className;
          
          // All variants should have padding and border-radius
          expect(className.includes('p-6')).toBe(true);
          expect(className.includes('rounded-lg')).toBe(true);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.5: Table rows have hover state classes
   *
   * For any TableRow, the component SHALL have hover state classes for
   * both light and dark modes.
   *
   * Validates: Requirements 9.5
   */
  it('Table rows should have hover state classes for both themes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (rowCount) => {
          localStorage.clear();
          document.documentElement.classList.remove('dark');

          const { unmount } = render(
            <ThemeProvider>
              <Table>
                <TableBody>
                  {Array.from({ length: rowCount }, (_, i) => (
                    <TableRow key={i} data-testid={`row-${i}`}>
                      <TableCell>Cell {i}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ThemeProvider>
          );

          // Check each row has hover classes
          for (let i = 0; i < rowCount; i++) {
            const row = screen.getByTestId(`row-${i}`);
            const className = row.className;
            
            // Should have hover classes for both themes
            expect(className.includes('hover:')).toBe(true);
            expect(className.includes('dark:hover:')).toBe(true);
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
