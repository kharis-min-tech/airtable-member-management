import { useState, useMemo } from 'react';
import { Card } from '../tailus-ui';
import type { FollowUpInteraction } from '../../types';

interface FollowUpCommentsTableProps {
  data: FollowUpInteraction[] | null;
  isLoading?: boolean;
  startDate: string;
  endDate: string;
  onDateRangeChange: (startDate: string, endDate: string) => void;
}

function FollowUpCommentsTable({
  data,
  isLoading = false,
  startDate,
  endDate,
  onDateRangeChange,
}: FollowUpCommentsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(
      (interaction) =>
        interaction.memberName.toLowerCase().includes(term) ||
        interaction.volunteerName.toLowerCase().includes(term) ||
        interaction.comment.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Quick date range presets
  const setDatePreset = (preset: 'today' | 'week' | 'month' | 'all') => {
    const today = new Date();
    let start: Date;
    const end: Date = today;

    switch (preset) {
      case 'today':
        start = today;
        break;
      case 'week':
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        break;
      case 'month':
        start = new Date(today);
        start.setMonth(today.getMonth() - 1);
        break;
      case 'all':
        start = new Date('2020-01-01');
        break;
    }

    onDateRangeChange(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );
  };

  return (
    <Card variant="default">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
          Consolidated Follow-up Comments
        </h2>
        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          <span className="font-semibold text-accent dark:text-accent-light">{filteredData.length}</span> comments
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Date range inputs */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary-light dark:text-text-secondary-dark">From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onDateRangeChange(e.target.value, endDate)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary-light dark:text-text-secondary-dark">To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onDateRangeChange(startDate, e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark"
          />
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDatePreset('today')}
            className="px-2 py-1 text-xs text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Today
          </button>
          <button
            onClick={() => setDatePreset('week')}
            className="px-2 py-1 text-xs text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Last 7 days
          </button>
          <button
            onClick={() => setDatePreset('month')}
            className="px-2 py-1 text-xs text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Last 30 days
          </button>
          <button
            onClick={() => setDatePreset('all')}
            className="px-2 py-1 text-xs text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            All
          </button>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search comments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-8 text-text-secondary-light dark:text-text-secondary-dark">
          {data && data.length > 0
            ? 'No comments match your search'
            : 'No follow-up comments found for the selected date range'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">
                  Member
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">
                  Volunteer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">
                  Comment
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredData.map((interaction) => (
                <tr key={interaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
                    <div>{formatDate(interaction.date)}</div>
                    <div className="text-xs text-text-secondary-light/70 dark:text-text-secondary-dark/70">{formatTime(interaction.date)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                    {interaction.memberName}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    {interaction.volunteerName}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-md">
                    <p className="line-clamp-2">{interaction.comment}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default FollowUpCommentsTable;
