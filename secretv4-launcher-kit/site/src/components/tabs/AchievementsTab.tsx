import { StatsSection } from '@/components/StatsSection';

/** Achievements and personal stats, now a main tab of its own */
export function AchievementsTab() {
  return (
    <div className="h-full overflow-y-auto -mr-2 pr-2">
      <StatsSection />
    </div>
  );
}
