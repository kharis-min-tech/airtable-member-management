import { useState, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useLiveMode } from '../../hooks/useLiveMode';
import { churchApi } from '../../services/church-api';
import {
  ServiceSelectorCard,
  AttendeesListCard,
  DepartmentBreakdownCard,
} from '../../components/attendance';
import { DataRefreshControls } from '../../components/common';
import type { Service, AttendanceBreakdown, DepartmentAttendance } from '../../types';

function AttendanceExplorer() {
  // State for selected service
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  // Fetch services
  const {
    data: services,
    isLoading: isLoadingServices,
    lastUpdated,
  } = useApi<Service[]>(() => churchApi.services.getRecent(20), { immediate: true });

  // Fetch attendance breakdown for selected service
  const {
    data: attendanceBreakdown,
    isLoading: isLoadingBreakdown,
    execute: refreshBreakdown,
  } = useApi<AttendanceBreakdown>(
    useCallback(
      () =>
        selectedServiceId
          ? churchApi.attendance.getServiceAttendance(selectedServiceId)
          : Promise.resolve({ data: null as unknown as AttendanceBreakdown, lastUpdated: new Date(), cached: false }),
      [selectedServiceId]
    ),
    { immediate: !!selectedServiceId }
  );

  // Fetch department attendance for selected service
  const {
    data: departmentAttendance,
    isLoading: isLoadingDepartments,
    execute: refreshDepartments,
  } = useApi<DepartmentAttendance[]>(
    useCallback(
      () =>
        selectedServiceId
          ? churchApi.attendance.getDepartmentAttendance(selectedServiceId)
          : Promise.resolve({ data: null as unknown as DepartmentAttendance[], lastUpdated: new Date(), cached: false }),
      [selectedServiceId]
    ),
    { immediate: !!selectedServiceId }
  );

  // Refresh all data
  const refreshAll = useCallback(async () => {
    if (selectedServiceId) {
      await Promise.all([refreshBreakdown(), refreshDepartments()]);
    }
  }, [selectedServiceId, refreshBreakdown, refreshDepartments]);

  // Live mode
  const { isLive, toggleLive } = useLiveMode({
    interval: 30000,
    onRefresh: refreshAll,
  });

  // Handle service selection
  const handleServiceChange = useCallback((serviceId: string) => {
    setSelectedServiceId(serviceId || null);
  }, []);

  const isAnyLoading = isLoadingServices || isLoadingBreakdown || isLoadingDepartments;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Service Attendance Explorer</h1>
          <p className="text-gray-600">Explore attendance details for any service</p>
        </div>
        <DataRefreshControls
          lastUpdated={lastUpdated}
          isLoading={isAnyLoading}
          isLive={isLive}
          onToggleLive={toggleLive}
          onRefresh={refreshAll}
          disabled={!selectedServiceId}
          timestampFormat="time"
        />
      </div>

      {/* Service selector */}
      <ServiceSelectorCard
        services={services || []}
        selectedServiceId={selectedServiceId}
        onServiceChange={handleServiceChange}
        isLoading={isLoadingServices}
      />

      {/* Attendees list */}
      <AttendeesListCard
        breakdown={attendanceBreakdown}
        isLoading={isLoadingBreakdown && !!selectedServiceId}
      />

      {/* Department breakdown */}
      <DepartmentBreakdownCard
        departments={departmentAttendance}
        isLoading={isLoadingDepartments && !!selectedServiceId}
        threshold={50}
      />
    </div>
  );
}

export default AttendanceExplorer;
