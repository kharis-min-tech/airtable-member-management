import { useCallback } from 'react';
import type { Service } from '../../types';

interface ServiceSelectorCardProps {
  services: Service[];
  selectedServiceId: string | null;
  onServiceChange: (serviceId: string) => void;
  isLoading?: boolean;
}

function ServiceSelectorCard({
  services,
  selectedServiceId,
  onServiceChange,
  isLoading = false,
}: ServiceSelectorCardProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onServiceChange(e.target.value);
    },
    [onServiceChange]
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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Service</h2>
      <div className="flex items-center gap-3">
        <label htmlFor="attendance-service-selector" className="text-sm font-medium text-gray-700">
          Service
        </label>
        <select
          id="attendance-service-selector"
          value={selectedServiceId || ''}
          onChange={handleChange}
          disabled={isLoading || services.length === 0}
          className="block w-full max-w-md px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <option value="">Loading services...</option>
          ) : services.length === 0 ? (
            <option value="">No services available</option>
          ) : (
            <>
              <option value="">Select a service to explore...</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.serviceName} - {formatServiceDate(service.serviceDate)}
                </option>
              ))}
            </>
          )}
        </select>
      </div>
      {!selectedServiceId && !isLoading && services.length > 0 && (
        <p className="mt-3 text-sm text-gray-500">
          Select a service to view attendance details and department breakdown.
        </p>
      )}
    </div>
  );
}

export default ServiceSelectorCard;
