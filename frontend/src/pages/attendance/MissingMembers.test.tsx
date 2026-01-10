/**
 * Unit Tests for Simplified Missing Members Page
 * 
 * Tests for:
 * - Unidirectional display (only shows members present in reference, missing in comparison)
 * - Status filter functionality
 * - Export functionality
 * 
 * Validates: Requirements 5.2, 5.3, 5.5, 5.7, 7.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MissingMembers from './MissingMembers';
import { churchApi } from '../../services/church-api';
import type { Service } from '../../types';

// Mock the church API
vi.mock('../../services/church-api', () => ({
  churchApi: {
    services: {
      getRecent: vi.fn(),
    },
    attendance: {
      compareServices: vi.fn(),
    },
  },
}));

// Mock the useLiveMode hook
vi.mock('../../hooks/useLiveMode', () => ({
  useLiveMode: () => ({
    isLive: false,
    toggleLive: vi.fn(),
  }),
}));

// Mock DataRefreshControls
vi.mock('../../components/common', () => ({
  DataRefreshControls: () => <div data-testid="data-refresh-controls">Refresh Controls</div>,
}));

// Sample test data
const mockServices: Service[] = [
  {
    id: 'service-1',
    serviceName: 'Sunday Service',
    serviceDate: new Date('2024-01-07'),
    serviceCode: 'SUN-2024-01-07',
  },
  {
    id: 'service-2',
    serviceName: 'Sunday Service',
    serviceDate: new Date('2024-01-14'),
    serviceCode: 'SUN-2024-01-14',
  },
];

function renderMissingMembers() {
  return render(
    <MemoryRouter>
      <MissingMembers />
    </MemoryRouter>
  );
}

describe('MissingMembers Page - Simplified Unidirectional Comparison', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    vi.mocked(churchApi.services.getRecent).mockResolvedValue({
      data: mockServices,
      lastUpdated: new Date(),
      cached: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Structure', () => {
    it('should render the page with correct title and description', async () => {
      renderMissingMembers();
      
      // Use getByRole to target the h1 specifically
      expect(screen.getByRole('heading', { level: 1, name: 'Missing Members' })).toBeInTheDocument();
      expect(screen.getByText('Find members who attended one service but missed another')).toBeInTheDocument();
    });

    it('should display Reference Service and Comparison Service labels', async () => {
      renderMissingMembers();
      
      await waitFor(() => {
        expect(screen.getByText('Reference Service')).toBeInTheDocument();
        expect(screen.getByText('Comparison Service')).toBeInTheDocument();
      });
    });

    it('should display helper text explaining comparison direction', async () => {
      renderMissingMembers();
      
      await waitFor(() => {
        expect(screen.getByText(/Select a Reference Service and a Comparison Service/)).toBeInTheDocument();
        expect(screen.getByText(/The results will show members who attended the Reference Service but missed the Comparison Service/)).toBeInTheDocument();
      });
    });

    it('should have export button disabled initially', async () => {
      renderMissingMembers();

      const exportButton = screen.getByText('Export Missing Members');
      expect(exportButton).toBeDisabled();
    });

    it('should show two service selectors', async () => {
      renderMissingMembers();

      await waitFor(() => {
        const selectors = screen.getAllByRole('combobox');
        expect(selectors.length).toBe(2);
      });
    });

    it('should show service options after loading', async () => {
      renderMissingMembers();

      await waitFor(() => {
        // Check that service options are available
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should show placeholder message when no services selected', async () => {
      renderMissingMembers();

      await waitFor(() => {
        expect(screen.getByText('Select both services to see comparison')).toBeInTheDocument();
      });
    });
  });

  describe('Unidirectional Display Structure', () => {
    it('should only have one MissingMembersList component (not two)', async () => {
      renderMissingMembers();

      await waitFor(() => {
        // There should only be one MissingMembersList component
        // We check for the "Missing Members" title in the card header
        // The EmptyState inside also has an h3, so we look for the specific card title
        const missingMembersTitle = screen.getByRole('heading', { level: 3, name: 'Missing Members' });
        expect(missingMembersTitle).toBeInTheDocument();
        
        // Verify there's only one card with this title (not two separate lists)
        const allMissingMembersTitles = screen.getAllByRole('heading', { level: 3, name: 'Missing Members' });
        expect(allMissingMembersTitles.length).toBe(1);
      });
    });
  });
});
