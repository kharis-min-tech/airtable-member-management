/**
 * Attendance by Service View
 * Requirements: 19.7
 * Shows Attendance grouped first by Service then by Department
 */

import { useMemo, useState, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { churchApi } from '../../services/church-api';
import { Select } from '../tailus-ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../tailus-ui/Table';
import { Card } from '../tailus-ui/Card';
import { EmptyState } from '../common/EmptyState';
import type { Service, AttendanceByDepartment } from '../../types';

interface AttendanceByServiceViewProps {
  services: Service[] | null;
  isLoadingServices?: boolean;
}

function AttendanceByServiceView({ services, isLoadingServices = false }: AttendanceByServiceViewProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());

  const attendanceData = useApi<AttendanceByDepartment>(
    useCallback(() => churchApi.admin.getAttendanceByDepartment(selectedServiceId), [selectedServiceId]),
    { immediate: false }
  );

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setExpandedDepartments(new Set());
    if (serviceId) {
      attendanceData.execute();
    }
  };

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

  const totalAttendees = useMemo(() => {
    if (!attendanceData.data?.departments) return 0;
    return attendanceData.data.departments.reduce((sum, dept) => sum + dept.attendees.length, 0);
  }, [attendanceData.data]);

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

  const serviceOptions = [
    { value: '', label: 'Select a service...' },
    ...(services?.map((service) => ({
      value: service.id,
      label: `${service.serviceName} - ${formatDate(service.serviceDate)}`,
    })) || []),
  ];

  if (isLoadingServices) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
        <div className="animate-pulse h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Service selector */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Select
            options={serviceOptions}
            value={selectedServiceId}
            onChange={(e) => handleServiceChange(e.target.value)}
          />
        </div>
        {selectedServiceId && attendanceData.data && (
          <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            {attendanceData.data.departments?.length || 0} departments, {totalAttendees} attendees
          </span>
        )}
      </div>

      {/* Content */}
      {!selectedServiceId ? (
        <EmptyState
          title="Select a service to view attendance"
          description="Choose a service from the dropdown above to see attendance by department"
        />
      ) : attendanceData.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      ) : attendanceData.error ? (
        <div className="text-center py-12 text-red-500 dark:text-red-400">
          Error loading attendance data: {attendanceData.error}
        </div>
      ) : !attendanceData.data?.departments || attendanceData.data.departments.length === 0 ? (
        <EmptyState
          title="No attendance data found"
          description="No attendance records exist for this service"
        />
      ) : (
        <div className="space-y-4">
          {/* Service summary */}
          <Card variant="outlined" className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
            <h3 className="font-medium text-primary dark:text-primary-light">{attendanceData.data.serviceName}</h3>
            <p className="text-sm text-primary/80 dark:text-primary-light/80 mt-1">
              Total attendees across all departments: {totalAttendees}
            </p>
          </Card>

          {/* Department breakdown */}
          <div className="space-y-2">
            {attendanceData.data.departments.map((dept) => (
              <Card key={dept.departmentId} variant="outlined" className="p-0 overflow-hidden">
                <button
                  onClick={() => toggleDepartment(dept.departmentId)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <span className="text-green-600 dark:text-green-400 font-semibold text-sm">
                        {dept.departmentName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-text-primary-light dark:text-text-primary-dark">{dept.departmentName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm font-medium px-2.5 py-0.5 rounded">
                      {dept.attendees.length} present
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
                    {dept.attendees.length === 0 ? (
                      <div className="p-4 text-center text-text-secondary-light dark:text-text-secondary-dark">No attendees from this department</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableCell header>Name</TableCell>
                            <TableCell header>Phone</TableCell>
                            <TableCell header>Status</TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dept.attendees.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium text-text-primary-light dark:text-text-primary-dark">
                                {member.fullName || `${member.firstName} ${member.lastName}`}
                              </TableCell>
                              <TableCell>{member.phone || '-'}</TableCell>
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
        </div>
      )}
    </div>
  );
}

export default AttendanceByServiceView;
