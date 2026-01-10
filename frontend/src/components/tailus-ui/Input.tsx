import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Input component with label and error support.
 * Applies focus ring with primary color and disabled state styling.
 * 
 * @example
 * <Input label="Email" type="email" placeholder="Enter your email" />
 * <Input label="Name" error="Name is required" />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, disabled, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium mb-1.5',
              'text-text-primary-light dark:text-text-primary-dark',
              disabled && 'opacity-50'
            )}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 rounded-lg border',
            'bg-surface-light dark:bg-surface-dark',
            'text-text-primary-light dark:text-text-primary-dark',
            'placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark',
            'border-gray-300 dark:border-gray-600',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'dark:focus:ring-primary-dark dark:focus:border-primary-dark',
            'transition-colors duration-200',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800',
            error && 'border-error focus:ring-error focus:border-error',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-error"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
