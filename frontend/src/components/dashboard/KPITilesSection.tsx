import { useMemo } from 'react';
import KPITile from './KPITile';
import type { ServiceKPIs, EvangelismStats } from '../../types';

interface KPITilesSectionProps {
  kpis: ServiceKPIs | null;
  evangelismStats: EvangelismStats | null;
  isLoadingKPIs: boolean;
  isLoadingEvangelism: boolean;
  evangelismPeriod: 'week' | 'month';
}

function KPITilesSection({
  kpis,
  evangelismStats,
  isLoadingKPIs,
  isLoadingEvangelism,
  evangelismPeriod,
}: KPITilesSectionProps) {
  const evangelismSubtitle = useMemo(() => {
    if (!evangelismStats) return `This ${evangelismPeriod}`;
    const startDate = new Date(evangelismStats.startDate);
    const endDate = new Date(evangelismStats.endDate);
    const formatDate = (d: Date) =>
      d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }, [evangelismStats, evangelismPeriod]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPITile
        title="Total Attendance"
        value={kpis?.totalAttendance ?? '--'}
        subtitle="Selected service"
        color="gray"
        isLoading={isLoadingKPIs}
      />
      <KPITile
        title="First Timers"
        value={kpis?.firstTimersCount ?? '--'}
        subtitle="Selected service"
        color="blue"
        isLoading={isLoadingKPIs}
      />
      <KPITile
        title="Returners"
        value={kpis?.returnersCount ?? '--'}
        subtitle="Selected service"
        color="green"
        isLoading={isLoadingKPIs}
      />
      <KPITile
        title="Evangelism Contacts"
        value={evangelismStats?.contactCount ?? '--'}
        subtitle={evangelismSubtitle}
        color="purple"
        isLoading={isLoadingEvangelism}
      />
    </div>
  );
}

export default KPITilesSection;
