import { ClockCircleOutlined, ExclamationCircleOutlined, TrophyOutlined } from '@ant-design/icons';
import type { ApplicationStats } from '../../types';
import type { JobHuntStats } from './widgetStatsTypes';
import {
  AnalyticsSection,
  MIN_SEGMENT_SAMPLE,
  OUTCOME_CLASSES,
  formatShare,
} from './widgetPrimitives';

export const OutcomesSection = ({ stats }: { stats: JobHuntStats }) => (
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
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-ink-900 px-4 py-6 text-center text-sm text-gray-500 dark:text-ink-400">
          Nothing has finished yet
        </div>
      )
    }
  </AnalyticsSection>
);

export const ReplyTimingSection = ({ stats }: { stats: JobHuntStats }) => (
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
          <div className="rounded-lg border border-dashed border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-ink-900 px-4 py-6 text-center text-sm text-gray-500 dark:text-ink-400">
            No replies recorded yet
          </div>
        );
      }
      const busiest = Math.max(...analytics.response_time_buckets.map((b) => b.count), 1);

      return (
        <>
          {/* Full width: in a side column the headline wrapped every other word. */}
          <div className="mb-4 flex flex-wrap items-baseline gap-x-5 gap-y-2 rounded-lg border border-sky-100 dark:border-sky-500/20 bg-sky-50/60 dark:bg-sky-500/10 px-3 py-2.5">
            <span className="text-sm text-gray-700 dark:text-ink-100">
              Half arrived within{' '}
              <span className="font-bold text-sky-700 dark:text-sky-300">
                {analytics.median_days_to_response}d
              </span>
              , 90% within{' '}
              <span className="font-bold text-sky-700 dark:text-sky-300">
                {analytics.p90_days_to_response}d
              </span>
            </span>
            <span className="text-xs text-gray-400 dark:text-ink-500">
              {analytics.response_time_sample_size} answered
            </span>
          </div>

          <div className="space-y-2">
            {analytics.response_time_buckets.map((bucket) => (
              <div
                key={bucket.label}
                // auto: a fixed width clipped "31-60 days".
                className="grid grid-cols-[auto_minmax(28px,1fr)_auto] items-center gap-3"
              >
                <span className="whitespace-nowrap text-xs font-medium text-gray-700 dark:text-ink-100">
                  {bucket.label}
                </span>
                <div className="h-2.5 rounded-full bg-gray-100 dark:bg-ink-800">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all duration-300"
                    style={{
                      width: `${Math.max((bucket.count / busiest) * 100, bucket.count > 0 ? 3 : 0)}%`,
                    }}
                  />
                </div>
                <span className="whitespace-nowrap text-right text-xs tabular-nums">
                  <span className="font-semibold text-gray-700 dark:text-ink-100">
                    {bucket.count}
                  </span>
                  <span className="text-gray-400 dark:text-ink-500">
                    {' '}
                    · {Math.round(bucket.cumulative_share * 100)}%
                  </span>
                </span>
              </div>
            ))}
          </div>

          {analytics.suggested_followup_days != null && (
            <p className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-ink-200">
              Past <span className="font-semibold">{analytics.suggested_followup_days} days</span>{' '}
              silence is more likely dead than slow — a better ghosting threshold than a round
              number. Yours is{' '}
              <span className="font-semibold">{analytics.stale_threshold_days}d</span>
              {analytics.open_without_response_count > 0 && (
                <>
                  , and{' '}
                  <span className="font-semibold text-gray-900 dark:text-ink-50">
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

export const ResponseSegmentsSection = ({ stats }: { stats: JobHuntStats }) => (
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
          <div className="rounded-lg border border-dashed border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-ink-900 px-4 py-6 text-center text-sm text-gray-500 dark:text-ink-400">
            Needs {MIN_SEGMENT_SAMPLE}+ applications in one location to compare
          </div>
        );
      }

      return (
        <div className="space-y-2">
          {segments.map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-ink-900 px-3 py-2.5"
            >
              <span className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-ink-50">
                {row.name}
              </span>
              <span className="whitespace-nowrap text-xs text-gray-500 dark:text-ink-400 tabular-nums">
                <span className="font-bold text-emerald-600 dark:text-emerald-300">
                  {formatShare(row.response_rate, row.responded)}
                </span>{' '}
                of {row.total}
              </span>
            </div>
          ))}
          {topSource && (
            <p className="pt-1 text-[11px] leading-relaxed text-gray-400 dark:text-ink-500">
              Overall {formatShare(topSource.offer_rate, topSource.offers)} of {topSource.name}{' '}
              applications became offers.
            </p>
          )}
        </div>
      );
    }}
  </AnalyticsSection>
);

export const DataHealthSection = ({
  stats,
  fieldCompleteness,
}: {
  stats: JobHuntStats;
  fieldCompleteness: ApplicationStats['field_completeness'];
}) => (
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
          <div className="rounded-lg border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-500/10 px-3 py-5 text-center text-sm text-emerald-700 dark:text-emerald-300">
            Everything the dashboard needs is filled in.
          </div>
        );
      }

      return (
        <div className="space-y-2">
          {links.unlinked_events > 0 && (
            <div className="rounded-lg border border-amber-100 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-500/10 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-ink-50">
                  Calendar not linked
                </span>
                <span className="whitespace-nowrap text-xs font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
                  {links.unlinked_events} of {links.total_events}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                Link events to applications on the Events page to unlock interviews per offer and
                time from last interview to decision.
              </p>
            </div>
          )}
          {rows.map((row) => (
            <div
              key={row.field}
              className="rounded-lg border border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-ink-900 px-3 py-2.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-ink-50">
                  {row.label}
                </span>
                <span className="whitespace-nowrap text-xs text-gray-500 dark:text-ink-400 tabular-nums">
                  blank on{' '}
                  <span className="font-semibold text-gray-700 dark:text-ink-100">
                    {row.missing.toLocaleString()}
                  </span>{' '}
                  of {row.total.toLocaleString()}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-ink-400">
                Fill it to {row.unlocks}.
              </p>
            </div>
          ))}
        </div>
      );
    }}
  </AnalyticsSection>
);
