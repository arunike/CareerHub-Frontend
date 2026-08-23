import { FilterOutlined, ThunderboltOutlined, WarningOutlined } from '@ant-design/icons';
import Tooltip from 'antd/es/tooltip';
import { Link } from 'react-router-dom';
import type { JobHuntStats } from './widgetStatsTypes';
import {
  AnalyticsSection,
  MetricTile,
  SectionCard,
  TERMINAL_STAGE_KEYS,
  TooltipLabel,
  formatShare,
  formatStageDate,
  getStageColor,
} from './widgetPrimitives';

export const HeadlineNumbers = ({ stats }: { stats: JobHuntStats }) => {
  const analytics = stats.timelineAnalytics;
  const isLoading = Boolean(stats.timelineAnalyticsLoading);
  const staleCount = analytics?.stale_in_stage.length || 0;
  // The server's count, so this and the funnel cannot disagree.
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

export const ApplicationFunnelSection = ({ stats }: { stats: JobHuntStats }) => (
  <AnalyticsSection
    stats={stats}
    icon={<FilterOutlined />}
    title="Application Funnel"
    tooltip="Counted from your application timeline, so an application rejected after the 3rd round still counts as having reached the 3rd round. “Now” is how many currently sit at that stage. Stages follow Settings → Application Stages."
  >
    {(analytics) => {
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

export const WatchListSection = ({
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
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              No stale active stages
            </div>
          )}
        </div>
      )}
    </AnalyticsSection>
  );
};
