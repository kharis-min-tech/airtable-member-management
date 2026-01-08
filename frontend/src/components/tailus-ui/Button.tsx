import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  primary: cn(
    'bg-primary dark:bg-primary-dark text-white',
    'hover:bg-primary-light dark:hover:bg-primary-400',
    'focus:ring-primary-500'
  ),
  secondary: cn(
    'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    'hover:bg-gray-200 dark:hover:bg-gray-600',
    'focus:ring-gray-500'
  ),
  outline: cn(
    'border border-primary dark:border-primary-dark',
    'text-primary dark:text-primary-dark',
    'hover:bg-primary/10 dark:hover:bg-primary-dark/10',
    'focus:ring-primary-500'
  ),
  ghost: cn(
    'text-gray-700 dark:text-gray-300',
    'hover:bg-gray-100 dark:hover:bg-gray-800',
    'focus:ring-gray-500'
  ),
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

/**
 * Button component with multiple variants and sizes.
 * Uses brand primary color for primary variant.
 * 
 * @example
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="outline" size="sm">Cancel</Button>
 */
export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'dark:focus:ring-offset-gray-900',
        variantStyles[variant],
        sizeStyles[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
