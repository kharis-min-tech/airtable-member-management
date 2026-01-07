/**
 * Unit Tests for MainLayout Navigation Component
 * 
 * Tests tab rendering, active state, and role-based visibility
 * Validates: Requirements 7.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MainLayout, { navigationTabs } from './MainLayout';

// Mock logout function
const mockLogout = vi.fn();

// Mock useAuth hook with configurable role
const mockUseAuth = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

/**
 * Helper to render MainLayout with router context
 */
function renderWithRouter(initialPath = '/dashboard', userRole = 'pastor') {
  mockUseAuth.mockReturnValue({
    user: { email: 'test@church.org', role: userRole },
    logout: mockLogout,
    hasRole: (roles: string[]) => roles.includes(userRole),
  });

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard Page</div>} />
          <Route path="/attendance" element={<div data-testid="attendance-page">Attendance Page</div>} />
          <Route path="/missing-members" element={<div data-testid="missing-page">Missing Members Page</div>} />
          <Route path="/members" element={<div data-testid="members-page">Member Journey Page</div>} />
          <Route path="/admin" element={<div data-testid="admin-page">Admin Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('MainLayout Navigation - Tab Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all navigation tabs for pastor role', () => {
    renderWithRouter('/dashboard', 'pastor');

    // Check desktop navigation
    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    
    expect(within(mainNav).getByText('Dashboard')).toBeInTheDocument();
    expect(within(mainNav).getByText('Attendance Explorer')).toBeInTheDocument();
    expect(within(mainNav).getByText('Missing Members')).toBeInTheDocument();
    expect(within(mainNav).getByText('Member Journey')).toBeInTheDocument();
    expect(within(mainNav).getByText('Admin')).toBeInTheDocument();
  });

  it('should render all navigation tabs for admin role', () => {
    renderWithRouter('/dashboard', 'admin');

    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    
    expect(within(mainNav).getByText('Dashboard')).toBeInTheDocument();
    expect(within(mainNav).getByText('Admin')).toBeInTheDocument();
  });

  it('should hide Admin tab for regular member role', () => {
    renderWithRouter('/dashboard', 'member');

    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    
    expect(within(mainNav).getByText('Dashboard')).toBeInTheDocument();
    expect(within(mainNav).getByText('Attendance Explorer')).toBeInTheDocument();
    expect(within(mainNav).queryByText('Admin')).not.toBeInTheDocument();
  });

  it('should render mobile navigation with shortened labels', () => {
    renderWithRouter('/dashboard', 'pastor');

    const mobileNav = screen.getByRole('navigation', { name: 'Mobile navigation' });
    
    // Mobile uses shortened labels
    expect(within(mobileNav).getByText('Dashboard')).toBeInTheDocument();
    expect(within(mobileNav).getByText('Attendance')).toBeInTheDocument();
    expect(within(mobileNav).getByText('Missing')).toBeInTheDocument();
    expect(within(mobileNav).getByText('Journey')).toBeInTheDocument();
    expect(within(mobileNav).getByText('Admin')).toBeInTheDocument();
  });

  it('should render the correct number of tabs based on role', () => {
    // Pastor should see all 5 tabs
    const { unmount: unmount1 } = renderWithRouter('/dashboard', 'pastor');
    const mainNav1 = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(mainNav1).getAllByRole('link')).toHaveLength(5);
    unmount1();

    // Member should see 4 tabs (no Admin)
    renderWithRouter('/dashboard', 'member');
    const mainNav2 = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(mainNav2).getAllByRole('link')).toHaveLength(4);
  });
});

describe('MainLayout Navigation - Active State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should highlight Dashboard tab when on dashboard page', () => {
    renderWithRouter('/dashboard', 'pastor');

    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    const dashboardLink = within(mainNav).getByText('Dashboard').closest('a');
    
    expect(dashboardLink).toHaveClass('bg-blue-600', 'text-white');
  });

  it('should highlight Attendance tab when on attendance page', () => {
    renderWithRouter('/attendance', 'pastor');

    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    const attendanceLink = within(mainNav).getByText('Attendance Explorer').closest('a');
    
    expect(attendanceLink).toHaveClass('bg-blue-600', 'text-white');
  });

  it('should highlight Missing Members tab when on missing members page', () => {
    renderWithRouter('/missing-members', 'pastor');

    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    const missingLink = within(mainNav).getByText('Missing Members').closest('a');
    
    expect(missingLink).toHaveClass('bg-blue-600', 'text-white');
  });

  it('should highlight Member Journey tab when on members page', () => {
    renderWithRouter('/members', 'pastor');

    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    const membersLink = within(mainNav).getByText('Member Journey').closest('a');
    
    expect(membersLink).toHaveClass('bg-blue-600', 'text-white');
  });

  it('should highlight Admin tab when on admin page', () => {
    renderWithRouter('/admin', 'pastor');

    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    const adminLink = within(mainNav).getByText('Admin').closest('a');
    
    expect(adminLink).toHaveClass('bg-blue-600', 'text-white');
  });

  it('should not highlight inactive tabs', () => {
    renderWithRouter('/dashboard', 'pastor');

    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    const attendanceLink = within(mainNav).getByText('Attendance Explorer').closest('a');
    
    expect(attendanceLink).not.toHaveClass('bg-blue-600');
    expect(attendanceLink).toHaveClass('text-gray-700');
  });
});

