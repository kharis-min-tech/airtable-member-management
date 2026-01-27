/**
 * Property-Based Tests for Public Forms Page
 * 
 * Property 7: Public route accessibility
 * Validates: Requirements 4.2, 5.2
 * 
 * For any request to /forms or /contacts paths, the system should allow access 
 * without requiring Cognito authentication
 * 
 * Feature: app-enhancements-v4, Property 7: Public route accessibility
 * Validates: Requirements 4.2, 5.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PublicLayout from '../../layouts/PublicLayout';
import FormsPage from './FormsPage';
import ContactsPage from '../contacts/ContactsPage';

// Mock the useAuth hook to simulate unauthenticated state
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null, // Unauthenticated user
    isAuthenticated: false,
    logout: vi.fn(),
    hasRole: () => false,
  }),
}));

// Mock ThemeContext
vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
}));

/**
 * Arbitrary for generating public route paths
 */
const publicRouteArb = fc.constantFrom('/forms', '/contacts');

/**
 * Arbitrary for generating various URL patterns that should be public
 */
const publicUrlPatternArb = fc.record({
  path: publicRouteArb,
  search: fc.option(fc.string().map(s => `?${s}`), { nil: '' }),
  hash: fc.option(fc.string().map(s => `#${s}`), { nil: '' }),
});

describe('Property 7: Public route accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 7.1: Public routes render without authentication
   * 
   * For any public route (/forms or /contacts), the system should render
   * the page content without requiring authentication.
   * 
   * Validates: Requirements 4.2, 5.2
   */
  it('should render public routes without authentication', () => {
    fc.assert(
      fc.property(
        publicRouteArb,
        (route: string) => {
          const { container, unmount } = render(
            <MemoryRouter initialEntries={[route]}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/forms" element={<FormsPage />} />
                  <Route path="/contacts" element={<ContactsPage />} />
                </Route>
              </Routes>
            </MemoryRouter>
          );

          // Verify the public layout is rendered
          const publicLayout = container.querySelector('header');
          expect(publicLayout).toBeInTheDocument();

          // Verify the appropriate page content is rendered
          if (route === '/forms') {
            // Look for forms page content
            expect(screen.getByText('Church Forms')).toBeInTheDocument();
          } else if (route === '/contacts') {
            // Look for contacts page content
            expect(screen.getByText('Evangelism Contacts')).toBeInTheDocument();
          }

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  }, 15000);

  /**
   * Property 7.2: Public routes do not redirect to login
   * 
   * For any public route, the system should not redirect to the login page
   * when accessed without authentication.
   * 
   * Validates: Requirements 4.2, 5.2
   */
  it('should not redirect public routes to login page', () => {
    fc.assert(
      fc.property(
        publicRouteArb,
        (route: string) => {
          const { container, unmount } = render(
            <MemoryRouter initialEntries={[route]}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/forms" element={<FormsPage />} />
                  <Route path="/contacts" element={<ContactsPage />} />
                </Route>
                <Route path="/login" element={<div data-testid="login-page">Login</div>} />
              </Routes>
            </MemoryRouter>
          );

          // Verify we're not on the login page
          const loginPage = container.querySelector('[data-testid="login-page"]');
          expect(loginPage).not.toBeInTheDocument();

          // Verify we're on the expected public page
          const publicLayout = container.querySelector('header');
          expect(publicLayout).toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  }, 15000);

  /**
   * Property 7.3: Public routes work with URL parameters and fragments
   * 
   * For any public route with query parameters or hash fragments,
   * the system should still render the page without authentication.
   * 
   * Validates: Requirements 4.2, 5.2
   */
  it('should handle public routes with URL parameters and fragments', () => {
    fc.assert(
      fc.property(
        publicUrlPatternArb,
        (urlPattern: { path: string; search: string; hash: string }) => {
          const fullUrl = `${urlPattern.path}${urlPattern.search}${urlPattern.hash}`;
          
          const { container, unmount } = render(
            <MemoryRouter initialEntries={[fullUrl]}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/forms" element={<FormsPage />} />
                  <Route path="/contacts" element={<ContactsPage />} />
                </Route>
              </Routes>
            </MemoryRouter>
          );

          // Verify the public layout is rendered regardless of URL parameters
          const publicLayout = container.querySelector('header');
          expect(publicLayout).toBeInTheDocument();

          // Verify the appropriate page content is rendered
          if (urlPattern.path === '/forms') {
            expect(screen.getByText('Church Forms')).toBeInTheDocument();
          } else if (urlPattern.path === '/contacts') {
            expect(screen.getByText('Evangelism Contacts')).toBeInTheDocument();
          }

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  }, 15000);

  /**
   * Property 7.4: Public routes are accessible from any initial state
   * 
   * For any public route, the system should render the page correctly
   * regardless of the initial authentication state or previous navigation.
   * 
   * Validates: Requirements 4.2, 5.2
   */
  it('should render public routes consistently from any initial state', () => {
    fc.assert(
      fc.property(
        publicRouteArb,
        fc.constantFrom('/', '/dashboard', '/login', '/some-other-route'),
        (publicRoute: string, initialRoute: string) => {
          // Start at some initial route, then navigate to public route
          const { container, unmount } = render(
            <MemoryRouter initialEntries={[initialRoute, publicRoute]} initialIndex={1}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/forms" element={<FormsPage />} />
                  <Route path="/contacts" element={<ContactsPage />} />
                </Route>
                <Route path="/" element={<div data-testid="home">Home</div>} />
                <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
                <Route path="/login" element={<div data-testid="login">Login</div>} />
                <Route path="*" element={<div data-testid="not-found">Not Found</div>} />
              </Routes>
            </MemoryRouter>
          );

          // Verify we're on the public route, not the initial route
          const publicLayout = container.querySelector('header');
          expect(publicLayout).toBeInTheDocument();
          
          // Verify the correct public page is rendered
          if (publicRoute === '/forms') {
            expect(screen.getByText('Church Forms')).toBeInTheDocument();
          } else if (publicRoute === '/contacts') {
            expect(screen.getByText('Evangelism Contacts')).toBeInTheDocument();
          }

          // Verify we're not on other pages
          const homePage = container.querySelector('[data-testid="home"]');
          const dashboardPage = container.querySelector('[data-testid="dashboard"]');
          const loginPage = container.querySelector('[data-testid="login"]');
          
          expect(homePage).not.toBeInTheDocument();
          expect(dashboardPage).not.toBeInTheDocument();
          expect(loginPage).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  }, 15000);
});