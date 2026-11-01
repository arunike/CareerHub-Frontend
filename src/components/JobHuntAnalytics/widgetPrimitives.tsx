import type React from 'react';
import { format } from 'date-fns';
import { SectionCard } from '../dashboard/DashboardCards';
import { parseDateOnlyLocal } from '../../utils/dateOnly';
import type { ApplicationTimelineAnalytics } from '../../types';
import type { JobHuntStats } from './widgetStatsTypes';

export { MetricTile, SectionCard, StatCard, TooltipLabel } from '../dashboard/DashboardCards';

export const getStageColor = (key: string) => {
  switch (key) {
    case 'APPLIED':
      return 'bg-blue-500';
    case 'OA':
      return 'bg-indigo-500';
    case 'SCREEN':
      return 'bg-sky-500';
    case 'ROUND_1':
      return 'bg-amber-500';
    case 'ROUND_2':
      return 'bg-orange-400';
    case 'ROUND_3':
      return 'bg-orange-500';
    case 'ROUND_4':
      return 'bg-red-500';
    case 'ONSITE':
      return 'bg-rose-500';
    case 'OFFER':
      return 'bg-emerald-500';
    default:
      return 'bg-slate-500 dark:bg-ink-700';
  }
};

// Reported as outcomes, not as funnel steps.
export const TERMINAL_STAGE_KEYS = new Set([
  'REJECTED',
  'GHOSTED',
  'REMOVED_FROM_SHEET',
  'OFFER_REJECTED',
  'ACCEPTED',
]);

export const OUTCOME_CLASSES: Record<string, string> = {
  OFFER:
    'border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  ACCEPTED:
    'border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  REJECTED:
    'border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300',
  OFFER_REJECTED:
    'border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300',
  GHOSTED:
    'border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-ink-800 text-slate-600 dark:text-ink-200',
};

export const MIN_SEGMENT_SAMPLE = 20;

// A non-zero share under 0.1% reads "<0.1%", not a misleading 0%.
export const formatShare = (rate: number, count: number) => {
  const percent = rate * 100;
  if (count === 0) return '0%';
  if (percent >= 0.95) return `${Math.round(percent)}%`;
  if (percent < 0.1) return '<0.1%';
  return `${percent.toFixed(1)}%`;
};

// yyyy-MM-dd from the API; parsed locally so the day does not shift.
export const formatStageDate = (value: string) => {
  const parsed = parseDateOnlyLocal(value);
  return parsed ? format(parsed, 'MMM d, yyyy') : value;
};

const percentageColor = (index: number) => {
  const colors = [
    'bg-blue-500',
    'bg-sky-500',
    'bg-amber-500',
    'bg-orange-500',
    'bg-rose-500',
    'bg-emerald-500',
  ];
  return colors[index % colors.length];
};

export const renderPercentageList = (
  items: { name: string; count: number }[],
  total: number,
  emptyText: string,
  maxItems = 6
) => (
  <div className="space-y-3">
    {items.slice(0, maxItems).map((item, index) => {
      const percent = total > 0 ? (item.count / total) * 100 : 0;
      const shownPercent = formatShare(percent / 100, item.count);
      return (
        <div
          key={item.name}
          className="group/metric relative grid grid-cols-[minmax(0,88px)_minmax(28px,1fr)_56px] items-center gap-2 rounded-lg px-1 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-ink-800 md:grid-cols-[96px_1fr_44px] md:gap-3"
        >
          <span
            className="truncate text-sm font-medium text-gray-700 dark:text-ink-100"
            title={item.name}
          >
            {item.name}
          </span>
          <div className="relative h-2 overflow-visible rounded-full bg-gray-100 dark:bg-ink-800">
            <div
              className={`h-full rounded-full ${percentageColor(index)} transition-all duration-300`}
              style={{ width: `${Math.max(percent, item.count > 0 ? 4 : 0)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 scale-95 whitespace-nowrap rounded-lg border border-slate-800 bg-slate-900/95 px-3 py-1.5 text-center text-xs text-white opacity-0 shadow-xl transition-all duration-150 group-hover/metric:scale-100 group-hover/metric:opacity-100 md:block">
              <span className="block font-bold text-slate-100">{item.name}</span>
              <span className="mt-0.5 block text-[11px] text-slate-300">
                {item.count} application{item.count === 1 ? '' : 's'} ({shownPercent})
              </span>
              <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-slate-800 bg-slate-900" />
            </div>
          </div>
          <span className="flex flex-col items-end text-right text-xs font-semibold text-blue-600 dark:text-blue-300">
            <span>{shownPercent}</span>
            <span className="mt-0.5 whitespace-nowrap font-medium text-slate-500 dark:text-ink-400 md:hidden">
              {item.count} apps
            </span>
          </span>
        </div>
      );
    })}
    {items.length === 0 && (
      <div className="py-6 text-center text-sm text-gray-400 dark:text-ink-500">{emptyText}</div>
    )}
  </div>
);

export const AnalyticsSection = ({
  stats,
  icon,
  title,
  tooltip,
  badge,
  emptyText = 'Appears once applications have timeline or sync history.',
  children,
}: {
  stats: JobHuntStats;
  icon: React.ReactNode;
  title: string;
  tooltip: string;
  badge?: React.ReactNode;
  emptyText?: string;
  children: (analytics: ApplicationTimelineAnalytics) => React.ReactNode;
}) => {
  const analytics = stats.timelineAnalytics;
  let body: React.ReactNode;

  if (!analytics && stats.timelineAnalyticsLoading) {
    body = (
      <div className="rounded-lg border border-blue-100 dark:border-blue-500/20 bg-blue-50/60 dark:bg-blue-500/10 px-4 py-6">
        <div className="flex items-center gap-3 text-sm font-medium text-blue-700 dark:text-blue-300">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
          Loading…
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-blue-100 dark:bg-blue-500/15" />
          <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-blue-100 dark:bg-blue-500/15" />
        </div>
      </div>
    );
  } else if (!analytics && stats.timelineAnalyticsError) {
    body = (
      <div className="rounded-lg border border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-4 py-6 text-center text-sm text-rose-600 dark:text-rose-300">
        Could not load. Try refreshing the dashboard.
      </div>
    );
  } else if (!analytics) {
    body = (
      <div className="rounded-lg border border-dashed border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-ink-900 px-4 py-6 text-center text-sm text-gray-500 dark:text-ink-400">
        {emptyText}
      </div>
    );
  } else {
    body = children(analytics);
  }

  return (
    <SectionCard icon={icon} title={title} tooltip={tooltip} badge={badge}>
      {body}
    </SectionCard>
  );
};
