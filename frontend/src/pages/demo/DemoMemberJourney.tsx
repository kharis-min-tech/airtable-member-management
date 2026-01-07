/**
 * Demo Member Journey Page
 * Requirements: 6.1, 6.5
 * - Use mock member journey data
 * - Include timeline with various event types
 * - Allow navigation between mock members
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback, useMemo } from 'react';
import {
  MemberProfileCard,
  JourneyTimeline,
  JourneySummaryCard,
} from '../../components/members';
import { DataRefreshControls } from '../../components/common';
import { mockMembers, getMockMemberJourney, searchMockMembers } from '../../data/mockData';
import type { Member } from '../../types';

function DemoMemberJourney() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Get mock journey data
  const journey = useMemo(() => {
    if (!memberId) return null;
    return getMockMemberJourney(memberId);
  }, [memberId]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const results = searchMockMembers(query);
      setSearchResults(results);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, []);

  // Handle member selection
  const handleMemberSelect = useCallback(
    (member: Member) => {
      setSearchQuery('');
      setSearchResults([]);
      setShowResults(false);
      navigate(`/demo/members/${member.id}`);
    },
    [navigate]
  );

  // Handle refresh (demo - just shows alert)
  const handleRefresh = useCallback(() => {
    alert('Refresh clicked! In demo mode, data is static.');
  }, []);

  const lastUpdated = useMemo(() => new Date(), []);

  // Quick member navigation
  const quickMembers = useMemo(() => mockMembers.slice(0, 5), []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Member Journey</h1>
          <p className="text-gray-600">
            {journey?.member
              ? `Viewing: ${journey.member.fullName}`
              : 'Search for a member to view their journey'}
          </p>
        </div>
        {memberId && (
          <DataRefreshControls
            lastUpdated={lastUpdated}
            isLoading={false}
            isLive={false}
            onToggleLive={() => alert('Live mode is not available in demo')}
            onRefresh={handleRefresh}
            timestampFormat="datetime"
          />
        )}
      </div>

      {/* Member search */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Search Member</h2>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
            placeholder="Search by name, phone, or email..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <SearchIcon className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />

          {/* Search results dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {searchResults.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMemberSelect(member)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <p className="font-medium text-gray-900">{member.fullName}</p>
                  <p className="text-sm text-gray-500">
                    {member.phone || member.email || 'No contact info'}
                  </p>
                </button>
              ))}
            </div>
          )}

          {showResults && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center text-gray-500">
              No members found
            </div>
          )}
        </div>

        {/* Quick access to demo members */}
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-2">Quick access (demo members):</p>
          <div className="flex flex-wrap gap-2">
            {quickMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => handleMemberSelect(member)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  memberId === member.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {member.fullName}
              </button>
            ))}
          </div>
        </div>
      </div>

      {memberId ? (
        <>
          {/* Member profile */}
          <MemberProfileCard member={journey?.member || null} isLoading={false} />

          {/* Journey summary */}
          <JourneySummaryCard summary={journey?.summary || null} isLoading={false} />

          {/* Timeline */}
          <JourneyTimeline events={journey?.timeline || []} isLoading={false} />

          {/* Navigation buttons */}
          {journey?.member && (
            <div className="flex justify-between items-center bg-white rounded-lg shadow p-4">
              <button
                onClick={() => navigate('/demo/members')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <BackIcon className="w-5 h-5" />
                <span>Back to Search</span>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <PrintIcon className="w-4 h-4" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <UserIcon className="w-16 h-16 mb-4" />
            <p className="text-lg">Search for a member to view their journey</p>
            <p className="text-sm mt-2">
              You can search by name, phone number, or email address
            </p>
            <p className="text-sm mt-4 text-blue-500">
              Or click on one of the quick access members above
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  );
}

function PrintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
      />
    </svg>
  );
}

export default DemoMemberJourney;
