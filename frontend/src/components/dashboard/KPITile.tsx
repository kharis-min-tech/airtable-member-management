import type { ReactNode } from 'react';
import { Card } from '../tailus-ui';

interface KPITileProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'success' | 'gray';
  isLoading?: boolean;
}

const colorClasses = {
  primary: 'text-primary dark:text-primary-dark',
  secondary: 'text-secondary dark:text-secondary-400',
  tertiary: 'text-tertiary dark:text-tertiary-400',
  accent: 'text-accent dark:text-accent-light',
  success: 'text-success dark:text-success-500',
  gray: 'text-accent dark:text-accent-light', // Use accent color for KPI values per Requirements 7.4
};

function KPITile({ title, value, subtitle, icon, color = 'gray', isLoading = false }: KPITileProps) {
  return (
    <Card variant="outlined" className="transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">{title}</h3>
        {icon && <div className="text-text-secondary-light dark:text-text-secondary-dark">{icon}</div>}
      </div>
      {isLoading ? (
        <div className="mt-2">
          <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        </div>
      ) : (
        <p className={`text-3xl font-bold mt-2 ${colorClasses[color]}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      )}
      {subtitle && <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">{subtitle}</p>}
    </Card>
  );
}

export default KPITile;
