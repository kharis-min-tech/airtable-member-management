/**
 * Property-Based Tests for AttendanceDrillDownModal
 * 
 * Property 6: Drill-Down Member Count Matches List Length
 * Validates: Requirements 3.5
 * 
 * For any attendance category drill-down, the displayed total count 
 * SHALL equal the length of the members list shown.
 */

import * as fc from 'fast-check';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  AttendanceCategory,
  DrillDownMember 
} from './AttendanceDrillDownModal';
import AttendanceDrillDownModal from './AttendanceDrillDownModal';

/**
 * Arbitrary for generating valid member IDs
 */
const memberIdArb = fc.integer({ min: 10000000000000, max: 99999999999999 }).map(n => `rec${n}`);

/**
 * Arbitrary for generating member status
 */
const memberStatusArb = fc.constantFrom(
  'First Timer',
  'Returner',
  'Evangelism Contact',
  'Member'
);

/**
 * Arbitrary for generating optional phone numbers
 */
const phoneArb = fc.option(
  fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 10, maxLength: 15 })
    .map(digits => `+${digits.join('')}`),
  { nil: undefined }
);

/**
 * Arbitrary for generating optional email addresses
 */
const emailArb = fc.option(
  fc.tuple(
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 3, maxLength: 10 }),
    fc.constantFrom('gmail.com', 'yahoo.com', 'outlook.com', 'example.com')
  ).map(([nameChars, domain]) => `${nameChars.join('')}@${domain}`),
  { nil: undefined }
);

/**
 * Arbitrary for generating a DrillDownMember
 */
const drillDownMemberArb: fc.Arbitrary<DrillDownMember> = fc.record({
  id: memberIdArb,
  fullName: fc.tuple(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 2, maxLength: 10 }),
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 2, maxLength: 10 })
  ).map(([firstInitial, firstName, lastInitial, lastName]) => 
    `${firstInitial}${firstName.join('')} ${lastInitial}${lastName.join('')}`
  ),
  phone: phoneArb,
  email: emailArb,
  status: memberStatusArb,
});

/**
 * Arbitrary for generating attendance categories
 */
const categoryArb: fc.Arbitrary<AttendanceCategory> = fc.constantFrom(
  'firstTimers',
  'returners',
  'evangelismContacts',
  'department'
);

/**
 * Arbitrary for generating category labels
 */
const categoryLabelArb = fc.constantFrom(
  'First Timers',
  'Returners',
  'Evangelism Contacts',
  'Department Members',
  'Youth Department',
  'Choir'
);

/**
 * Arbitrary for generating service names
 * Using integer timestamps to avoid invalid date issues
 */
const serviceNameArb = fc.tuple(
  fc.constantFrom('Sunday Service', 'Wednesday Service', 'Friday Service', 'Special Service'),
  fc.integer({ min: 1704067200000, max: 1767225600000 }) // 2024-01-01 to 2025-12-31 in milliseconds
).map(([name, timestamp]) => {
  const date = new Date(timestamp);
  const dateStr = date.toISOString().split('T')[0];
  return `${name} - ${dateStr}`;
});

