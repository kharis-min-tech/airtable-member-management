/**
 * No Follow-up Owner Assigned View
 * Requirements: 19.4
 * Shows Members where Follow-up Owner is empty and Status is not "Member" or "Integrated"
 */

import { useMemo, useState } from 'react';
import type { Member } from '../../types';

interface NoFollowUpOwnerViewProps {
  data: Member[] | null;
  isLoading?: boolean;
}

function NoFollowUpOwnerView({ data, isLoading = false }: NoFollowUpOwnerViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredData = useMemo(() => {
    if (!data) return [];
    let filtered = data;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((member) => member.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (member) =>
          member.fullName?.toLowerCase().includes(term) ||
          member.firstName?.toLowerCase().includes(term) ||
          member.lastName?.toLowerCase().includes(term) ||
          member.phone?.includes(term) ||
          member.email?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [data, searchTerm, statusFilter]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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

  // Get unique statuses for filter
  const statuses = useMemo(() => {
    if (!data) return [];
    const uniqueStatuses = [...new Set(data.map((m) => m.status))];
    return uniqueStatuses.sort();
  }, [data]);

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
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">
          {filteredData.length} members without follow-up owner
        </span>
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {data && data.length > 0
            ? 'No members match your filters'
            : 'All members have follow-up owners assigned'}
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
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date First Captured
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
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(
                        member.status
                      )}`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {member.source || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(member.dateFirstCaptured)}
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

export default NoFollowUpOwnerView;
