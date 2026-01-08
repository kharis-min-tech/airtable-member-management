import { cn } from '../lib/utils';

export interface LoadingSpinnerProps {
  /** Optional loading text to display below the spinner */
  text?: string;
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to center the spinner in a full-screen container */
  fullScreen?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeStyles = {
  sm: 'h-6 w-6',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

/**
 * LoadingSpinner component with brand primary color.
 * Supports optional loading text and multiple sizes.
 * 
 * @example
 * <LoadingSpinner />
 * <LoadingSpinner text="Loading data..." size="lg" />
 * <LoadingSpinner fullScreen text="Please wait..." />
 */
export function LoadingSpinner({
  text,
  size = 'md',
  fullScreen = true,
  className,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2',
          'border-primary dark:border-primary-dark',
          'border-t-transparent dark:border-t-transparent',
          sizeStyles[size]
        )}
        role="status"
        aria-label={text || 'Loading'}
      />
      {text && (
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export default LoadingSpinner;
