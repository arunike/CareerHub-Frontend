import { useEffect, useMemo, useState } from 'react';
import { Tooltip } from 'antd';
import { AimOutlined, BulbOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getDecisionOutcomeInsights } from '../../api/career';
import { PageState } from '../../components/PageState';
import { MetricCardsSkeleton } from '../../components/SkeletonLoader';
import {
  concernHitRate,
  criterionShare,
  decisionPatterns,
  mostUsedCriteria,
  type CriterionOutcomeRow,
  type DecisionOutcomeInsightsData,
} from './decisionInsights';

const SEGMENTS = [
  { key: 'better' as const, label: 'Better', className: 'bg-emerald-500' },
  { key: 'as_expected' as const, label: 'As expected', className: 'bg-slate-300 dark:bg-white/25' },
  { key: 'worse' as const, label: 'Worse', className: 'bg-rose-500' },
];

const CriterionRow = ({
  row,
  minimumDecisions,
}: {
  row: CriterionOutcomeRow;
  minimumDecisions: number;
}) => (
  <div className="flex items-center gap-3">
    <span className="w-32 shrink-0 truncate text-[12.5px] text-slate-700 dark:text-ink-100">
      {row.label}
    </span>
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {row.judged_count === 0 ? (
        <span className="text-[11.5px] italic text-slate-400 dark:text-ink-500">
          Not looked back on yet
        </span>
      ) : (
        <div className="flex h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.07]">
          {SEGMENTS.map((segment) => {
            const share = criterionShare(row, segment.key);
            return share > 0 ? (
              <Tooltip key={segment.key} title={`${segment.label}: ${row[segment.key]}`}>
                <div className={segment.className} style={{ width: `${share}%` }} />
              </Tooltip>
            ) : null;
          })}
        </div>
      )}
    </div>
    <span className="w-28 shrink-0 text-right text-[11.5px] tabular-nums text-slate-500 dark:text-ink-400">
      drove {row.chosen_count}
      {row.judged_count > 0 ? ` · judged ${row.judged_count}` : ''}
    </span>
    {row.judged_count > 0 && row.below_minimum_sample && (
      <Tooltip title={`Under ${minimumDecisions} judged decisions, so read it as a hint only`}>
        <WarningOutlined className="shrink-0 text-[11px] text-amber-500" />
      </Tooltip>
    )}
  </div>
);

const DecisionOutcomeInsights = () => {
  const [data, setData] = useState<DecisionOutcomeInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await getDecisionOutcomeInsights();
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
  }, []);

  const patterns = useMemo(() => (data ? decisionPatterns(data) : []), [data]);
  const criteria = useMemo(() => (data ? mostUsedCriteria(data) : []), [data]);

  if (loading && !data) return <MetricCardsSkeleton count={2} />;
  if (failed) {
    return (
      <PageState
        tone="error"
        title="Decision outcomes could not be loaded"
        description="Your decision journals were not changed. Check your connection and try again."
      />
    );
  }
  if (!data) return null;

  if (data.journal_count === 0) {
    return (
      <PageState
        tone="neutral"
        title="No decision has been journalled yet"
        description="Record why you took or turned down an offer from its card on the Offers page, then grade it at 30 and 90 days. This is where the pattern across those decisions shows up."
      />
    );
  }

  const hitRate = concernHitRate(data);
  const stillWaiting = data.journal_count - data.reviewed_count;

  return (
    <section className="space-y-4">
      <header className="min-w-0">
        <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-ink-50">
          Decision outcomes
        </h3>
        <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-ink-400">
          {data.reviewed_count} of {data.journal_count} journalled decisions have been looked back
          on
          {stillWaiting > 0 ? ` · ${stillWaiting} still waiting on a 30 or 90 day review` : ''}.
        </p>
      </header>

      {/* Nothing is asserted until the evidence clears the floor, so this is empty early on. */}
      {patterns.length > 0 && (
        <div className="enterprise-card p-4 sm:p-6">
          <p className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 dark:text-ink-500">
            <BulbOutlined /> What the look-backs say
          </p>
          <ul className="space-y-2">
            {patterns.map((pattern) => (
              <li
                key={pattern.id}
                className={`rounded-lg px-3 py-2.5 text-[12.5px] ${
                  pattern.tone === 'bad'
                    ? 'bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-200'
                    : pattern.tone === 'good'
                      ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200'
                      : 'bg-slate-50 text-slate-700 dark:bg-ink-900 dark:text-ink-200'
                }`}
              >
                {pattern.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {patterns.length === 0 && data.reviewed_count < data.minimum_decisions_for_pattern && (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-[12.5px] text-slate-500 dark:border-white/[0.08] dark:text-ink-400">
          Patterns appear once {data.minimum_decisions_for_pattern} decisions have been looked back
          on. Reading one into fewer would be a story, not evidence.
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="enterprise-card p-4 sm:p-6">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 dark:text-ink-500">
            <AimOutlined /> What drove your calls, and how it turned out
          </p>
          {criteria.length === 0 ? (
            <p className="text-[12.5px] text-slate-400 dark:text-ink-500">
              No decision has named the criteria it rested on yet.
            </p>
          ) : (
            <>
              <div className="space-y-2.5">
                {criteria.map((row) => (
                  <CriterionRow
                    key={row.key}
                    row={row}
                    minimumDecisions={data.minimum_decisions_for_pattern}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-2.5 dark:border-white/[0.07]">
                {SEGMENTS.map((segment) => (
                  <span
                    key={segment.key}
                    className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-ink-500"
                  >
                    <span className={`h-2 w-2 rounded-full ${segment.className}`} />
                    {segment.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="enterprise-card p-4 sm:p-6">
          <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 dark:text-ink-500">
            <WarningOutlined /> Worries that came true
          </p>
          <p className="mb-3 text-[11.5px] text-slate-400 dark:text-ink-500">
            {hitRate === null
              ? `${data.concerns_raised} recorded · none resolved by a look-back yet`
              : `${data.concerns_became_real.length} of ${data.concerns_resolved} resolved worries happened (${hitRate}%)`}
          </p>
          {data.concerns_became_real.length === 0 ? (
            <p className="text-[12.5px] text-slate-400 dark:text-ink-500">
              Nothing you were worried about has been marked as having happened.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.concerns_became_real.map((concern) => (
                <li
                  key={`${concern.journal_id}-${concern.text}`}
                  className="rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-ink-900"
                >
                  <p className="text-[12.5px] text-slate-700 dark:text-ink-100">{concern.text}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400 dark:text-ink-500">
                    {concern.company_name} ·{' '}
                    {concern.decision === 'ACCEPTED' ? 'Accepted' : 'Declined'}{' '}
                    {dayjs(concern.decided_on).format('MMM YYYY')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default DecisionOutcomeInsights;
