/**
 * Admin Quick Views Page
 * Requirements: 19.1-19.7
 * Pre-configured views for common admin tasks
 */

import { useState, useCallback, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import { useLiveMode } from '../../hooks/useLiveMode';
import { churchApi } from '../../services/church-api';
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
import type { AdminViewType, AdminViewConfig } from '../../types';

const ADMIN_VIEWS: AdminViewConfig[] = [
  { id: 'follow-ups-due', label: "Today's Follow-ups Due", description: 'Follow-up assignments due today' },
  { id: 'new-first-timers', label: 'New First Timers', description: 'First timers from the last 30 days' },
  { id: 'incomplete-evangelism', label: 'Incomplete Evangelism', description: 'Evangelism records with missing data' },
  { id: 'no-follow-up-owner', label: 'No Follow-up Owner', description: 'Members without assigned follow-up' },
  { id: 'visited-members', label: 'Visited Members', description: 'Members who have been visited' },
  { id: 'department-lists', label: 'Department Lists', description: 'Active members by department' },
  { id: 'attendance-by-service', label: 'Attendance by Service', description: 'Attendance grouped by department' },
];

function AdminViews() {
  const [activeView, setActiveView] = useState<AdminViewType>('follow-ups-due');

  const todaysFollowUps = useApi(
    () => churchApi.admin.getTodaysFollowUps(),
    { immediate: activeView === 'follow-ups-due' }
  );
  const newFirstTimers = useApi(
    () => churchApi.admin.getNewFirstTimers(30),
    { immediate: activeView === 'new-first-timers' }
  );
  const incompleteEvangelism = useApi(
    () => churchApi.admin.getIncompleteEvangelism(),
    { immediate: activeView === 'incomplete-evangelism' }
  );
  const unassignedMembers = useApi(
    () => churchApi.admin.getUnassignedMembers(),
    { immediate: activeView === 'no-follow-up-owner' }
  );
  const visitedMembers = useApi(
    () => churchApi.admin.getVisitedMembers(),
    { immediate: activeView === 'visited-members' }
  );
  const departmentRosters = useApi(
    () => churchApi.admin.getDepartmentRosters(),
    { immediate: activeView === 'department-lists' }
  );
  const services = useApi(
    () => churchApi.services.getRecent(20),
    { immediate: activeView === 'attendance-by-service' }
  );

  const refreshCurrentView = useCallback(async () => {
    switch (activeView) {
      case 'follow-ups-due': await todaysFollowUps.refresh(); break;
      case 'new-first-timers': await newFirstTimers.refresh(); break;
      case 'incomplete-evangelism': await incompleteEvangelism.refresh(); break;
      case 'no-follow-up-owner': await unassignedMembers.refresh(); break;
      case 'visited-members': await visitedMembers.refresh(); break;
      case 'department-lists': await departmentRosters.refresh(); break;
      case 'attendance-by-service': await services.refresh(); break;
    }
  }, [activeView, todaysFollowUps, newFirstTimers, incompleteEvangelism, unassignedMembers, visitedMembers, departmentRosters, services]);

  const { isLive, toggleLive } = useLiveMode({ interval: 30000, onRefresh: refreshCurrentView });

  const handleViewChange = useCallback((viewId: AdminViewType) => {
    setActiveView(viewId);
    switch (viewId) {
      case 'follow-ups-due': if (!todaysFollowUps.data) todaysFollowUps.execute(); break;
      case 'new-first-timers': if (!newFirstTimers.data) newFirstTimers.execute(); break;
      case 'incomplete-evangelism': if (!incompleteEvangelism.data) incompleteEvangelism.execute(); break;
      case 'no-follow-up-owner': if (!unassignedMembers.data) unassignedMembers.execute(); break;
      case 'visited-members': if (!visitedMembers.data) visitedMembers.execute(); break;
      case 'department-lists': if (!departmentRosters.data) departmentRosters.execute(); break;
      case 'attendance-by-service': if (!services.data) services.execute(); break;
    }
  }, [todaysFollowUps, newFirstTimers, incompleteEvangelism, unassignedMembers, visitedMembers, departmentRosters, services]);

  const lastUpdated = useMemo(() => {
    switch (activeView) {
      case 'follow-ups-due': return todaysFollowUps.lastUpdated;
      case 'new-first-timers': return newFirstTimers.lastUpdated;
      case 'incomplete-evangelism': return incompleteEvangelism.lastUpdated;
      case 'no-follow-up-owner': return unassignedMembers.lastUpdated;
      case 'visited-members': return visitedMembers.lastUpdated;
      case 'department-lists': return departmentRosters.lastUpdated;
      case 'attendance-by-service': return services.lastUpdated;
      default: return null;
    }
  }, [activeView, todaysFollowUps.lastUpdated, newFirstTimers.lastUpdated, incompleteEvangelism.lastUpdated, unassignedMembers.lastUpdated, visitedMembers.lastUpdated, departmentRosters.lastUpdated, services.lastUpdated]);

  const isLoading = useMemo(() => {
    switch (activeView) {
      case 'follow-ups-due': return todaysFollowUps.isLoading;
      case 'new-first-timers': return newFirstTimers.isLoading;
      case 'incomplete-evangelism': return incompleteEvangelism.isLoading;
      case 'no-follow-up-owner': return unassignedMembers.isLoading;
      case 'visited-members': return visitedMembers.isLoading;
      case 'department-lists': return departmentRosters.isLoading;
      case 'attendance-by-service': return services.isLoading;
      default: return false;
    }
  }, [activeView, todaysFollowUps.isLoading, newFirstTimers.isLoading, incompleteEvangelism.isLoading, unassignedMembers.isLoading, visitedMembers.isLoading, departmentRosters.isLoading, services.isLoading]);

  const renderViewContent = () => {
    switch (activeView) {
      case 'follow-ups-due':
        return <TodaysFollowUpsView data={todaysFollowUps.data} isLoading={todaysFollowUps.isLoading} />;
      case 'new-first-timers':
        return <NewFirstTimersView data={newFirstTimers.data} isLoading={newFirstTimers.isLoading} />;
      case 'incomplete-evangelism':
        return <IncompleteEvangelismView data={incompleteEvangelism.data} isLoading={incompleteEvangelism.isLoading} />;
      case 'no-follow-up-owner':
        return <NoFollowUpOwnerView data={unassignedMembers.data} isLoading={unassignedMembers.isLoading} />;
      case 'visited-members':
        return <VisitedMembersView data={visitedMembers.data} isLoading={visitedMembers.isLoading} />;
      case 'department-lists':
        return <DepartmentListsView data={departmentRosters.data} isLoading={departmentRosters.isLoading} />;
      case 'attendance-by-service':
        return <AttendanceByServiceView services={services.data} isLoadingServices={services.isLoading} />;
      default:
        return null;
    }
  };

  const activeViewConfig = ADMIN_VIEWS.find((v) => v.id === activeView);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Quick Views</h1>
          <p className="text-gray-600">Pre-configured views for common admin tasks</p>
        </div>
        <DataRefreshControls
          lastUpdated={lastUpdated}
          isLoading={isLoading}
          isLive={isLive}
          onToggleLive={toggleLive}
          onRefresh={refreshCurrentView}
          showLiveIndicator={true}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-2">
          {ADMIN_VIEWS.map((view) => (
            <button
              key={view.id}
              onClick={() => handleViewChange(view.id)}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                activeView === view.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">{activeViewConfig?.label}</h2>
        <p className="text-gray-500 mb-4">{activeViewConfig?.description}</p>
        {renderViewContent()}
      </div>
    </div>
  );
}

export default AdminViews;
