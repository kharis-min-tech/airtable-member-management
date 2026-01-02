import { useState, useCallback, useMemo } from 'react';
import {
  KPITilesSection,
  ServiceSelector,
  EvangelismStatsCard,
  AttendanceBreakdownChart,
  SoulsAssignedTable,
  FollowUpCommentsTable,
} from '../../components/dashboard';
import { DataRefreshControls } from '../../components/common';
import type {
  Service,
  ServiceKPIs,
  EvangelismStats,
  SoulsAssignedByVolunteer,
  FollowUpInteraction,
} from '../../types';

// Mock data
const mockServices: Service[] = [
  { id: '1', serviceName: 'Sunday Service', serviceDate: new Date('2026-01-04'), serviceCode: '2026-01-04-SUN' },
  { id: '2', serviceName: 'Sunday Service', serviceDate: new Date('2025-12-28'), serviceCode: '2025-12-28-SUN' },
  { id: '3', serviceName: 'Midweek Service', serviceDate: new Date('2025-12-31'), serviceCode: '2025-12-31-MID' },
  { id: '4', serviceName: 'Sunday Service', serviceDate: new Date('2025-12-21'), serviceCode: '2025-12-21-SUN' },
  { id: '5', serviceName: 'Christmas Service', serviceDate: new Date('2025-12-25'), serviceCode: '2025-12-25-XMAS' },
];

const mockKPIs: Record<string, ServiceKPIs> = {
  '1': {
    totalAttendance: 245,
    firstTimersCount: 12,
    returnersCount: 8,
    departmentBreakdown: [
      { department: 'Choir', count: 35 },
      { department: 'Ushers', count: 22 },
      { department: 'Media', count: 15 },
      { department: 'Children', count: 28 },
      { department: 'Youth', count: 45 },
    ],
  },
  '2': {
    totalAttendance: 198,
    firstTimersCount: 7,
    returnersCount: 5,
    departmentBreakdown: [
      { department: 'Choir', count: 30 },
      { department: 'Ushers', count: 18 },
      { department: 'Media', count: 12 },
      { department: 'Children', count: 25 },
      { department: 'Youth', count: 38 },
    ],
  },
  '3': {
    totalAttendance: 85,
    firstTimersCount: 3,
    returnersCount: 2,
    departmentBreakdown: [
      { department: 'Choir', count: 15 },
      { department: 'Ushers', count: 8 },
      { department: 'Media', count: 6 },
    ],
  },
  '4': {
    totalAttendance: 210,
    firstTimersCount: 9,
    returnersCount: 6,
    departmentBreakdown: [
      { department: 'Choir', count: 32 },
      { department: 'Ushers', count: 20 },
      { department: 'Media', count: 14 },
      { department: 'Children', count: 26 },
      { department: 'Youth', count: 42 },
    ],
  },
  '5': {
    totalAttendance: 320,
    firstTimersCount: 25,
    returnersCount: 15,
    departmentBreakdown: [
      { department: 'Choir', count: 45 },
      { department: 'Ushers', count: 30 },
      { department: 'Media', count: 18 },
      { department: 'Children', count: 40 },
      { department: 'Youth', count: 55 },
    ],
  },
};

const mockEvangelismStats: Record<'week' | 'month', EvangelismStats> = {
  week: {
    period: 'week',
    contactCount: 18,
    startDate: new Date('2025-12-28'),
    endDate: new Date('2026-01-03'),
  },
  month: {
    period: 'month',
    contactCount: 67,
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-31'),
  },
};

const mockSoulsAssigned: SoulsAssignedByVolunteer[] = [
  {
    volunteerId: 'v1',
    volunteerName: 'John Mensah',
    members: [
      { id: 'm1', name: 'Kwame Asante', status: 'First Timer', phone: '0244123456', assignedDate: new Date('2025-12-28') },
      { id: 'm2', name: 'Ama Serwaa', status: 'Evangelism Contact', phone: '0201234567', assignedDate: new Date('2025-12-25') },
      { id: 'm3', name: 'Kofi Boateng', status: 'First Timer', phone: '0551234567', assignedDate: new Date('2025-12-20') },
    ],
  },
  {
    volunteerId: 'v2',
    volunteerName: 'Grace Owusu',
    members: [
      { id: 'm4', name: 'Abena Darko', status: 'Returner', phone: '0271234567', assignedDate: new Date('2025-12-30') },
      { id: 'm5', name: 'Yaw Mensah', status: 'Evangelism Contact', phone: '0541234567', assignedDate: new Date('2025-12-22') },
    ],
  },
  {
    volunteerId: 'v3',
    volunteerName: 'Emmanuel Adjei',
    members: [
      { id: 'm6', name: 'Akua Frimpong', status: 'First Timer', phone: '0231234567', assignedDate: new Date('2025-12-29') },
      { id: 'm7', name: 'Kwesi Appiah', status: 'Evangelism Contact', phone: '0501234567', assignedDate: new Date('2025-12-27') },
      { id: 'm8', name: 'Efua Mensah', status: 'First Timer', phone: '0261234567', assignedDate: new Date('2025-12-26') },
      { id: 'm9', name: 'Nana Yaw', status: 'Returner', phone: '0571234567', assignedDate: new Date('2025-12-24') },
    ],
  },
  {
    volunteerId: 'v4',
    volunteerName: 'Priscilla Agyemang',
    members: [
      { id: 'm10', name: 'Adwoa Sarpong', status: 'First Timer', phone: '0241234567', assignedDate: new Date('2025-12-31') },
    ],
  },
];

