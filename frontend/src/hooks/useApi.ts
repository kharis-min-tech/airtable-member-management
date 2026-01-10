import { useState, useCallback, useRef, useEffect } from 'react';
import type { ApiResponse } from '../types';

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isCached: boolean;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: <T>(data: T) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for making API calls with loading, error, and cache state management.
 * 
 * @param apiCall - Function that returns a Promise<ApiResponse<T>>
 * @param options - Configuration options
 * @returns State and control functions for the API call
 * 
 * @example
 * const { data, isLoading, error, execute, refresh } = useApi(
 *   () => churchApi.dashboard.getServiceKPIs(serviceId),
 *   { immediate: true }
 * );
 */
export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const { immediate = false, onSuccess, onError } = options;
  
  const [state, setState] = useState<UseApiState<T>>(() => ({
    data: null,
    isLoading: immediate,
    error: null,
    lastUpdated: null,
    isCached: false,
  }));

  const mountedRef = useRef(true);
  const apiCallRef = useRef(apiCall);
  const immediateExecutedRef = useRef(false);

  // Update ref when apiCall changes
  useEffect(() => {
    apiCallRef.current = apiCall;
  }, [apiCall]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiCallRef.current();
      
      if (mountedRef.current) {
        setState({
          data: response.data,
          isLoading: false,
          error: null,
          lastUpdated: response.lastUpdated,
          isCached: response.cached,
        });
        onSuccess?.(response.data);
      }
    } catch (err) {
      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        onError?.(errorMessage);
      }
    }
  }, [onSuccess, onError]);

  const refresh = useCallback(async () => {
    // Force a fresh fetch by clearing any cached state indication
    await execute();
  }, [execute]);

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      lastUpdated: null,
      isCached: false,
    });
  }, []);

  // Execute immediately if requested (only once on mount)
  useEffect(() => {
    if (immediate && !immediateExecutedRef.current) {
      immediateExecutedRef.current = true;
      // Schedule the execution for the next tick to avoid setState in effect
      const timeoutId = setTimeout(() => {
        void execute();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    refresh,
    reset,
  };
}

/**
 * Hook for making API calls that depend on a parameter.
 * Re-executes when the parameter changes.
 * 
 * @param apiCallFactory - Function that takes a param and returns an API call
 * @param param - The parameter to pass to the API call
 * @param options - Configuration options
 * 
 * @example
 * const { data, isLoading } = useApiWithParam(
 *   (id) => () => churchApi.members.getById(id),
 *   memberId,
 *   { immediate: true }
 * );
 */
export function useApiWithParam<T, P>(
  apiCallFactory: (param: P) => () => Promise<ApiResponse<T>>,
  param: P,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const apiCall = useCallback(() => {
    return apiCallFactory(param)();
  }, [apiCallFactory, param]);

  return useApi(apiCall, options);
}

export default useApi;
