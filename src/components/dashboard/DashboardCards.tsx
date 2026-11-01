import type React from 'react';
import Tooltip from 'antd/es/tooltip';
import CrispInfoIcon from '../feedback/CrispInfoIcon';
import { WidgetCollapseToggle, useWidgetCollapse } from '../JobHuntAnalytics/widgetCollapse';

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
        className="text-slate-400 dark:text-ink-500 opacity-70 group-hover:opacity-100 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-all"
      />
    </span>
  </Tooltip>
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
    blue: 'border-blue-100 dark:border-blue-500/20 bg-blue-50/60 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300',
    purple:
      'border-purple-100 dark:border-purple-500/20 bg-purple-50/60 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300',
    emerald:
      'border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    amber:
      'border-amber-100 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300',
    slate:
      'border-slate-100 dark:border-white/[0.07] bg-slate-50 dark:bg-ink-900 text-slate-700 dark:text-ink-100',
  };

  return (
    <div className={`rounded-lg border px-3 py-3 ${tones[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
        <TooltipLabel title={tooltip}>{label}</TooltipLabel>
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <p className="truncate text-2xl font-bold leading-none tabular-nums">{value}</p>
        {trend && trend.delta !== 0 && (
          <Tooltip title={trend.tooltip} placement="top">
            <span
              className={`cursor-help rounded px-1 py-0.5 text-[11px] font-bold tabular-nums ${
                trend.delta > 0
                  ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
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

export const StatCard = ({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail?: string;
}) => (
  <div className="enterprise-card flex h-full items-center gap-4 p-4 sm:p-6">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-ink-800 text-lg text-slate-500 dark:text-ink-300">
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-ink-400">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold leading-none tabular-nums text-gray-900 dark:text-ink-50">
        {value}
      </p>
      {detail ? (
        <p className="mt-1.5 truncate text-xs text-slate-500 dark:text-ink-400">{detail}</p>
      ) : null}
    </div>
  </div>
);

export const SectionCard = ({
  icon,
  title,
  tooltip,
  badge,
  subtitle,
  actions,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tooltip?: string;
  badge?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const collapse = useWidgetCollapse();
  const collapsed = collapse?.collapsed ?? false;

  return (
    <div className={`enterprise-card flex flex-col p-4 sm:p-6 ${collapsed ? 'h-auto' : 'h-full'}`}>
      <div
        className={`flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between ${
          collapsed ? '' : 'mb-4'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base text-gray-500 dark:text-ink-400">{icon}</span>
            <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-ink-200">
              {tooltip ? (
                <TooltipLabel title={tooltip}>{title}</TooltipLabel>
              ) : (
                <span className="truncate">{title}</span>
              )}
              {badge}
            </h3>
            <WidgetCollapseToggle title={title} />
          </div>
          {subtitle && !collapsed ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-ink-400">{subtitle}</p>
          ) : null}
        </div>
        {actions && !collapsed ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {/* min-h-0 so a scrolling child shrinks instead of pushing the card past its row. */}
      {collapsed ? null : <div className="min-h-0 flex-1">{children}</div>}
    </div>
  );
};
