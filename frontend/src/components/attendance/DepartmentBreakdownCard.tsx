import { useMemo } from 'react';
import type { DepartmentAttendance } from '../../types';

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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Department Breakdown</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!departments) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Department Breakdown</h2>
        <div className="h-64 flex items-center justify-center text-gray-400">
          Select a service to view department breakdown
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Department Breakdown</h2>
        {stats && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">
              Avg: <span className="font-medium text-gray-700">{stats.avgPercentage}%</span>
            </span>
            {stats.belowThreshold > 0 && (
              <span className="text-red-600">
                {stats.belowThreshold} below {threshold}%
              </span>
            )}
          </div>
        )}
      </div>

      {sortedDepartments.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400">
          No department data available for this service
        </div>
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
      <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Above {threshold}%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Below {threshold}%</span>
        </div>
      </div>
    </div>
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
  const textColor = isBelowThreshold ? 'text-red-600' : 'text-green-600';

  return (
    <div
      className={`p-3 rounded-lg border ${
        isBelowThreshold ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-700">{department.departmentName}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {department.presentCount} / {department.activeMemberCount}
          </span>
          <span className={`font-semibold ${textColor}`}>{percentage}%</span>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

export default DepartmentBreakdownCard;
