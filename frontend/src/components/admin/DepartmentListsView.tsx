/**
 * Department Lists View
 * Requirements: 19.6
 * Shows active members grouped by Department
 */

import { useMemo, useState } from 'react';
import { Input } from '../tailus-ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../tailus-ui/Table';
import { Card } from '../tailus-ui/Card';
import { EmptyState } from '../common/EmptyState';
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
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
      case 'Returner':
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
      case 'Evangelism Contact':
        return 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300';
      case 'Member':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and stats */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by name, phone, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
          {data?.length || 0} departments, {totalMembers} total members
        </span>
      </div>

      {/* Department list */}
      {filteredData.length === 0 ? (
        <EmptyState
          title={data && data.length > 0 ? 'No departments match your search' : 'No department data found'}
          description={data && data.length > 0 ? 'Try adjusting your search terms' : 'Department data will appear here'}
        />
      ) : (
        <div className="space-y-2">
          {filteredData.map((dept) => (
            <Card key={dept.departmentId} variant="outlined" className="p-0 overflow-hidden">
              <button
                onClick={() => toggleDepartment(dept.departmentId)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <span className="text-primary dark:text-primary-light font-semibold text-sm">
                      {dept.departmentName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-medium text-text-primary-light dark:text-text-primary-dark">{dept.departmentName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-primary dark:text-primary-light text-sm font-medium px-2.5 py-0.5 rounded">
                    {dept.members.length} members
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform ${
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
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {dept.members.length === 0 ? (
                    <div className="p-4 text-center text-text-secondary-light dark:text-text-secondary-dark">No active members in this department</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableCell header>Name</TableCell>
                          <TableCell header>Phone</TableCell>
                          <TableCell header>Email</TableCell>
                          <TableCell header>Status</TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dept.members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium text-text-primary-light dark:text-text-primary-dark">
                              {member.fullName || `${member.firstName} ${member.lastName}`}
                            </TableCell>
                            <TableCell>{member.phone || '-'}</TableCell>
                            <TableCell>{member.email || '-'}</TableCell>
                            <TableCell>
                              <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(member.status)}`}>
                                {member.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default DepartmentListsView;