const mockFollowUpComments: FollowUpInteraction[] = [
  { id: 'c1', memberId: 'm1', memberName: 'Kwame Asante', volunteerId: 'v1', volunteerName: 'John Mensah', date: new Date('2026-01-02T10:30:00'), comment: 'Called and spoke with him. He is excited about the church and wants to join a cell group.' },
  { id: 'c2', memberId: 'm2', memberName: 'Ama Serwaa', volunteerId: 'v1', volunteerName: 'John Mensah', date: new Date('2026-01-01T14:15:00'), comment: 'Visited her home. She has some questions about baptism. Will follow up next week.' },
  { id: 'c3', memberId: 'm4', memberName: 'Abena Darko', volunteerId: 'v2', volunteerName: 'Grace Owusu', date: new Date('2025-12-31T09:00:00'), comment: 'She attended the New Year service. Very happy to be back in church.' },
  { id: 'c4', memberId: 'm6', memberName: 'Akua Frimpong', volunteerId: 'v3', volunteerName: 'Emmanuel Adjei', date: new Date('2025-12-30T16:45:00'), comment: 'First call made. She is interested in the youth ministry.' },
  { id: 'c5', memberId: 'm7', memberName: 'Kwesi Appiah', volunteerId: 'v3', volunteerName: 'Emmanuel Adjei', date: new Date('2025-12-29T11:20:00'), comment: 'Met him at the market. Reminded him about Sunday service.' },
  { id: 'c6', memberId: 'm3', memberName: 'Kofi Boateng', volunteerId: 'v1', volunteerName: 'John Mensah', date: new Date('2025-12-28T15:00:00'), comment: 'Home visit completed. Family is very welcoming. Prayed with them.' },
  { id: 'c7', memberId: 'm5', memberName: 'Yaw Mensah', volunteerId: 'v2', volunteerName: 'Grace Owusu', date: new Date('2025-12-27T10:00:00'), comment: 'Phone was off. Will try again tomorrow.' },
  { id: 'c8', memberId: 'm8', memberName: 'Efua Mensah', volunteerId: 'v3', volunteerName: 'Emmanuel Adjei', date: new Date('2025-12-26T13:30:00'), comment: 'She confirmed she will attend the Christmas service with her family.' },
];

function DemoDashboard() {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>('1');
  const [evangelismPeriod, setEvangelismPeriod] = useState<'week' | 'month'>('week');
  const [commentsDateRange, setCommentsDateRange] = useState(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return {
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    };
  });
  const [isLive, setIsLive] = useState(false);

  const kpis = selectedServiceId ? mockKPIs[selectedServiceId] || null : null;
  const evangelismStats = mockEvangelismStats[evangelismPeriod];

  const filteredComments = useMemo(() => {
    const start = new Date(commentsDateRange.startDate);
    const end = new Date(commentsDateRange.endDate);
    end.setHours(23, 59, 59, 999);
    return mockFollowUpComments.filter((c) => {
      const date = new Date(c.date);
      return date >= start && date <= end;
    });
  }, [commentsDateRange]);

  const handleServiceChange = useCallback((serviceId: string) => {
    setSelectedServiceId(serviceId || null);
  }, []);

  const handlePeriodChange = useCallback((period: 'week' | 'month') => {
    setEvangelismPeriod(period);
  }, []);

  const handleCommentsDateRangeChange = useCallback(
    (startDate: string, endDate: string) => {
      setCommentsDateRange({ startDate, endDate });
    },
    []
  );

  const handleRefresh = useCallback(() => {
    alert('Refresh clicked! In demo mode, data is static.');
  }, []);

  const lastUpdated = useMemo(() => new Date(), []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Demo Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            <strong>Demo Mode:</strong> This dashboard is showing mock data for preview purposes.
          </p>
        </div>

        {/* Page header */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Pastor Dashboard</h1>
            <p className="text-gray-600">Welcome back, pastor@church.org</p>
          </div>
          <DataRefreshControls
            lastUpdated={lastUpdated}
            isLoading={false}
            isLive={isLive}
            onToggleLive={() => setIsLive(!isLive)}
            onRefresh={handleRefresh}
            timestampFormat="time"
          />
        </div>

        {/* Service selector */}
        <div className="bg-white rounded-lg shadow p-4">
          <ServiceSelector
            services={mockServices}
            selectedServiceId={selectedServiceId}
            onServiceChange={handleServiceChange}
            isLoading={false}
            label="Select Service for KPIs"
          />
        </div>

        {/* KPI Tiles */}
        <KPITilesSection
          kpis={kpis}
          evangelismStats={evangelismStats}
          isLoadingKPIs={false}
          isLoadingEvangelism={false}
          evangelismPeriod={evangelismPeriod}
        />

        {/* Charts and Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AttendanceBreakdownChart kpis={kpis} isLoading={false} />
          <EvangelismStatsCard
            stats={evangelismStats}
            period={evangelismPeriod}
            onPeriodChange={handlePeriodChange}
            isLoading={false}
          />
        </div>

        {/* Follow-up Tables */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SoulsAssignedTable data={mockSoulsAssigned} isLoading={false} />
          <FollowUpCommentsTable
            data={filteredComments}
            isLoading={false}
            startDate={commentsDateRange.startDate}
            endDate={commentsDateRange.endDate}
            onDateRangeChange={handleCommentsDateRangeChange}
          />
        </div>
      </div>
    </div>
  );
}

export default DemoDashboard;
