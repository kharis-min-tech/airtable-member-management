import { useCallback } from 'react';

/**
 * Attendance category types for drill-down
 */
export type AttendanceCategory = 
  | 'firstTimers' 
  | 'returners' 
  | 'evangelismContacts' 
  | 'department';

/**
 * Member details for drill-down view
 * Requirements: 3.3
 */
export interface DrillDownMember {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  status: string;
}

/**
 * Props for AttendanceDrillDownModal component
 * Requirements: 3.2, 3.3, 3.4, 3.6
 */
interface AttendanceDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: AttendanceCategory;
  categoryLabel: string;
  serviceId: string;
  serviceName: string;
  members: DrillDownMember[];
  isLoading: boolean;
  onMemberClick: (memberId: string) => void;
}

/**
 * Get display label for attendance category
 */
function getCategoryDisplayLabel(category: AttendanceCategory, customLabel?: string): string {
  if (customLabel) return customLabel;
  
  switch (category) {
    case 'firstTimers':
      return 'First Timers';
    case 'returners':
      return 'Returners';
    case 'evangelismContacts':
      return 'Evangelism Contacts';
    case 'department':
      return 'Department Members';
    default:
      return 'Members';
  }
}

/**
 * AttendanceDrillDownModal - Modal component for displaying attendance drill-down
 * 
 * Requirements:
 * - 3.2: Display modal with list of members in selected category
 * - 3.3: Show member details (name, phone, email, status)
 * - 3.4: Allow navigation to member journey by clicking on name
 * - 3.6: Close button to return to summary view
 */
function AttendanceDrillDownModal({
  isOpen,
  onClose,
  category,
  categoryLabel,
  serviceName,
  members,
  isLoading,
  onMemberClick,
}: AttendanceDrillDownModalProps) {
  const displayLabel = getCategoryDisplayLabel(category, categoryLabel);
  
  // Defensive array check - Requirements: 2.5
  // Ensure members is always an array to prevent .length and .map errors
  const safeMembers = Array.isArray(members) ? members : [];
  
  const handleMemberClick = useCallback((memberId: string) => {
    onMemberClick(memberId);
    onClose();
  }, [onMemberClick, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h2 id="modal-title" className="text-lg font-semibold text-gray-800">
                {displayLabel}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {serviceName}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Member count - Requirements: 3.5 */}
              <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {safeMembers.length} {safeMembers.length === 1 ? 'member' : 'members'}
              </span>
              {/* Close button - Requirements: 3.6 */}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                aria-label="Close modal"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <LoadingState />
            ) : safeMembers.length === 0 ? (
              <EmptyState category={displayLabel} />
            ) : (
              <MemberList 
                members={safeMembers} 
                onMemberClick={handleMemberClick} 
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading state component
 */
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4" />
      <p className="text-gray-500">Loading members...</p>
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState({ category }: { category: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <UserGroupIcon className="w-12 h-12 mb-4" />
      <p className="text-lg">No {category.toLowerCase()} found</p>
      <p className="text-sm mt-1">There are no members in this category for this service</p>
    </div>
  );
}

/**
 * Member list component
 * Requirements: 3.3, 3.4, 2.5
 */
function MemberList({ 
  members, 
  onMemberClick 
}: { 
  members: DrillDownMember[]; 
  onMemberClick: (memberId: string) => void;
}) {
  // Defensive array check - Requirements: 2.5
  // Default to empty array if members prop is invalid
  const safeMembers = Array.isArray(members) ? members : [];
  
  return (
    <div className="space-y-2">
      {safeMembers.map((member) => (
        <MemberRow 
          key={member.id} 
          member={member} 
          onClick={() => onMemberClick(member.id)} 
        />
      ))}
    </div>
  );
}

/**
 * Individual member row component
 * Requirements: 3.3 - Show member details (name, phone, email, status)
 * Requirements: 3.4 - Click to navigate to member journey
 */
function MemberRow({ 
  member, 
  onClick 
}: { 
  member: DrillDownMember; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {/* Full Name - Requirements: 3.3 */}
          <p className="font-medium text-gray-800 group-hover:text-blue-600 truncate">
            {member.fullName}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
            {/* Phone - Requirements: 3.3 */}
            {member.phone && (
              <span className="flex items-center gap-1">
                <PhoneIcon className="w-4 h-4" />
                {member.phone}
              </span>
            )}
            {/* Email - Requirements: 3.3 */}
            {member.email && (
              <span className="flex items-center gap-1 truncate">
                <EmailIcon className="w-4 h-4" />
                {member.email}
              </span>
            )}
          </div>
        </div>
        {/* Status - Requirements: 3.3 */}
        <div className="flex items-center gap-2 ml-4">
          <StatusBadge status={member.status} />
          <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
        </div>
      </div>
    </button>
  );
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'First Timer':
        return 'bg-blue-100 text-blue-800';
      case 'Returner':
        return 'bg-green-100 text-green-800';
      case 'Evangelism Contact':
        return 'bg-purple-100 text-purple-800';
      case 'Member':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
      {status}
    </span>
  );
}

// Icons
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default AttendanceDrillDownModal;
