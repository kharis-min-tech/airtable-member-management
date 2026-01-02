import { useState, useCallback, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import { useLiveMode } from '../../hooks/useLiveMode';
import { churchApi } from '../../services/church-api';
import { DualServiceSelector, MissingMembersList } from '../../components/attendance';
import { DataRefreshControls } from '../../components/common';
import type { Service, ServiceComparison, Member } from '../../types';

function MissingMembers() {
  // State for selected services
  const [serviceAId, setServiceAId] = useState<string | null>(null);
  const [serviceBId, setServiceBId] = useState<string | null>(null);
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
        serviceAId && serviceBId
          ? churchApi.attendance.compareServices(serviceAId, serviceBId)
          : Promise.resolve({
              data: null as unknown as ServiceComparison,
              lastUpdated: new Date(),
              cached: false,
            }),
      [serviceAId, serviceBId]
    ),
    { immediate: !!(serviceAId && serviceBId) }
  );

  // Refresh all data
  const refreshAll = useCallback(async () => {
    if (serviceAId && serviceBId) {
      await refreshComparison();
    }
  }, [serviceAId, serviceBId, refreshComparison]);

  // Live mode
  const { isLive, toggleLive } = useLiveMode({
    interval: 30000,
    onRefresh: refreshAll,
  });

  // Get service objects from IDs
  const serviceA = useMemo(
    () => services?.find((s) => s.id === serviceAId) || null,
    [services, serviceAId]
  );
  const serviceB = useMemo(
    () => services?.find((s) => s.id === serviceBId) || null,
    [services, serviceBId]
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

  // Filtered member lists
  const filteredMissingInB = useMemo(
    () => filterMembers(comparison?.presentInAMissingInB || []),
    [comparison, filterMembers]
  );
  const filteredMissingInA = useMemo(
    () => filterMembers(comparison?.presentInBMissingInA || []),
    [comparison, filterMembers]
  );

  // Export functionality
  const handleExport = useCallback(() => {
    if (!comparison || !serviceA || !serviceB) return;

    const formatDate = (date: Date | string) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-GB');
    };

    // Build CSV content
    const lines: string[] = [];
    lines.push('Missing Members Comparison Report');
    lines.push(`Generated: ${new Date().toLocaleString('en-GB')}`);
    lines.push(`Service A: ${serviceA.serviceName} - ${formatDate(serviceA.serviceDate)}`);
    lines.push(`Service B: ${serviceB.serviceName} - ${formatDate(serviceB.serviceDate)}`);
    lines.push('');

    // Present in A, Missing in B
    lines.push(`"Present in Service A, Missing from Service B (${filteredMissingInB.length} members)"`);
    lines.push('Full Name,Phone,Email,Status,Follow-up Owner');
    filteredMissingInB.forEach((member) => {
      lines.push(
        `"${member.fullName}","${member.phone || ''}","${member.email || ''}","${member.status}","${member.followUpOwner || ''}"`
      );
    });
    lines.push('');

    // Present in B, Missing in A
    lines.push(`"Present in Service B, Missing from Service A (${filteredMissingInA.length} members)"`);
    lines.push('Full Name,Phone,Email,Status,Follow-up Owner');
    filteredMissingInA.forEach((member) => {
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
      `missing-members-${formatDate(serviceA.serviceDate)}-vs-${formatDate(serviceB.serviceDate)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [comparison, serviceA, serviceB, filteredMissingInB, filteredMissingInA]);

  const canCompare = serviceAId && serviceBId;
  const hasResults = comparison && (comparison.presentInAMissingInB.length > 0 || comparison.presentInBMissingInA.length > 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Missing Members List</h1>
          <p className="text-gray-600">Compare attendance between two services</p>
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

      {/* Dual service selector */}
      <DualServiceSelector
        services={services || []}
        serviceAId={serviceAId}
        serviceBId={serviceBId}
        onServiceAChange={setServiceAId}
        onServiceBChange={setServiceBId}
        isLoading={isLoadingServices}
      />

      {/* Filters */}
      {canCompare && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                Filter by Status:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="Member">Member</option>
                <option value="First Timer">First Timer</option>
                <option value="Returner">Returner</option>
                <option value="Evangelism Contact">Evangelism Contact</option>
              </select>
            </div>
            {/* Department filter placeholder - would need department data */}
            <div className="flex items-center gap-2">
              <label htmlFor="department-filter" className="text-sm font-medium text-gray-700">
                Filter by Department:
              </label>
              <select
                id="department-filter"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Departments</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Comparison results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MissingMembersList
          title="Present in A, Missing in B"
          serviceFrom={serviceA}
          serviceTo={serviceB}
          members={filteredMissingInB}
          isLoading={!!(isLoadingComparison && canCompare)}
        />
        <MissingMembersList
          title="Present in B, Missing in A"
          serviceFrom={serviceB}
          serviceTo={serviceA}
          members={filteredMissingInA}
          isLoading={!!(isLoadingComparison && canCompare)}
        />
      </div>

      {/* Export button */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={!hasResults}
          className={`px-4 py-2 rounded-md transition-colors ${
            hasResults
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Export Missing Members
        </button>
      </div>
    </div>
  );
}

export default MissingMembers;
