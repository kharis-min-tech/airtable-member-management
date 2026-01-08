import { useState, useCallback, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import { useLiveMode } from '../../hooks/useLiveMode';
import { churchApi } from '../../services/church-api';
import { DualServiceSelector, MissingMembersList } from '../../components/attendance';
import { DataRefreshControls } from '../../components/common';
import { Card } from '../../components/tailus-ui/Card';
import { Select } from '../../components/tailus-ui/Select';
import { Button } from '../../components/tailus-ui/Button';
import type { Service, ServiceComparison, Member } from '../../types';

function MissingMembers() {
  // State for selected services
  const [referenceServiceId, setReferenceServiceId] = useState<string | null>(null);
  const [comparisonServiceId, setComparisonServiceId] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Fetch services
  const {
    data: services,
    isLoading: isLoadingServices,
    lastUpdated,
  } = useApi<Service[]>(() => churchApi.services.getRecent(30), { immediate: true });

  // Fetch comparison data when both services are selected
  const {
    data: comparison,
    isLoading: isLoadingComparison,
    execute: refreshComparison,
  } = useApi<ServiceComparison>(
    useCallback(
      () =>
        referenceServiceId && comparisonServiceId
          ? churchApi.attendance.compareServices(referenceServiceId, comparisonServiceId)
          : Promise.resolve({
              data: null as unknown as ServiceComparison,
              lastUpdated: new Date(),
              cached: false,
            }),
      [referenceServiceId, comparisonServiceId]
    ),
    { immediate: !!(referenceServiceId && comparisonServiceId) }
  );

  // Refresh all data
  const refreshAll = useCallback(async () => {
    if (referenceServiceId && comparisonServiceId) {
      await refreshComparison();
    }
  }, [referenceServiceId, comparisonServiceId, refreshComparison]);

  // Live mode
  const { isLive, toggleLive } = useLiveMode({
    interval: 30000,
    onRefresh: refreshAll,
  });

  // Get service objects from IDs
  const referenceService = useMemo(
    () => services?.find((s) => s.id === referenceServiceId) || null,
    [services, referenceServiceId]
  );
  const comparisonService = useMemo(
    () => services?.find((s) => s.id === comparisonServiceId) || null,
    [services, comparisonServiceId]
  );

  // Filter members based on department and status
  const filterMembers = useCallback(
    (members: Member[]): Member[] => {
      return members.filter((member) => {
        if (statusFilter && member.status !== statusFilter) {
          return false;
        }
        // Note: Department filtering would require department data on members
        // For now, we'll skip department filtering as it's not in the Member type
        return true;
      });
    },
    [statusFilter]
  );

  // Filtered member list - only unidirectional (present in reference, missing in comparison)
  const filteredMissingMembers = useMemo(
    () => filterMembers(Array.isArray(comparison?.presentInAMissingInB) ? comparison.presentInAMissingInB : []),
    [comparison, filterMembers]
  );

  // Export functionality - only exports unidirectional comparison
  const handleExport = useCallback(() => {
    if (!comparison || !referenceService || !comparisonService || !Array.isArray(comparison.presentInAMissingInB)) return;

    const formatDate = (date: Date | string) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-GB');
    };

    const formatServiceLabel = (service: Service) => 
      `${service.serviceName} - ${formatDate(service.serviceDate)}`;

    // Build CSV content
    const lines: string[] = [];
    lines.push('Missing Members Report');
    lines.push(`Generated: ${new Date().toLocaleString('en-GB')}`);
    lines.push(`Reference Service: ${formatServiceLabel(referenceService)}`);
    lines.push(`Comparison Service: ${formatServiceLabel(comparisonService)}`);
    lines.push('');
    lines.push(`Members who attended ${referenceService.serviceName} but missed ${comparisonService.serviceName} (${filteredMissingMembers.length} members)`);
    lines.push('');
    lines.push('Full Name,Phone,Email,Status,Follow-up Owner');
    filteredMissingMembers.forEach((member) => {
      lines.push(
        `"${member.fullName}","${member.phone || ''}","${member.email || ''}","${member.status}","${member.followUpOwner || ''}"`
      );
    });

    // Create and download file
    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `missing-members-${formatDate(referenceService.serviceDate)}-vs-${formatDate(comparisonService.serviceDate)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [comparison, referenceService, comparisonService, filteredMissingMembers]);

  const canCompare = referenceServiceId && comparisonServiceId;
  const hasResults = comparison && Array.isArray(comparison.presentInAMissingInB) && comparison.presentInAMissingInB.length > 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">Missing Members</h1>
          <p className="text-text-secondary-light dark:text-text-secondary-dark">
            Find members who attended one service but missed another
          </p>
        </div>
        <DataRefreshControls
          lastUpdated={lastUpdated}
          isLoading={isLoadingServices || isLoadingComparison}
          isLive={isLive}
          onToggleLive={toggleLive}
          onRefresh={refreshAll}
          disabled={!canCompare}
          timestampFormat="time"
        />
      </div>

      {/* Dual service selector with updated labels */}
      <DualServiceSelector
        services={services || []}
        serviceAId={referenceServiceId}
        serviceBId={comparisonServiceId}
        onServiceAChange={setReferenceServiceId}
        onServiceBChange={setComparisonServiceId}
        isLoading={isLoadingServices}
        labelA="Reference Service"
        labelB="Comparison Service"
        helperText="Select a Reference Service and a Comparison Service. The results will show members who attended the Reference Service but missed the Comparison Service."
      />

      {/* Filters */}
      {canCompare && (
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-48">
              <Select
                id="status-filter"
                label="Filter by Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="All Statuses"
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'Member', label: 'Member' },
                  { value: 'First Timer', label: 'First Timer' },
                  { value: 'Returner', label: 'Returner' },
                  { value: 'Evangelism Contact', label: 'Evangelism Contact' },
                ]}
              />
            </div>
            {/* Department filter placeholder - would need department data */}
            <div className="w-48">
              <Select
                id="department-filter"
                label="Filter by Department"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                placeholder="All Departments"
                options={[
                  { value: '', label: 'All Departments' },
                ]}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Comparison result - single unidirectional list */}
      <MissingMembersList
        title={
          referenceService && comparisonService
            ? `Members who attended ${referenceService.serviceName} but missed ${comparisonService.serviceName}`
            : 'Missing Members'
        }
        serviceFrom={referenceService}
        serviceTo={comparisonService}
        members={filteredMissingMembers}
        isLoading={!!(isLoadingComparison && canCompare)}
      />

      {/* Export button */}
      <div className="flex justify-end">
        <Button
          onClick={handleExport}
          disabled={!hasResults}
          variant="primary"
          className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
        >
          Export Missing Members
        </Button>
      </div>
    </div>
  );
}

export default MissingMembers;
