import { useEffect, useMemo, useState } from 'react';
import { Segmented, Tooltip } from 'antd';
import { FileTextOutlined, TrophyOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getResumeVersionAnalytics } from '../../api/career';
import { PageState } from '../../components/PageState';
import { MetricCardsSkeleton } from '../../components/SkeletonLoader';
import {
  RATE_LABELS,
  bestVersion,
  formatDelta,
  formatRate,
  rateDelta,
  sampleWarning,
  type RateKey,
  type ResumeGroupStats,
  type ResumeVersionAnalyticsData,
  type ResumeVersionStats,
} from './resumeVersions';

const RATE_KEYS: RateKey[] = ['response_rate', 'interview_rate', 'offer_rate'];

const countFor = (row: ResumeGroupStats | ResumeVersionStats, rate: RateKey) =>
  rate === 'response_rate'
    ? row.responded
    : rate === 'interview_rate'
      ? row.interviewed
      : row.offers;

const Bar = ({ value, muted }: { value: number; muted: boolean }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.07]">
    <div
      className={`h-full rounded-full ${muted ? 'bg-slate-300 dark:bg-white/20' : 'bg-blue-500'}`}
      style={{ width: `${Math.min(100, Math.max(value, value > 0 ? 2 : 0))}%` }}
    />
  </div>
);

const GroupTable = ({
  title,
  rows,
  rate,
  minimumSampleSize,
}: {
  title: string;
  rows: ResumeGroupStats[];
  rate: RateKey;
  minimumSampleSize: number;
}) => {
  if (!rows.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 dark:text-ink-500">
        {title}
      </p>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-[12px] text-slate-600 dark:text-ink-200">
              {row.label}
            </span>
            <div className="min-w-0 flex-1">
              <Bar value={row[rate]} muted={row.below_minimum_sample} />
            </div>
            <span className="w-24 shrink-0 text-right text-[11.5px] tabular-nums text-slate-500 dark:text-ink-400">
              {formatRate(row[rate])}
              <span className="ml-1 text-slate-300 dark:text-ink-600">
                {countFor(row, rate)}/{row.applications}
              </span>
            </span>
            {row.below_minimum_sample && (
              <Tooltip title={`Under ${minimumSampleSize} applications, so read it as a hint only`}>
                <WarningOutlined className="shrink-0 text-[11px] text-amber-500" />
              </Tooltip>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const VersionCard = ({
  version,
  data,
  rate,
  isBest,
}: {
  version: ResumeVersionStats;
  data: ResumeVersionAnalyticsData;
  rate: RateKey;
  isBest: boolean;
}) => {
  const warning = sampleWarning(version, data.minimum_sample_size);
  const delta = rateDelta(version, data, rate);
  return (
    <article
      className={`enterprise-card p-4 sm:p-6 ${
        isBest ? 'ring-1 ring-inset ring-emerald-300 dark:ring-emerald-400/30' : ''
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileTextOutlined className="text-[13px] text-slate-400 dark:text-ink-500" />
            <h4 className="truncate text-[14px] font-semibold text-slate-900 dark:text-ink-50">
              {version.title}
            </h4>
            <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10.5px] font-bold text-white tabular-nums dark:bg-ink-50 dark:text-ink-950">
              v{version.version_number}
            </span>
            {version.is_current && (
              <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-500/12 dark:text-blue-300">
                Current
              </span>
            )}
          </div>
          <p className="mt-1 text-[11.5px] text-slate-400 dark:text-ink-500">
            {version.applications} application{version.applications === 1 ? '' : 's'}
            {version.first_used && version.last_used
              ? ` · ${dayjs(version.first_used).format('MMM YYYY')} – ${dayjs(version.last_used).format('MMM YYYY')}`
              : ''}
          </p>
        </div>
        {isBest && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300">
            <TrophyOutlined className="text-[11px]" />
            Best interview rate
          </span>
        )}
      </header>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {RATE_KEYS.map((key) => (
          <div key={key}>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400 dark:text-ink-500">
              {RATE_LABELS[key]}
            </p>
            <p
              className={`mt-0.5 text-[19px] font-semibold tabular-nums ${
                key === rate
                  ? 'text-slate-900 dark:text-ink-50'
                  : 'text-slate-500 dark:text-ink-300'
              }`}
            >
              {formatRate(version[key])}
            </p>
            <p className="text-[11px] tabular-nums text-slate-400 dark:text-ink-500">
              {countFor(version, key)} of {version.applications}
            </p>
          </div>
        ))}
      </div>

      {/* The warning sits with the numbers rather than in a footnote nobody reads. */}
      {warning ? (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2.5 text-[11.5px] font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          <WarningOutlined className="text-[11px]" />
          {warning}
        </p>
      ) : (
        <p className="mt-3 text-[11.5px] text-slate-400 dark:text-ink-500">
          {RATE_LABELS[rate]} rate {formatDelta(delta)}
        </p>
      )}

      {(version.by_role_type.length > 1 || version.by_source.length > 1) && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-3.5 dark:border-white/[0.07]">
          {version.by_role_type.length > 1 && (
            <GroupTable
              title="By role type"
              rows={version.by_role_type}
              rate={rate}
              minimumSampleSize={data.minimum_sample_size}
            />
          )}
          {version.by_source.length > 1 && (
            <GroupTable
              title="By source"
              rows={version.by_source}
              rate={rate}
              minimumSampleSize={data.minimum_sample_size}
            />
          )}
        </div>
      )}
    </article>
  );
};

const ResumeVersionAnalytics = ({ selectedYear }: { selectedYear: number | 'all' }) => {
  const [data, setData] = useState<ResumeVersionAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [rate, setRate] = useState<RateKey>('interview_rate');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await getResumeVersionAnalytics(selectedYear);
        if (!cancelled) setData(response.data);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const best = useMemo(() => (data ? bestVersion(data) : null), [data]);

  if (loading && !data)
    return <MetricCardsSkeleton count={2} label="Loading resume version analytics" />;
  if (failed) {
    return (
      <PageState
        tone="error"
        title="Resume version analytics could not be loaded"
        description="Your documents were not changed. Check your connection and try again."
      />
    );
  }
  if (!data) return null;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-ink-50">
            Resume versions
          </h3>
          <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-ink-400">
            {data.tracked_applications} of {data.total_applications} applications record which
            version was sent
            {data.untracked_applications > 0
              ? ` · ${data.untracked_applications} without one are left out`
              : ''}
            .
          </p>
        </div>
        <Segmented
          value={rate}
          onChange={(value) => setRate(value as RateKey)}
          options={RATE_KEYS.map((key) => ({ label: RATE_LABELS[key], value: key }))}
        />
      </header>

      {data.versions.length === 0 ? (
        <PageState
          tone="neutral"
          title="No resume version has been recorded against an application yet"
          description="Attach the exact resume you sent under an application's submitted documents, and its response, interview and offer rates will build up here on their own."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.versions.map((version) => (
            <VersionCard
              key={version.document_id}
              version={version}
              data={data}
              rate={rate}
              isBest={best?.document_id === version.document_id}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default ResumeVersionAnalytics;
