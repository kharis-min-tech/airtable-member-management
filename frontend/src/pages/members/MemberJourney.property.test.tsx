/**
 * Property-Based Tests for Member Journey Page
 * 
 * Property 8: Member Journey URL Parameter Parsing
 * Validates: Requirements 4.1, 4.2, 4.5
 * 
 * For any valid member ID in the URL path `/members/:memberId`, 
 * the Member_Journey_Page SHALL correctly extract and use that member ID 
 * to fetch the member's journey data.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, waitFor } from '@testing-library/react';
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

// Mock child components to simplify testing and avoid dependency issues
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
 * Arbitrary for generating valid Airtable-style record IDs
 * Format: rec followed by 14 alphanumeric characters
 */
const alphanumericChar = fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
);

const airtableIdArb = fc.array(alphanumericChar, { minLength: 14, maxLength: 14 })
  .map(chars => `rec${chars.join('')}`);

/**
 * Arbitrary for generating valid member names
 */
const memberNameArb = fc.record({
  firstName: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)),
  lastName: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)),
});

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

describe('Property 8: Member Journey URL Parameter Parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 8.1: Valid member IDs are correctly extracted from URL
   * 
   * For any valid Airtable record ID, when navigating to /members/:memberId,
   * the page should extract the memberId and use it to fetch journey data.
   * 
   * Validates: Requirements 4.5
   */
  it('should correctly extract member ID from URL and call API with it', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        memberNameArb,
        async (memberId, memberName) => {
          // Setup mock response
          const mockJourney = {
            member: {
              id: memberId,
              firstName: memberName.firstName,
              lastName: memberName.lastName,
              fullName: `${memberName.firstName} ${memberName.lastName}`,
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
            timeline: [],
          };

          vi.mocked(churchApi.members.getJourney).mockResolvedValue({
            data: mockJourney,
            lastUpdated: new Date(),
            cached: false,
          });

          vi.mocked(churchApi.members.search).mockResolvedValue({
            data: [],
            lastUpdated: new Date(),
            cached: false,
          });

          renderWithMemberId(memberId);

          // Wait for the API call to be made
          await waitFor(() => {
            expect(churchApi.members.getJourney).toHaveBeenCalled();
          }, { timeout: 2000 });

          // Verify the API was called with the correct member ID
          expect(churchApi.members.getJourney).toHaveBeenCalledWith(memberId);

          vi.clearAllMocks();
        }
      ),
      { numRuns: 25 } // Reduced from 100 to avoid timeout - each iteration involves async React rendering
    );
  }, 30000); // Extended timeout for property-based test with async rendering

  /**
   * Property 8.2: Member ID is used to fetch and display member data
   * 
   * For any valid member ID, when the API returns member data,
   * the page should display the member's name.
   * 
   * Validates: Requirements 4.1, 4.2
   */
  it('should fetch and display member data for any valid member ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        memberNameArb,
        async (memberId, memberName) => {
          const fullName = `${memberName.firstName} ${memberName.lastName}`;
          
          const mockJourney = {
            member: {
              id: memberId,
              firstName: memberName.firstName,
              lastName: memberName.lastName,
              fullName,
              status: 'Member' as const,
              followUpStatus: 'Not Started' as const,
              source: 'First Timer Form' as const,
              dateFirstCaptured: new Date('2024-01-01'),
            },
            summary: {
              visitsCount: 5,
              firstAttended: new Date('2024-01-01'),
              lastAttended: new Date('2024-06-01'),
            },
            timeline: [],
          };

          vi.mocked(churchApi.members.getJourney).mockResolvedValue({
            data: mockJourney,
            lastUpdated: new Date(),
            cached: false,
          });

          vi.mocked(churchApi.members.search).mockResolvedValue({
            data: [],
            lastUpdated: new Date(),
            cached: false,
          });

          renderWithMemberId(memberId);

          // Wait for the member name to appear in the page header
          await waitFor(() => {
            expect(screen.getByText(`Viewing: ${fullName}`)).toBeInTheDocument();
          }, { timeout: 2000 });

          vi.clearAllMocks();
        }
      ),
      { numRuns: 25 } // Reduced from 100 to avoid timeout - each iteration involves async React rendering
    );
  }, 30000); // Extended timeout for property-based test with async rendering

  /**
   * Property 8.3: No API call when no member ID in URL
   * 
   * When navigating to /members without a member ID,
   * the page should not call the journey API.
   * 
   * Validates: Requirements 4.1
   */
  it('should not call API when no member ID is in URL', async () => {
    vi.mocked(churchApi.members.search).mockResolvedValue({
      data: [],
      lastUpdated: new Date(),
      cached: false,
    });

    render(
      <MemoryRouter initialEntries={['/members']}>
        <Routes>
          <Route path="/members/:memberId" element={<MemberJourney />} />
          <Route path="/members" element={<MemberJourney />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait a bit to ensure no API call is made
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the journey API was NOT called
    expect(churchApi.members.getJourney).not.toHaveBeenCalled();

    // Verify the search prompt is shown (there are multiple elements with this text)
    const searchPrompts = screen.getAllByText(/Search for a member to view their journey/);
    expect(searchPrompts.length).toBeGreaterThan(0);
  });
});
