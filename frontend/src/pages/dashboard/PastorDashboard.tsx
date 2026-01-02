import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { useLiveMode } from '../../hooks/useLiveMode';
import { churchApi } from '../../services/church-api';
import {
  KPITilesSection,
  ServiceSelector,
  EvangelismStatsCard,
  AttendanceBreakdownChart,
  SoulsAssignedTable,
  FollowUpCommentsTable,
} from '../../components/dashboard';
import { DataRefreshControls } from '../../components/common';
import type { Service } from '../../types';

function PastorDashboard() {
  const { user } = useAuth();

  // State for selections
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [evangelismPeriod, setEvangelismPeriod] = useState<'week' | 'month'>('week');
  const [commentsDateRange, setCommentsDateRange] = useState(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return {
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    };
  });

  // Fetch services
  const {
    data: services,
    isLoading: isLoadingServices,
    lastUpdated,
  } = useApi<Service[]>(() => churchApi.services.getRecent(20), { immediate: true });

  // Fetch KPIs for selected service
  const {
    data: kpis,
    isLoading: isLoadingKPIs,
    execute: refreshKPIs,
  } = useApi(
    useCallback(
      () =>
        selectedServiceId
          ? churchApi.dashboard.getServiceKPIs(selectedServiceId)
          : Promise.resolve({ data: null, lastUpdated: new Date(), cached: false }),
      [selectedServiceId]
    ),
    { immediate: !!selectedServiceId }
  );

  // Fetch evangelism stats
  const {
    data: evangelismStats,
    isLoading: isLoadingEvangelism,
    execute: refreshEvangelism,
  } = useApi(
    useCallback(
      () => churchApi.dashboard.getEvangelismStats(evangelismPeriod),
      [evangelismPeriod]
    ),
    { immediate: true }
  );

  // Fetch souls assigned by volunteer
  const {
    data: soulsAssigned,
    isLoading: isLoadingSouls,
    execute: refreshSouls,
  } = useApi(() => churchApi.followUp.getSoulsAssignedByVolunteer(), { immediate: true });

  // Fetch follow-up interactions
  const {
    data: followUpComments,
    isLoading: isLoadingComments,
    execute: refreshComments,
  } = useApi(
    useCallback(
      () =>
        churchApi.followUp.getInteractions(
          commentsDateRange.startDate,
          commentsDateRange.endDate
        ),
      [commentsDateRange.startDate, commentsDateRange.endDate]
    ),
    { immediate: true }
  );

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshKPIs(),
      refreshEvangelism(),
      refreshSouls(),
      refreshComments(),
    ]);
  }, [refreshKPIs, refreshEvangelism, refreshSouls, refreshComments]);

  // Live mode
  const { isLive, toggleLive } = useLiveMode({
    interval: 30000,
    onRefresh: refreshAll,
  });

  // Handle service selection
  const handleServiceChange = useCallback((serviceId: string) => {
    setSelectedServiceId(serviceId || null);
  }, []);

  // Handle evangelism period change
  const handlePeriodChange = useCallback((period: 'week' | 'month') => {
    setEvangelismPeriod(period);
  }, []);

  // Handle comments date range change
  const handleCommentsDateRangeChange = useCallback(
    (startDate: string, endDate: string) => {
      setCommentsDateRange({ startDate, endDate });
    },
    []
  );

  // Format last updated time
  const isAnyLoading = isLoadingServices || isLoadingKPIs || isLoadingEvangelism || isLoadingSouls || isLoadingComments;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pastor Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.email}</p>
        </div>
        <DataRefreshControls
          lastUpdated={lastUpdated}
          isLoading={isAnyLoading}
          isLive={isLive}
          onToggleLive={toggleLive}
          onRefresh={refreshAll}
          timestampFormat="time"
        />
      </div>

      {/* Service selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <ServiceSelector
          services={services || []}
          selectedServiceId={selectedServiceId}
          onServiceChange={handleServiceChange}
          isLoading={isLoadingServices}
          label="Select Service for KPIs"
        />
      </div>

      {/* KPI Tiles */}
      <KPITilesSection
        kpis={kpis}
        evangelismStats={evangelismStats}
        isLoadingKPIs={isLoadingKPIs}
        isLoadingEvangelism={isLoadingEvangelism}
        evangelismPeriod={evangelismPeriod}
      />

      {/* Charts and Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceBreakdownChart kpis={kpis} isLoading={isLoadingKPIs} />
        <EvangelismStatsCard
          stats={evangelismStats}
          period={evangelismPeriod}
          onPeriodChange={handlePeriodChange}
          isLoading={isLoadingEvangelism}
        />
      </div>

      {/* Follow-up Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SoulsAssignedTable data={soulsAssigned} isLoading={isLoadingSouls} />
        <FollowUpCommentsTable
          data={followUpComments}
          isLoading={isLoadingComments}
          startDate={commentsDateRange.startDate}
          endDate={commentsDateRange.endDate}
          onDateRangeChange={handleCommentsDateRangeChange}
        />
      </div>
    </div>
  );
}

export default PastorDashboard;
