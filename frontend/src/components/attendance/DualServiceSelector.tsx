import { useCallback } from 'react';
import type { Service } from '../../types';

interface DualServiceSelectorProps {
  services: Service[];
  serviceAId: string | null;
  serviceBId: string | null;
  onServiceAChange: (serviceId: string | null) => void;
  onServiceBChange: (serviceId: string | null) => void;
  isLoading?: boolean;
  /** Custom label for Service A selector (default: "Service A") */
  labelA?: string;
  /** Custom label for Service B selector (default: "Service B") */
  labelB?: string;
  /** Helper text explaining the comparison direction */
  helperText?: string;
}

function DualServiceSelector({
  services,
  serviceAId,
  serviceBId,
  onServiceAChange,
  onServiceBChange,
  isLoading = false,
  labelA = 'Service A',
  labelB = 'Service B',
  helperText,
}: DualServiceSelectorProps) {
  const handleServiceAChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onServiceAChange(e.target.value || null);
    },
    [onServiceAChange]
  );

  const handleServiceBChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onServiceBChange(e.target.value || null);
    },
    [onServiceBChange]
  );

  const formatServiceDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderServiceOptions = (excludeId: string | null) => {
    return services
      .filter((service) => service.id !== excludeId)
      .map((service) => (
        <option key={service.id} value={service.id}>
          {service.serviceName} - {formatServiceDate(service.serviceDate)}
        </option>
      ));
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Services to Compare</h2>
      
      {/* Helper text explaining comparison direction */}
      {helperText && (
        <p className="text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded-md border border-blue-100">
          <span className="text-blue-600 font-medium">ℹ️ </span>
          {helperText}
        </p>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service A Selector */}
        <div>
          <label
            htmlFor="service-a-selector"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {labelA}
          </label>
          <select
            id="service-a-selector"
            value={serviceAId || ''}
            onChange={handleServiceAChange}
            disabled={isLoading || services.length === 0}
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <option value="">Loading services...</option>
            ) : services.length === 0 ? (
              <option value="">No services available</option>
            ) : (
              <>
                <option value="">Select {labelA}...</option>
                {renderServiceOptions(serviceBId)}
              </>
            )}
          </select>
        </div>

        {/* Service B Selector */}
        <div>
          <label
            htmlFor="service-b-selector"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {labelB}
          </label>
          <select
            id="service-b-selector"
            value={serviceBId || ''}
            onChange={handleServiceBChange}
            disabled={isLoading || services.length === 0}
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <option value="">Loading services...</option>
            ) : services.length === 0 ? (
              <option value="">No services available</option>
            ) : (
              <>
                <option value="">Select {labelB}...</option>
                {renderServiceOptions(serviceAId)}
              </>
            )}
          </select>
        </div>
      </div>

      {/* Default helper text when no custom helper text is provided */}
      {!helperText && !serviceAId && !serviceBId && !isLoading && services.length > 0 && (
        <p className="mt-4 text-sm text-gray-500">
          Select two services to compare attendance and identify missing members.
        </p>
      )}
      {!helperText && serviceAId && !serviceBId && (
        <p className="mt-4 text-sm text-gray-500">
          Now select {labelB} to see the comparison.
        </p>
      )}
      {!helperText && !serviceAId && serviceBId && (
        <p className="mt-4 text-sm text-gray-500">
          Now select {labelA} to see the comparison.
        </p>
      )}
    </div>
  );
}

export default DualServiceSelector;
