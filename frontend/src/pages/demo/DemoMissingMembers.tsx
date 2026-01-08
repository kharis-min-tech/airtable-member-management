/**
 * Demo Missing Members Page
 * Requirements: 6.1, 6.5
 * - Use mock data for service comparison
 * - Show unidirectional comparison with mock members
 */

import { useState, useCallback, useMemo } from 'react';
import { DualServiceSelector, MissingMembersList } from '../../components/attendance';
import { DataRefreshControls } from '../../components/common';
import { mockServices, getMockServiceComparison } from '../../data/mockData';
import type { Member, Service } from '../../types';

function DemoMissingMembers() {
  // State for selected services
  const [referenceServiceId, setReferenceServiceId] = useState<string | null>(null);
  const [comparisonServiceId, setComparisonServiceId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Get mock comparison data
  const comparison = useMemo(() => {
    if (!referenceServiceId || !comparisonServiceId) return null;
    return getMockServiceComparison(referenceServiceId, comparisonServiceId);
  }, [referenceServiceId, comparisonServiceId]);

  // Get service objects from IDs
  const referenceService = useMemo(
    () => mockServices.find((s) => s.id === referenceServiceId) || null,
    [referenceServiceId]
  );
  const comparisonService = useMemo(
    () => mockServices.find((s) => s.id === comparisonServiceId) || null,
    [comparisonServiceId]
  );

  // Filter members based on status
  const filterMembers = useCallback(
    (members: Member[]): Member[] => {
      if (!statusFilter) return members;
      return members.filter((member) => member.status === statusFilter);
    },
    [statusFilter]
  );

  // Filtered member list - only unidirectional (present in reference, missing in comparison)
  const filteredMissingMembers = useMemo(
    () => filterMembers(comparison?.presentInAMissingInB || []),
    [comparison, filterMembers]
  );

  // Export functionality
  const handleExport = useCallback(() => {
    if (!comparison || !referenceService || !comparisonService) return;

    const formatDate = (date: Date | string) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-GB');
    };

    const formatServiceLabel = (service: Service) =>
      `${service.serviceName} - ${formatDate(service.serviceDate)}`;

    // Build CSV content
    const lines: string[] = [];
    lines.push('Missing Members Report (Demo)');
    lines.push(`Generated: ${new Date().toLocaleString('en-GB')}`);
    lines.push(`Reference Service: ${formatServiceLabel(referenceService)}`);
    lines.push(`Comparison Service: ${formatServiceLabel(comparisonService)}`);
    lines.push('');
    lines.push(
      `Members who attended ${referenceService.serviceName} but missed ${comparisonService.serviceName} (${filteredMissingMembers.length} members)`
    );
    lines.push('');
    lines.push('Full Name,Phone,Email,Status,Follow-up Owner');
    filteredMissingMembers.forEach((member) => {
      lines.push(
        `"${member.fullName}","${member.phone || ''}","${member.email || ''}","${member.status}","${member.followUpOwnerName || ''}"`
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
      `demo-missing-members-${formatDate(referenceService.serviceDate)}-vs-${formatDate(comparisonService.serviceDate)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [comparison, referenceService, comparisonService, filteredMissingMembers]);

  // Handle refresh (demo - just shows alert)
  const handleRefresh = useCallback(() => {
    alert('Refresh clicked! In demo mode, data is static.');
  }, []);

  const canCompare = referenceServiceId && comparisonServiceId;
  const hasResults = comparison && comparison.presentInAMissingInB.length > 0;
  const lastUpdated = useMemo(() => new Date(), []);

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
          isLoading={false}
          isLive={false}
          onToggleLive={() => alert('Live mode is not available in demo')}
          onRefresh={handleRefresh}
          disabled={!canCompare}
          timestampFormat="time"
        />
      </div>

      {/* Dual service selector with updated labels */}
      <DualServiceSelector
        services={mockServices}
        serviceAId={referenceServiceId}
        serviceBId={comparisonServiceId}
        onServiceAChange={setReferenceServiceId}
        onServiceBChange={setComparisonServiceId}
        isLoading={false}
        labelA="Reference Service"
        labelB="Comparison Service"
        helperText="Select a Reference Service and a Comparison Service. The results will show members who attended the Reference Service but missed the Comparison Service."
      />

      {/* Filters */}
      {canCompare && (
        <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
                Filter by Status:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm text-text-primary-light dark:text-text-primary-dark"
              >
                <option value="">All Statuses</option>
                <option value="Member">Member</option>
                <option value="First Timer">First Timer</option>
                <option value="Returner">Returner</option>
                <option value="Evangelism Contact">Evangelism Contact</option>
              </select>
            </div>
          </div>
        </div>
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
        isLoading={false}
      />

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

export default DemoMissingMembers;
