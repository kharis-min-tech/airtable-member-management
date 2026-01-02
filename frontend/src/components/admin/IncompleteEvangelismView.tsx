/**
 * Incomplete Evangelism Records View
 * Requirements: 19.3
 * Shows Evangelism records where Data Completeness formula indicates missing required fields
 */

import { useMemo, useState } from 'react';
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
    if (completeness >= 80) return 'bg-green-100 text-green-800';
    if (completeness >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getMissingFields = (record: EvangelismRecord) => {
    const missing: string[] = [];
    if (!record.firstName) missing.push('First Name');
    if (!record.lastName) missing.push('Last Name');
    if (!record.phone) missing.push('Phone');
    if (!record.email) missing.push('Email');
    return missing;
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
          placeholder="Search by name, phone, email, or captured by..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-500">
          {filteredData.length} records with incomplete data
        </span>
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {data && data.length > 0
            ? 'No records match your search'
            : 'No incomplete evangelism records found'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Captured By
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Completeness
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Missing Fields
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((record) => {
                const missingFields = getMissingFields(record);
                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {record.firstName || record.lastName
                        ? `${record.firstName || ''} ${record.lastName || ''}`.trim()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.phone || <span className="text-red-500">Missing</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.email || <span className="text-red-500">Missing</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.capturedByName || record.capturedBy || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${getCompletenessColor(
                          record.dataCompleteness
                        )}`}
                      >
                        {record.dataCompleteness}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {missingFields.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {missingFields.map((field) => (
                            <span
                              key={field}
                              className="bg-red-50 text-red-600 text-xs px-1.5 py-0.5 rounded"
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default IncompleteEvangelismView;
