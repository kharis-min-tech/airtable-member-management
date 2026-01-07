/**
 * Property-Based Tests for MainLayout Navigation
 * 
 * Property 1: Navigation Tab Click Routes Correctly
 * Validates: Requirements 1.2
 * 
 * For any navigation tab in the Navigation_Component, when clicked,
 * the system SHALL navigate to the corresponding route path that matches the tab's destination.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
   * Property 1.1: Clicking any visible navigation tab navigates to the correct route
   * 
   * For any visible navigation tab, clicking it should update the URL to match
   * the tab's destination path.
   * 
   * Validates: Requirements 1.2
   */
  it('should navigate to the correct route when any visible tab is clicked', async () => {
    const user = userEvent.setup();

    await fc.assert(
      fc.asyncProperty(
        visibleTabArb,
        async (tab: NavTab) => {
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
          const navLink = screen.getAllByRole('link', { name: tab.label })[0];
          expect(navLink).toBeDefined();

          // Click the navigation link
          await user.click(navLink);

          // Verify the URL has changed to the tab's destination
          const locationDisplay = screen.getByTestId('location-display');
          expect(locationDisplay.textContent).toBe(tab.to);

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
