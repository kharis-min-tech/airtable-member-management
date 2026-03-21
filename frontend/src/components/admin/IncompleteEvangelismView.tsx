/**
 * Incomplete Evangelism Records View
 * Requirements: 19.3
 * Shows Evangelism records where Data Completeness formula indicates missing required fields
 */

import { useMemo, useState } from 'react';
import { Input } from '../tailus-ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../tailus-ui/Table';
import { EmptyState } from '../common/EmptyState';
import type { EvangelismRecord } from '../../types';

interface IncompleteEvangelismViewProps {
  data: EvangelismRecord[] | null;
  isLoading?: boolean;
}

function IncompleteEvangelismView({ data, isLoading = false }: IncompleteEvangelismViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(
      (record) =>
        record.firstName?.toLowerCase().includes(term) ||
        record.lastName?.toLowerCase().includes(term) ||
        record.phone?.includes(term) ||
        record.email?.toLowerCase().includes(term) ||
        record.capturedByName?.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getCompletenessColor = (completeness: number) => {
    if (completeness >= 80) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    if (completeness >= 50) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
  };

  const getMissingFields = (record: EvangelismRecord) => {
    const missing: string[] = [];
    if (!record.firstName) missing.push('First Name');
    if (!record.lastName) missing.push('Last Name');
    if (!record.phone) missing.push('Old Phone');
    if (!record.email) missing.push('Email');
    return missing;
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
            placeholder="Search by name, phone, email, or captured by..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
          {filteredData.length} records with incomplete data
        </span>
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <EmptyState
          title={data && data.length > 0 ? 'No records match your search' : 'No incomplete evangelism records found'}
          description={data && data.length > 0 ? 'Try adjusting your search terms' : 'All evangelism records are complete'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell header>Name</TableCell>
              <TableCell header>Phone</TableCell>
              <TableCell header>Email</TableCell>
              <TableCell header>Date</TableCell>
              <TableCell header>Captured By</TableCell>
              <TableCell header>Completeness</TableCell>
              <TableCell header>Missing Fields</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((record) => {
              const missingFields = getMissingFields(record);
              return (
                <TableRow key={record.id}>
                  <TableCell className="font-medium text-text-primary-light dark:text-text-primary-dark">
                    {record.firstName || record.lastName
                      ? `${record.firstName || ''} ${record.lastName || ''}`.trim()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {record.phone || <span className="text-red-500 dark:text-red-400">Missing</span>}
                  </TableCell>
                  <TableCell>
                    {record.email || <span className="text-red-500 dark:text-red-400">Missing</span>}
                  </TableCell>
                  <TableCell>
                    {formatDate(record.date)}
                  </TableCell>
                  <TableCell>
                    {record.capturedByName || record.capturedBy || '-'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${getCompletenessColor(
                        record.dataCompleteness
                      )}`}
                    >
                      {record.dataCompleteness}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {missingFields.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {missingFields.map((field) => (
                          <span
                            key={field}
                            className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs px-1.5 py-0.5 rounded"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
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

export default IncompleteEvangelismView;
