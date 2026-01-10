import { useCallback } from 'react';
import type { Service } from '../../types';
import { Card } from '../tailus-ui/Card';
import { Select } from '../tailus-ui/Select';

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

  const serviceOptions = services.map((service) => ({
    value: service.id,
    label: `${service.serviceName} - ${formatServiceDate(service.serviceDate)}`,
  }));

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">Select Service</h2>
      <div className="max-w-md">
        <Select
          id="attendance-service-selector"
          label="Service"
          value={selectedServiceId || ''}
          onChange={handleChange}
          disabled={isLoading || services.length === 0}
          placeholder={
            isLoading
              ? 'Loading services...'
              : services.length === 0
              ? 'No services available'
              : 'Select a service to explore...'
          }
          options={serviceOptions}
        />
      </div>
      {!selectedServiceId && !isLoading && services.length > 0 && (
        <p className="mt-3 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Select a service to view attendance details and department breakdown.
        </p>
      )}
    </Card>
  );
}

export default ServiceSelectorCard;
