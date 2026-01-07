/**
 * Unit Tests for Member Journey Page
 * 
 * Tests:
 * - URL parameter extraction
 * - Loading state
 * - Error state
 * 
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 7.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MemberJourney from './MemberJourney';
import { churchApi } from '../../services/church-api';

// Mock the church API
vi.mock('../../services/church-api', () => ({
  churchApi: {
    members: {
      getJourney: vi.fn(),
      search: vi.fn(),
    },
  },
}));

// Mock the useLiveMode hook
vi.mock('../../hooks/useLiveMode', () => ({
  useLiveMode: () => ({
    isLive: false,
    toggleLive: vi.fn(),
  }),
}));

// Mock child components to simplify testing
vi.mock('../../components/members', () => ({
  MemberProfileCard: ({ member, isLoading }: { member: any; isLoading: boolean }) => (
    <div data-testid="member-profile-card">
      {isLoading ? 'Loading profile...' : member ? `Profile: ${member.fullName}` : 'No member'}
    </div>
  ),
  JourneyTimeline: ({ events, isLoading }: { events: any[]; isLoading: boolean }) => (
    <div data-testid="journey-timeline">
      {isLoading ? 'Loading timeline...' : `Timeline: ${events.length} events`}
    </div>
  ),
  JourneySummaryCard: ({ summary, isLoading }: { summary: any; isLoading: boolean }) => (
    <div data-testid="journey-summary">
      {isLoading ? 'Loading summary...' : summary ? 'Summary loaded' : 'No summary'}
    </div>
  ),
  MemberSearchBar: ({ onMemberSelect: _ }: { onMemberSelect?: (member: any) => void }) => (
    <div data-testid="member-search-bar">Search Bar</div>
  ),
}));

// Mock DataRefreshControls
vi.mock('../../components/common', () => ({
  DataRefreshControls: () => <div data-testid="data-refresh-controls">Refresh Controls</div>,
}));

/**
 * Helper to render MemberJourney with a specific memberId in the URL
 */
function renderWithMemberId(memberId: string) {
  return render(
    <MemoryRouter initialEntries={[`/members/${memberId}`]}>
      <Routes>
        <Route path="/members/:memberId" element={<MemberJourney />} />
        <Route path="/members" element={<MemberJourney />} />
      </Routes>
    </MemoryRouter>
  );
}

/**
 * Helper to render MemberJourney without a memberId
 */
function renderWithoutMemberId() {
  return render(
    <MemoryRouter initialEntries={['/members']}>
      <Routes>
        <Route path="/members/:memberId" element={<MemberJourney />} />
        <Route path="/members" element={<MemberJourney />} />
      </Routes>
    </MemoryRouter>
  );
}

const mockMemberJourney = {
  member: {
    id: 'rec123456789012',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    status: 'Member' as const,
    followUpStatus: 'Not Started' as const,
    source: 'First Timer Form' as const,
    dateFirstCaptured: new Date('2024-01-01'),
  },
  summary: {
    visitsCount: 10,
    firstAttended: new Date('2024-01-01'),
    lastAttended: new Date('2024-06-01'),
  },
  timeline: [
    {
      date: new Date('2024-06-01'),
      type: 'attendance' as const,
      title: 'Sunday Service',
      description: 'Attended Sunday service',
    },
  ],
};

