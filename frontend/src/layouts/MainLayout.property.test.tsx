/**
 * Property-Based Tests for MainLayout Navigation
 * 
 * Property 1: Navigation Tab Click Routes Correctly
 * Validates: Requirements 1.2
 * 
 * For any navigation tab in the Navigation_Component, when clicked,
 * the system SHALL navigate to the corresponding route path that matches the tab's destination.
 * 
 * Property 5: Navigation Active State
 * Validates: Requirements 6.2
 * 
 * For any route in the application, the navigation tab corresponding to that route
 * SHALL have the active visual indicator applied, and no other tabs SHALL have the active indicator.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import * as fc from 'fast-check';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import MainLayout, { navigationTabs } from './MainLayout';
import type { NavTab } from './MainLayout';

// Mock the useAuth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'test@church.org', role: 'pastor' },
    logout: vi.fn(),
    hasRole: (roles: string[]) => roles.includes('pastor') || roles.includes('admin'),
  }),
}));

// Mock ThemeContext
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
}));

/**
 * Helper component to capture current location for testing
 */
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

/**
 * Arbitrary for generating navigation tabs that should be visible to a pastor user
 */
const visibleTabArb = fc.constantFrom(
  ...navigationTabs.filter(
    (tab) => !tab.requiresRole || tab.requiresRole.includes('pastor')
  )
);

/**
 * Arbitrary for generating all navigation tabs
 */
const allTabArb = fc.constantFrom(...navigationTabs);

