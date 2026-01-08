/**
 * Visited Members View
 * Requirements: 19.5
 * Shows Members where Visited? is true, sorted by Last Visited date descending
 */

import { useMemo, useState } from 'react';
import { Input } from '../tailus-ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../tailus-ui/Table';
import { EmptyState } from '../common/EmptyState';
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
    if (days <= 7) return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
    if (days <= 30) return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
    if (days <= 90) return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300';
    return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300';
  };

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
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
          {filteredData.length} visited members
        </span>
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <EmptyState
          title={data && data.length > 0 ? 'No members match your search' : 'No visited members found'}
          description={data && data.length > 0 ? 'Try adjusting your search terms' : 'Start visiting members to see them here'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell header>Name</TableCell>
              <TableCell header>Phone</TableCell>
              <TableCell header>Status</TableCell>
              <TableCell header>Last Visited</TableCell>
              <TableCell header>Days Ago</TableCell>
              <TableCell header>Total Visits</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => {
              const daysSince = getDaysSince(item.lastVisited);
              return (
                <TableRow key={item.member.id}>
                  <TableCell className="font-medium text-text-primary-light dark:text-text-primary-dark">
                    {item.member.fullName || `${item.member.firstName} ${item.member.lastName}`}
                  </TableCell>
                  <TableCell>
                    {item.member.phone || '-'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(
                        item.member.status
                      )}`}
                    >
                      {item.member.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatDate(item.lastVisited)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${getRecencyColor(daysSince)}`}
                    >
                      {daysSince} days
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.member.visitsCount || 0}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default VisitedMembersView;
