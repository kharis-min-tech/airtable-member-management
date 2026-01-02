import type { JourneySummary } from '../../types';

interface JourneySummaryCardProps {
  summary: JourneySummary | null;
  isLoading?: boolean;
}

function JourneySummaryCard({ summary, isLoading = false }: JourneySummaryCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Journey Summary</h2>
        <div className="animate-pulse grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-gray-200 rounded"></div>
              <div className="h-5 w-24 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Journey Summary</h2>
        <div className="h-24 flex items-center justify-center text-gray-400">
          Select a member to view their journey summary
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return '--';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const calculateDaysSince = (date: Date | string | undefined): string => {
    if (!date) return '--';
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const summaryItems = [
    {
      label: 'First Evangelised',
      value: formatDate(summary.firstEvangelised),
      subValue: summary.firstEvangelised ? calculateDaysSince(summary.firstEvangelised) : undefined,
      icon: <MegaphoneIcon />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'First Visited',
      value: formatDate(summary.firstVisited),
      subValue: summary.firstVisited ? calculateDaysSince(summary.firstVisited) : undefined,
      icon: <HomeIcon />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'First Attended',
      value: formatDate(summary.firstAttended),
      subValue: summary.firstAttended ? calculateDaysSince(summary.firstAttended) : undefined,
      icon: <CalendarIcon />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Last Attended',
      value: formatDate(summary.lastAttended),
      subValue: summary.lastAttended ? calculateDaysSince(summary.lastAttended) : undefined,
      icon: <ClockIcon />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Total Visits',
      value: summary.visitsCount.toString(),
      subValue: summary.visitsCount === 1 ? 'home visit' : 'home visits',
      icon: <HashIcon />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      label: 'Follow-up Person',
      value: summary.assignedFollowUpPerson || '--',
      icon: <UserIcon />,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Journey Summary</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {summaryItems.map((item, index) => (
          <div key={index} className={`${item.bgColor} rounded-lg p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={item.color}>{item.icon}</span>
              <span className="text-xs font-medium text-gray-500">{item.label}</span>
            </div>
            <p className={`text-sm font-semibold ${item.color}`}>{item.value}</p>
            {item.subValue && (
              <p className="text-xs text-gray-500 mt-0.5">{item.subValue}</p>
            )}
          </div>
        ))}
      </div>

      {/* Journey Progress Bar */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Journey Progress</h3>
        <JourneyProgressBar summary={summary} />
      </div>
    </div>
  );
}

interface JourneyProgressBarProps {
  summary: JourneySummary;
}

function JourneyProgressBar({ summary }: JourneyProgressBarProps) {
  const stages = [
    { label: 'Evangelised', completed: !!summary.firstEvangelised },
    { label: 'Visited', completed: !!summary.firstVisited },
    { label: 'Attended', completed: !!summary.firstAttended },
    { label: 'Follow-up Assigned', completed: !!summary.assignedFollowUpPerson },
  ];

  const completedCount = stages.filter(s => s.completed).length;
  const progressPercentage = (completedCount / stages.length) * 100;

  return (
    <div>
      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-gray-200 rounded-full">
          <div 
            className="h-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        {/* Stage markers */}
        <div className="flex justify-between mt-2">
          {stages.map((stage, index) => (
            <div key={index} className="flex flex-col items-center" style={{ width: `${100 / stages.length}%` }}>
              <div className={`w-4 h-4 rounded-full border-2 ${
                stage.completed 
                  ? 'bg-green-500 border-green-500' 
                  : 'bg-white border-gray-300'
              } flex items-center justify-center -mt-5`}>
                {stage.completed && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className={`text-xs mt-1 text-center ${stage.completed ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                {stage.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Icons
function MegaphoneIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function HashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export default JourneySummaryCard;
