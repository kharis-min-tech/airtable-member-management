import { useCallback } from 'react';
import type { Service } from '../../types';

interface DualServiceSelectorProps {
  services: Service[];
  serviceAId: string | null;
  serviceBId: string | null;
  onServiceAChange: (serviceId: string | null) => void;
  onServiceBChange: (serviceId: string | null) => void;
  isLoading?: boolean;
}

function DualServiceSelector({
  services,
  serviceAId,
  serviceBId,
  onServiceAChange,
  onServiceBChange,
  isLoading = false,
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service A Selector */}
        <div>
          <label
            htmlFor="service-a-selector"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Service A
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
                <option value="">Select Service A...</option>
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
            Service B
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
                <option value="">Select Service B...</option>
                {renderServiceOptions(serviceAId)}
              </>
            )}
          </select>
        </div>
      </div>

      {/* Helper text */}
      {!serviceAId && !serviceBId && !isLoading && services.length > 0 && (
        <p className="mt-4 text-sm text-gray-500">
          Select two services to compare attendance and identify missing members.
        </p>
      )}
      {serviceAId && !serviceBId && (
        <p className="mt-4 text-sm text-gray-500">
          Now select Service B to see the comparison.
        </p>
      )}
      {!serviceAId && serviceBId && (
        <p className="mt-4 text-sm text-gray-500">
          Now select Service A to see the comparison.
        </p>
      )}
    </div>
  );
}

export default DualServiceSelector;
