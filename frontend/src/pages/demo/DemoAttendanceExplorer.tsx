/**
 * Demo Attendance Explorer Page
 * Requirements: 6.1, 6.5
 * - Use mock data for attendance breakdown
 * - Include drill-down functionality with mock members
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ServiceSelectorCard,
  DepartmentBreakdownCard,
} from '../../components/attendance';
import { AttendanceDrillDownModal } from '../../components/dashboard';
import { DataRefreshControls } from '../../components/common';
import {
  mockServices,
  getMockAttendanceBreakdown,
  getMockDepartmentAttendance,
  getMockServiceAttendees,
} from '../../data/mockData';
import type { ServiceAttendee } from '../../types';

type AttendanceCategory = 'firstTimers' | 'returners' | 'evangelismContacts' | string;

function DemoAttendanceExplorer() {
  const navigate = useNavigate();
  
  // State for selected service
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  
  // State for drill-down modal
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownCategory, setDrillDownCategory] = useState<AttendanceCategory>('firstTimers');
  const [drillDownMembers, setDrillDownMembers] = useState<ServiceAttendee[]>([]);

  // Get mock data based on selected service
  const attendanceBreakdown = useMemo(
    () => (selectedServiceId ? getMockAttendanceBreakdown(selectedServiceId) : null),
    [selectedServiceId]
  );

  const departmentAttendance = useMemo(
    () => (selectedServiceId ? getMockDepartmentAttendance(selectedServiceId) : null),
    [selectedServiceId]
  );

  const selectedService = useMemo(
    () => mockServices.find((s) => s.id === selectedServiceId) || null,
    [selectedServiceId]
  );

  // Handle service selection
  const handleServiceChange = useCallback((serviceId: string) => {
    setSelectedServiceId(serviceId || null);
  }, []);

  // Handle drill-down click
  const handleDrillDown = useCallback(
    (category: AttendanceCategory) => {
      if (!selectedServiceId) return;
      
      const members = getMockServiceAttendees(selectedServiceId, category);
      setDrillDownCategory(category);
      setDrillDownMembers(members);
      setDrillDownOpen(true);
    },
    [selectedServiceId]
  );

  // Handle member click in drill-down
  const handleMemberClick = useCallback(
    (memberId: string) => {
      setDrillDownOpen(false);
      navigate(`/demo/members/${memberId}`);
    },
    [navigate]
  );

  // Handle refresh (demo - just shows alert)
  const handleRefresh = useCallback(() => {
    alert('Refresh clicked! In demo mode, data is static.');
  }, []);

  const lastUpdated = useMemo(() => new Date(), []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">Service Attendance Explorer</h1>
          <p className="text-text-secondary-light dark:text-text-secondary-dark">Explore attendance details for any service</p>
        </div>
        <DataRefreshControls
          lastUpdated={lastUpdated}
          isLoading={false}
          isLive={false}
          onToggleLive={() => alert('Live mode is not available in demo')}
          onRefresh={handleRefresh}
          disabled={!selectedServiceId}
          timestampFormat="time"
        />
      </div>

      {/* Service selector */}
      <ServiceSelectorCard
        services={mockServices}
        selectedServiceId={selectedServiceId}
        onServiceChange={handleServiceChange}
        isLoading={false}
      />

      {/* Attendees list with drill-down capability */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">Attendees</h2>
          {attendanceBreakdown && (
            <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{attendanceBreakdown.serviceName}</span>
          )}
        </div>

        {!attendanceBreakdown ? (
          <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500">
            Select a service to view attendees
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DrillDownStatBox
              label="Total Attendance"
              value={attendanceBreakdown.totalAttendance}
              color="blue"
              onClick={() => {}}
              clickable={false}
            />
            <DrillDownStatBox
              label="First Timers"
              value={attendanceBreakdown.firstTimers}
              color="green"
              onClick={() => handleDrillDown('firstTimers')}
              clickable={true}
            />
            <DrillDownStatBox
              label="Returners"
              value={attendanceBreakdown.returners}
              color="purple"
              onClick={() => handleDrillDown('returners')}
              clickable={true}
            />
            <DrillDownStatBox
              label="Evangelism Contacts"
              value={attendanceBreakdown.evangelismContacts}
              color="orange"
              onClick={() => handleDrillDown('evangelismContacts')}
              clickable={true}
            />
          </div>
        )}

        {attendanceBreakdown && attendanceBreakdown.departments.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-3">By Department (click to drill down)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {attendanceBreakdown.departments.map((dept) => (
                <button
                  key={dept.departmentId}
                  onClick={() => handleDrillDown(dept.departmentName)}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-500 transition-colors text-left"
                >
                  <p className="text-lg font-bold text-primary dark:text-primary-light">{dept.count}</p>
                  <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{dept.departmentName}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Department breakdown */}
      <DepartmentBreakdownCard
        departments={departmentAttendance}
        isLoading={false}
        threshold={50}
      />

      {/* Drill-down modal */}
      <AttendanceDrillDownModal
        isOpen={drillDownOpen}
        onClose={() => setDrillDownOpen(false)}
        category={drillDownCategory as 'firstTimers' | 'returners' | 'evangelismContacts' | 'department'}
        categoryLabel={drillDownCategory === 'firstTimers' ? 'First Timers' : 
                       drillDownCategory === 'returners' ? 'Returners' : 
                       drillDownCategory === 'evangelismContacts' ? 'Evangelism Contacts' : 
                       drillDownCategory}
        serviceId={selectedServiceId || ''}
        serviceName={selectedService?.serviceName || ''}
        members={drillDownMembers.map((m) => ({
          id: m.id,
          fullName: m.fullName,
          phone: m.phone,
          email: m.email,
          status: m.status,
        }))}
        isLoading={false}
        onMemberClick={handleMemberClick}
      />
    </div>
  );
}

interface DrillDownStatBoxProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
  onClick: () => void;
  clickable: boolean;
}

function DrillDownStatBox({ label, value, color, onClick, clickable }: DrillDownStatBoxProps) {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
  };

  const hoverClasses = clickable
    ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-500'
    : '';

  return (
    <button
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors ${hoverClasses} ${
        !clickable ? 'cursor-default' : ''
      }`}
    >
      <p className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">{label}</p>
      {clickable && (
        <p className="text-xs text-primary dark:text-primary-light mt-1">Click to view</p>
      )}
    </button>
  );
}

export default DemoAttendanceExplorer;
