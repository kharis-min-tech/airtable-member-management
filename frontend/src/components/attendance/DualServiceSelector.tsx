import { useCallback, useMemo } from 'react';
import type { Service } from '../../types';
import { Card } from '../tailus-ui/Card';
import { Select } from '../tailus-ui/Select';

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

  const serviceAOptions = useMemo(() => {
    return services
      .filter((service) => service.id !== serviceBId)
      .map((service) => ({
        value: service.id,
        label: `${service.serviceName} - ${formatServiceDate(service.serviceDate)}`,
      }));
  }, [services, serviceBId]);

  const serviceBOptions = useMemo(() => {
    return services
      .filter((service) => service.id !== serviceAId)
      .map((service) => ({
        value: service.id,
        label: `${service.serviceName} - ${formatServiceDate(service.serviceDate)}`,
      }));
  }, [services, serviceAId]);

  const getPlaceholder = () => {
    if (isLoading) return 'Loading services...';
    if (services.length === 0) return 'No services available';
    return undefined;
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">Select Services to Compare</h2>
      
      {/* Helper text explaining comparison direction */}
      {helperText && (
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md border border-blue-100 dark:border-blue-800">
          <span className="text-blue-600 dark:text-blue-400 font-medium">ℹ️ </span>
          {helperText}
        </p>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service A Selector */}
        <Select
          id="service-a-selector"
          label={labelA}
          value={serviceAId || ''}
          onChange={handleServiceAChange}
          disabled={isLoading || services.length === 0}
          placeholder={getPlaceholder() || `Select ${labelA}...`}
          options={serviceAOptions}
        />

        {/* Service B Selector */}
        <Select
          id="service-b-selector"
          label={labelB}
          value={serviceBId || ''}
          onChange={handleServiceBChange}
          disabled={isLoading || services.length === 0}
          placeholder={getPlaceholder() || `Select ${labelB}...`}
          options={serviceBOptions}
        />
      </div>

      {/* Default helper text when no custom helper text is provided */}
      {!helperText && !serviceAId && !serviceBId && !isLoading && services.length > 0 && (
        <p className="mt-4 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Select two services to compare attendance and identify missing members.
        </p>
      )}
      {!helperText && serviceAId && !serviceBId && (
        <p className="mt-4 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Now select {labelB} to see the comparison.
        </p>
      )}
      {!helperText && !serviceAId && serviceBId && (
        <p className="mt-4 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Now select {labelA} to see the comparison.
        </p>
      )}
    </Card>
  );
}

export default DualServiceSelector;
