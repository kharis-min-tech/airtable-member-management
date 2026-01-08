import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef } from 'react';
import { MemberProfileCard, JourneyTimeline, JourneySummaryCard, MemberSearchBar } from '../../components/members';
import { DataRefreshControls } from '../../components/common';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/tailus-ui/Card';
import { Button } from '../../components/tailus-ui/Button';
import { useApi } from '../../hooks/useApi';
import { useLiveMode } from '../../hooks/useLiveMode';
import { churchApi } from '../../services/church-api';
import type { Member, MemberJourney as MemberJourneyType } from '../../types';

/**
 * Get user-friendly error title based on error message
 */
function getErrorTitle(error: string): string {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('not found') || lowerError.includes('does not exist')) {
    return 'Member Not Found';
  }
  if (lowerError.includes('permission') || lowerError.includes('access')) {
    return 'Access Denied';
  }
  if (lowerError.includes('authentication') || lowerError.includes('api key')) {
    return 'Authentication Error';
  }
  if (lowerError.includes('network') || lowerError.includes('connect') || lowerError.includes('timeout')) {
    return 'Connection Error';
  }
  return 'Unable to Load Member Journey';
}

/**
 * Get user-friendly error message based on error type
 */
function getErrorMessage(error: string, memberId: string | undefined): string {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('not found') || lowerError.includes('does not exist')) {
    return `The member with ID "${memberId}" could not be found. They may have been removed or the link may be incorrect.`;
  }
  if (lowerError.includes('permission') || lowerError.includes('access')) {
    return 'You do not have permission to view this member\'s journey. Please contact your administrator if you believe this is an error.';
  }
  if (lowerError.includes('authentication') || lowerError.includes('api key')) {
    return 'There was an authentication problem with the data service. Please contact your administrator.';
  }
  if (lowerError.includes('network') || lowerError.includes('connect') || lowerError.includes('timeout')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  return error;
}

/**
 * Get optional hint text for certain error types
 */
function getErrorHint(error: string): string | null {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('permission') || lowerError.includes('access')) {
    return 'Hint: This may be due to Airtable API key permissions or table access settings.';
  }
  if (lowerError.includes('authentication') || lowerError.includes('api key')) {
    return 'Hint: The Airtable API key may be invalid or expired.';
  }
  return null;
}

function MemberJourney() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  
  const prevMemberIdRef = useRef<string | undefined>(undefined);

  const apiCall = useCallback(() => {
    if (!memberId) {
      return Promise.resolve({ data: null as MemberJourneyType | null, lastUpdated: new Date(), cached: false });
    }
    return churchApi.members.getJourney(memberId);
  }, [memberId]);

  const { data: journey, isLoading, error, lastUpdated, refresh, execute, reset } = useApi(apiCall, {
    immediate: !!memberId,
  });

  useEffect(() => {
    if (prevMemberIdRef.current === undefined) {
      prevMemberIdRef.current = memberId;
      return;
    }
    
    if (memberId !== prevMemberIdRef.current) {
      prevMemberIdRef.current = memberId;
      
      if (memberId) {
        reset();
        execute();
      } else {
        reset();
      }
    }
  }, [memberId, execute, reset]);

  const { isLive, toggleLive } = useLiveMode({
    interval: 30000,
    onRefresh: refresh,
  });

  const handleMemberSelect = useCallback((member: Member) => {
    navigate(`/members/${member.id}`);
  }, [navigate]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">Member Journey</h1>
          <p className="text-text-secondary-light dark:text-text-secondary-dark">
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
      <Card variant="default">
        <CardHeader>
          <CardTitle>Search Member</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberSearchBar 
            onMemberSelect={handleMemberSelect}
            autoFocus={!memberId}
          />
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Card variant="outlined" className="border-error-200 dark:border-error/30 bg-error-50 dark:bg-error/10">
          <CardContent className="p-0">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <ErrorIcon className="w-6 h-6 text-error" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-error-700 dark:text-error-400">
                  {getErrorTitle(error)}
                </h3>
                <p className="text-error-600 dark:text-error-400 mt-1">
                  {getErrorMessage(error, memberId)}
                </p>
                {getErrorHint(error) && (
                  <p className="text-error-500 dark:text-error-400 text-sm mt-2 italic">
                    {getErrorHint(error)}
                  </p>
                )}
                <div className="mt-4 flex gap-3">
                  <Button 
                    onClick={() => execute()}
                    disabled={isLoading}
                    variant="primary"
                    className="bg-error hover:bg-error-700"
                  >
                    <RefreshIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Retrying...' : 'Try Again'}
                  </Button>
                  <Button 
                    onClick={() => navigate('/members')}
                    variant="outline"
                    className="border-error-300 dark:border-error/50 text-error-700 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error/10"
                  >
                    Search for Another Member
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {memberId ? (
        <>
          {/* Loading indicator for initial load */}
          {isLoading && !journey && (
            <Card variant="default">
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8">
                  <LoadingSpinner className="w-12 h-12 text-primary dark:text-primary-dark" />
                  <p className="mt-4 text-text-primary-light dark:text-text-primary-dark font-medium">Loading member journey...</p>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">Please wait while we fetch the data</p>
                </div>
              </CardContent>
            </Card>
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
            <Card variant="default">
              <CardContent className="p-4 flex justify-between items-center">
                <button
                  onClick={() => navigate('/members')}
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
              <p className="text-sm mt-2">You can search by name, phone number, or email address</p>
            </div>
          </CardContent>
        </Card>
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
