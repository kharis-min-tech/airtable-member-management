/**
 * New First Timers View (last 1 month)
 * Requirements: 19.2
 * Shows Members with Status "First Timer" and Date First Captured within the last 30 days
 */

import { useMemo, useState } from 'react';
import type { Member } from '../../types';

interface NewFirstTimersViewProps {
  data: Member[] | null;
  isLoading?: boolean;
}

function NewFirstTimersView({ data, isLoading = false }: NewFirstTimersViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(
      (member) =>
        member.fullName?.toLowerCase().includes(term) ||
        member.firstName?.toLowerCase().includes(term) ||
        member.lastName?.toLowerCase().includes(term) ||
        member.phone?.includes(term) ||
        member.email?.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysSince = (date: Date | string) => {
    const now = new Date();
    const capturedDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - capturedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-500">
          {filteredData.length} first timers in the last 30 days
        </span>
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {data && data.length > 0
            ? 'No first timers match your search'
            : 'No new first timers in the last 30 days'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date First Captured
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Days Ago
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Follow-up Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {member.fullName || `${member.firstName} ${member.lastName}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {member.phone || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {member.email || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(member.dateFirstCaptured)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                      {getDaysSince(member.dateFirstCaptured)} days
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {member.followUpStatus || 'Not Started'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default NewFirstTimersView;
