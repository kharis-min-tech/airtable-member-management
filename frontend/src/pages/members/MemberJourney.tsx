import { useParams, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { MemberProfileCard, JourneyTimeline, JourneySummaryCard, MemberSearchBar } from '../../components/members';
import { DataRefreshControls } from '../../components/common';
import { useApi } from '../../hooks/useApi';
import { useLiveMode } from '../../hooks/useLiveMode';
import { churchApi } from '../../services/church-api';
import type { Member, MemberJourney as MemberJourneyType } from '../../types';

function MemberJourney() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();

  // Fetch member journey data when memberId is present
  const apiCall = useCallback(() => {
    if (!memberId) {
      return Promise.resolve({ data: null as MemberJourneyType | null, lastUpdated: new Date(), cached: false });
    }
    return churchApi.members.getJourney(memberId);
  }, [memberId]);

  const { data: journey, isLoading, error, lastUpdated, refresh } = useApi(apiCall, {
    immediate: !!memberId,
  });

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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <ErrorIcon className="w-5 h-5" />
            <span className="font-medium">Error loading member journey</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button 
            onClick={() => refresh()}
            className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {memberId ? (
        <>
          {/* Member profile */}
          <MemberProfileCard 
            member={journey?.member || null} 
            isLoading={isLoading} 
          />

          {/* Journey summary */}
          <JourneySummaryCard 
            summary={journey?.summary || null} 
            isLoading={isLoading} 
          />

          {/* Timeline */}
          <JourneyTimeline 
            events={journey?.timeline || []} 
            isLoading={isLoading} 
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

export default MemberJourney;
