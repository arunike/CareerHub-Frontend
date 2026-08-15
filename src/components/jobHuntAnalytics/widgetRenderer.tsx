import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import Tooltip from 'antd/es/tooltip';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import CustomWidgetCard from '../CustomWidgetCard';
import CrispInfoIcon from '../CrispInfoIcon';
import { parseDateOnlyLocal } from '../../utils/dateOnly';
import type { CustomWidget } from '../../hooks/useCustomWidgets';
import type { ApplicationStats, ApplicationTimelineAnalytics } from '../../types';

export type JobHuntStats = {
  total: number;
  offers: number;
  ghosted: number;
  activeInterviews: number;
  totalInterviews: number;
  responseRate: string;
  respondedCount: number;
  offerRate: string;
  recentApplications30d: number;
  locations: { name: string; count: number }[];
  applicationAgeBreakdown: { name: string; count: number }[];
  timelineAnalytics?: ApplicationTimelineAnalytics | null;
  timelineAnalyticsLoading?: boolean;
  timelineAnalyticsError?: boolean;
};

const getStageColor = (key: string) => {
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

// Terminal results are reported as outcomes, not as a funnel step you can pass through.
const TERMINAL_STAGE_KEYS = new Set([
  'REJECTED',
  'GHOSTED',
  'REMOVED_FROM_SHEET',
  'OFFER_REJECTED',
  'ACCEPTED',
]);

const OUTCOME_CLASSES: Record<string, string> = {
  OFFER: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ACCEPTED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
  OFFER_REJECTED: 'border-amber-200 bg-amber-50 text-amber-700',
  GHOSTED: 'border-slate-200 bg-slate-100 text-slate-600',
};

// Segments need a real sample before a rate means anything: a 50% response rate off four
// applications says nothing, and presenting it as a finding is worse than omitting it.
const MIN_SEGMENT_SAMPLE = 20;

// A share that rounds to zero but is not zero gets a decimal instead. 2 offers out of 806
// is 0.2%, and showing that as a flat 0% next to "2 reached" reads as though the funnel
// never got there. Below a tenth of a percent the digit stops being meaningful, so it
// becomes an explicit "less than" rather than a stack of zeroes.
const formatShare = (rate: number, count: number) => {
  const percent = rate * 100;
  if (count === 0) return '0%';
  // Anything that rounds up to a whole percent keeps the whole-number style.
  if (percent >= 0.95) return `${Math.round(percent)}%`;
  if (percent < 0.1) return '<0.1%';
  return `${percent.toFixed(1)}%`;
};

// yyyy-MM-dd from the API, rendered without a timezone shift dragging it back a day.
const formatStageDate = (value: string) => {
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

const TooltipLabel = ({
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

const renderPercentageList = (
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

const MetricTile = ({
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
  // Percentage points against the previous comparable period. Sign carries the meaning, so
  // it is always rendered with one.
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

// Each section is its own draggable card now, so the shell and heading that used to be
// written once for the whole report are shared instead of repeated eight times.
const SectionCard = ({
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
}) => (
  <div className="enterprise-card h-full p-4 sm:p-5">
    <div className="mb-4 flex items-center gap-2">
      <span className="text-base text-gray-500">{icon}</span>
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
        <TooltipLabel title={tooltip}>{title}</TooltipLabel>
        {badge}
      </h3>
    </div>
    {children}
  </div>
);

// Sections built from the timeline endpoint each need their own loading, error and empty
// state now that they no longer sit inside one card that handled it for all of them.
const AnalyticsSection = ({
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

const HeadlineNumbers = ({ stats }: { stats: JobHuntStats }) => {
  const analytics = stats.timelineAnalytics;
  const isLoading = Boolean(stats.timelineAnalyticsLoading);
  const staleCount = analytics?.stale_in_stage.length || 0;
  // Prefer the server's offer count so this and the funnel cannot disagree about what
  // counts as an offer.
  const offers = analytics?.offer_count ?? stats.offers;
  const offerRate = analytics?.offer_rate ?? Number(stats.offerRate);
  const trend = analytics?.response_trend ?? null;

  return (
    <SectionCard
      icon={<ThunderboltOutlined />}
      title="Headline Numbers"
      tooltip="The figures worth seeing before anything else, from your applications and their status history."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile
          label="Total"
          tooltip="All applications currently saved in your tracker, within the selected year. The detail counts those submitted in the last 30 days, using Date Applied when available and Created At as fallback."
          value={stats.total}
          detail={`${stats.recentApplications30d} in the last 30 days`}
        />
        <MetricTile
          label="Active"
          tooltip="Applications that are not applied-only, rejected, ghosted, accepted, or removed from a synced sheet."
          value={stats.activeInterviews}
          detail={`${stats.totalInterviews} reached interviews`}
          tone="slate"
        />
        <MetricTile
          label="Offers"
          tooltip="Applications that produced an offer — offered, accepted, or offer declined."
          value={offers}
          detail={`${offerRate}% offer rate`}
          tone="emerald"
        />
        <MetricTile
          label="No Response"
          tooltip="Applications currently marked as Ghosted, i.e. never answered."
          value={stats.ghosted}
          detail={analytics ? `${analytics.ghost_rate}% went silent` : 'Ghosted'}
          tone="amber"
        />
        <MetricTile
          label="Response Rate"
          tooltip="Applications that moved beyond applied/ghosted/removed, divided by total applications."
          value={`${stats.responseRate}%`}
          detail={`${stats.respondedCount} responded`}
          trend={
            trend
              ? {
                  delta: trend.delta,
                  tooltip: `${trend.recent.response_rate}% for the ${trend.window_days} days to ${trend.matured_before} (${trend.recent.responded}/${trend.recent.applied}), against ${trend.previous.response_rate}% for the ${trend.window_days} days before that (${trend.previous.responded}/${trend.previous.applied}). Both windows are old enough to have had a full chance to reply, so a recent batch that has simply not answered yet does not show up as a drop.`,
                }
              : null
          }
        />
        <MetricTile
          label="Avg to Interview"
          tooltip="Average days from applying to the first interview-stage timeline entry. Applied, offer, rejected, and ghosted are not counted as interview stages."
          value={
            isLoading
              ? '...'
              : analytics?.average_time_to_interview_days != null
                ? `${analytics.average_time_to_interview_days}d`
                : '-'
          }
          detail={
            isLoading
              ? 'Loading'
              : `${analytics?.time_to_interview_sample_size || 0} sample${
                  analytics?.time_to_interview_sample_size === 1 ? '' : 's'
                }`
          }
        />
        <MetricTile
          label="Avg to Offer"
          tooltip="Average days from applying to the offer arriving, read from the timeline rather than from when the offer was recorded."
          value={
            isLoading
              ? '...'
              : analytics?.average_days_to_offer != null
                ? `${analytics.average_days_to_offer}d`
                : '-'
          }
          detail={
            isLoading
              ? 'Loading'
              : `${analytics?.days_to_offer_sample_size || 0} offer${
                  analytics?.days_to_offer_sample_size === 1 ? '' : 's'
                }`
          }
          tone="purple"
        />
        <MetricTile
          label="Stale In Stage"
          tooltip="Active applications sitting in their current stage for at least your ghosting threshold."
          value={analytics ? staleCount : isLoading ? '...' : '-'}
          detail={analytics ? `Over ${analytics.stale_threshold_days}d` : 'Timeline signal'}
          tone={staleCount > 0 ? 'amber' : 'slate'}
        />
      </div>
    </SectionCard>
  );
};

const ApplicationFunnelSection = ({ stats }: { stats: JobHuntStats }) => (
  <AnalyticsSection
    stats={stats}
    icon={<FilterOutlined />}
    title="Application Funnel"
    tooltip="Counted from your application timeline, so an application rejected after the 3rd round still counts as having reached the 3rd round. “Now” is how many currently sit at that stage. Stages follow Settings → Application Stages."
  >
    {(analytics) => {
      // The funnel is the stages you pass through, so terminal results are excluded — they
      // are reported as outcomes instead of pretending to be a step.
      const pipeline = analytics.stage_conversion.filter(
        (stage) => !TERMINAL_STAGE_KEYS.has(stage.key)
      );
      const topReached = Math.max(...pipeline.map((stage) => stage.reached_count), 1);
      const typicalStages = analytics.stage_durations.filter(
        (row) => row.sample_size >= analytics.min_duration_sample
      );

      return (
        <>
          <div className="space-y-2.5">
            {pipeline.map((stage) => (
              <div key={stage.key}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-gray-700">{stage.label}</span>
                  <span className="shrink-0 text-gray-500">
                    <span className="font-semibold text-gray-900">
                      {stage.reached_count.toLocaleString()}
                    </span>{' '}
                    reached · {formatShare(stage.conversion_rate, stage.reached_count)}
                    {stage.current_count > 0 && (
                      <span className="ml-2 text-gray-400">{stage.current_count} now</span>
                    )}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getStageColor(stage.key)}`}
                    style={{
                      width: `${Math.max(
                        (stage.reached_count / topReached) * 100,
                        stage.reached_count > 0 ? 1.5 : 0
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {pipeline.length === 0 && (
              <div className="py-6 text-center text-sm text-gray-400">No stage data</div>
            )}
          </div>

          {typicalStages.length > 0 && (
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              <TooltipLabel
                title={`Median days each stage takes before moving on, from your own timeline. Stages with fewer than ${analytics.min_duration_sample} recorded moves are left out — one transition is an anecdote, not a typical duration.`}
              >
                Typically
              </TooltipLabel>{' '}
              {typicalStages.map((row, index) => (
                <span key={row.key}>
                  {index > 0 && ' · '}
                  <span className="font-semibold text-slate-600">{row.label}</span>{' '}
                  {row.median_days}d
                </span>
              ))}
            </p>
          )}

          {analytics.biggest_drop && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[13px] leading-relaxed text-amber-900">
              Biggest drop-off is{' '}
              <span className="font-semibold">{analytics.biggest_drop.from_label}</span> →{' '}
              <span className="font-semibold">{analytics.biggest_drop.to_label}</span>, where{' '}
              {analytics.biggest_drop.lost.toLocaleString()} applications stop.
            </p>
          )}
        </>
      );
    }}
  </AnalyticsSection>
);

const WatchListSection = ({
  stats,
  onGhost,
}: {
  stats: JobHuntStats;
  onGhost?: (applicationId: number) => void;
}) => {
  const staleCount = stats.timelineAnalytics?.stale_in_stage.length || 0;
  return (
    <AnalyticsSection
      stats={stats}
      icon={<WarningOutlined />}
      title="Watch List"
      tooltip="Active applications that have stayed in the same stage longer than your ghosting threshold, longest first."
      badge={
        staleCount > 0 ? (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-amber-700">
            {staleCount}
          </span>
        ) : undefined
      }
    >
      {(analytics) => (
        // Every stale application, not the first few. Tall lists scroll rather than
        // stretching this card past its neighbours.
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {analytics.stale_in_stage.map((item) => (
            <div
              key={item.application_id}
              className="group/stale rounded-lg border border-amber-100 bg-amber-50 px-3 py-2"
            >
              <div className="flex items-start gap-2">
                <WarningOutlined className="mt-0.5 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  {/* A report you cannot act on sends you hunting through 800 rows for the
                      row it just told you about. */}
                  <Link
                    to={`/applications?application=${item.application_id}`}
                    className="block truncate text-sm font-semibold text-gray-900 hover:text-blue-700 hover:underline"
                    title={`Open ${item.company} — ${item.role_title}`}
                  >
                    {item.company} · {item.role_title}
                  </Link>
                  <p className="text-xs text-amber-700">
                    {item.days_in_stage} day{item.days_in_stage === 1 ? '' : 's'} in{' '}
                    {item.status_label}
                    {/* The date the count is measured from. Several applications synced on
                        one day legitimately share a day count, which reads like a bug until
                        you can see where it starts. */}
                    {item.last_stage_date && (
                      <span className="text-amber-600/70">
                        {' '}
                        · since {formatStageDate(item.last_stage_date)}
                      </span>
                    )}
                  </p>
                  {/* A flat threshold treats a phone screen like an onsite. This says how far
                      past normal for its own stage it actually is, which is the difference
                      between slow and dead. */}
                  {typeof item.days_over_typical === 'number' && item.days_over_typical > 0 && (
                    <p className="mt-0.5 text-[11px] font-semibold text-rose-600">
                      {item.days_over_typical.toLocaleString()} days past the {item.typical_days}d
                      typical for this stage
                    </p>
                  )}
                </div>
                {onGhost && (
                  <Tooltip title="Mark as ghosted, so it leaves the pipeline and this list">
                    <button
                      type="button"
                      onClick={() => onGhost(item.application_id)}
                      aria-label={`Mark ${item.company} as ghosted`}
                      className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-white hover:text-rose-600"
                    >
                      Ghosted
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
          {analytics.stale_in_stage.length === 0 && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-5 text-center text-sm text-gray-500">
              No stale active stages
            </div>
          )}
        </div>
      )}
    </AnalyticsSection>
  );
};

const OutcomesSection = ({ stats }: { stats: JobHuntStats }) => (
  <AnalyticsSection
    stats={stats}
    icon={<TrophyOutlined />}
    title="Outcomes"
    tooltip="Where applications finished. These are terminal results, so they are reported here rather than as a funnel step."
  >
    {(analytics) =>
      analytics.outcomes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {analytics.outcomes.map((outcome) => (
            <span
              key={outcome.key}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                OUTCOME_CLASSES[outcome.key] ?? OUTCOME_CLASSES.GHOSTED
              }`}
            >
              {outcome.label}: {outcome.count.toLocaleString()}
            </span>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-5 text-center text-sm text-gray-500">
          Nothing has finished yet
        </div>
      )
    }
  </AnalyticsSection>
);

const ReplyTimingSection = ({ stats }: { stats: JobHuntStats }) => (
  <AnalyticsSection
    stats={stats}
    icon={<ClockCircleOutlined />}
    title="Reply Timing"
    tooltip="How long replies took to arrive, measured from the date you applied to the first movement past Applied. Only counts applications that were answered."
    emptyText="Appears once some applications have been answered."
  >
    {(analytics) => {
      if (analytics.response_time_sample_size === 0) {
        return (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-5 text-center text-sm text-gray-500">
            No replies recorded yet
          </div>
        );
      }
      // Bars are scaled to the busiest bucket, not to the total. Against the total the
      // largest bar filled 63% and the rest were slivers in a wide empty track, which is
      // the opposite of what a distribution should show. The share is already spelled out
      // in the label beside each row.
      const busiest = Math.max(...analytics.response_time_buckets.map((b) => b.count), 1);

      return (
        <>
          {/* The headline reads across the full width. In a side column it wrapped every
              other word and left the bars stranded in the space it was not using. */}
          <div className="mb-4 flex flex-wrap items-baseline gap-x-5 gap-y-2 rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2.5">
            <span className="text-sm text-gray-700">
              Half arrived within{' '}
              <span className="font-bold text-sky-700">{analytics.median_days_to_response}d</span>,
              90% within{' '}
              <span className="font-bold text-sky-700">{analytics.p90_days_to_response}d</span>
            </span>
            <span className="text-xs text-gray-400">
              {analytics.response_time_sample_size} answered
            </span>
          </div>

          <div className="space-y-2">
            {analytics.response_time_buckets.map((bucket) => (
              <div
                key={bucket.label}
                // auto, not a fixed width: "31-60 days" was being clipped to "31-60 d…".
                // The widest label sets the column, so the rows still line up.
                className="grid grid-cols-[auto_minmax(28px,1fr)_auto] items-center gap-3"
              >
                <span className="whitespace-nowrap text-xs font-medium text-gray-700">
                  {bucket.label}
                </span>
                <div className="h-2.5 rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all duration-300"
                    style={{
                      width: `${Math.max((bucket.count / busiest) * 100, bucket.count > 0 ? 3 : 0)}%`,
                    }}
                  />
                </div>
                <span className="whitespace-nowrap text-right text-xs tabular-nums">
                  <span className="font-semibold text-gray-700">{bucket.count}</span>
                  <span className="text-gray-400">
                    {' '}
                    · {Math.round(bucket.cumulative_share * 100)}%
                  </span>
                </span>
              </div>
            ))}
          </div>

          {analytics.suggested_followup_days != null && (
            <p className="mt-3 text-xs leading-relaxed text-gray-600">
              Past <span className="font-semibold">{analytics.suggested_followup_days} days</span>{' '}
              silence is more likely dead than slow — a better ghosting threshold than a round
              number. Yours is{' '}
              <span className="font-semibold">{analytics.stale_threshold_days}d</span>
              {analytics.open_without_response_count > 0 && (
                <>
                  , and{' '}
                  <span className="font-semibold text-gray-900">
                    {analytics.silent_past_followup_count}
                  </span>{' '}
                  of {analytics.open_without_response_count} still-silent applications are past it
                </>
              )}
              .
            </p>
          )}
        </>
      );
    }}
  </AnalyticsSection>
);

const ResponseSegmentsSection = ({ stats }: { stats: JobHuntStats }) => (
  // This used to rank sheet sources and companies by offer rate. With a handful of offers
  // that is noise dressed as insight — one company at 2 applications and 1 offer outranked
  // everything at "50%". Response rate has the sample size to mean something.
  <AnalyticsSection
    stats={stats}
    icon={<TrophyOutlined />}
    title="Best Response Rate"
    tooltip={`Share of applications that got any reply, by location, best first. Ranked on replies rather than offers because offers are too rare to compare, and locations with fewer than ${MIN_SEGMENT_SAMPLE} applications are left out rather than shown as a rate the sample cannot support.`}
  >
    {(analytics) => {
      const segments = analytics.response_rate_by_location
        .filter((row) => row.total >= MIN_SEGMENT_SAMPLE && row.name !== 'Unknown')
        .slice(0, 6);
      const topSource = analytics.offer_rate_by_source[0];

      if (segments.length === 0) {
        return (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-sm text-gray-500">
            Needs {MIN_SEGMENT_SAMPLE}+ applications in one location to compare
          </div>
        );
      }

      return (
        <div className="space-y-2">
          {segments.map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm font-medium text-gray-900">{row.name}</span>
              <span className="whitespace-nowrap text-xs text-gray-500 tabular-nums">
                <span className="font-bold text-emerald-600">
                  {formatShare(row.response_rate, row.responded)}
                </span>{' '}
                of {row.total}
              </span>
            </div>
          ))}
          {topSource && (
            <p className="pt-1 text-[11px] leading-relaxed text-gray-400">
              Overall {formatShare(topSource.offer_rate, topSource.offers)} of {topSource.name}{' '}
              applications became offers.
            </p>
          )}
        </div>
      );
    }}
  </AnalyticsSection>
);

const DataHealthSection = ({
  stats,
  fieldCompleteness,
}: {
  stats: JobHuntStats;
  fieldCompleteness: ApplicationStats['field_completeness'];
}) => (
  // Reporting an empty breakdown is less useful than saying why it is empty. Level is blank
  // on every row here, so response-rate-by-seniority cannot exist — that is worth stating
  // rather than rendering a chart with nothing in it.
  <AnalyticsSection
    stats={stats}
    icon={<ExclamationCircleOutlined />}
    title="Data Health"
    tooltip="Inputs the rest of this dashboard depends on. Each row is something currently blank or unlinked, and what filling it would let the analytics answer."
    emptyText="Nothing to flag."
  >
    {(analytics) => {
      const links = analytics.interview_links;
      const rows = fieldCompleteness.slice(0, 5);
      if (rows.length === 0 && links.unlinked_events === 0) {
        return (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-5 text-center text-sm text-emerald-700">
            Everything the dashboard needs is filled in.
          </div>
        );
      }

      return (
        <div className="space-y-2">
          {links.unlinked_events > 0 && (
            <div className="rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900">Calendar not linked</span>
                <span className="whitespace-nowrap text-xs font-semibold text-amber-700 tabular-nums">
                  {links.unlinked_events} of {links.total_events}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
                Link events to applications on the Events page to unlock interviews per offer and
                time from last interview to decision.
              </p>
            </div>
          )}
          {rows.map((row) => (
            <div
              key={row.field}
              className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">{row.label}</span>
                <span className="whitespace-nowrap text-xs text-gray-500 tabular-nums">
                  blank on{' '}
                  <span className="font-semibold text-gray-700">
                    {row.missing.toLocaleString()}
                  </span>{' '}
                  of {row.total.toLocaleString()}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                Fill it to {row.unlocks}.
              </p>
            </div>
          ))}
        </div>
      );
    }}
  </AnalyticsSection>
);

export const renderJobHuntWidget = (
  id: string,
  stats: JobHuntStats,
  customWidgets: CustomWidget[],
  deleteCustomWidget: (id: string) => void,
  fieldCompleteness: ApplicationStats['field_completeness'] = [],
  onGhost?: (applicationId: number) => void
) => {
  switch (id) {
    case 'headline':
      return <HeadlineNumbers stats={stats} />;
    case 'funnel':
      return <ApplicationFunnelSection stats={stats} />;
    case 'watch_list':
      return <WatchListSection stats={stats} onGhost={onGhost} />;
    case 'reply_timing':
      return <ReplyTimingSection stats={stats} />;
    case 'outcomes':
      return <OutcomesSection stats={stats} />;
    case 'response_segments':
      return <ResponseSegmentsSection stats={stats} />;
    case 'data_health':
      return <DataHealthSection stats={stats} fieldCompleteness={fieldCompleteness} />;
    case 'top_locations':
      return (
        <SectionCard
          icon={<EnvironmentOutlined />}
          title="Top Locations"
          tooltip="Most common application locations, grouped by city or Remote, with exact counts and shares."
        >
          {renderPercentageList(stats.locations, stats.total, 'No location data')}
        </SectionCard>
      );
    case 'application_age':
      return (
        <SectionCard
          icon={<ClockCircleOutlined />}
          title="Application Age"
          tooltip="Application age using Date Applied when available and Created At as fallback, with exact counts and shares."
        >
          {renderPercentageList(
            stats.applicationAgeBreakdown,
            stats.total,
            'No application age data',
            5
          )}
        </SectionCard>
      );
    default: {
      const customWidget = customWidgets.find((w) => w.id === id);
      if (customWidget) {
        return <CustomWidgetCard widget={customWidget} onDelete={deleteCustomWidget} />;
      }
      return null;
    }
  }
};

// Widths that keep the default order tidy on the 4-column grid: a full-width headline row,
// then two pairs, then a row of narrow cards. Anything unlisted takes a single column.
const WIDGET_COL_SPANS: Record<string, string> = {
  headline: 'col-span-1 md:col-span-2 lg:col-span-4',
  funnel: 'col-span-1 md:col-span-2 lg:col-span-2',
  watch_list: 'col-span-1 md:col-span-2 lg:col-span-2',
  reply_timing: 'col-span-1 md:col-span-2 lg:col-span-2',
  outcomes: 'col-span-1 md:col-span-2 lg:col-span-2',
  response_segments: 'col-span-1 md:col-span-2 lg:col-span-2',
  data_health: 'col-span-1 md:col-span-2 lg:col-span-2',
  top_locations: 'col-span-1',
  application_age: 'col-span-1',
};

export const getJobHuntWidgetColSpan = (id: string, customWidgets: CustomWidget[]) => {
  const customWidget = customWidgets.find((w) => w.id === id);
  if (customWidget) {
    return customWidget.widgetType === 'chart'
      ? 'col-span-1 md:col-span-2 lg:col-span-2'
      : 'col-span-1';
  }
  return WIDGET_COL_SPANS[id] ?? 'col-span-1';
};
