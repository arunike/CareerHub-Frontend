import type React from 'react';
import Tooltip from 'antd/es/tooltip';
import { format } from 'date-fns';
import CrispInfoIcon from '../CrispInfoIcon';
import { WidgetCollapseToggle, useWidgetCollapse } from './widgetCollapse';
import { parseDateOnlyLocal } from '../../utils/dateOnly';
import type { ApplicationTimelineAnalytics } from '../../types';
import type { JobHuntStats } from './widgetStatsTypes';

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
      return 'bg-slate-500';
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
  OFFER: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ACCEPTED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
  OFFER_REJECTED: 'border-amber-200 bg-amber-50 text-amber-700',
  GHOSTED: 'border-slate-200 bg-slate-100 text-slate-600',
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

export const percentageColor = (index: number) => {
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

export const TooltipLabel = ({
  children,
  title,
  className = '',
}: {
  children: React.ReactNode;
  title: string;
  className?: string;
}) => (
  <Tooltip title={title} placement="top" overlayClassName="analytics-help-tooltip">
    <span className={`inline-flex cursor-help items-center gap-1 group ${className}`}>
      <span>{children}</span>
      <CrispInfoIcon
        size={13}
        className="text-slate-400 opacity-70 group-hover:opacity-100 group-hover:text-blue-600 transition-all"
      />
    </span>
  </Tooltip>
);

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
          className="group/metric relative grid grid-cols-[minmax(0,88px)_minmax(28px,1fr)_56px] items-center gap-2 rounded-lg px-1 py-1.5 transition-colors hover:bg-slate-50 md:grid-cols-[96px_1fr_44px] md:gap-3"
        >
          <span className="truncate text-sm font-medium text-gray-700" title={item.name}>
            {item.name}
          </span>
          <div className="relative h-2 overflow-visible rounded-full bg-gray-100">
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
          <span className="flex flex-col items-end text-right text-xs font-semibold text-blue-600">
            <span>{shownPercent}</span>
            <span className="mt-0.5 whitespace-nowrap font-medium text-slate-500 md:hidden">
              {item.count} apps
            </span>
          </span>
        </div>
      );
    })}
    {items.length === 0 && (
      <div className="py-6 text-center text-sm text-gray-400">{emptyText}</div>
    )}
  </div>
);

export const MetricTile = ({
  label,
  value,
  detail,
  tooltip,
  tone = 'blue',
  trend,
}: {
  label: string;
  value: string | number;
  detail: string;
  tooltip: string;
  tone?: 'blue' | 'purple' | 'emerald' | 'amber' | 'slate';
  trend?: { delta: number; tooltip: string } | null;
}) => {
  const tones = {
    blue: 'border-blue-100 bg-blue-50/60 text-blue-700',
    purple: 'border-purple-100 bg-purple-50/60 text-purple-700',
    emerald: 'border-emerald-100 bg-emerald-50/60 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50/70 text-amber-700',
    slate: 'border-slate-100 bg-slate-50 text-slate-700',
  };

  return (
    <div className={`rounded-lg border px-3 py-3 ${tones[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
        <TooltipLabel title={tooltip}>{label}</TooltipLabel>
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <p className="text-2xl font-bold leading-none">{value}</p>
        {trend && trend.delta !== 0 && (
          <Tooltip title={trend.tooltip} placement="top">
            <span
              className={`cursor-help rounded px-1 py-0.5 text-[11px] font-bold tabular-nums ${
                trend.delta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {trend.delta > 0 ? '▲' : '▼'} {Math.abs(trend.delta)}
            </span>
          </Tooltip>
        )}
      </div>
      <p className="mt-1.5 text-xs opacity-75">{detail}</p>
    </div>
  );
};

export const SectionCard = ({
  icon,
  title,
  tooltip,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tooltip: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const collapse = useWidgetCollapse();
  const collapsed = collapse?.collapsed ?? false;

  return (
    <div className={`enterprise-card flex flex-col p-4 sm:p-6 ${collapsed ? 'h-auto' : 'h-full'}`}>
      <div className={`flex items-center gap-2 ${collapsed ? '' : 'mb-4'}`}>
        <span className="text-base text-gray-500">{icon}</span>
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
          <TooltipLabel title={tooltip}>{title}</TooltipLabel>
          {badge}
        </h3>
        <WidgetCollapseToggle title={title} />
      </div>
      {/* min-h-0 so a scrolling child shrinks instead of pushing the card past its row. */}
      {collapsed ? null : <div className="min-h-0 flex-1">{children}</div>}
    </div>
  );
};

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
      <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-6">
        <div className="flex items-center gap-3 text-sm font-medium text-blue-700">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
          Loading…
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-blue-100" />
          <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-blue-100" />
        </div>
      </div>
    );
  } else if (!analytics && stats.timelineAnalyticsError) {
    body = (
      <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-6 text-center text-sm text-rose-600">
        Could not load. Try refreshing the dashboard.
      </div>
    );
  } else if (!analytics) {
    body = (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
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
