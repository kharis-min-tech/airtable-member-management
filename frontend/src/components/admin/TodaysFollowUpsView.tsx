/**
 * Today's Follow-ups Due View
 * Requirements: 19.1
 * Shows Follow-up Assignments where Due Date equals today and Status is not "Completed"
 */

import { useMemo, useState } from 'react';
import type { FollowUpAssignment } from '../../types';

interface TodaysFollowUpsViewProps {
  data: FollowUpAssignment[] | null;
  isLoading?: boolean;
}

function TodaysFollowUpsView({ data, isLoading = false }: TodaysFollowUpsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(
      (assignment) =>
        assignment.memberName?.toLowerCase().includes(term) ||
        assignment.assignedToName?.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Reassigned':
        return 'bg-purple-100 text-purple-800';
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
          placeholder="Search by member or volunteer name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-500">
          {filteredData.length} follow-ups due today
        </span>
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {data && data.length > 0
            ? 'No follow-ups match your search'
            : 'No follow-ups due today'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Member
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Assigned To
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Assigned Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {assignment.memberName || assignment.memberId}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {assignment.assignedToName || assignment.assignedTo}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(assignment.assignedDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(assignment.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(
                        assignment.status
                      )}`}
                    >
                      {assignment.status}
                    </span>
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

export default TodaysFollowUpsView;