describe('MemberJourney Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('URL Parameter Extraction', () => {
    it('should extract memberId from URL and call API', async () => {
      const memberId = 'rec123456789012';
      
      vi.mocked(churchApi.members.getJourney).mockResolvedValue({
        data: mockMemberJourney,
        lastUpdated: new Date(),
        cached: false,
      });

      renderWithMemberId(memberId);

      await waitFor(() => {
        expect(churchApi.members.getJourney).toHaveBeenCalledWith(memberId);
      });
    });

    it('should not call API when no memberId in URL', async () => {
      renderWithoutMemberId();

      // Wait a bit to ensure no API call is made
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(churchApi.members.getJourney).not.toHaveBeenCalled();
    });

    it('should show search prompt when no memberId', async () => {
      renderWithoutMemberId();

      // There are multiple elements with this text (header and body), so use getAllByText
      const searchPrompts = screen.getAllByText(/Search for a member to view their journey/);
      expect(searchPrompts.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator while fetching data', async () => {
      const memberId = 'rec123456789012';
      
      // Create a promise that we can control
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      vi.mocked(churchApi.members.getJourney).mockReturnValue(pendingPromise as any);

      renderWithMemberId(memberId);

      // Wait for the API to be called
      await waitFor(() => {
        expect(churchApi.members.getJourney).toHaveBeenCalled();
      });

      // Check for loading state in child components
      await waitFor(() => {
        expect(screen.getByText('Loading profile...')).toBeInTheDocument();
      });

      // Resolve the promise
      resolvePromise!({
        data: mockMemberJourney,
        lastUpdated: new Date(),
        cached: false,
      });
    });

    it('should hide loading indicator after data loads', async () => {
      const memberId = 'rec123456789012';
      
      vi.mocked(churchApi.members.getJourney).mockResolvedValue({
        data: mockMemberJourney,
        lastUpdated: new Date(),
        cached: false,
      });

      renderWithMemberId(memberId);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Profile: John Doe')).toBeInTheDocument();
      });

      // Loading indicator should be gone
      expect(screen.queryByText('Loading profile...')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when API fails', async () => {
      const memberId = 'rec123456789012';
      
      vi.mocked(churchApi.members.getJourney).mockRejectedValue(new Error('Network error'));

      renderWithMemberId(memberId);

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Member Journey')).toBeInTheDocument();
      });
    });

    it('should show specific message for member not found', async () => {
      const memberId = 'recNonExistent12';
      
      vi.mocked(churchApi.members.getJourney).mockRejectedValue(new Error('Member not found'));

      renderWithMemberId(memberId);

      await waitFor(() => {
        expect(screen.getByText(/could not be found/)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      const memberId = 'rec123456789012';
      
      vi.mocked(churchApi.members.getJourney).mockRejectedValue(new Error('Network error'));

      renderWithMemberId(memberId);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should retry API call when retry button is clicked', async () => {
      const memberId = 'rec123456789012';
      
      vi.mocked(churchApi.members.getJourney)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: mockMemberJourney,
          lastUpdated: new Date(),
          cached: false,
        });

      renderWithMemberId(memberId);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Unable to Load Member Journey')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Verify API was called again
      await waitFor(() => {
        expect(churchApi.members.getJourney).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Data Display', () => {
    it('should display member name in header when data loads', async () => {
      const memberId = 'rec123456789012';
      
      vi.mocked(churchApi.members.getJourney).mockResolvedValue({
        data: mockMemberJourney,
        lastUpdated: new Date(),
        cached: false,
      });

      renderWithMemberId(memberId);

      await waitFor(() => {
        expect(screen.getByText(/Viewing: John Doe/)).toBeInTheDocument();
      });
    });

    it('should display page title', () => {
      const memberId = 'rec123456789012';
      
      vi.mocked(churchApi.members.getJourney).mockResolvedValue({
        data: mockMemberJourney,
        lastUpdated: new Date(),
        cached: false,
      });

      renderWithMemberId(memberId);

      expect(screen.getByText('Member Journey')).toBeInTheDocument();
    });

    it('should render child components with correct data', async () => {
      const memberId = 'rec123456789012';
      
      vi.mocked(churchApi.members.getJourney).mockResolvedValue({
        data: mockMemberJourney,
        lastUpdated: new Date(),
        cached: false,
      });

      renderWithMemberId(memberId);

      await waitFor(() => {
        expect(screen.getByTestId('member-profile-card')).toBeInTheDocument();
        expect(screen.getByTestId('journey-timeline')).toBeInTheDocument();
        expect(screen.getByTestId('journey-summary')).toBeInTheDocument();
      });
    });
  });
});
