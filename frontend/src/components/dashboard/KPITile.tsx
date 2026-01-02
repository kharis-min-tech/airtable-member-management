import type { ReactNode } from 'react';

interface KPITileProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'gray';
  isLoading?: boolean;
}

const colorClasses = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  gray: 'text-gray-800',
};

function KPITile({ title, value, subtitle, icon, color = 'gray', isLoading = false }: KPITileProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      {isLoading ? (
        <div className="mt-2">
          <div className="h-9 w-20 bg-gray-200 animate-pulse rounded"></div>
        </div>
      ) : (
        <p className={`text-3xl font-bold mt-2 ${colorClasses[color]}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      )}
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export default KPITile;
