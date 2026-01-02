import { useMemo } from 'react';
import PeriodToggle from './PeriodToggle';
import type { EvangelismStats } from '../../types';

interface EvangelismStatsCardProps {
  stats: EvangelismStats | null;
  period: 'week' | 'month';
  onPeriodChange: (period: 'week' | 'month') => void;
  isLoading?: boolean;
}

function EvangelismStatsCard({
  stats,
  period,
  onPeriodChange,
  isLoading = false,
}: EvangelismStatsCardProps) {
  const dateRange = useMemo(() => {
    if (!stats) {
      // Calculate default date range based on period
      const now = new Date();
      if (period === 'week') {
        // Sunday to Saturday week
        const dayOfWeek = now.getDay();
        const sunday = new Date(now);
        sunday.setDate(now.getDate() - dayOfWeek);
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        return {
          start: sunday,
          end: saturday,
        };
      } else {
        // First to last day of month
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          start: firstDay,
          end: lastDay,
        };
      }
    }
    return {
      start: new Date(stats.startDate),
      end: new Date(stats.endDate),
    };
  }, [stats, period]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

  const periodDescription =
    period === 'week' ? 'Sunday to Saturday' : `${dateRange.start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Evangelism Contacts</h3>
          <p className="text-sm text-gray-500">{periodDescription}</p>
        </div>
        <PeriodToggle period={period} onPeriodChange={onPeriodChange} disabled={isLoading} />
      </div>

      <div className="flex items-baseline gap-2">
        {isLoading ? (
          <div className="h-12 w-24 bg-gray-200 animate-pulse rounded"></div>
        ) : (
          <>
            <span className="text-4xl font-bold text-purple-600">
              {stats?.contactCount ?? 0}
            </span>
            <span className="text-gray-500">contacts</span>
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Period:</span>
          <span className="font-medium text-gray-700">
            {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default EvangelismStatsCard;
