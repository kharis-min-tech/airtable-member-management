/**
 * Visited Members View
 * Requirements: 19.5
 * Shows Members where Visited? is true, sorted by Last Visited date descending
 */

import { useMemo, useState } from 'react';
import type { VisitedMember } from '../../types';

interface VisitedMembersViewProps {
  data: VisitedMember[] | null;
  isLoading?: boolean;
}

function VisitedMembersView({ data, isLoading = false }: VisitedMembersViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(
      (item) =>
        item.member.fullName?.toLowerCase().includes(term) ||
        item.member.firstName?.toLowerCase().includes(term) ||
        item.member.lastName?.toLowerCase().includes(term) ||
        item.member.phone?.includes(term) ||
        item.member.email?.toLowerCase().includes(term)
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
    const visitDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - visitDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getRecencyColor = (days: number) => {
    if (days <= 7) return 'bg-green-100 text-green-800';
    if (days <= 30) return 'bg-blue-100 text-blue-800';
    if (days <= 90) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'First Timer':
        return 'bg-blue-100 text-blue-800';
      case 'Returner':
        return 'bg-green-100 text-green-800';
      case 'Evangelism Contact':
        return 'bg-purple-100 text-purple-800';
      case 'Member':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          {filteredData.length} visited members
        </span>
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {data && data.length > 0
            ? 'No members match your search'
            : 'No visited members found'}
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
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Visited
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Days Ago
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Visits
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((item) => {
                const daysSince = getDaysSince(item.lastVisited);
                return (
                  <tr key={item.member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {item.member.fullName || `${item.member.firstName} ${item.member.lastName}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.member.phone || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(
                          item.member.status
                        )}`}
                      >
                        {item.member.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(item.lastVisited)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${getRecencyColor(daysSince)}`}
                      >
                        {daysSince} days
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.member.visitsCount || 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default VisitedMembersView;
