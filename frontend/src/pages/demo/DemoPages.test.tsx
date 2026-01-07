/**
 * Unit Tests for Demo Pages
 * Requirements: 7.1
 * 
 * - Test demo banner visibility
 * - Test mock data rendering
 * - Test navigation between demo pages
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DemoLayout from '../../layouts/DemoLayout';
import DemoAttendanceExplorer from './DemoAttendanceExplorer';
import DemoMissingMembers from './DemoMissingMembers';
import DemoMemberJourney from './DemoMemberJourney';
import DemoAdminViews from './DemoAdminViews';

// Mock the dashboard components that use recharts
vi.mock('../../components/dashboard', () => ({
  KPITilesSection: () => <div data-testid="kpi-tiles">KPI Tiles</div>,
  ServiceSelector: () => <div data-testid="service-selector">Service Selector</div>,
  EvangelismStatsCard: () => <div data-testid="evangelism-stats">Evangelism Stats</div>,
  AttendanceBreakdownChart: () => <div data-testid="attendance-chart">Attendance Chart</div>,
  SoulsAssignedTable: () => <div data-testid="souls-assigned">Souls Assigned</div>,
  FollowUpCommentsTable: () => <div data-testid="follow-up-comments">Follow Up Comments</div>,
  AttendanceDrillDownModal: ({ isOpen }: { isOpen: boolean }) => 
    isOpen ? <div data-testid="drill-down-modal">Drill Down Modal</div> : null,
}));

// Helper to render with router
const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('DemoLayout', () => {
  it('should render demo banner indicating mock data mode', () => {
    renderWithRouter(
      <Routes>
        <Route path="/" element={<DemoLayout />}>
          <Route index element={<div>Demo Content</div>} />
        </Route>
      </Routes>
    );

    // Check for demo banner (use getAllByText since "Demo Mode" appears in banner and footer)
    const demoModeElements = screen.getAllByText(/Demo Mode/i);
    expect(demoModeElements.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });

  it('should render DEMO badge in header', () => {
    renderWithRouter(
      <Routes>
        <Route path="/" element={<DemoLayout />}>
          <Route index element={<div>Demo Content</div>} />
        </Route>
      </Routes>
    );

    expect(screen.getByText('DEMO')).toBeInTheDocument();
  });

  it('should render all navigation tabs', () => {
    renderWithRouter(
      <Routes>
        <Route path="/" element={<DemoLayout />}>
          <Route index element={<div>Demo Content</div>} />
        </Route>
      </Routes>
    );

    // Check for navigation tabs (both desktop and mobile nav exist, so use getAllByRole)
    expect(screen.getAllByRole('link', { name: /Dashboard/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Attendance/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Missing/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Journey/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Admin/i }).length).toBeGreaterThan(0);
  });

  it('should show demo user info', () => {
    renderWithRouter(
      <Routes>
        <Route path="/" element={<DemoLayout />}>
          <Route index element={<div>Demo Content</div>} />
        </Route>
      </Routes>
    );

    expect(screen.getByText('demo@church.org')).toBeInTheDocument();
    expect(screen.getByText('pastor')).toBeInTheDocument();
  });
});

describe('DemoAttendanceExplorer', () => {
  it('should render page title', () => {
    renderWithRouter(<DemoAttendanceExplorer />);

    expect(screen.getByText('Service Attendance Explorer')).toBeInTheDocument();
  });

  it('should render service selector', () => {
    renderWithRouter(<DemoAttendanceExplorer />);

    expect(screen.getByText('Select Service')).toBeInTheDocument();
  });

  it('should show prompt to select service when none selected', () => {
    renderWithRouter(<DemoAttendanceExplorer />);

    expect(screen.getByText(/Select a service to view attendees/i)).toBeInTheDocument();
  });
});

describe('DemoMissingMembers', () => {
  it('should render page title', () => {
    renderWithRouter(<DemoMissingMembers />);

    // "Missing Members" appears as page title and section header, use getByRole for h1
    expect(screen.getByRole('heading', { level: 1, name: 'Missing Members' })).toBeInTheDocument();
  });

  it('should render dual service selector with correct labels', () => {
    renderWithRouter(<DemoMissingMembers />);

    expect(screen.getByText('Reference Service')).toBeInTheDocument();
    expect(screen.getByText('Comparison Service')).toBeInTheDocument();
  });

  it('should render helper text explaining comparison direction', () => {
    renderWithRouter(<DemoMissingMembers />);

    expect(screen.getByText(/Reference Service and a Comparison Service/i)).toBeInTheDocument();
  });

  it('should show prompt to select both services', () => {
    renderWithRouter(<DemoMissingMembers />);

    expect(screen.getByText(/Select both services to see comparison/i)).toBeInTheDocument();
  });
});

describe('DemoMemberJourney', () => {
  it('should render page title', () => {
    renderWithRouter(<DemoMemberJourney />);

    expect(screen.getByText('Member Journey')).toBeInTheDocument();
  });

  it('should render search input', () => {
    renderWithRouter(<DemoMemberJourney />);

    expect(screen.getByPlaceholderText(/Search by name, phone, or email/i)).toBeInTheDocument();
  });

  it('should render quick access demo members', () => {
    renderWithRouter(<DemoMemberJourney />);

    // "Quick access" appears in label and hint text, use getAllByText
    expect(screen.getAllByText(/Quick access/i).length).toBeGreaterThan(0);
    // Should show some demo member names (use getAllByText since name appears in button)
    expect(screen.getAllByText('Kwame Asante').length).toBeGreaterThan(0);
  });

  it('should show prompt when no member selected', () => {
    renderWithRouter(<DemoMemberJourney />);

    // Text appears in subtitle and empty state, use getAllByText
    expect(screen.getAllByText(/Search for a member to view their journey/i).length).toBeGreaterThan(0);
  });

  it('should render member profile when memberId is in URL', () => {
    renderWithRouter(
      <Routes>
        <Route path="/demo/members/:memberId" element={<DemoMemberJourney />} />
      </Routes>,
      { route: '/demo/members/mem-001' }
    );

    // Member name appears in multiple places (subtitle, button, profile), use getAllByText
    expect(screen.getAllByText(/Kwame Asante/i).length).toBeGreaterThan(0);
  });
});

describe('DemoAdminViews', () => {
  it('should render page title', () => {
    renderWithRouter(<DemoAdminViews />);

    expect(screen.getByText('Admin Quick Views')).toBeInTheDocument();
  });

  it('should render all admin view tabs', () => {
    renderWithRouter(<DemoAdminViews />);

    expect(screen.getByRole('button', { name: /Today's Follow-ups Due/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New First Timers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Incomplete Evangelism/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /No Follow-up Owner/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Visited Members/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Department Lists/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Attendance by Service/i })).toBeInTheDocument();
  });

  it('should show default view description', () => {
    renderWithRouter(<DemoAdminViews />);

    // Default view is "Today's Follow-ups Due"
    expect(screen.getByText(/Follow-up assignments due today/i)).toBeInTheDocument();
  });
});

describe('Demo Pages Navigation', () => {
  it('should have correct href for dashboard link', () => {
    renderWithRouter(
      <Routes>
        <Route path="/demo" element={<DemoLayout />}>
          <Route index element={<div>Demo Home</div>} />
        </Route>
      </Routes>,
      { route: '/demo' }
    );

    // Both desktop and mobile nav exist, check first link (desktop)
    const dashboardLinks = screen.getAllByRole('link', { name: /Dashboard/i });
    expect(dashboardLinks[0]).toHaveAttribute('href', '/demo/dashboard');
  });

  it('should have correct href for attendance link', () => {
    renderWithRouter(
      <Routes>
        <Route path="/demo" element={<DemoLayout />}>
          <Route index element={<div>Demo Home</div>} />
        </Route>
      </Routes>,
      { route: '/demo' }
    );

    const attendanceLinks = screen.getAllByRole('link', { name: /Attendance/i });
    expect(attendanceLinks[0]).toHaveAttribute('href', '/demo/attendance');
  });

  it('should have correct href for missing members link', () => {
    renderWithRouter(
      <Routes>
        <Route path="/demo" element={<DemoLayout />}>
          <Route index element={<div>Demo Home</div>} />
        </Route>
      </Routes>,
      { route: '/demo' }
    );

    // Mobile nav uses "Missing" instead of "Missing Members"
    const missingMembersLinks = screen.getAllByRole('link', { name: /Missing/i });
    expect(missingMembersLinks[0]).toHaveAttribute('href', '/demo/missing-members');
  });

  it('should have correct href for member journey link', () => {
    renderWithRouter(
      <Routes>
        <Route path="/demo" element={<DemoLayout />}>
          <Route index element={<div>Demo Home</div>} />
        </Route>
      </Routes>,
      { route: '/demo' }
    );

    // Mobile nav uses "Journey" instead of "Member Journey"
    const memberJourneyLinks = screen.getAllByRole('link', { name: /Journey/i });
    expect(memberJourneyLinks[0]).toHaveAttribute('href', '/demo/members');
  });

  it('should have correct href for admin link', () => {
    renderWithRouter(
      <Routes>
        <Route path="/demo" element={<DemoLayout />}>
          <Route index element={<div>Demo Home</div>} />
        </Route>
      </Routes>,
      { route: '/demo' }
    );

    const adminLinks = screen.getAllByRole('link', { name: /Admin/i });
    expect(adminLinks[0]).toHaveAttribute('href', '/demo/admin');
  });
});
