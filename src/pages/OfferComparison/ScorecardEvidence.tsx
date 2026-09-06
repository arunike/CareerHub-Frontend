import { formatPtoLabel } from '../../utils/offerTimeOff';
import { getEquityLiquidityCopy, getRealizableEquity } from './equityLiquidity';
import { formatCurrency } from './decisionScoring';

import type { DecisionRow } from './decisionScoring';

type Props = {
  row: DecisionRow;
};

const ScorecardEvidence = ({ row }: Props) => (
  <div className="grid grid-cols-1 border-t border-slate-100 dark:border-white/[0.07] bg-slate-50/40 dark:bg-ink-900/40 sm:grid-cols-3">
    <div className="border-b border-slate-100 dark:border-white/[0.07] px-4 py-3 sm:border-r sm:border-b-0 sm:px-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-ink-500">
        Adjusted value
      </p>
      <p className="mt-1 text-base font-bold text-emerald-700 dark:text-emerald-300">
        {formatCurrency(row.financialValue)}
      </p>
      <p className="mt-0.5 text-[10px] leading-4 text-slate-500 dark:text-ink-400">
        After tax, COL, rent, and lifestyle
      </p>
    </div>
    <div className="border-b border-slate-100 dark:border-white/[0.07] px-4 py-3 sm:border-r sm:border-b-0 sm:px-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-ink-500">
        Realizable equity
      </p>
      <p className="mt-1 text-base font-bold text-slate-900 dark:text-ink-50">
        {formatCurrency(getRealizableEquity(row.offer))}
        <span className="ml-1 text-[10px] font-medium text-slate-400 dark:text-ink-500">/ yr</span>
      </p>
      <p className="mt-0.5 line-clamp-1 text-[10px] leading-4 text-slate-500 dark:text-ink-400">
        {getEquityLiquidityCopy(row.offer).label}
      </p>
    </div>
    <div className="px-4 py-3 sm:px-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-ink-500">
        Time off
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-ink-50">
        {formatPtoLabel(row.offer.pto_days, !!row.offer.is_unlimited_pto)}
      </p>
      <p className="mt-0.5 line-clamp-1 text-[10px] leading-4 text-slate-500 dark:text-ink-400">
        {row.offer.is_unlimited_pto && row.offer.sick_leave_included_in_unlimited_pto !== false
          ? 'Sick leave included'
          : `${row.offer.sick_leave_days ?? 0} sick days`}
        {' · '}
        {row.offer.holiday_days ?? 11} holidays
      </p>
    </div>
  </div>
);

export default ScorecardEvidence;
