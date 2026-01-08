/**
 * Today's Follow-ups Due View
 * Requirements: 19.1
 * Shows Follow-up Assignments where Due Date equals today and Status is not "Completed"
 */

import { useMemo, useState } from 'react';
import { Input } from '../tailus-ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../tailus-ui/Table';
import { EmptyState } from '../common/EmptyState';
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
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300';
      case 'In Progress':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
      case 'Completed':
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
      case 'Reassigned':
        return 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by member or volunteer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
          {filteredData.length} follow-ups due today
        </span>
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <EmptyState
          title={data && data.length > 0 ? 'No follow-ups match your search' : 'No follow-ups due today'}
          description={data && data.length > 0 ? 'Try adjusting your search terms' : 'All follow-ups are up to date'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell header>Member</TableCell>
              <TableCell header>Assigned To</TableCell>
              <TableCell header>Assigned Date</TableCell>
              <TableCell header>Due Date</TableCell>
              <TableCell header>Status</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell className="font-medium text-text-primary-light dark:text-text-primary-dark">
                  {assignment.memberName || assignment.memberId}
                </TableCell>
                <TableCell>
                  {assignment.assignedToName || assignment.assignedTo}
                </TableCell>
                <TableCell>
                  {formatDate(assignment.assignedDate)}
                </TableCell>
                <TableCell>
                  {formatDate(assignment.dueDate)}
                </TableCell>
                <TableCell>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(
                      assignment.status
                    )}`}
                  >
                    {assignment.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default TodaysFollowUpsView;
