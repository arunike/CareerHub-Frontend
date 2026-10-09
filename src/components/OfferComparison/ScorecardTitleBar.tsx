import { Segmented } from 'antd';

import { formatCurrency } from '../../utils/OfferComparison/decisionScoring';

import type { ReactNode } from 'react';
import type { DecisionRow } from '../../utils/OfferComparison/decisionScoring';
import type {
  OfferLike as Offer,
  OfferStatusFilter,
} from '../../utils/OfferComparison/calculations';

type Props = {
  leader: DecisionRow;
  offers: Offer[];
  statusFilter?: OfferStatusFilter;
  setStatusFilter?: (filter: OfferStatusFilter) => void;
  rejectedOffersCount?: number;
  pastOffersCount?: number;
  extraHeaderNode?: ReactNode;
};

const ScorecardTitleBar = ({
  leader,
  offers,
  statusFilter,
  setStatusFilter,
  rejectedOffersCount,
  pastOffersCount,
  extraHeaderNode,
}: Props) => (
  <div className="border-b border-slate-100 dark:border-white/[0.07] bg-white dark:bg-ink-900 px-4 py-5 sm:px-8 sm:py-8">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300 shadow-sm ring-1 ring-sky-100 dark:ring-sky-500/20">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-sky-500 dark:text-sky-400">
            Decision Scorecard
          </p>
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-ink-50 sm:text-3xl">
          Best overall: <span className="text-sky-600 dark:text-sky-300">{leader.company}</span>
        </h2>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-ink-400 max-w-2xl">
          Weighted beyond total comp. Advanced signals only count after you fill them in.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        {extraHeaderNode}
        {setStatusFilter && (
          <Segmented
            size="middle"
            options={[
              { label: `All (${offers.length})`, value: 'all' },
              {
                // Both other buckets come out of Active, or past roles get counted twice.
                label: `Active (${Math.max(
                  0,
                  offers.length - (rejectedOffersCount || 0) - (pastOffersCount || 0)
                )})`,
                value: 'active',
              },
              { label: `Past Experience (${pastOffersCount || 0})`, value: 'past' },
              { label: `Rejected (${rejectedOffersCount || 0})`, value: 'rejected' },
            ]}
            value={statusFilter || 'all'}
            onChange={(val) => setStatusFilter(val as OfferStatusFilter)}
          />
        )}
        <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-ink-900/50 p-4 shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-ink-500">
              Top Score
            </p>
            <p className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-ink-50">
              {leader.score}
            </p>
          </div>
          <div className="h-12 w-[1px] bg-slate-200 dark:bg-ink-800" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-ink-500">
              Value
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-300">
              {formatCurrency(leader.financialValue)}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default ScorecardTitleBar;
