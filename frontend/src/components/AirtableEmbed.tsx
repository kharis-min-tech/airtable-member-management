import { useState, useEffect } from 'react';
import { isValidAirtableUrl } from '../config/airtable';

/**
 * Props for the AirtableEmbed component
 */
interface AirtableEmbedProps {
  embedUrl: string;
  title: string;
  height?: string;
  allowFullscreen?: boolean;
  fallbackUrl?: string;
  onError?: () => void;
}

/**
 * Error state types for different failure scenarios
 */
type ErrorType = 'invalid_url' | 'load_failed' | 'unavailable';

/**
 * AirtableEmbed component for iframe integration
 * 
 * Renders an Airtable form or interface in an iframe with proper error handling
 * and responsive design. Supports fullscreen mode, custom dimensions, and
 * fallback handling for unavailable embeds.
 * 
 * Requirements: 4.3, 5.3, 5.4 - Airtable form and interface embedding with fallback
 */
function AirtableEmbed({ 
  embedUrl, 
  title, 
  height = '600px', 
  allowFullscreen = true,
  fallbackUrl,
  onError
}: AirtableEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [loadTimeout, setLoadTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Validate URL on mount and when it changes
  useEffect(() => {
    if (!embedUrl || !isValidAirtableUrl(embedUrl)) {
      setErrorType('invalid_url');
      setIsLoading(false);
      onError?.();
    } else {
      setErrorType(null);
      setIsLoading(true);
    }
  }, [embedUrl, onError]);

  // Set a timeout for loading - if iframe doesn't load in 30 seconds, show error
  useEffect(() => {
    if (isLoading && !errorType) {
      const timeout = setTimeout(() => {
        setIsLoading(false);
        setErrorType('unavailable');
        onError?.();
      }, 30000);
      setLoadTimeout(timeout);
      
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
  }, [isLoading, errorType, onError]);

  const handleLoad = () => {
    if (loadTimeout) clearTimeout(loadTimeout);
    setIsLoading(false);
    setErrorType(null);
  };

  const handleError = () => {
    if (loadTimeout) clearTimeout(loadTimeout);
    setIsLoading(false);
    setErrorType('load_failed');
    onError?.();
  };

  // Get the appropriate fallback URL
  const getFallbackLink = (): string => {
    if (fallbackUrl) return fallbackUrl;
    // Convert embed URL to direct URL if possible
    if (embedUrl) {
      return embedUrl.replace('/embed/', '/');
    }
    return 'https://airtable.com';
  };

  // Get error message based on error type
  const getErrorMessage = (): { title: string; description: string } => {
    switch (errorType) {
      case 'invalid_url':
        return {
          title: 'Invalid Configuration',
          description: 'The embed URL is not properly configured. Please contact the administrator.',
        };
      case 'load_failed':
        return {
          title: 'Failed to Load',
          description: `Unable to load ${title}. The content may be temporarily unavailable.`,
        };
      case 'unavailable':
        return {
          title: 'Content Unavailable',
          description: `${title} is taking too long to load. Please try again later.`,
        };
      default:
        return {
          title: 'Error',
          description: 'An unexpected error occurred.',
        };
    }
  };

  // Render error state with fallback link
  if (errorType) {
    const errorMessage = getErrorMessage();
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        style={{ height }}
        data-testid="airtable-embed-error"
      >
        <div className="text-center p-6 max-w-md">
          <div className="mb-4">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
            {errorMessage.title}
          </h3>
          <p className="text-text-secondary-light dark:text-text-secondary-dark mb-4">
            {errorMessage.description}
          </p>
          <a 
            href={getFallbackLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary dark:bg-primary-dark hover:bg-primary/90 dark:hover:bg-primary-dark/90 transition-colors"
            data-testid="airtable-fallback-link"
          >
            Open in Airtable
            <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" data-testid="airtable-embed-container">
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 z-10"
          style={{ height }}
          data-testid="airtable-embed-loading"
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary dark:border-primary-dark mx-auto mb-2"></div>
            <p className="text-text-secondary-light dark:text-text-secondary-dark">
              Loading {title}...
            </p>
          </div>
        </div>
      )}
      
      <iframe
        src={embedUrl}
        title={title}
        width="100%"
        height={height}
        frameBorder="0"
        onLoad={handleLoad}
        onError={handleError}
        allowFullScreen={allowFullscreen}
        className="rounded-lg border border-gray-200 dark:border-gray-700"
        style={{ minHeight: height }}
        data-testid="airtable-embed-iframe"
      />
    </div>
  );
}

export default AirtableEmbed;
