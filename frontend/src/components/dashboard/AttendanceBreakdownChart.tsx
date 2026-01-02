import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import type { ServiceKPIs } from '../../types';

interface AttendanceBreakdownChartProps {
  kpis: ServiceKPIs | null;
  isLoading?: boolean;
}

const COLORS = {
  'First Timers': '#3B82F6', // blue-500
  'Returners': '#10B981', // green-500
  'Evangelism Contacts': '#8B5CF6', // purple-500
  'Department Members': '#F59E0B', // amber-500
  'Other': '#6B7280', // gray-500
};

function AttendanceBreakdownChart({ kpis, isLoading = false }: AttendanceBreakdownChartProps) {
  const chartData = useMemo(() => {
    if (!kpis) return [];

    // Build chart data from KPIs
    const data = [
      { name: 'First Timers', count: kpis.firstTimersCount },
      { name: 'Returners', count: kpis.returnersCount },
    ];

    // Add department breakdown
    if (kpis.departmentBreakdown && kpis.departmentBreakdown.length > 0) {
      kpis.departmentBreakdown.forEach((dept) => {
        data.push({
          name: dept.department,
          count: dept.count,
        });
      });
    }

    return data;
  }, [kpis]);

  const getBarColor = (name: string) => {
    if (name in COLORS) {
      return COLORS[name as keyof typeof COLORS];
    }
    // For departments, use amber color
    return COLORS['Department Members'];
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Attendance Breakdown</h2>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="h-32 w-full bg-gray-200 rounded"></div>
            <div className="h-4 w-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!kpis || chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Attendance Breakdown</h2>
        <div className="h-64 flex items-center justify-center text-gray-400">
          Select a service to view attendance breakdown
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Attendance Breakdown</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value) => [value, 'Count']}
            />
            <Legend />
            <Bar dataKey="count" name="Attendees" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Total Attendance:</span>
          <span className="font-semibold text-gray-800">{kpis.totalAttendance}</span>
        </div>
      </div>
    </div>
  );
}

export default AttendanceBreakdownChart;
