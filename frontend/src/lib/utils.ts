import { cloneElement as reactCloneElement, isValidElement } from 'react';
import type { ReactElement } from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * Clones a React element and merges Tailwind CSS classes.
 * This utility helps combine existing classes with new ones while
 * properly handling Tailwind class conflicts.
 *
 * @param element - The React element to clone
 * @param props - Additional props to merge, including className
 * @returns A cloned element with merged classes
 */
export function cloneElement<P extends { className?: string }>(
  element: ReactElement<P>,
  props?: Partial<P> & { className?: string }
): ReactElement<P> {
  if (!isValidElement(element)) {
    return element;
  }

  const existingClassName = (element.props as P).className || '';
  const newClassName = props?.className || '';

  return reactCloneElement(element, {
    ...props,
    className: twMerge(existingClassName, newClassName),
  } as Partial<P>);
}

/**
 * Utility function to merge Tailwind CSS classes.
 * Handles class conflicts intelligently (e.g., p-4 and p-2 -> p-2).
 *
 * @param classes - Class names to merge
 * @returns Merged class string
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return twMerge(classes.filter(Boolean).join(' '));
}
