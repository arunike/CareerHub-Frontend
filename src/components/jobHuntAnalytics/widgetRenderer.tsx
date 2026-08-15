import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  NodeIndexOutlined,
  TrophyOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import Tooltip from 'antd/es/tooltip';
import { format } from 'date-fns';
import CustomWidgetCard from '../CustomWidgetCard';
import CrispInfoIcon from '../CrispInfoIcon';
import { parseDateOnlyLocal } from '../../utils/dateOnly';
import type { CustomWidget } from '../../hooks/useCustomWidgets';
import type { ApplicationTimelineAnalytics } from '../../types';

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
}: {
  label: string;
  value: string | number;
  detail: string;
  tooltip: string;
  tone?: 'blue' | 'purple' | 'emerald' | 'amber' | 'slate';
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
      <p className="mt-1 text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1.5 text-xs opacity-75">{detail}</p>
    </div>
  );
};

export const renderJobHuntWidget = (
  id: string,
  stats: JobHuntStats,
  customWidgets: CustomWidget[],
  deleteCustomWidget: (id: string) => void
) => {
  switch (id) {
    // One card for the whole job hunt. Total / Active / Outcomes / No Response used to be
    // four standalone tiles, the funnel and Timeline Analytics both drew stage conversion,
    // and Pipeline Breakdown drew a third view of the same distribution. They are folded
    // together here so each number appears exactly once: headline tiles, then the funnel,
    // then the things the funnel cannot show.
    case 'job_search': {
      const analytics = stats.timelineAnalytics;
      const isLoading = Boolean(stats.timelineAnalyticsLoading);
      const hasError = Boolean(stats.timelineAnalyticsError);
      const staleCount = analytics?.stale_in_stage.length || 0;
      const topSource = analytics?.offer_rate_by_source[0];
      const topCompany = analytics?.offer_rate_by_company[0];
      // The funnel is the stages you pass through, so terminal results are excluded — they
      // are reported as outcomes instead of pretending to be a step.
      const pipeline = (analytics?.stage_conversion || []).filter(
        (stage) => !TERMINAL_STAGE_KEYS.has(stage.key)
      );
      const topReached = Math.max(...pipeline.map((stage) => stage.reached_count), 1);
      // Prefer the server's offer count so the tile and the offer-rate breakdowns below it
      // cannot disagree about what counts as an offer.
      const offers = analytics?.offer_count ?? stats.offers;
      const offerRate = analytics?.offer_rate ?? Number(stats.offerRate);

      return (
        <div className="enterprise-card h-full p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <NodeIndexOutlined className="text-lg text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  <TooltipLabel title="Every job-hunt number in one place, built from your applications, their status history, and synced sheet provenance.">
                    Job Search
                  </TooltipLabel>
                </h3>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Headline numbers, the stages applications move through, and where they stall
              </p>
            </div>

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
                tooltip="Average days from Date Applied to the offer creation date for applications with offers."
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

            {isLoading && !analytics && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-6">
                <div className="flex items-center gap-3 text-sm font-medium text-blue-700">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
                  Loading timeline analytics...
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-blue-100" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-blue-100" />
                </div>
              </div>
            )}

            {hasError && !isLoading && (
              <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-6 text-center text-sm text-rose-600">
                Timeline analytics could not load. Try refreshing the dashboard.
              </div>
            )}

            {!analytics && !isLoading && !hasError && (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                The funnel and stage timings appear once applications have timeline or sync history.
              </div>
            )}

            {analytics && (
              <>
                <div className="grid min-w-0 gap-5 border-t border-gray-100 pt-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                  <div className="min-w-0">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <TooltipLabel title="Counted from your application timeline, so an application rejected after the 3rd round still counts as having reached the 3rd round. “Now” is how many currently sit at that stage. Stages follow Settings → Application Stages.">
                        Funnel
                      </TooltipLabel>
                    </p>
                    <div className="space-y-2.5">
                      {pipeline.map((stage) => (
                        <div key={stage.key}>
                          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                            <span className="truncate font-medium text-gray-700">
                              {stage.label}
                            </span>
                            <span className="shrink-0 text-gray-500">
                              <span className="font-semibold text-gray-900">
                                {stage.reached_count.toLocaleString()}
                              </span>{' '}
                              reached · {formatShare(stage.conversion_rate, stage.reached_count)}
                              {stage.current_count > 0 && (
                                <span className="ml-2 text-gray-400">
                                  {stage.current_count} now
                                </span>
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

                    {analytics.biggest_drop && (
                      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[13px] leading-relaxed text-amber-900">
                        Biggest drop-off is{' '}
                        <span className="font-semibold">{analytics.biggest_drop.from_label}</span> →{' '}
                        <span className="font-semibold">{analytics.biggest_drop.to_label}</span>,
                        where {analytics.biggest_drop.lost.toLocaleString()} applications stop.
                      </p>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <TooltipLabel title="Active applications that have stayed in the same stage longer than your ghosting threshold, longest first.">
                        Watch List
                      </TooltipLabel>
                      {staleCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-amber-700">
                          {staleCount}
                        </span>
                      )}
                    </p>
                    {/* Every stale application, not the first few. This was capped at four,
                        which hid 12 of 16 and made a run of same-day rows look like the
                        whole list. Tall lists scroll rather than stretching the card. */}
                    <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                      {analytics.stale_in_stage.map((item) => (
                        <div
                          key={item.application_id}
                          className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2"
                        >
                          <div className="flex items-start gap-2">
                            <WarningOutlined className="mt-0.5 text-amber-600" />
                            <div className="min-w-0">
                              <p
                                className="truncate text-sm font-semibold text-gray-900"
                                title={`${item.company} ${item.role_title}`}
                              >
                                {item.company} · {item.role_title}
                              </p>
                              <p className="text-xs text-amber-700">
                                {item.days_in_stage} day{item.days_in_stage === 1 ? '' : 's'} in{' '}
                                {item.status_label}
                                {/* The date the count is measured from. Several applications
                                    synced on one day legitimately share a day count, which
                                    reads like a bug until you can see where it starts. */}
                                {item.last_stage_date && (
                                  <span className="text-amber-600/70">
                                    {' '}
                                    · since {formatStageDate(item.last_stage_date)}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {analytics.stale_in_stage.length === 0 && (
                        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-5 text-center text-sm text-gray-500">
                          No stale active stages
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {analytics.outcomes.length > 0 && (
                  <div className="border-t border-gray-100 pt-5">
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <TooltipLabel title="Where applications finished. These are terminal results, so they are reported here rather than as a funnel step.">
                        Outcomes
                      </TooltipLabel>
                    </p>
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
                  </div>
                )}
              </>
            )}

            <div className="grid gap-6 border-t border-gray-100 pt-5 xl:grid-cols-3">
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <EnvironmentOutlined className="text-gray-500" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <TooltipLabel title="Most common application locations, grouped by city or Remote, with exact counts and shares.">
                      Top Locations
                    </TooltipLabel>
                  </p>
                </div>
                {renderPercentageList(stats.locations, stats.total, 'No location data')}
              </section>
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <ClockCircleOutlined className="text-gray-500" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <TooltipLabel title="Application age using Date Applied when available and Created At as fallback, with exact counts and shares.">
                      Application Age
                    </TooltipLabel>
                  </p>
                </div>
                {renderPercentageList(
                  stats.applicationAgeBreakdown,
                  stats.total,
                  'No application age data',
                  5
                )}
              </section>
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <TrophyOutlined className="text-gray-500" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <TooltipLabel title="Where your offers actually come from: the synced sheet source and the company with the highest offer rate.">
                      Best Odds
                    </TooltipLabel>
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Sheet source
                    </p>
                    <p
                      className="mt-1 truncate text-sm font-semibold text-gray-900"
                      title={topSource?.name || 'No sheet source'}
                    >
                      {topSource?.name || 'No sheet source'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {topSource
                        ? `${formatShare(topSource.offer_rate, topSource.offers)} offer rate`
                        : 'Connect a sheet to compare'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Company
                    </p>
                    <p
                      className="mt-1 truncate text-sm font-semibold text-gray-900"
                      title={topCompany?.name || 'No company data'}
                    >
                      {topCompany?.name || 'No company data'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {topCompany
                        ? `${formatShare(topCompany.offer_rate, topCompany.offers)} offer rate`
                        : 'Needs applications'}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      );
    }
    default: {
      const customWidget = customWidgets.find((w) => w.id === id);
      if (customWidget) {
        return <CustomWidgetCard widget={customWidget} onDelete={deleteCustomWidget} />;
      }
      return null;
    }
  }
};

export const getJobHuntWidgetColSpan = (id: string, customWidgets: CustomWidget[]) => {
  const customWidget = customWidgets.find((w) => w.id === id);
  if (customWidget) {
    return customWidget.widgetType === 'chart'
      ? 'col-span-1 md:col-span-2 lg:col-span-2'
      : 'col-span-1';
  }

  if (id === 'job_search') {
    return 'col-span-1 md:col-span-2 lg:col-span-4';
  }
  return 'col-span-1';
};
