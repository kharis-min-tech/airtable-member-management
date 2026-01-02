import { useState, useMemo } from 'react';
import type { AttendanceBreakdown } from '../../types';

interface AttendeesListCardProps {
  breakdown: AttendanceBreakdown | null;
  isLoading?: boolean;
}

type FilterType = 'all' | 'firstTimers' | 'returners' | 'evangelismContacts' | 'departments';

function AttendeesListCard({ breakdown, isLoading = false }: AttendeesListCardProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const stats = useMemo(() => {
    if (!breakdown) return null;
    return {
      total: breakdown.totalAttendance,
      firstTimers: breakdown.firstTimers,
      returners: breakdown.returners,
      evangelismContacts: breakdown.evangelismContacts,
      departmentMembers: breakdown.departments.reduce((sum, d) => sum + d.count, 0),
    };
  }, [breakdown]);

  const filterButtons: { key: FilterType; label: string; count: number }[] = useMemo(() => {
    if (!stats) return [];
    return [
      { key: 'all', label: 'All', count: stats.total },
      { key: 'firstTimers', label: 'First Timers', count: stats.firstTimers },
      { key: 'returners', label: 'Returners', count: stats.returners },
      { key: 'evangelismContacts', label: 'Evangelism Contacts', count: stats.evangelismContacts },
      { key: 'departments', label: 'By Department', count: stats.departmentMembers },
    ];
  }, [stats]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Attendees</h2>
        <div className="animate-pulse space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!breakdown) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Attendees</h2>
        <div className="h-48 flex items-center justify-center text-gray-400">
          Select a service to view attendees
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Attendees</h2>
        <span className="text-sm text-gray-500">{breakdown.serviceName}</span>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              filter === btn.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {btn.label} ({btn.count})
          </button>
        ))}
      </div>

      {/* Stats display based on filter */}
      <div className="border rounded-lg overflow-hidden">
        {filter === 'all' && (
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBox label="Total Attendance" value={stats?.total || 0} color="blue" />
              <StatBox label="First Timers" value={stats?.firstTimers || 0} color="green" />
              <StatBox label="Returners" value={stats?.returners || 0} color="purple" />
              <StatBox label="Evangelism Contacts" value={stats?.evangelismContacts || 0} color="orange" />
            </div>
          </div>
        )}

        {filter === 'firstTimers' && (
          <div className="p-4">
            <div className="text-center py-8">
              <p className="text-4xl font-bold text-green-600">{stats?.firstTimers || 0}</p>
              <p className="text-gray-500 mt-2">First Timers attended this service</p>
            </div>
          </div>
        )}

        {filter === 'returners' && (
          <div className="p-4">
            <div className="text-center py-8">
              <p className="text-4xl font-bold text-purple-600">{stats?.returners || 0}</p>
              <p className="text-gray-500 mt-2">Returners attended this service</p>
            </div>
          </div>
        )}

        {filter === 'evangelismContacts' && (
          <div className="p-4">
            <div className="text-center py-8">
              <p className="text-4xl font-bold text-orange-600">{stats?.evangelismContacts || 0}</p>
              <p className="text-gray-500 mt-2">Evangelism Contacts attended this service</p>
            </div>
          </div>
        )}

        {filter === 'departments' && (
          <div className="divide-y">
            {breakdown.departments.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No department data available
              </div>
            ) : (
              breakdown.departments.map((dept) => (
                <div key={dept.departmentId} className="p-3 flex justify-between items-center hover:bg-gray-50">
                  <span className="font-medium text-gray-700">{dept.departmentName}</span>
                  <span className="text-blue-600 font-semibold">{dept.count}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatBox({ label, value, color }: StatBoxProps) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  };

  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export default AttendeesListCard;
