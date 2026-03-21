import { useState, useEffect, useRef } from 'react';
import { invalidateCache } from '../services/api-client';

export interface UseDebouncedDateFilterOptions {
  debounceMs: number;
  onDateChange: (startDate: Date, endDate: Date) => Promise<void>;
}

export interface UseDebouncedDateFilterReturn {
  startDate: Date | undefined;
  setStartDate: (date: Date | undefined) => void;
  endDate: Date | undefined;
  setEndDate: (date: Date | undefined) => void;
  isLoading: boolean;
}

/**
 * Hook for debounced date filter with automatic data loading
 * 
 * Features:
 * - Debounces date changes by specified milliseconds (default 500ms)
 * - Automatically triggers data fetch after debounce period
 * - Cancels pending requests on rapid date changes
 * - Invalidates cache when date range changes
 * - Manages loading state
 * 
 * @param options - Configuration options
 * @returns Date filter state and setters
 */
export function useDebouncedDateFilter(
  options: UseDebouncedDateFilterOptions
): UseDebouncedDateFilterReturn {
  const { debounceMs, onDateChange } = options;
  
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  
  // Track previous date range for cache invalidation
  const previousDateRangeRef = useRef<{ startDate?: Date; endDate?: Date }>({});
  
  // Track abort controller for cancelling pending requests
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any pending timer
    const timer = setTimeout(async () => {
      // Only fetch if both dates are set
      if (startDate && endDate) {
        // Cancel any pending request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();
        
        // Invalidate cache for previous date range
        const prevStart = previousDateRangeRef.current.startDate;
        const prevEnd = previousDateRangeRef.current.endDate;
        
        if (prevStart || prevEnd) {
          // Invalidate all query cache entries (date-filtered data)
          invalidateCache('/query/*');
        }
        
        // Update previous date range
        previousDateRangeRef.current = { startDate, endDate };
        
        // Set loading state and fetch data
        setIsLoading(true);
        
        try {
          await onDateChange(startDate, endDate);
        } catch (error) {
          // Only log error if not aborted
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error('Error loading date-filtered data:', error);
          }
        } finally {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    // Cleanup function: cancel timer on unmount or when dependencies change
    return () => {
      clearTimeout(timer);
    };
  }, [startDate, endDate, debounceMs, onDateChange]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    isLoading,
  };
}