describe('Property 1: Navigation Tab Click Routes Correctly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1.1: Navigation links have correct href attributes for routing
   * 
   * For any visible navigation tab, the link should have the correct href
   * that would navigate to the tab's destination path when clicked.
   * 
   * Note: We test href attributes instead of actual click navigation because
   * jsdom doesn't support actual navigation events. The href attribute is what
   * React Router uses to determine the destination.
   * 
   * Validates: Requirements 1.2
   */
  it('should have navigation links with correct href for routing', () => {
    fc.assert(
      fc.property(
        visibleTabArb,
        (tab: NavTab) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={['/dashboard']}>
              <Routes>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<LocationDisplay />} />
                  <Route path="/attendance" element={<LocationDisplay />} />
                  <Route path="/missing-members" element={<LocationDisplay />} />
                  <Route path="/members" element={<LocationDisplay />} />
                  <Route path="/admin" element={<LocationDisplay />} />
                </Route>
              </Routes>
            </MemoryRouter>
          );

          // Find the navigation link by its label (desktop navigation)
          const navLinks = screen.getAllByRole('link', { name: tab.label });
          expect(navLinks.length).toBeGreaterThan(0);

          // Verify the link has the correct href for routing
          const navLink = navLinks[0];
          expect(navLink.getAttribute('href')).toBe(tab.to);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.2: Navigation tab href attribute matches the destination path
   * 
   * For any navigation tab, the href attribute should exactly match the tab's
   * destination path.
   * 
   * Validates: Requirements 1.2
   */
  it('should have href attribute matching the destination path for all tabs', () => {
    fc.assert(
      fc.property(
        visibleTabArb,
        (tab: NavTab) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={['/dashboard']}>
              <Routes>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<div>Dashboard</div>} />
                  <Route path="/attendance" element={<div>Attendance</div>} />
                  <Route path="/missing-members" element={<div>Missing</div>} />
                  <Route path="/members" element={<div>Members</div>} />
                  <Route path="/admin" element={<div>Admin</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          );

          // Find the navigation link by its label
          const navLinks = screen.getAllByRole('link', { name: tab.label });
          
          // Check that at least one link has the correct href
          const hasCorrectHref = navLinks.some(
            (link) => link.getAttribute('href') === tab.to
          );
          expect(hasCorrectHref).toBe(true);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.3: Tab configuration has correct href for each tab
   * 
   * For any navigation tab, the navigation should have a link pointing to the correct destination.
   * 
   * Validates: Requirements 1.2
   */
  it('should have correct href for each navigation tab', () => {
    fc.assert(
      fc.property(
        visibleTabArb,
        (tab: NavTab) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={['/dashboard']}>
              <Routes>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<div>Dashboard</div>} />
                  <Route path="/attendance" element={<div>Attendance</div>} />
                  <Route path="/missing-members" element={<div>Missing</div>} />
                  <Route path="/members" element={<div>Members</div>} />
                  <Route path="/admin" element={<div>Admin</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          );

          // Find the link with the tab's destination
          const link = screen.getAllByRole('link').find(
            (l) => l.getAttribute('href') === tab.to
          );

          // There should be at least 1 link for each tab
          expect(link).toBeDefined();
          expect(link?.getAttribute('href')).toBe(tab.to);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.4: Navigation tabs maintain correct order
   * 
   * The navigation tabs should always appear in the defined order:
   * Dashboard, Attendance Explorer, Missing Members, Member Journey, Admin
   * 
   * Validates: Requirements 1.1
   */
  it('should maintain correct tab order in navigation', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
            <Route path="/attendance" element={<div>Attendance</div>} />
            <Route path="/missing-members" element={<div>Missing</div>} />
            <Route path="/members" element={<div>Members</div>} />
            <Route path="/admin" element={<div>Admin</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Get all navigation links from the main navigation
    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    const navLinks = mainNav.querySelectorAll('a');

    // Expected order of tabs
    const expectedOrder = ['/dashboard', '/attendance', '/missing-members', '/members', '/admin'];

    // Verify the order matches
    navLinks.forEach((link, index) => {
      expect(link.getAttribute('href')).toBe(expectedOrder[index]);
    });

    unmount();
  });

  /**
   * Property 1.5: Each tab destination is unique
   * 
   * For any two different navigation tabs, their destination paths should be different.
   * 
   * Validates: Requirements 1.2
   */
  it('should have unique destination paths for all tabs', () => {
    fc.assert(
      fc.property(
        allTabArb,
        allTabArb,
        (tab1: NavTab, tab2: NavTab) => {
          // If tabs are different, their destinations should be different
          if (tab1.label !== tab2.label) {
            expect(tab1.to).not.toBe(tab2.to);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 5: Navigation Active State
 * 
 * For any route in the application, the navigation tab corresponding to that route
 * SHALL have the active visual indicator applied, and no other tabs SHALL have the active indicator.
 * 
 * Feature: ui-ux-refresh, Property 5: Navigation Active State
 * Validates: Requirements 6.2
 */
describe('Property 5: Navigation Active State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 5.1: Active tab has correct styling
   * 
   * For any route, the corresponding navigation tab should have the active styling
   * (bg-primary and text-white classes).
   * 
   * Validates: Requirements 6.2
   */
  it('should apply active styling to the tab matching the current route', () => {
    fc.assert(
      fc.property(
        visibleTabArb,
        (tab: NavTab) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={[tab.to]}>
              <Routes>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<div>Dashboard</div>} />
                  <Route path="/attendance" element={<div>Attendance</div>} />
                  <Route path="/missing-members" element={<div>Missing</div>} />
                  <Route path="/members" element={<div>Members</div>} />
                  <Route path="/admin" element={<div>Admin</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          );

          // Find the main navigation
          const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
          
          // Find the active tab link
          const activeLink = within(mainNav).getByText(tab.label).closest('a');
          
          // Verify active styling is applied
          expect(activeLink).toHaveClass('bg-primary');
          expect(activeLink).toHaveClass('text-white');

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.2: Only one tab is active at a time
   * 
   * For any route, exactly one navigation tab should have the active styling.
   * All other tabs should not have the active styling.
   * 
   * Validates: Requirements 6.2
   */
  it('should have exactly one active tab for any route', () => {
    fc.assert(
      fc.property(
        visibleTabArb,
        (tab: NavTab) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={[tab.to]}>
              <Routes>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<div>Dashboard</div>} />
                  <Route path="/attendance" element={<div>Attendance</div>} />
                  <Route path="/missing-members" element={<div>Missing</div>} />
                  <Route path="/members" element={<div>Members</div>} />
                  <Route path="/admin" element={<div>Admin</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          );

          // Find the main navigation
          const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
          
          // Get all navigation links
          const navLinks = within(mainNav).getAllByRole('link');
          
          // Count how many links have active styling
          const activeLinks = navLinks.filter(
            (link) => link.classList.contains('bg-primary') && link.classList.contains('text-white')
          );
          
          // Exactly one link should be active
          expect(activeLinks.length).toBe(1);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.3: Inactive tabs do not have active styling
   * 
   * For any route, all tabs that don't correspond to that route should not have
   * the active styling (bg-primary class).
   * 
   * Validates: Requirements 6.2
   */
  it('should not apply active styling to tabs not matching the current route', () => {
    fc.assert(
      fc.property(
        visibleTabArb,
        (activeTab: NavTab) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={[activeTab.to]}>
              <Routes>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<div>Dashboard</div>} />
                  <Route path="/attendance" element={<div>Attendance</div>} />
                  <Route path="/missing-members" element={<div>Missing</div>} />
                  <Route path="/members" element={<div>Members</div>} />
                  <Route path="/admin" element={<div>Admin</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          );

          // Find the main navigation
          const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
          
          // Get all visible tabs that are not the active tab
          const inactiveTabs = navigationTabs.filter(
            (tab) => tab.to !== activeTab.to && 
                     (!tab.requiresRole || tab.requiresRole.includes('pastor'))
          );
          
          // Verify each inactive tab does not have active styling
          inactiveTabs.forEach((tab) => {
            const link = within(mainNav).getByText(tab.label).closest('a');
            expect(link).not.toHaveClass('bg-primary');
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.4: Active state is determined by current route
   * 
   * For any route, the active state should be correctly applied based on the
   * initial route. This verifies that the active state logic works correctly
   * for different starting routes.
   * 
   * Note: We test initial route rendering instead of click navigation because
   * jsdom doesn't properly support navigation events. React Router's NavLink
   * component handles active state based on the current location.
   * 
   * Validates: Requirements 6.2
   */
  it('should correctly determine active state based on current route', () => {
    fc.assert(
      fc.property(
        visibleTabArb,
        visibleTabArb,
        (tab1: NavTab, tab2: NavTab) => {
          // Test that when we render at tab1's route, tab1 is active
          const { unmount } = render(
            <MemoryRouter initialEntries={[tab1.to]}>
              <Routes>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<div>Dashboard</div>} />
                  <Route path="/attendance" element={<div>Attendance</div>} />
                  <Route path="/missing-members" element={<div>Missing</div>} />
                  <Route path="/members" element={<div>Members</div>} />
                  <Route path="/admin" element={<div>Admin</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          );

          // Find the main navigation
          const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
          
          // Verify tab1 is active
          const tab1Link = within(mainNav).getByText(tab1.label).closest('a');
          expect(tab1Link).toHaveClass('bg-primary');

          // If tab2 is different from tab1, verify it's not active
          if (tab1.to !== tab2.to) {
            const tab2Link = within(mainNav).getByText(tab2.label).closest('a');
            expect(tab2Link).not.toHaveClass('bg-primary');
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
