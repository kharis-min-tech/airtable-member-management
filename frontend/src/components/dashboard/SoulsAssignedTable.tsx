import { useMemo, useState } from 'react';
import { Card } from '../tailus-ui';
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
    return data.reduce((sum, volunteer) => sum + (volunteer.members?.length ?? 0), 0);
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
      <Card variant="default">
        <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">
          Souls Assigned to Individuals
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card variant="default">
        <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">
          Souls Assigned to Individuals
        </h2>
        <div className="text-center py-8 text-text-secondary-light dark:text-text-secondary-dark">
          No follow-up assignments found
        </div>
      </Card>
    );
  }

  return (
    <Card variant="default">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
          Souls Assigned to Individuals
        </h2>
        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Total: <span className="font-semibold text-accent dark:text-accent-light">{totalSouls}</span> souls
        </span>
      </div>

      <div className="space-y-2">
        {data.map((volunteer) => (
          <div key={volunteer.volunteerId} className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              onClick={() => toggleVolunteer(volunteer.volunteerId)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 dark:bg-primary-dark/20 rounded-full flex items-center justify-center">
                  <span className="text-primary dark:text-primary-dark font-semibold text-sm">
                    {volunteer.volunteerName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="font-medium text-text-primary-light dark:text-text-primary-dark">{volunteer.volunteerName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-primary/10 dark:bg-primary-dark/20 text-primary dark:text-primary-dark text-sm font-medium px-2.5 py-0.5 rounded">
                  {volunteer.members?.length ?? 0} souls
                </span>
                <svg
                  className={`w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark transition-transform ${
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
              <div className="border-t border-gray-200 dark:border-gray-700">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">
                        Phone
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">
                        Assigned
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {(volunteer.members ?? []).map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm text-text-primary-light dark:text-text-primary-dark">{member.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded ${
                              member.status === 'First Timer'
                                ? 'bg-primary/10 dark:bg-primary-dark/20 text-primary dark:text-primary-dark'
                                : member.status === 'Returner'
                                ? 'bg-secondary/10 dark:bg-secondary-400/20 text-secondary dark:text-secondary-400'
                                : member.status === 'Evangelism Contact'
                                ? 'bg-tertiary/10 dark:bg-tertiary-400/20 text-tertiary dark:text-tertiary-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-text-primary-light dark:text-text-primary-dark'
                            }`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                          {member.phone || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary-light dark:text-text-secondary-dark">
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
    </Card>
  );
}

export default SoulsAssignedTable;
