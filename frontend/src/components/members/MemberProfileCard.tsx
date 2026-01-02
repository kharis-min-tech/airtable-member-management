import type { Member } from '../../types';

interface MemberProfileCardProps {
  member: Member | null;
  isLoading?: boolean;
}

function MemberProfileCard({ member, isLoading = false }: MemberProfileCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-3">
              <div className="h-6 w-48 bg-gray-200 rounded"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="flex gap-2">
                <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
                <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 bg-gray-200 rounded"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-32 flex items-center justify-center text-gray-400">
          Select a member to view their profile
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    'Member': 'bg-green-100 text-green-800',
    'First Timer': 'bg-blue-100 text-blue-800',
    'Returner': 'bg-purple-100 text-purple-800',
    'Evangelism Contact': 'bg-orange-100 text-orange-800',
  };

  const followUpStatusColors: Record<string, string> = {
    'Not Started': 'bg-gray-100 text-gray-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Contacted': 'bg-blue-100 text-blue-800',
    'Visiting': 'bg-indigo-100 text-indigo-800',
    'Integrated': 'bg-green-100 text-green-800',
    'Established': 'bg-emerald-100 text-emerald-800',
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return '--';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header with avatar and basic info */}
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {member.firstName?.[0]?.toUpperCase() || '?'}
          {member.lastName?.[0]?.toUpperCase() || ''}
        </div>

        {/* Basic info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">{member.fullName}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Member since {formatDate(member.dateFirstCaptured)}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[member.status] || 'bg-gray-100 text-gray-800'}`}>
              {member.status}
            </span>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${followUpStatusColors[member.followUpStatus] || 'bg-gray-100 text-gray-800'}`}>
              {member.followUpStatus}
            </span>
            {member.waterBaptized && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-cyan-100 text-cyan-800">
                Baptized
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoField label="Phone" value={member.phone} icon={<PhoneIcon />} />
          <InfoField label="Email" value={member.email} icon={<EmailIcon />} />
          <InfoField label="Address" value={member.address} icon={<LocationIcon />} />
          <InfoField label="GhanaPost Code" value={member.ghanaPostCode} icon={<MapPinIcon />} />
        </div>
      </div>


      {/* Personal Details */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Personal Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoField label="Gender" value={member.gender} />
          <InfoField label="Date of Birth" value={formatDate(member.dob)} />
          <InfoField label="Source" value={member.source} />
          <InfoField label="Follow-up Owner" value={member.followUpOwnerName || member.followUpOwner} />
        </div>
      </div>

      {/* Milestones */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Milestones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MilestoneField 
            label="Water Baptism" 
            completed={member.waterBaptized} 
            date={member.waterBaptismDate ? formatDate(member.waterBaptismDate) : undefined}
          />
          <MilestoneField 
            label="Membership Completed" 
            completed={!!member.membershipCompleted} 
            date={member.membershipCompleted ? formatDate(member.membershipCompleted) : undefined}
          />
          <MilestoneField 
            label="Spiritual Maturity" 
            completed={!!member.spiritualMaturityCompleted} 
            date={member.spiritualMaturityCompleted ? formatDate(member.spiritualMaturityCompleted) : undefined}
          />
          <MilestoneField 
            label="Holy Spirit Baptism" 
            completed={member.holySpritBaptism} 
          />
        </div>
      </div>

      {/* Departments */}
      {member.departments && member.departments.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Departments</h3>
          <div className="flex flex-wrap gap-2">
            {member.departments.map((dept, index) => (
              <span key={index} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full">
                {dept}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {member.notes && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{member.notes}</p>
        </div>
      )}
    </div>
  );
}

interface InfoFieldProps {
  label: string;
  value?: string;
  icon?: React.ReactNode;
}

function InfoField({ label, value, icon }: InfoFieldProps) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-gray-400 mt-0.5">{icon}</span>}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value || '--'}</p>
      </div>
    </div>
  );
}

interface MilestoneFieldProps {
  label: string;
  completed?: boolean;
  date?: string;
}

function MilestoneField({ label, completed, date }: MilestoneFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${completed ? 'bg-green-100' : 'bg-gray-100'}`}>
        {completed ? (
          <CheckIcon className="w-3 h-3 text-green-600" />
        ) : (
          <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {date && <p className="text-xs text-gray-500">{date}</p>}
      </div>
    </div>
  );
}

// Icons
function PhoneIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default MemberProfileCard;
