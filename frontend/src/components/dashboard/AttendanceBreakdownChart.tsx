import { useMemo, useCallback } from 'react';
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
import type { AttendanceCategory } from './AttendanceDrillDownModal';
import { useTheme } from '../../contexts/ThemeContext';
import { Card } from '../tailus-ui';

/**
 * Chart data item with category information for drill-down
 */
interface ChartDataItem {
  name: string;
  count: number;
  category: AttendanceCategory;
  departmentId?: string;
}

interface AttendanceBreakdownChartProps {
  kpis: ServiceKPIs | null;
  isLoading?: boolean;
  serviceId?: string | null;
  /**
   * Callback when a category bar is clicked for drill-down
   * Requirements: 3.1
   */
  onCategoryClick?: (category: AttendanceCategory, categoryLabel: string, departmentId?: string) => void;
}

// Modern color palette with complementary colors
const COLORS_LIGHT = {
  'First Timers': '#1e3a5f', // primary navy
  'Returners': '#06b6d4', // secondary teal
  'Members': '#10b981', // green
  'Children': '#f59e0b', // accent gold
  'Visitors': '#8b5cf6', // violet
  'Department Members': '#a855f7', // tertiary purple
  'Other': '#6B7280', // gray-500
};

const COLORS_DARK = {
  'First Timers': '#60a5fa', // primary-dark (brighter blue)
  'Returners': '#22d3ee', // secondary-400 (brighter teal)
  'Members': '#34d399', // green-400
  'Children': '#fbbf24', // accent-light (brighter gold)
  'Visitors': '#a78bfa', // violet-400
  'Department Members': '#c084fc', // tertiary-400 (brighter purple)
  'Other': '#94a3b8', // gray-400
};

function AttendanceBreakdownChart({ kpis, isLoading = false, serviceId, onCategoryClick }: AttendanceBreakdownChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;
  
  const chartData = useMemo((): ChartDataItem[] => {
    if (!kpis) return [];

    // Build chart data from KPIs with category information for drill-down
    // Note: Evangelism Contacts are excluded as they are not attendees
    const data: ChartDataItem[] = [
      { name: 'First Timers', count: kpis.firstTimersCount, category: 'firstTimers' },
      { name: 'Returners', count: kpis.returnersCount, category: 'returners' },
      { name: 'Members', count: kpis.membersCount, category: 'members' },
      { name: 'Children', count: kpis.childrenCount, category: 'children' },
      { name: 'Visitors', count: kpis.visitorsCount, category: 'visitors' },
    ];

    return data;
  }, [kpis]);

  /**
   * Handle bar click for drill-down
   * Requirements: 3.1 - Click on any category to drill down
   */
  const handleBarClick = useCallback((data: ChartDataItem) => {
    if (onCategoryClick && serviceId) {
      onCategoryClick(data.category, data.name, data.departmentId);
    }
  }, [onCategoryClick, serviceId]);

  const getBarColor = (name: string) => {
    if (name in COLORS) {
      return COLORS[name as keyof typeof COLORS];
    }
    // For departments, use amber color
    return COLORS['Department Members'];
  };

  if (isLoading) {
    return (
      <Card variant="default">
        <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">Attendance Breakdown</h2>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="h-32 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (!kpis || chartData.length === 0) {
    return (
      <Card variant="default">
        <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">Attendance Breakdown</h2>
        <div className="h-64 flex items-center justify-center text-text-secondary-light dark:text-text-secondary-dark">
          Select a service to view attendance breakdown
        </div>
      </Card>
    );
  }

  // Theme-aware colors for chart elements
  const gridColor = isDark ? '#374151' : '#E5E7EB';
  const textColor = isDark ? '#94a3b8' : '#6B7280';
  const tooltipBg = isDark ? '#1e293b' : '#fff';
  const tooltipBorder = isDark ? '#374151' : '#E5E7EB';

  return (
    <Card variant="default">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">Attendance Breakdown</h2>
        {onCategoryClick && serviceId && (
          <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Click bars to view members</span>
        )}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
            onClick={(state) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const chartState = state as any;
              if (chartState?.activePayload && chartState.activePayload.length > 0) {
                const payload = chartState.activePayload[0].payload as ChartDataItem;
                if (onCategoryClick && serviceId) {
                  onCategoryClick(payload.category, payload.name, payload.departmentId);
                }
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: textColor }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: textColor }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                color: textColor,
              }}
              formatter={(value) => [value, 'Count']}
            />
            <Legend />
            <Bar 
              dataKey="count" 
              name="Attendees" 
              radius={[4, 4, 0, 0]}
              cursor={onCategoryClick && serviceId ? 'pointer' : 'default'}
              onClick={(data: { payload?: ChartDataItem } | null) => {
                console.log('Bar clicked:', data);
                if (data?.payload) {
                  console.log('Calling handleBarClick with:', data.payload);
                  handleBarClick(data.payload);
                }
              }}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary-light dark:text-text-secondary-dark">Total Attendance:</span>
          <span className="font-semibold text-accent dark:text-accent-light">{kpis.totalAttendance}</span>
        </div>
      </div>
    </Card>
  );
}

export default AttendanceBreakdownChart;
