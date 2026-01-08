/**
 * Demo Admin Views Page
 * Requirements: 6.1, 6.5
 * - Use mock data for admin quick views
 * - Include all admin view types
 */

import { useState, useCallback, useMemo } from 'react';
import { DataRefreshControls } from '../../components/common';
import {
  TodaysFollowUpsView,
  NewFirstTimersView,
  IncompleteEvangelismView,
  NoFollowUpOwnerView,
  VisitedMembersView,
  DepartmentListsView,
  AttendanceByServiceView,
} from '../../components/admin';
import {
  mockTodaysFollowUps,
  mockNewFirstTimers,
  mockIncompleteEvangelism,
  mockUnassignedMembers,
  mockVisitedMembers,
  mockDepartmentRosters,
  mockServices,
} from '../../data/mockData';
import type { AdminViewType, AdminViewConfig } from '../../types';

const ADMIN_VIEWS: AdminViewConfig[] = [
  {
    id: 'follow-ups-due',
    label: "Today's Follow-ups Due",
    description: 'Follow-up assignments due today',
  },
  {
    id: 'new-first-timers',
    label: 'New First Timers',
    description: 'First timers from the last 30 days',
  },
  {
    id: 'incomplete-evangelism',
    label: 'Incomplete Evangelism',
    description: 'Evangelism records with missing data',
  },
  {
    id: 'no-follow-up-owner',
    label: 'No Follow-up Owner',
    description: 'Members without assigned follow-up',
  },
  {
    id: 'visited-members',
    label: 'Visited Members',
    description: 'Members who have been visited',
  },
  {
    id: 'department-lists',
    label: 'Department Lists',
    description: 'Active members by department',
  },
  {
    id: 'attendance-by-service',
    label: 'Attendance by Service',
    description: 'Attendance grouped by department',
  },
];

function DemoAdminViews() {
  const [activeView, setActiveView] = useState<AdminViewType>('follow-ups-due');

  // Handle view change
  const handleViewChange = useCallback((viewId: AdminViewType) => {
    setActiveView(viewId);
  }, []);

  // Handle refresh (demo - just shows alert)
  const handleRefresh = useCallback(() => {
    alert('Refresh clicked! In demo mode, data is static.');
  }, []);

  const lastUpdated = useMemo(() => new Date(), []);

  // Render the active view content
  const renderViewContent = () => {
    switch (activeView) {
      case 'follow-ups-due':
        return <TodaysFollowUpsView data={mockTodaysFollowUps} isLoading={false} />;
      case 'new-first-timers':
        return <NewFirstTimersView data={mockNewFirstTimers} isLoading={false} />;
      case 'incomplete-evangelism':
        return <IncompleteEvangelismView data={mockIncompleteEvangelism} isLoading={false} />;
      case 'no-follow-up-owner':
        return <NoFollowUpOwnerView data={mockUnassignedMembers} isLoading={false} />;
      case 'visited-members':
        return <VisitedMembersView data={mockVisitedMembers} isLoading={false} />;
      case 'department-lists':
        return <DepartmentListsView data={mockDepartmentRosters} isLoading={false} />;
      case 'attendance-by-service':
        return <AttendanceByServiceView services={mockServices} isLoadingServices={false} />;
      default:
        return null;
    }
  };

  const activeViewConfig = ADMIN_VIEWS.find((v) => v.id === activeView);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">Admin Quick Views</h1>
          <p className="text-text-secondary-light dark:text-text-secondary-dark">Pre-configured views for common admin tasks</p>
        </div>
        <DataRefreshControls
          lastUpdated={lastUpdated}
          isLoading={false}
          isLive={false}
          onToggleLive={() => alert('Live mode is not available in demo')}
          onRefresh={handleRefresh}
          showLiveIndicator={true}
        />
      </div>

      {/* View selector tabs */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-2">
          {ADMIN_VIEWS.map((view) => (
            <button
              key={view.id}
              onClick={() => handleViewChange(view.id)}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                activeView === view.id
                  ? 'bg-primary dark:bg-primary-dark text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active view content */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
          {activeViewConfig?.label}
        </h2>
        <p className="text-text-secondary-light dark:text-text-secondary-dark mb-4">{activeViewConfig?.description}</p>
        {renderViewContent()}
      </div>
    </div>
  );
}

export default DemoAdminViews;
