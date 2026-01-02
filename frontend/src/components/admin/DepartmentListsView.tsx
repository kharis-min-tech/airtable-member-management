/**
 * Department Lists View
 * Requirements: 19.6
 * Shows active members grouped by Department
 */

import { useMemo, useState } from 'react';
import type { DepartmentRoster } from '../../types';

interface DepartmentListsViewProps {
  data: DepartmentRoster[] | null;
  isLoading?: boolean;
}

function DepartmentListsView({ data, isLoading = false }: DepartmentListsViewProps) {
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const toggleDepartment = (departmentId: string) => {
    setExpandedDepartments((prev) => {
      const next = new Set(prev);
      if (next.has(departmentId)) {
        next.delete(departmentId);
      } else {
        next.add(departmentId);
      }
      return next;
    });
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.map((dept) => ({
      ...dept,
      members: dept.members.filter(
        (member) =>
          member.fullName?.toLowerCase().includes(term) ||
          member.firstName?.toLowerCase().includes(term) ||
          member.lastName?.toLowerCase().includes(term) ||
          member.phone?.includes(term) ||
          member.email?.toLowerCase().includes(term)
      ),
    })).filter((dept) => dept.members.length > 0 || dept.departmentName.toLowerCase().includes(term));
  }, [data, searchTerm]);

  const totalMembers = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, dept) => sum + dept.members.length, 0);
  }, [data]);

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
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and stats */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search by name, phone, email, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-500">
          {data?.length || 0} departments, {totalMembers} total members
        </span>
      </div>

      {/* Department list */}
      {filteredData.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {data && data.length > 0
            ? 'No departments match your search'
            : 'No department data found'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredData.map((dept) => (
            <div key={dept.departmentId} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleDepartment(dept.departmentId)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {dept.departmentName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-medium text-gray-800">{dept.departmentName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                    {dept.members.length} members
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedDepartments.has(dept.departmentId) ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedDepartments.has(dept.departmentId) && (
                <div className="border-t border-gray-200">
                  {dept.members.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No active members in this department</div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {dept.members.map((member) => (
                          <tr key={member.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">
                              {member.fullName || `${member.firstName} ${member.lastName}`}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{member.phone || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{member.email || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(member.status)}`}>
                                {member.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DepartmentListsView;
