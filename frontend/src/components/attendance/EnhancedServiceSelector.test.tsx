import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnhancedServiceSelector from './EnhancedServiceSelector';
import type { Service } from '../../types';

const mockServices: Service[] = [
  {
    id: 'service-1',
    serviceName: 'Sunday Service',
    serviceDate: new Date('2024-01-07'),
    serviceCode: 'SUN-2024-01-07',
  },
  {
    id: 'service-2',
    serviceName: 'Wednesday Service',
    serviceDate: new Date('2024-01-10'),
    serviceCode: 'WED-2024-01-10',
  },
  {
    id: 'service-3',
    serviceName: 'Sunday Service',
    serviceDate: new Date('2024-01-14'),
    serviceCode: 'SUN-2024-01-14',
  },
];

describe('EnhancedServiceSelector', () => {
  describe('Basic Rendering', () => {
    it('renders with default label', () => {
      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
        />
      );

      expect(screen.getByText('Select Service')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          label="Choose a Service"
        />
      );

      expect(screen.getByText('Choose a Service')).toBeInTheDocument();
    });

    it('renders all services in dropdown', () => {
      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      
      // Check that all services are rendered as options by checking option count
      const options = screen.getAllByRole('option');
      // +1 for the "Select a service..." placeholder option
      expect(options).toHaveLength(mockServices.length + 1);
    });

    it('shows service count indicator', () => {
      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
        />
      );

      expect(screen.getByText(/Showing 3 services/)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading message when isLoading is true', () => {
      render(
        <EnhancedServiceSelector
          services={[]}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading services...')).toBeInTheDocument();
    });

    it('disables select when loading', () => {
      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          isLoading={true}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('shows no services message when empty', () => {
      render(
        <EnhancedServiceSelector
          services={[]}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          isLoading={false}
        />
      );

      expect(screen.getByText('No services available')).toBeInTheDocument();
    });
  });

  describe('Service Selection', () => {
    it('calls onServiceChange when service is selected', async () => {
      const onServiceChange = vi.fn();
      const user = userEvent.setup();

      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={onServiceChange}
        />
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'service-1');

      expect(onServiceChange).toHaveBeenCalledWith('service-1');
    });

    it('shows selected service', () => {
      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId="service-2"
          onServiceChange={vi.fn()}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('service-2');
    });
  });

  describe('Date Filter UI', () => {
    it('shows filter button when enableDateFilter is true', () => {
      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          enableDateFilter={true}
        />
      );

      expect(screen.getByRole('button', { name: /Filters/i })).toBeInTheDocument();
    });

    it('does not show filter button when enableDateFilter is false', () => {
      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          enableDateFilter={false}
        />
      );

      expect(screen.queryByRole('button', { name: /Filters/i })).not.toBeInTheDocument();
    });

    it('toggles filter panel when filter button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          enableDateFilter={true}
        />
      );

      const filterButton = screen.getByRole('button', { name: /Filters/i });
      
      // Filter panel should not be visible initially
      expect(screen.queryByLabelText('From Date')).not.toBeInTheDocument();

      // Click to show filters
      await user.click(filterButton);
      expect(screen.getByLabelText('From Date')).toBeInTheDocument();
      expect(screen.getByLabelText('To Date')).toBeInTheDocument();

      // Click to hide filters
      await user.click(filterButton);
      expect(screen.queryByLabelText('From Date')).not.toBeInTheDocument();
    });

    it('calls onDateRangeChange when dates are entered', async () => {
      const onDateRangeChange = vi.fn();
      const user = userEvent.setup();

      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          enableDateFilter={true}
          onDateRangeChange={onDateRangeChange}
        />
      );

      // Open filter panel
      await user.click(screen.getByRole('button', { name: /Filters/i }));

      // Enter start date
      const startDateInput = screen.getByLabelText('From Date');
      await user.type(startDateInput, '2024-01-01');

      expect(onDateRangeChange).toHaveBeenCalled();
    });
  });

  describe('Search Functionality', () => {
    it('shows search input when enableSearch is true', async () => {
      const user = userEvent.setup();

      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          enableSearch={true}
        />
      );

      // Open filter panel
      await user.click(screen.getByRole('button', { name: /Filters/i }));

      expect(screen.getByLabelText('Search Services')).toBeInTheDocument();
    });

    it('calls onSearchChange when search query is entered', async () => {
      const onSearchChange = vi.fn();
      const user = userEvent.setup();

      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          enableSearch={true}
          onSearchChange={onSearchChange}
        />
      );

      // Open filter panel
      await user.click(screen.getByRole('button', { name: /Filters/i }));

      // Enter search query
      const searchInput = screen.getByLabelText('Search Services');
      await user.type(searchInput, 'Sunday');

      expect(onSearchChange).toHaveBeenCalledWith('S');
      expect(onSearchChange).toHaveBeenCalledWith('Su');
      expect(onSearchChange).toHaveBeenCalledWith('Sun');
    });

    it('filters services client-side when onSearchChange is not provided', async () => {
      const user = userEvent.setup();

      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          enableSearch={true}
        />
      );

      // Open filter panel
      await user.click(screen.getByRole('button', { name: /Filters/i }));

      // Enter search query
      const searchInput = screen.getByLabelText('Search Services');
      await user.type(searchInput, 'Wednesday');

      // Should show only Wednesday service
      expect(screen.getByText(/Showing 1 service/)).toBeInTheDocument();
    });
  });

  describe('Load More Functionality', () => {
    it('shows load more button when hasMore is true', () => {
      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          hasMore={true}
          onLoadMore={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /Load More/i })).toBeInTheDocument();
    });

    it('does not show load more button when hasMore is false', () => {
      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          hasMore={false}
          onLoadMore={vi.fn()}
        />
      );

      expect(screen.queryByRole('button', { name: /Load More/i })).not.toBeInTheDocument();
    });

    it('calls onLoadMore when load more button is clicked', async () => {
      const onLoadMore = vi.fn();
      const user = userEvent.setup();

      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          hasMore={true}
          onLoadMore={onLoadMore}
        />
      );

      await user.click(screen.getByRole('button', { name: /Load More/i }));

      expect(onLoadMore).toHaveBeenCalled();
    });

    it('shows loading state when isLoadingMore is true', () => {
      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          hasMore={true}
          onLoadMore={vi.fn()}
          isLoadingMore={true}
        />
      );

      expect(screen.getByRole('button', { name: /Loading.../i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Loading.../i })).toBeDisabled();
    });
  });

  describe('Clear Filters', () => {
    it('shows clear filters button when filters are active', async () => {
      const user = userEvent.setup();

      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          enableSearch={true}
        />
      );

      // Open filter panel
      await user.click(screen.getByRole('button', { name: /Filters/i }));

      // Enter search query
      const searchInput = screen.getByLabelText('Search Services');
      await user.type(searchInput, 'test');

      // Clear filters button should appear
      expect(screen.getByRole('button', { name: /Clear all filters/i })).toBeInTheDocument();
    });

    it('clears all filters when clear button is clicked', async () => {
      const onSearchChange = vi.fn();
      const onDateRangeChange = vi.fn();
      const user = userEvent.setup();

      render(
        <EnhancedServiceSelector
          services={mockServices}
          selectedServiceId={null}
          onServiceChange={vi.fn()}
          enableSearch={true}
          enableDateFilter={true}
          onSearchChange={onSearchChange}
          onDateRangeChange={onDateRangeChange}
        />
      );

      // Open filter panel
      await user.click(screen.getByRole('button', { name: /Filters/i }));

      // Enter search query
      const searchInput = screen.getByLabelText('Search Services');
      await user.type(searchInput, 'test');

      // Clear filters
      await user.click(screen.getByRole('button', { name: /Clear all filters/i }));

      expect(onSearchChange).toHaveBeenLastCalledWith('');
      expect(onDateRangeChange).toHaveBeenLastCalledWith(null, null);
    });
  });
});
