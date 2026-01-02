import { useCallback } from 'react';
import type { Service } from '../../types';

interface ServiceSelectorProps {
  services: Service[];
  selectedServiceId: string | null;
  onServiceChange: (serviceId: string) => void;
  isLoading?: boolean;
  label?: string;
}

function ServiceSelector({
  services,
  selectedServiceId,
  onServiceChange,
  isLoading = false,
  label = 'Select Service',
}: ServiceSelectorProps) {
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
    <div className="flex items-center gap-3">
      <label htmlFor="service-selector" className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id="service-selector"
        value={selectedServiceId || ''}
        onChange={handleChange}
        disabled={isLoading || services.length === 0}
        className="block w-64 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <option value="">Loading services...</option>
        ) : services.length === 0 ? (
          <option value="">No services available</option>
        ) : (
          <>
            <option value="">Select a service...</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.serviceName} - {formatServiceDate(service.serviceDate)}
              </option>
            ))}
          </>
        )}
      </select>
    </div>
  );
}

export default ServiceSelector;
