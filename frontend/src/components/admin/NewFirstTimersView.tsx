/**
 * New First Timers View (last 1 month)
 * Requirements: 19.2
 * Shows Members with Status "First Timer" and Date First Captured within the last 30 days
 */

import { useMemo, useState } from 'react';
import { Input } from '../tailus-ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../tailus-ui/Table';
import { EmptyState } from '../common/EmptyState';
import type { Member } from '../../types';

interface NewFirstTimersViewProps {
  data: Member[] | null;
  isLoading?: boolean;
}

function NewFirstTimersView({ data, isLoading = false }: NewFirstTimersViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(
      (member) =>
        member.fullName?.toLowerCase().includes(term) ||
        member.firstName?.toLowerCase().includes(term) ||
        member.lastName?.toLowerCase().includes(term) ||
        member.phone?.includes(term) ||
        member.email?.toLowerCase().includes(term)
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
    const capturedDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - capturedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
          {filteredData.length} first timers in the last 30 days
        </span>
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <EmptyState
          title={data && data.length > 0 ? 'No first timers match your search' : 'No new first timers in the last 30 days'}
          description={data && data.length > 0 ? 'Try adjusting your search terms' : 'Check back later for new visitors'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell header>Name</TableCell>
              <TableCell header>Phone</TableCell>
              <TableCell header>Email</TableCell>
              <TableCell header>Date First Captured</TableCell>
              <TableCell header>Days Ago</TableCell>
              <TableCell header>Follow-up Status</TableCell>
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
                  {formatDate(member.dateFirstCaptured)}
                </TableCell>
                <TableCell>
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium px-2 py-1 rounded">
                    {getDaysSince(member.dateFirstCaptured)} days
                  </span>
                </TableCell>
                <TableCell>
                  {member.followUpStatus || 'Not Started'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default NewFirstTimersView;
