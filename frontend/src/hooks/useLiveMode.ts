import { useState, useEffect, useCallback, useRef } from 'react';

interface UseLiveModeOptions {
  interval?: number; // Polling interval in milliseconds
  onRefresh: () => Promise<void>;
}

interface UseLiveModeReturn {
  isLive: boolean;
  toggleLive: () => void;
  setLive: (live: boolean) => void;
}

const DEFAULT_INTERVAL = 30000; // 30 seconds

/**
 * Hook for enabling live mode with automatic polling.
 * 
 * @param options - Configuration options including interval and refresh callback
 * @returns State and control functions for live mode
 * 
 * @example
 * const { isLive, toggleLive } = useLiveMode({
 *   interval: 30000,
 *   onRefresh: async () => {
 *     await refreshData();
 *   }
 * });
 */
export function useLiveMode(options: UseLiveModeOptions): UseLiveModeReturn {
  const { interval = DEFAULT_INTERVAL, onRefresh } = options;
  const [isLive, setIsLive] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const onRefreshRef = useRef(onRefresh);

  // Update ref when onRefresh changes
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Set up polling when live mode is enabled
  useEffect(() => {
    if (isLive) {
      // Initial refresh
      void onRefreshRef.current();

      // Set up interval
      intervalRef.current = window.setInterval(() => {
        void onRefreshRef.current();
      }, interval);
    }

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLive, interval]);

  const toggleLive = useCallback(() => {
    setIsLive(prev => !prev);
  }, []);

  const setLive = useCallback((live: boolean) => {
    setIsLive(live);
  }, []);

  return {
    isLive,
    toggleLive,
    setLive,
  };
}

export default useLiveMode;
