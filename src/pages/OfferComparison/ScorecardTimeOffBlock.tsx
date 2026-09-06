import type { DecisionRow } from './decisionScoring';
import { type OfferLike as Offer } from './calculations';
import clsx from 'clsx';
import { formatPtoLabel } from '../../utils/offerTimeOff';
import { getRealizableEquity } from './equityLiquidity';
import HelpTooltipTrigger from '../../components/HelpTooltipTrigger';

type Props = {
  row: DecisionRow;
  currentTotal: number;
};

const ScorecardTimeOffBlock = ({ row, currentTotal }: Props) => (
  <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-white/[0.07]">
    <div className="flex justify-between items-center">
      <div>
        <HelpTooltipTrigger
          title="PTO covers vacation and personal time. Sick leave is tracked separately. Holidays are company-observed days off. Unlimited PTO policies vary by company culture."
          ariaLabel="Explain time off"
          density="comfortable"
          className="text-xs font-medium text-slate-500 dark:text-ink-400"
        >
          Time Off
        </HelpTooltipTrigger>
        <div className="text-sm font-medium text-slate-900 dark:text-ink-50">
          {formatPtoLabel(row.offer.pto_days, !!row.offer.is_unlimited_pto)} PTO,{' '}
          {row.offer.is_unlimited_pto && row.offer.sick_leave_included_in_unlimited_pto !== false
            ? 'Sick Leave Included, '
            : `${row.offer.sick_leave_days ?? 0} Sick Leave, `}
          {row.offer.holiday_days ?? 11} Holidays
        </div>
      </div>
      {!row.isSimulated && !(row.offer as Offer).is_current && (
        <div className="text-right">
          <HelpTooltipTrigger
            title="Total comp difference using Base + Bonus + Realizable Equity + Sign-On compared with your current job. Paper equity is excluded."
            ariaLabel="Explain difference from current job"
            density="comfortable"
            className="justify-end text-xs font-medium text-slate-500 dark:text-ink-400"
          >
            Diff vs Current
          </HelpTooltipTrigger>
          {(() => {
            const total =
              Number(row.offer.base_salary) +
              Number(row.offer.bonus) +
              getRealizableEquity(row.offer) +
              Number(row.offer.sign_on);
            const diff = total - currentTotal;
            const diffPercent = currentTotal > 0 ? ((diff / currentTotal) * 100).toFixed(1) : 0;
            return (
              <div
                className={clsx(
                  'text-sm font-bold',
                  diff >= 0
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : 'text-rose-500 dark:text-rose-400'
                )}
              >
                {diff > 0 ? '+' : ''}${diff.toLocaleString()}{' '}
                <span className="text-[10px] font-medium ml-1">
                  ({diff > 0 ? '+' : ''}
                  {diffPercent}%)
                </span>
              </div>
            );
          })()}
        </div>
      )}
      {row.isSimulated && (
        <div className="text-right">
          <HelpTooltipTrigger
            title="Total comp difference using Base + Bonus + Realizable Equity + Sign-On. Paper equity is excluded."
            ariaLabel="Explain difference from current job"
            density="comfortable"
            className="justify-end text-xs font-medium text-slate-500 dark:text-ink-400"
          >
            Diff vs Current
          </HelpTooltipTrigger>
          {(() => {
            const total =
              Number(row.offer.base_salary) +
              Number(row.offer.bonus) +
              getRealizableEquity(row.offer) +
              Number(row.offer.sign_on);
            const diff = total - currentTotal;
            const diffPercent = currentTotal > 0 ? ((diff / currentTotal) * 100).toFixed(1) : 0;
            return (
              <div
                className={clsx(
                  'text-sm font-bold',
                  diff >= 0
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : 'text-rose-500 dark:text-rose-400'
                )}
              >
                {diff > 0 ? '+' : ''}${diff.toLocaleString()}{' '}
                <span className="text-[10px] font-medium ml-1">
                  ({diff > 0 ? '+' : ''}
                  {diffPercent}%)
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  </div>
);

export default ScorecardTimeOffBlock;
