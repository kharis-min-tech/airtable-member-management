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
import { Card, CardHeader, CardTitle, CardContent } from '../../components/tailus-ui/Card';
import { Button } from '../../components/tailus-ui/Button';
import { Input } from '../../components/tailus-ui/Input';
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
          <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">Member Journey</h1>
          <p className="text-text-secondary-light dark:text-text-secondary-dark">
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
      <Card variant="default">
        <CardHeader>
          <CardTitle>Search Member</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
              placeholder="Search by name, phone, or email..."
              className="pr-10"
            />
            <SearchIcon className="absolute right-3 top-2.5 w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark" />

            {/* Search results dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                {searchResults.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleMemberSelect(member)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <p className="font-medium text-text-primary-light dark:text-text-primary-dark">{member.fullName}</p>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                      {member.phone || member.email || 'No contact info'}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {showResults && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-4 text-center text-text-secondary-light dark:text-text-secondary-dark">
                No members found
              </div>
            )}
          </div>

          {/* Quick access to demo members */}
          <div className="mt-4">
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-2">Quick access (demo members):</p>
            <div className="flex flex-wrap gap-2">
              {quickMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMemberSelect(member)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    memberId === member.id
                      ? 'bg-primary dark:bg-primary-dark text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-text-primary-light dark:text-text-primary-dark hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {member.fullName}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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
            <Card variant="default">
              <CardContent className="p-4 flex justify-between items-center">
                <button
                  onClick={() => navigate('/demo/members')}
                  className="flex items-center gap-2 text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors"
                >
                  <BackIcon className="w-5 h-5" />
                  <span>Back to Search</span>
                </button>
                <div className="flex gap-2">
                  <Button
                    onClick={() => window.print()}
                    variant="outline"
                  >
                    <PrintIcon className="w-4 h-4 mr-2" />
                    <span>Print</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card variant="default">
          <CardContent>
            <div className="h-64 flex flex-col items-center justify-center text-text-secondary-light dark:text-text-secondary-dark">
              <UserIcon className="w-16 h-16 mb-4" />
              <p className="text-lg">Search for a member to view their journey</p>
              <p className="text-sm mt-2">
                You can search by name, phone number, or email address
              </p>
              <p className="text-sm mt-4 text-primary dark:text-primary-dark">
                Or click on one of the quick access members above
              </p>
            </div>
          </CardContent>
        </Card>
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
