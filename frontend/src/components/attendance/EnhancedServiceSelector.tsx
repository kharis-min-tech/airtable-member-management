import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Service } from '../../types';

interface EnhancedServiceSelectorProps {
  services: Service[];
  selectedServiceId: string | null;
  onServiceChange: (serviceId: string) => void;
  isLoading?: boolean;
  label?: string;
  // Filtering props
  enableDateFilter?: boolean;
  enableSearch?: boolean;
  // Lazy loading props
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  // Date range filter callbacks
  onDateRangeChange?: (startDate: string | null, endDate: string | null) => void;
  // Search callback
  onSearchChange?: (query: string) => void;
}

interface ServiceFilterState {
  searchQuery: string;
  startDate: string;
  endDate: string;
}

function EnhancedServiceSelector({
  services,
  selectedServiceId,
  onServiceChange,
  isLoading = false,
  label = 'Select Service',
  enableDateFilter = false,
  enableSearch = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  onDateRangeChange,
  onSearchChange,
}: EnhancedServiceSelectorProps) {
  const [filters, setFilters] = useState<ServiceFilterState>({
    searchQuery: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const handleServiceChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onServiceChange(e.target.value);
    },
    [onServiceChange]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setFilters((prev) => ({ ...prev, searchQuery: query }));
      onSearchChange?.(query);
    },
    [onSearchChange]
  );

  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const startDate = e.target.value;
      setFilters((prev) => ({ ...prev, startDate }));
    },
    []
  );

  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const endDate = e.target.value;
      setFilters((prev) => ({ ...prev, endDate }));
    },
    []
  );

  // Apply date range filter when both dates are set
  useEffect(() => {
    if (enableDateFilter && onDateRangeChange) {
      const startDate = filters.startDate || null;
      const endDate = filters.endDate || null;
      onDateRangeChange(startDate, endDate);
    }
  }, [filters.startDate, filters.endDate, enableDateFilter, onDateRangeChange]);

  const handleClearFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      startDate: '',
      endDate: '',
    });
    onSearchChange?.('');
    onDateRangeChange?.(null, null);
  }, [onSearchChange, onDateRangeChange]);

  const formatServiceDate = useCallback((date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  // Client-side filtering for search (when onSearchChange is not provided)
  const filteredServices = useMemo(() => {
    if (!enableSearch || onSearchChange || !filters.searchQuery) {
      return services;
    }
    const query = filters.searchQuery.toLowerCase();
    return services.filter(
      (service) =>
        service.serviceName.toLowerCase().includes(query) ||
        formatServiceDate(service.serviceDate).toLowerCase().includes(query)
    );
  }, [services, filters.searchQuery, enableSearch, onSearchChange, formatServiceDate]);

  const hasActiveFilters = filters.searchQuery || filters.startDate || filters.endDate;

  return (
    <div className="space-y-3">
      {/* Main selector row */}
      <div className="flex items-center gap-3 flex-wrap">
        <label htmlFor="enhanced-service-selector" className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
          {label}
        </label>
        <select
          id="enhanced-service-selector"
          value={selectedServiceId || ''}
          onChange={handleServiceChange}
          disabled={isLoading || filteredServices.length === 0}
          className="block w-64 px-3 py-2 bg-surface-light dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-text-primary-light dark:text-text-primary-dark disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <option value="">Loading services...</option>
          ) : filteredServices.length === 0 ? (
            <option value="">No services available</option>
          ) : (
            <>
              <option value="">Select a service...</option>
              {filteredServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.serviceName} - {formatServiceDate(service.serviceDate)}
                </option>
              ))}
            </>
          )}
        </select>

        {/* Filter toggle button */}
        {(enableDateFilter || enableSearch) && (
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'bg-surface-light dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
            aria-expanded={showFilters}
            aria-controls="service-filters"
          >
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                  Active
                </span>
              )}
            </span>
          </button>
        )}

        {/* Load more button */}
        {hasMore && onLoadMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (enableDateFilter || enableSearch) && (
        <div
          id="service-filters"
          className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4"
        >
          <div className="flex flex-wrap gap-4">
            {/* Search input */}
            {enableSearch && (
              <div className="flex-1 min-w-[200px]">
                <label
                  htmlFor="service-search"
                  className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1"
                >
                  Search Services
                </label>
                <input
                  type="text"
                  id="service-search"
                  value={filters.searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search by name or date..."
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-surface-light dark:bg-gray-700 text-text-primary-light dark:text-text-primary-dark placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            )}

            {/* Date range filters */}
            {enableDateFilter && (
              <>
                <div className="min-w-[150px]">
                  <label
                    htmlFor="service-start-date"
                    className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1"
                  >
                    From Date
                  </label>
                  <input
                    type="date"
                    id="service-start-date"
                    value={filters.startDate}
                    onChange={handleStartDateChange}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-surface-light dark:bg-gray-700 text-text-primary-light dark:text-text-primary-dark"
                  />
                </div>
                <div className="min-w-[150px]">
                  <label
                    htmlFor="service-end-date"
                    className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1"
                  >
                    To Date
                  </label>
                  <input
                    type="date"
                    id="service-end-date"
                    value={filters.endDate}
                    onChange={handleEndDateChange}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-surface-light dark:bg-gray-700 text-text-primary-light dark:text-text-primary-dark"
                  />
                </div>
              </>
            )}
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-sm text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Service count indicator */}
      {!isLoading && filteredServices.length > 0 && (
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
          Showing {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
          {hasMore && ' (more available)'}
        </p>
      )}
    </div>
  );
}

export default EnhancedServiceSelector;
