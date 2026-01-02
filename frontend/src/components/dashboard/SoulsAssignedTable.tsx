import { useMemo, useState } from 'react';
import type { SoulsAssignedByVolunteer } from '../../types';

interface SoulsAssignedTableProps {
  data: SoulsAssignedByVolunteer[] | null;
  isLoading?: boolean;
}

function SoulsAssignedTable({ data, isLoading = false }: SoulsAssignedTableProps) {
  const [expandedVolunteers, setExpandedVolunteers] = useState<Set<string>>(new Set());

  const toggleVolunteer = (volunteerId: string) => {
    setExpandedVolunteers((prev) => {
      const next = new Set(prev);
      if (next.has(volunteerId)) {
        next.delete(volunteerId);
      } else {
        next.add(volunteerId);
      }
      return next;
    });
  };

  const totalSouls = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, volunteer) => sum + volunteer.members.length, 0);
  }, [data]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Souls Assigned to Individuals
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Souls Assigned to Individuals
        </h2>
        <div className="text-center py-8 text-gray-400">
          No follow-up assignments found
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Souls Assigned to Individuals
        </h2>
        <span className="text-sm text-gray-500">
          Total: <span className="font-semibold">{totalSouls}</span> souls
        </span>
      </div>

      <div className="space-y-2">
        {data.map((volunteer) => (
          <div key={volunteer.volunteerId} className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleVolunteer(volunteer.volunteerId)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {volunteer.volunteerName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="font-medium text-gray-800">{volunteer.volunteerName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                  {volunteer.members.length} souls
                </span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedVolunteers.has(volunteer.volunteerId) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {expandedVolunteers.has(volunteer.volunteerId) && (
              <div className="border-t border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Phone
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Assigned
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {volunteer.members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800">{member.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded ${
                              member.status === 'First Timer'
                                ? 'bg-blue-100 text-blue-800'
                                : member.status === 'Returner'
                                ? 'bg-green-100 text-green-800'
                                : member.status === 'Evangelism Contact'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {member.phone || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(member.assignedDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SoulsAssignedTable;
