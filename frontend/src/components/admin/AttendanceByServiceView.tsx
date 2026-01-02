/**
 * Attendance by Service View
 * Requirements: 19.7
 * Shows Attendance grouped first by Service then by Department
 */

import { useMemo, useState, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { churchApi } from '../../services/church-api';
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

  if (isLoadingServices) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse h-10 bg-gray-200 rounded w-64"></div>
        <div className="animate-pulse h-48 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Service selector */}
      <div className="flex items-center gap-4">
        <select
          value={selectedServiceId}
          onChange={(e) => handleServiceChange(e.target.value)}
          className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a service...</option>
          {services?.map((service) => (
            <option key={service.id} value={service.id}>
              {service.serviceName} - {formatDate(service.serviceDate)}
            </option>
          ))}
        </select>
        {selectedServiceId && attendanceData.data && (
          <span className="text-sm text-gray-500">
            {attendanceData.data.departments?.length || 0} departments, {totalAttendees} attendees
          </span>
        )}
      </div>

      {/* Content */}
      {!selectedServiceId ? (
        <div className="h-48 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          Select a service to view attendance by department
        </div>
      ) : attendanceData.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : attendanceData.error ? (
        <div className="text-center py-12 text-red-500">
          Error loading attendance data: {attendanceData.error}
        </div>
      ) : !attendanceData.data?.departments || attendanceData.data.departments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No attendance data found for this service
        </div>
      ) : (
        <div className="space-y-4">
          {/* Service summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-800">{attendanceData.data.serviceName}</h3>
            <p className="text-sm text-blue-600 mt-1">
              Total attendees across all departments: {totalAttendees}
            </p>
          </div>

          {/* Department breakdown */}
          <div className="space-y-2">
            {attendanceData.data.departments.map((dept) => (
              <div key={dept.departmentId} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleDepartment(dept.departmentId)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-semibold text-sm">
                        {dept.departmentName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-gray-800">{dept.departmentName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
                      {dept.attendees.length} present
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
                    {dept.attendees.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No attendees from this department</div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {dept.attendees.map((member) => (
                            <tr key={member.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-800">
                                {member.fullName || `${member.firstName} ${member.lastName}`}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{member.phone || '-'}</td>
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
        </div>
      )}
    </div>
  );
}

export default AttendanceByServiceView;
