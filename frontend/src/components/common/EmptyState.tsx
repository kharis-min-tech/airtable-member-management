import React from 'react';
import { cn } from '../../lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  /** Icon component from lucide-react */
  icon?: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Optional action button or element */
  action?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * EmptyState component for displaying friendly messages when no data is available.
 * Supports icon, title, description, and optional action props.
 * Applies theme-aware styling.
 * 
 * @example
 * import { Inbox } from 'lucide-react';
 * 
 * <EmptyState
 *   icon={Inbox}
 *   title="No messages"
 *   description="You don't have any messages yet."
 *   action={<Button>Compose</Button>}
 * />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4">
          <Icon
            className="h-12 w-12 text-text-secondary-light dark:text-text-secondary-dark"
            aria-hidden="true"
          />
        </div>
      )}
      <h3 className="text-lg font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