describe('Property 6: Drill-Down Member Count Matches List Length', () => {
  const mockOnClose = vi.fn();
  const mockOnMemberClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  /**
   * Property 6.1: Displayed count equals members array length
   * 
   * For any list of members passed to the modal, the displayed count
   * in the header should exactly match the length of the members array.
   * 
   * **Feature: ui-improvements-v2, Property 6: Drill-Down Member Count Matches List Length**
   * **Validates: Requirements 3.5**
   */
  it('should display count that matches the members array length', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(drillDownMemberArb, { minLength: 0, maxLength: 50, selector: m => m.id }),
        categoryArb,
        categoryLabelArb,
        serviceNameArb,
        memberIdArb, // serviceId
        (members, category, categoryLabel, serviceName, serviceId) => {
          cleanup();
          
          render(
            <AttendanceDrillDownModal
              isOpen={true}
              onClose={mockOnClose}
              category={category}
              categoryLabel={categoryLabel}
              serviceId={serviceId}
              serviceName={serviceName}
              members={members}
              isLoading={false}
              onMemberClick={mockOnMemberClick}
            />
          );

          // Find the count display element
          const countElement = screen.getByText(new RegExp(`${members.length} member`));
          expect(countElement).toBeInTheDocument();

          // Verify the exact count matches
          const expectedText = members.length === 1 ? '1 member' : `${members.length} members`;
          expect(countElement.textContent).toBe(expectedText);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.2: Member list renders correct number of items
   * 
   * For any list of members, the number of rendered member rows
   * should equal the length of the members array.
   * 
   * **Feature: ui-improvements-v2, Property 6: Drill-Down Member Count Matches List Length**
   * **Validates: Requirements 3.5**
   */
  it('should render the same number of member rows as members in the array', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(drillDownMemberArb, { minLength: 1, maxLength: 30, selector: m => m.id }),
        categoryArb,
        categoryLabelArb,
        serviceNameArb,
        memberIdArb,
        (members, category, categoryLabel, serviceName, serviceId) => {
          cleanup();
          
          const { container } = render(
            <AttendanceDrillDownModal
              isOpen={true}
              onClose={mockOnClose}
              category={category}
              categoryLabel={categoryLabel}
              serviceId={serviceId}
              serviceName={serviceName}
              members={members}
              isLoading={false}
              onMemberClick={mockOnMemberClick}
            />
          );

          // Count the number of member buttons (each member is rendered as a button)
          const memberButtons = container.querySelectorAll('button.w-full.text-left');
          expect(memberButtons.length).toBe(members.length);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.3: Empty members array shows zero count
   * 
   * When the members array is empty, the count should be 0.
   * 
   * **Feature: ui-improvements-v2, Property 6: Drill-Down Member Count Matches List Length**
   * **Validates: Requirements 3.5**
   */
  it('should show 0 members when array is empty', () => {
    fc.assert(
      fc.property(
        categoryArb,
        categoryLabelArb,
        serviceNameArb,
        memberIdArb,
        (category, categoryLabel, serviceName, serviceId) => {
          cleanup();
          
          render(
            <AttendanceDrillDownModal
              isOpen={true}
              onClose={mockOnClose}
              category={category}
              categoryLabel={categoryLabel}
              serviceId={serviceId}
              serviceName={serviceName}
              members={[]}
              isLoading={false}
              onMemberClick={mockOnMemberClick}
            />
          );

          // Find the count display element showing 0 members
          const countElement = screen.getByText('0 members');
          expect(countElement).toBeInTheDocument();

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Unit Tests for AttendanceDrillDownModal
 * Requirements: 7.1
 */
describe('AttendanceDrillDownModal Unit Tests', () => {
  const mockOnClose = vi.fn();
  const mockOnMemberClick = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    category: 'firstTimers' as AttendanceCategory,
    categoryLabel: 'First Timers',
    serviceId: 'recService123',
    serviceName: 'Sunday Service - 2024-01-07',
    members: [] as DrillDownMember[],
    isLoading: false,
    onMemberClick: mockOnMemberClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  describe('Modal open/close', () => {
    it('should not render when isOpen is false', () => {
      render(<AttendanceDrillDownModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<AttendanceDrillDownModal {...defaultProps} isOpen={true} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(<AttendanceDrillDownModal {...defaultProps} />);
      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when footer close button is clicked', () => {
      render(<AttendanceDrillDownModal {...defaultProps} />);
      const closeButtons = screen.getAllByText('Close');
      fireEvent.click(closeButtons[0]);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      render(<AttendanceDrillDownModal {...defaultProps} />);
      const backdrop = document.querySelector('.bg-black.bg-opacity-50');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onClose when Escape key is pressed', () => {
      render(<AttendanceDrillDownModal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Member list rendering', () => {
    const testMembers: DrillDownMember[] = [
      { id: 'rec1', fullName: 'John Doe', phone: '+1234567890', email: 'john@example.com', status: 'First Timer' },
      { id: 'rec2', fullName: 'Jane Smith', phone: '+0987654321', status: 'Returner' },
      { id: 'rec3', fullName: 'Bob Wilson', email: 'bob@example.com', status: 'Member' },
    ];

    it('should render all member names', () => {
      render(<AttendanceDrillDownModal {...defaultProps} members={testMembers} />);
      testMembers.forEach(member => {
        expect(screen.getByText(member.fullName)).toBeInTheDocument();
      });
    });

    it('should render member phone when available', () => {
      render(<AttendanceDrillDownModal {...defaultProps} members={testMembers} />);
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('+0987654321')).toBeInTheDocument();
    });

    it('should render member email when available', () => {
      render(<AttendanceDrillDownModal {...defaultProps} members={testMembers} />);
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });

    it('should render member status badges', () => {
      render(<AttendanceDrillDownModal {...defaultProps} members={testMembers} />);
      expect(screen.getByText('First Timer')).toBeInTheDocument();
      expect(screen.getByText('Returner')).toBeInTheDocument();
      expect(screen.getByText('Member')).toBeInTheDocument();
    });

    it('should show empty state when no members', () => {
      render(<AttendanceDrillDownModal {...defaultProps} members={[]} />);
      expect(screen.getByText(/no first timers found/i)).toBeInTheDocument();
    });
  });

  describe('Navigation to member journey', () => {
    const testMembers: DrillDownMember[] = [
      { id: 'rec123', fullName: 'John Doe', status: 'First Timer' },
    ];

    it('should call onMemberClick with correct member ID when member is clicked', () => {
      render(<AttendanceDrillDownModal {...defaultProps} members={testMembers} />);
      const memberButton = screen.getByText('John Doe').closest('button');
      if (memberButton) {
        fireEvent.click(memberButton);
        expect(mockOnMemberClick).toHaveBeenCalledWith('rec123');
      }
    });

    it('should call onClose after member click', () => {
      render(<AttendanceDrillDownModal {...defaultProps} members={testMembers} />);
      const memberButton = screen.getByText('John Doe').closest('button');
      if (memberButton) {
        fireEvent.click(memberButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('Loading state', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<AttendanceDrillDownModal {...defaultProps} isLoading={true} />);
      expect(screen.getByText('Loading members...')).toBeInTheDocument();
    });

    it('should not show member list when loading', () => {
      const testMembers: DrillDownMember[] = [
        { id: 'rec1', fullName: 'John Doe', status: 'First Timer' },
      ];
      render(<AttendanceDrillDownModal {...defaultProps} members={testMembers} isLoading={true} />);
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  describe('Header display', () => {
    it('should display category label in header', () => {
      render(<AttendanceDrillDownModal {...defaultProps} categoryLabel="First Timers" />);
      expect(screen.getByText('First Timers')).toBeInTheDocument();
    });

    it('should display service name in header', () => {
      render(<AttendanceDrillDownModal {...defaultProps} serviceName="Sunday Service - 2024-01-07" />);
      expect(screen.getByText('Sunday Service - 2024-01-07')).toBeInTheDocument();
    });

    it('should display correct member count', () => {
      const testMembers: DrillDownMember[] = [
        { id: 'rec1', fullName: 'John Doe', status: 'First Timer' },
        { id: 'rec2', fullName: 'Jane Smith', status: 'Returner' },
      ];
      render(<AttendanceDrillDownModal {...defaultProps} members={testMembers} />);
      expect(screen.getByText('2 members')).toBeInTheDocument();
    });

    it('should use singular "member" for count of 1', () => {
      const testMembers: DrillDownMember[] = [
        { id: 'rec1', fullName: 'John Doe', status: 'First Timer' },
      ];
      render(<AttendanceDrillDownModal {...defaultProps} members={testMembers} />);
      expect(screen.getByText('1 member')).toBeInTheDocument();
    });
  });
});
