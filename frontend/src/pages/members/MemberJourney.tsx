import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef } from 'react';
import { MemberProfileCard, JourneyTimeline, JourneySummaryCard, MemberSearchBar } from '../../components/members';
import { DataRefreshControls } from '../../components/common';
import { useApi } from '../../hooks/useApi';
import { useLiveMode } from '../../hooks/useLiveMode';
import { churchApi } from '../../services/church-api';
import type { Member, MemberJourney as MemberJourneyType } from '../../types';

function MemberJourney() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  
  // Track previous memberId to detect changes
  const prevMemberIdRef = useRef<string | undefined>(undefined);

  // Fetch member journey data when memberId is present
  const apiCall = useCallback(() => {
    if (!memberId) {
      return Promise.resolve({ data: null as MemberJourneyType | null, lastUpdated: new Date(), cached: false });
    }
    return churchApi.members.getJourney(memberId);
  }, [memberId]);

  const { data: journey, isLoading, error, lastUpdated, refresh, execute, reset } = useApi(apiCall, {
    immediate: !!memberId,
  });

  // Re-fetch when memberId changes (handles navigation between members)
  useEffect(() => {
    // Skip initial mount (handled by immediate: true)
    if (prevMemberIdRef.current === undefined) {
      prevMemberIdRef.current = memberId;
      return;
    }
    
    // If memberId changed, reset and re-fetch
    if (memberId !== prevMemberIdRef.current) {
      prevMemberIdRef.current = memberId;
      
      if (memberId) {
        // Reset state and fetch new member data
        reset();
        execute();
      } else {
        // No memberId, just reset
        reset();
      }
    }
  }, [memberId, execute, reset]);

  // Live mode for real-time updates
  const { isLive, toggleLive } = useLiveMode({
    interval: 30000,
    onRefresh: refresh,
  });

  // Handle member selection from search
  const handleMemberSelect = useCallback((member: Member) => {
    navigate(`/members/${member.id}`);
  }, [navigate]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Member Journey</h1>
          <p className="text-gray-600">
            {journey?.member ? `Viewing: ${journey.member.fullName}` : 'Search for a member to view their journey'}
          </p>
        </div>
        {memberId && (
          <DataRefreshControls
            lastUpdated={lastUpdated}
            isLoading={isLoading}
            isLive={isLive}
            onToggleLive={toggleLive}
            onRefresh={refresh}
            timestampFormat="datetime"
          />
        )}
      </div>

      {/* Member search */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Search Member</h2>
        <MemberSearchBar 
          onMemberSelect={handleMemberSelect}
          autoFocus={!memberId}
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <ErrorIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800">
                Unable to Load Member Journey
              </h3>
              <p className="text-red-600 mt-1">
                {error === 'Member not found' 
                  ? `The member with ID "${memberId}" could not be found. They may have been removed or the link may be incorrect.`
                  : error.includes('network') || error.includes('Network')
                    ? 'Unable to connect to the server. Please check your internet connection and try again.'
                    : `An error occurred while loading the member journey: ${error}`
                }
              </p>
              <div className="mt-4 flex gap-3">
                <button 
                  onClick={() => execute()}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Retrying...' : 'Try Again'}
                </button>
                <button 
                  onClick={() => navigate('/members')}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
                >
                  Search for Another Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {memberId ? (
        <>
          {/* Loading indicator for initial load */}
          {isLoading && !journey && (
            <div className="bg-white rounded-lg shadow p-8">
              <div className="flex flex-col items-center justify-center">
                <LoadingSpinner className="w-12 h-12 text-blue-600" />
                <p className="mt-4 text-gray-600 font-medium">Loading member journey...</p>
                <p className="text-sm text-gray-400 mt-1">Please wait while we fetch the data</p>
              </div>
            </div>
          )}

          {/* Member profile */}
          <MemberProfileCard 
            member={journey?.member || null} 
            isLoading={isLoading && !journey} 
          />

          {/* Journey summary */}
          <JourneySummaryCard 
            summary={journey?.summary || null} 
            isLoading={isLoading && !journey} 
          />

          {/* Timeline */}
          <JourneyTimeline 
            events={journey?.timeline || []} 
            isLoading={isLoading && !journey} 
          />

          {/* Navigation buttons */}
          {journey?.member && (
            <div className="flex justify-between items-center bg-white rounded-lg shadow p-4">
              <button
                onClick={() => navigate('/members')}
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
            <p className="text-sm mt-2">You can search by name, phone number, or email address</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function PrintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className || ''}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

export default MemberJourney;
