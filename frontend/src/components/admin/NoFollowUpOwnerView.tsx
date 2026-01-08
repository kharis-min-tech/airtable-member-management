/**
 * No Follow-up Owner Assigned View
 * Requirements: 19.4
 * Shows Members where Follow-up Owner is empty and Status is not "Member" or "Integrated"
 */

import { useMemo, useState } from 'react';
import { Input } from '../tailus-ui/Input';
import { Select } from '../tailus-ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../tailus-ui/Table';
import { EmptyState } from '../common/EmptyState';
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

  // Get unique statuses for filter
  const statuses = useMemo(() => {
    if (!data) return [];
    const uniqueStatuses = [...new Set(data.map((m) => m.status))];
    return uniqueStatuses.sort();
  }, [data]);

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    ...statuses.map((status) => ({ value: status, label: status })),
  ];

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
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
          {filteredData.length} members without follow-up owner
        </span>
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <EmptyState
          title={data && data.length > 0 ? 'No members match your filters' : 'All members have follow-up owners assigned'}
          description={data && data.length > 0 ? 'Try adjusting your search or filter' : 'Great job keeping everyone assigned!'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell header>Name</TableCell>
              <TableCell header>Phone</TableCell>
              <TableCell header>Email</TableCell>
              <TableCell header>Status</TableCell>
              <TableCell header>Source</TableCell>
              <TableCell header>Date First Captured</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium text-text-primary-light dark:text-text-primary-dark">
                  {member.fullName || `${member.firstName} ${member.lastName}`}
                </TableCell>
                <TableCell>
                  {member.phone || '-'}
                </TableCell>
                <TableCell>
                  {member.email || '-'}
                </TableCell>
                <TableCell>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(
                      member.status
                    )}`}
                  >
                    {member.status}
                  </span>
                </TableCell>
                <TableCell>
                  {member.source || '-'}
                </TableCell>
                <TableCell>
                  {formatDate(member.dateFirstCaptured)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default NoFollowUpOwnerView;
