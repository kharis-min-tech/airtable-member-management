import { useMemo } from 'react';
import type { DepartmentAttendance } from '../../types';
import { Card } from '../tailus-ui/Card';
import { LoadingSpinner } from '../LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Building2 } from 'lucide-react';

interface DepartmentBreakdownCardProps {
  departments: DepartmentAttendance[] | null;
  isLoading?: boolean;
  threshold?: number;
}

function DepartmentBreakdownCard({
  departments,
  isLoading = false,
  threshold = 50,
}: DepartmentBreakdownCardProps) {
  const sortedDepartments = useMemo(() => {
    if (!departments) return [];
    return [...departments].sort((a, b) => b.attendancePercentage - a.attendancePercentage);
  }, [departments]);

  const stats = useMemo(() => {
    if (!departments || departments.length === 0) return null;
    const belowThreshold = departments.filter((d) => d.belowThreshold).length;
    const avgPercentage =
      departments.reduce((sum, d) => sum + d.attendancePercentage, 0) / departments.length;
    return {
      totalDepartments: departments.length,
      belowThreshold,
      avgPercentage: Math.round(avgPercentage * 10) / 10,
    };
  }, [departments]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">Department Breakdown</h2>
        <div className="h-64 flex items-center justify-center">
          <LoadingSpinner text="Loading departments..." />
        </div>
      </Card>
    );
  }

  if (!departments) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">Department Breakdown</h2>
        <EmptyState
          icon={Building2}
          title="No service selected"
          description="Select a service to view department breakdown"
        />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">Department Breakdown</h2>
        {stats && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-text-secondary-light dark:text-text-secondary-dark">
              Avg: <span className="font-medium text-text-primary-light dark:text-text-primary-dark">{stats.avgPercentage}%</span>
            </span>
            {stats.belowThreshold > 0 && (
              <span className="text-red-600 dark:text-red-400">
                {stats.belowThreshold} below {threshold}%
              </span>
            )}
          </div>
        )}
      </div>

      {sortedDepartments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No department data"
          description="No department data available for this service"
        />
      ) : (
        <div className="space-y-3">
          {sortedDepartments.map((dept) => (
            <DepartmentRow
              key={dept.departmentId}
              department={dept}
              threshold={threshold}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs text-text-secondary-light dark:text-text-secondary-dark">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Above {threshold}%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Below {threshold}%</span>
        </div>
      </div>
    </Card>
  );
}

interface DepartmentRowProps {
  department: DepartmentAttendance;
  threshold: number;
}

function DepartmentRow({ department, threshold }: DepartmentRowProps) {
  const percentage = Math.round(department.attendancePercentage * 10) / 10;
  const isBelowThreshold = department.attendancePercentage < threshold;
  const barColor = isBelowThreshold ? 'bg-red-500' : 'bg-green-500';
  const textColor = isBelowThreshold ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';

  return (
    <div
      className={`p-3 rounded-lg border ${
        isBelowThreshold ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-text-secondary-light dark:text-text-secondary-dark">{department.departmentName}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            {department.presentCount} / {department.activeMemberCount}
          </span>
          <span className={`font-semibold ${textColor}`}>{percentage}%</span>
        </div>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

export default DepartmentBreakdownCard;
