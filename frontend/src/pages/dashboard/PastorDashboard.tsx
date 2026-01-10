import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AttendanceDrillDownModal,
} from '../../components/dashboard';
import type { AttendanceCategory, DrillDownMember } from '../../components/dashboard';
import { DataRefreshControls } from '../../components/common';
import { Card } from '../../components/tailus-ui';
import type { Service } from '../../types';

function PastorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  // Drill-down modal state - Requirements: 3.1, 3.2
  const [drillDownModal, setDrillDownModal] = useState<{
    isOpen: boolean;
    category: AttendanceCategory;
    categoryLabel: string;
    departmentId?: string;
  }>({
    isOpen: false,
    category: 'firstTimers',
    categoryLabel: '',
    departmentId: undefined,
  });
  const [drillDownMembers, setDrillDownMembers] = useState<DrillDownMember[]>([]);
  const [isDrillDownLoading, setIsDrillDownLoading] = useState(false);

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

  /**
   * Handle category click for drill-down
   * Requirements: 3.1, 3.2
   */
  const handleCategoryClick = useCallback(
    async (category: AttendanceCategory, categoryLabel: string, departmentId?: string) => {
      if (!selectedServiceId) return;

      setDrillDownModal({
        isOpen: true,
        category,
        categoryLabel,
        departmentId,
      });
      setIsDrillDownLoading(true);
      setDrillDownMembers([]);

      try {
        const response = await churchApi.attendance.getAttendeesByCategory(
          selectedServiceId,
          category,
          departmentId
        );
        // Null-safe handling: ensure response.data is an array before setting state
        // Requirements: 2.2, 2.3, 2.4
        const safeMembers = Array.isArray(response?.data) ? response.data : [];
        setDrillDownMembers(safeMembers);
      } catch (error) {
        console.error('Failed to fetch attendees by category:', error);
        // Default to empty array on error - Requirements: 2.3
        setDrillDownMembers([]);
      } finally {
        setIsDrillDownLoading(false);
      }
    },
    [selectedServiceId]
  );

  /**
   * Handle closing the drill-down modal
   * Requirements: 3.6
   */
  const handleCloseDrillDown = useCallback(() => {
    setDrillDownModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  /**
   * Handle member click in drill-down modal
   * Requirements: 3.4
   */
  const handleMemberClick = useCallback(
    (memberId: string) => {
      navigate(`/members/${memberId}`);
    },
    [navigate]
  );

  // Get selected service name for modal
  const selectedServiceName = services?.find(s => s.id === selectedServiceId)?.serviceName || '';

  // Format last updated time
  const isAnyLoading = isLoadingServices || isLoadingKPIs || isLoadingEvangelism || isLoadingSouls || isLoadingComments;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">Pastor Dashboard</h1>
          <p className="text-text-secondary-light dark:text-text-secondary-dark">Welcome back, {user?.email}</p>
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
      <Card variant="default">
        <ServiceSelector
          services={services || []}
          selectedServiceId={selectedServiceId}
          onServiceChange={handleServiceChange}
          isLoading={isLoadingServices}
          label="Select Service for KPIs"
        />
      </Card>

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
        <AttendanceBreakdownChart 
          kpis={kpis} 
          isLoading={isLoadingKPIs}
          serviceId={selectedServiceId}
          onCategoryClick={handleCategoryClick}
        />
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

      {/* Attendance Drill-Down Modal - Requirements: 3.2, 3.3, 3.4, 3.5, 3.6 */}
      <AttendanceDrillDownModal
        isOpen={drillDownModal.isOpen}
        onClose={handleCloseDrillDown}
        category={drillDownModal.category}
        categoryLabel={drillDownModal.categoryLabel}
        serviceId={selectedServiceId || ''}
        serviceName={selectedServiceName}
        members={drillDownMembers}
        isLoading={isDrillDownLoading}
        onMemberClick={handleMemberClick}
      />
    </div>
  );
}

export default PastorDashboard;
