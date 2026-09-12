import type { DecisionRow } from './decisionScoring';
import { type OfferLike as Offer } from './calculations';
import clsx from 'clsx';
import { totalCompDiff } from './totalCompDiff';
import { formatPtoLabel } from '../../utils/offerTimeOff';
import HelpTooltipTrigger from '../../components/HelpTooltipTrigger';
import { COMPENSATION_TOOLTIPS } from '../../content/tooltips';

type Props = {
  row: DecisionRow;
  currentTotal: number;
};

const ScorecardTimeOffBlock = ({ row, currentTotal }: Props) => (
  <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-white/[0.07]">
    <div className="flex justify-between items-center">
      <div>
        <HelpTooltipTrigger
          title={COMPENSATION_TOOLTIPS.timeOff}
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
            title={COMPENSATION_TOOLTIPS.diffVsCurrent}
            ariaLabel="Explain difference from current job"
            density="comfortable"
            className="justify-end text-xs font-medium text-slate-500 dark:text-ink-400"
          >
            Diff vs Current
          </HelpTooltipTrigger>
          {(() => {
            const { amount, percent, isGain } = totalCompDiff(row.offer, currentTotal);
            return (
              <div
                className={clsx(
                  'text-sm font-bold',
                  isGain
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : 'text-rose-500 dark:text-rose-400'
                )}
              >
                {amount} <span className="text-[10px] font-medium ml-1">({percent})</span>
              </div>
            );
          })()}
        </div>
      )}
      {row.isSimulated && (
        <div className="text-right">
          <HelpTooltipTrigger
            title={COMPENSATION_TOOLTIPS.diffVsCurrent}
            ariaLabel="Explain difference from current job"
            density="comfortable"
            className="justify-end text-xs font-medium text-slate-500 dark:text-ink-400"
          >
            Diff vs Current
          </HelpTooltipTrigger>
          {(() => {
            const { amount, percent, isGain } = totalCompDiff(row.offer, currentTotal);
            return (
              <div
                className={clsx(
                  'text-sm font-bold',
                  isGain
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : 'text-rose-500 dark:text-rose-400'
                )}
              >
                {amount} <span className="text-[10px] font-medium ml-1">({percent})</span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  </div>
);

export default ScorecardTimeOffBlock;
