/**
 * DataRefreshControls Component
 * 
 * A reusable component that provides consistent data refresh controls across all views.
 * Includes:
 * - "Last Updated" timestamp display (Requirement 21.2)
 * - "Refresh Now" button (Requirement 21.3, 21.4)
 * - "Live Mode" toggle with 30-second polling (Requirement 21.6)
 * 
 * Requirements: 21.2, 21.3, 21.4, 21.5, 21.6
 */

import { useMemo } from 'react';

interface DataRefreshControlsProps {
  /** The timestamp when data was last updated */
  lastUpdated: Date | null;
  /** Whether data is currently being loaded/refreshed */
  isLoading: boolean;
  /** Whether live mode is currently active */
  isLive: boolean;
  /** Callback to toggle live mode on/off */
  onToggleLive: () => void;
  /** Callback to trigger a manual refresh */
  onRefresh: () => void;
  /** Whether the refresh controls should be disabled */
  disabled?: boolean;
  /** Optional custom format for the timestamp */
  timestampFormat?: 'time' | 'datetime' | 'relative';
  /** Whether to show the live mode indicator dot */
  showLiveIndicator?: boolean;
  /** Custom class name for the container */
  className?: string;
}

/**
 * Formats a date for display based on the specified format
 */
function formatTimestamp(date: Date | null, format: 'time' | 'datetime' | 'relative'): string {
  if (!date) return '--';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);

  switch (format) {
    case 'relative':
      if (diffSeconds < 60) {
        return 'Just now';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
      }
      // Fall through to time format for older timestamps
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });

    case 'datetime':
      return date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });

    case 'time':
    default:
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
  }
}

/**
 * DataRefreshControls provides a consistent UI for data refresh functionality
 * across all dashboard and explorer views.
 */
export function DataRefreshControls({
  lastUpdated,
  isLoading,
  isLive,
  onToggleLive,
  onRefresh,
  disabled = false,
  timestampFormat = 'time',
  showLiveIndicator = true,
  className = '',
}: DataRefreshControlsProps) {
  const formattedTimestamp = useMemo(
    () => formatTimestamp(lastUpdated, timestampFormat),
    [lastUpdated, timestampFormat]
  );

  const isDisabled = disabled || isLoading;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Last Updated Timestamp - Requirement 21.2 */}
      <span className="text-sm text-gray-500">
        Last updated: {formattedTimestamp}
      </span>

      {/* Refresh Now Button - Requirements 21.3, 21.4 */}
      <button
        onClick={onRefresh}
        disabled={isDisabled}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        aria-label="Refresh data"
      >
        {isLoading ? 'Refreshing...' : 'Refresh'}
      </button>

      {/* Live Mode Toggle - Requirement 21.6 */}
      <button
        onClick={onToggleLive}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
          isLive
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        } disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed`}
        aria-label={isLive ? 'Disable live mode' : 'Enable live mode'}
        aria-pressed={isLive}
      >
        {showLiveIndicator && (
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? 'bg-white animate-pulse' : 'bg-gray-400'
            }`}
            aria-hidden="true"
          />
        )}
        {isLive ? 'Live Mode ON' : 'Live Mode'}
      </button>
    </div>
  );
}

export default DataRefreshControls;
