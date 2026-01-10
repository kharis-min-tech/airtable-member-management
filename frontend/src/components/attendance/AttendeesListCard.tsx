import { useState, useMemo } from 'react';
import type { AttendanceBreakdown } from '../../types';
import { Card } from '../tailus-ui/Card';
import { Button } from '../tailus-ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../tailus-ui/Table';
import { LoadingSpinner } from '../LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Users } from 'lucide-react';

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
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">Attendees</h2>
        <div className="animate-pulse space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-48 flex items-center justify-center">
            <LoadingSpinner text="Loading attendees..." />
          </div>
        </div>
      </Card>
    );
  }

  if (!breakdown) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">Attendees</h2>
        <EmptyState
          icon={Users}
          title="No service selected"
          description="Select a service to view attendees"
        />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">Attendees</h2>
        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{breakdown.serviceName}</span>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filterButtons.map((btn) => (
          <Button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            variant={filter === btn.key ? 'primary' : 'secondary'}
            size="sm"
            className="rounded-full"
          >
            {btn.label} ({btn.count})
          </Button>
        ))}
      </div>

      {/* Stats display based on filter */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
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
              <p className="text-4xl font-bold text-green-600 dark:text-green-400">{stats?.firstTimers || 0}</p>
              <p className="text-text-secondary-light dark:text-text-secondary-dark mt-2">First Timers attended this service</p>
            </div>
          </div>
        )}

        {filter === 'returners' && (
          <div className="p-4">
            <div className="text-center py-8">
              <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{stats?.returners || 0}</p>
              <p className="text-text-secondary-light dark:text-text-secondary-dark mt-2">Returners attended this service</p>
            </div>
          </div>
        )}

        {filter === 'evangelismContacts' && (
          <div className="p-4">
            <div className="text-center py-8">
              <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">{stats?.evangelismContacts || 0}</p>
              <p className="text-text-secondary-light dark:text-text-secondary-dark mt-2">Evangelism Contacts attended this service</p>
            </div>
          </div>
        )}

        {filter === 'departments' && (
          <>
            {breakdown.departments.length === 0 ? (
              <div className="p-4 text-center text-text-secondary-light dark:text-text-secondary-dark">
                No department data available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell header>Department</TableCell>
                    <TableCell header>Count</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.departments.map((dept) => (
                    <TableRow key={dept.departmentId}>
                      <TableCell className="font-medium">{dept.departmentName}</TableCell>
                      <TableCell className="text-primary dark:text-primary-dark font-semibold">{dept.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatBox({ label, value, color }: StatBoxProps) {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
  };

  return (
    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">{label}</p>
    </div>
  );
}

export default AttendeesListCard;
