import { useEffect, useState } from 'react';
import { Spin, Tooltip } from 'antd';
import { FilterOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { getApplicationTimelineAnalytics } from '../../api/career';
import type { ApplicationTimelineAnalytics } from '../../types';

const TERMINAL_KEYS = new Set([
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

const REACHED_HELP =
  'Counted from your application timeline, so an application rejected after the 3rd round still counts as having reached the 3rd round. "Now" is how many currently sit at that stage.';

const ApplicationFunnel = () => {
  const [data, setData] = useState<ApplicationTimelineAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getApplicationTimelineAnalytics()
      .then((response) => {
        if (!cancelled) setData(response.data);
      })
      .catch((error) => console.error('Failed to load application analytics', error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <Spin />
      </div>
    );
  }

  if (!data || data.total_applications === 0) return null;

  const pipeline = data.stage_conversion.filter((stage) => !TERMINAL_KEYS.has(stage.key));

  const topReached = Math.max(...pipeline.map((stage) => stage.reached_count), 1);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      <header className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
          <FilterOutlined />
        </div>
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-950">
            Application funnel
            <Tooltip title={REACHED_HELP}>
              <InfoCircleOutlined
                className="cursor-help text-slate-400"
                aria-label="How reached is counted"
              />
            </Tooltip>
          </h3>
          <p className="text-xs text-slate-500">
            {data.total_applications.toLocaleString()} applications · {data.response_rate}% got past
            the first stage · {data.ghost_rate}% went silent
          </p>
        </div>
      </header>

      <div className="space-y-5 px-6 py-5">
        <div className="space-y-2.5">
          {pipeline.map((stage) => {
            const width = (stage.reached_count / topReached) * 100;
            return (
              <div key={stage.key}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[12px]">
                  <span className="truncate font-medium text-slate-700">{stage.label}</span>
                  <span className="shrink-0 text-slate-500">
                    <span className="font-semibold text-slate-900">
                      {stage.reached_count.toLocaleString()}
                    </span>{' '}
                    reached
                    {stage.current_count > 0 && (
                      <span className="ml-2 text-slate-400">{stage.current_count} now</span>
                    )}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Math.max(width, stage.reached_count > 0 ? 1.5 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {data.biggest_drop && (
          <p className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[13px] leading-relaxed text-amber-900">
            Biggest drop-off is{' '}
            <span className="font-semibold">{data.biggest_drop.from_label}</span> →{' '}
            <span className="font-semibold">{data.biggest_drop.to_label}</span>, where{' '}
            {data.biggest_drop.lost.toLocaleString()} applications stop.
          </p>
        )}

        {data.outcomes.length > 0 && (
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Outcomes
            </div>
            <div className="flex flex-wrap gap-2">
              {data.outcomes.map((outcome) => (
                <span
                  key={outcome.key}
                  className={`rounded-full border px-3 py-1 text-[12px] font-medium ${
                    OUTCOME_CLASSES[outcome.key] ?? OUTCOME_CLASSES.GHOSTED
                  }`}
                >
                  {outcome.label}: {outcome.count.toLocaleString()}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-slate-400">
          Stages follow your configuration in Settings → Application Stages, so renaming or
          reordering them updates this funnel.
        </p>
      </div>
    </div>
  );
};

export default ApplicationFunnel;
