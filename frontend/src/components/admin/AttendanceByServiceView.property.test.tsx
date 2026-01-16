/**
 * Property-Based Tests for AttendanceByServiceView
 * 
 * **Feature: app-enhancements-v4, Property 5: Service ID parameter inclusion**
 * **Validates: Requirements 3.1, 3.2, 3.3**
 * 
 * *For any* attendance by service API call, the request should include the selected Service_ID parameter 
 * and all other required parameters, returning service-specific attendance grouped by department
 * 
 * **Feature: app-enhancements-v4, Property 6: Meaningful error messages**
 * **Validates: Requirements 3.4**
 * 
 * *For any* API error condition, the Church_Management_System should display meaningful error messages 
 * instead of generic 400 errors
 */

import * as fc from 'fast-check';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { vi } from 'vitest';
import AttendanceByServiceView from './AttendanceByServiceView';
import { churchApi } from '../../services/church-api';
import type { Service, AttendanceByDepartment } from '../../types';

// Mock the church API
vi.mock('../../services/church-api', () => ({
  churchApi: {
    admin: {
      getAttendanceByDepartment: vi.fn(),
    },
  },
}));

const mockChurchApi = churchApi as any;

describe('Property 5: Service ID parameter inclusion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 5.1: API call includes selected service ID parameter
   * 
   * For any valid service ID selection, the API call should include that service ID
   * **Validates: Requirements 3.1, 3.2**
   */
  it('should include selected service ID in API call', async () => {
    const user = userEvent.setup();
    
    const testService: Service = {
      id: 'recABCDEFGHIJKLMN',
      serviceName: 'Test Service',
      serviceDate: new Date('2024-01-01'),
      serviceCode: 'SUN-2024-01-01'
    };
    
    // Setup mock to return empty attendance data in ApiResponse format
    mockChurchApi.admin.getAttendanceByDepartment.mockResolvedValue({
      data: {
        serviceId: testService.id,
        serviceName: testService.serviceName,
        departments: []
      },
      cached: false,
      lastUpdated: new Date()
    });

    // Render component with services
    const { container } = render(<AttendanceByServiceView services={[testService]} isLoadingServices={false} />);

    // Find and select a service
    const serviceSelect = container.querySelector('select');
    expect(serviceSelect).toBeInTheDocument();

    // Select the service
    await user.selectOptions(serviceSelect!, testService.id);

    // Wait for API call
    await waitFor(() => {
      expect(mockChurchApi.admin.getAttendanceByDepartment).toHaveBeenCalledWith(testService.id);
    }, { timeout: 3000 });

    // Verify the API was called with the correct service ID
    expect(mockChurchApi.admin.getAttendanceByDepartment).toHaveBeenCalledTimes(1);
    expect(mockChurchApi.admin.getAttendanceByDepartment).toHaveBeenCalledWith(testService.id);
    
    // Verify it was NOT called with empty string (the bug we fixed)
    expect(mockChurchApi.admin.getAttendanceByDepartment).not.toHaveBeenCalledWith('');
  });

  /**
   * Property 5.2: API returns service-specific attendance grouped by department
   * 
   * **Validates: Requirements 3.3**
   */
  it('should display service-specific attendance grouped by department', async () => {
    const user = userEvent.setup();
    
    const testService: Service = {
      id: 'recTEST123456789',
      serviceName: 'Sunday Service',
      serviceDate: new Date('2024-01-01'),
      serviceCode: 'SUN-2024-01-01'
    };

    const attendanceData: AttendanceByDepartment = {
      serviceId: testService.id,
      serviceName: testService.serviceName,
      departments: [
        {
          departmentId: 'recDEPT123456789',
          departmentName: 'Youth Department',
          attendees: [
            {
              id: 'recMEMB123456789',
              firstName: 'John',
              lastName: 'Doe',
              fullName: 'John Doe',
              phone: '1234567890',
              status: 'Member',
              source: 'First Timer Form',
              dateFirstCaptured: new Date('2024-01-01'),
              followUpStatus: 'Not Started',
            }
          ]
        }
      ]
    };
    
    // Setup mock to return the attendance data wrapped in ApiResponse format
    mockChurchApi.admin.getAttendanceByDepartment.mockResolvedValue({
      data: attendanceData,
      cached: false,
      lastUpdated: new Date()
    });

    // Render component with the service
    const { container } = render(<AttendanceByServiceView services={[testService]} isLoadingServices={false} />);

    // Select the service
    const serviceSelect = container.querySelector('select');
    await user.selectOptions(serviceSelect!, testService.id);

    // Wait for API call to be made
    await waitFor(() => {
      expect(mockChurchApi.admin.getAttendanceByDepartment).toHaveBeenCalledWith(testService.id);
    }, { timeout: 3000 });

    // Wait for data to load and be displayed
    await waitFor(() => {
      expect(screen.getByText(attendanceData.serviceName)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify department is displayed
    expect(screen.getByText('Youth Department')).toBeInTheDocument();
    expect(screen.getByText('1 present')).toBeInTheDocument();

    // Verify total attendees count
    expect(screen.getByText('1 departments, 1 attendees')).toBeInTheDocument();
  });
});

describe('Property 6: Meaningful error messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 6.1: Display meaningful error messages instead of generic 400 errors
   * 
   * For any API error condition, meaningful error messages should be displayed
   * **Validates: Requirements 3.4**
   */
  it('should display meaningful error messages instead of generic errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate meaningful error messages (not generic 400)
        fc.oneof(
          fc.constant('Service not found'),
          fc.constant('No attendance data available for this service'),
          fc.constant('Unable to load attendance data'),
          fc.constant('Service ID is invalid'),
          fc.constant('Attendance data is temporarily unavailable')
        ),
        async (errorMessage: string) => {
          const user = userEvent.setup();
          
          const testService: Service = {
            id: 'recTEST123456789',
            serviceName: 'Test Service',
            serviceDate: new Date('2024-01-01'),
            serviceCode: 'TEST-2024-01-01'
          };
          
          // Setup mock to reject with meaningful error
          mockChurchApi.admin.getAttendanceByDepartment.mockRejectedValue(new Error(errorMessage));

          // Render component with the service
          const { container } = render(<AttendanceByServiceView services={[testService]} isLoadingServices={false} />);

          // Select the service to trigger API call
          const serviceSelect = container.querySelector('select');
          await user.selectOptions(serviceSelect!, testService.id);

          // Wait for error to be displayed
          await waitFor(() => {
            expect(screen.getByText(`Error loading attendance data: ${errorMessage}`)).toBeInTheDocument();
          }, { timeout: 3000 });

          // Verify the error message is meaningful (not generic)
          expect(errorMessage).not.toBe('400');
          expect(errorMessage).not.toBe('Bad Request');
          expect(errorMessage).not.toBe('Error');
          expect(errorMessage.length).toBeGreaterThan(5); // Meaningful messages should be descriptive
          
          cleanup();
        }
      ),
      { numRuns: 5 }
    );
  });
});