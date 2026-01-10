import React from 'react';
import { cn } from '../../lib/utils';

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

/**
 * Table component with theme-aware styling, alternating row colors, and hover states.
 * Wrapped in overflow-x-auto container for responsive horizontal scrolling.
 * 
 * @example
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableCell header>Name</TableCell>
 *       <TableCell header>Email</TableCell>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>John Doe</TableCell>
 *       <TableCell>john@example.com</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 */
export function Table({ children, className, ...props }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table
        className={cn(
          'w-full border-collapse',
          'bg-surface-light dark:bg-surface-dark',
          className
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function TableHeader({ children, className, ...props }: TableHeaderProps) {
  return (
    <thead
      className={cn(
        'bg-gray-50 dark:bg-gray-800',
        'border-b border-gray-200 dark:border-gray-700',
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function TableBody({ children, className, ...props }: TableBodyProps) {
  return (
    <tbody
      className={cn(
        '[&>tr:nth-child(even)]:bg-gray-50 dark:[&>tr:nth-child(even)]:bg-gray-800/50',
        className
      )}
      {...props}
    >
      {children}
    </tbody>
  );
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

export function TableRow({ children, className, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        'border-b border-gray-200 dark:border-gray-700 last:border-b-0',
        'hover:bg-gray-100 dark:hover:bg-gray-700/50',
        'transition-colors duration-150',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  header?: boolean;
}

export function TableCell({ children, className, header = false, ...props }: TableCellProps) {
  const Component = header ? 'th' : 'td';

  return (
    <Component
      className={cn(
        'px-4 py-3 text-left',
        header
          ? 'font-semibold text-text-primary-light dark:text-text-primary-dark text-sm uppercase tracking-wider'
          : 'text-text-secondary-light dark:text-text-secondary-dark',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Table;