describe('MainLayout Navigation - Role-Based Visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show Admin tab for pastor role', () => {
    renderWithRouter('/dashboard', 'pastor');

    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(mainNav).getByText('Admin')).toBeInTheDocument();
  });

  it('should show Admin tab for admin role', () => {
    renderWithRouter('/dashboard', 'admin');

    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(mainNav).getByText('Admin')).toBeInTheDocument();
  });

  it('should hide Admin tab for volunteer role', () => {
    renderWithRouter('/dashboard', 'volunteer');

    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(mainNav).queryByText('Admin')).not.toBeInTheDocument();
  });

  it('should hide Admin tab for member role', () => {
    renderWithRouter('/dashboard', 'member');

    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(mainNav).queryByText('Admin')).not.toBeInTheDocument();
  });

  it('should show all non-admin tabs regardless of role', () => {
    renderWithRouter('/dashboard', 'volunteer');

    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    
    expect(within(mainNav).getByText('Dashboard')).toBeInTheDocument();
    expect(within(mainNav).getByText('Attendance Explorer')).toBeInTheDocument();
    expect(within(mainNav).getByText('Missing Members')).toBeInTheDocument();
    expect(within(mainNav).getByText('Member Journey')).toBeInTheDocument();
  });
});

describe('MainLayout Navigation - User Interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should navigate to attendance page when clicking Attendance tab', async () => {
    const user = userEvent.setup();
    renderWithRouter('/dashboard', 'pastor');

    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    const attendanceLink = within(mainNav).getByText('Attendance Explorer');
    
    await user.click(attendanceLink);

    expect(screen.getByTestId('attendance-page')).toBeInTheDocument();
  });

  it('should navigate to missing members page when clicking Missing Members tab', async () => {
    const user = userEvent.setup();
    renderWithRouter('/dashboard', 'pastor');

    const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
    const missingLink = within(mainNav).getByText('Missing Members');
    
    await user.click(missingLink);

    expect(screen.getByTestId('missing-page')).toBeInTheDocument();
  });

  it('should call logout when clicking Logout button', async () => {
    const user = userEvent.setup();
    renderWithRouter('/dashboard', 'pastor');

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

describe('MainLayout Navigation - Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have proper navigation landmarks', () => {
    renderWithRouter('/dashboard', 'pastor');

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
  });

  it('should have accessible logout button', () => {
    renderWithRouter('/dashboard', 'pastor');

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    expect(logoutButton).toHaveAttribute('aria-label', 'Logout');
  });

  it('should display user email and role', () => {
    renderWithRouter('/dashboard', 'pastor');

    expect(screen.getByText('test@church.org')).toBeInTheDocument();
    expect(screen.getByText('pastor')).toBeInTheDocument();
  });
});

describe('MainLayout Navigation - Configuration', () => {
  it('should export navigationTabs configuration', () => {
    expect(navigationTabs).toBeDefined();
    expect(Array.isArray(navigationTabs)).toBe(true);
    expect(navigationTabs.length).toBe(5);
  });

  it('should have correct tab configuration structure', () => {
    navigationTabs.forEach((tab) => {
      expect(tab).toHaveProperty('to');
      expect(tab).toHaveProperty('label');
      expect(tab).toHaveProperty('mobileLabel');
      expect(typeof tab.to).toBe('string');
      expect(typeof tab.label).toBe('string');
      expect(typeof tab.mobileLabel).toBe('string');
    });
  });

  it('should have Admin tab with requiresRole property', () => {
    const adminTab = navigationTabs.find((tab) => tab.label === 'Admin');
    expect(adminTab).toBeDefined();
    expect(adminTab?.requiresRole).toEqual(['pastor', 'admin']);
  });
});
