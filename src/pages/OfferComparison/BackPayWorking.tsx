import dayjs from 'dayjs';
import type { BackPay } from '../Income/raiseSchedule';
import { fmt } from './raiseHistoryFields';

const day = (iso: string) => dayjs(iso).format('D MMM YYYY');

// The banner states a figure the ledger will act on, so the arithmetic behind it is on show.
const BackPayWorking = ({ backPay }: { backPay: BackPay }) => {
  const lastOldRateDay = dayjs(backPay.paidFrom).subtract(1, 'day').format('YYYY-MM-DD');
  const exact = backPay.amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="mt-2.5 border-t border-emerald-200/70 dark:border-emerald-500/25 pt-2.5">
      <div className="mb-2 text-emerald-800/80 dark:text-emerald-300">
        {day(backPay.effectiveFrom)} → {day(lastOldRateDay)} — the {backPay.days} days you were paid
        at the old rate.
      </div>
      <div className="space-y-1 tabular-nums">
        <div className="flex items-baseline justify-between gap-3">
          <span>
            Base salary
            <span className="hidden text-emerald-800/60 dark:text-emerald-300 sm:inline">
              {' '}
              · {fmt(backPay.baseBefore)} → {fmt(backPay.baseAfter)}
            </span>
          </span>
          <span className="font-medium">+{fmt(backPay.annualDifference)} a year</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-emerald-200/70 dark:border-emerald-500/25 pt-1.5">
          <span>
            × {backPay.days} days ÷ {backPay.daysInYear} days in {backPay.effectiveFrom.slice(0, 4)}
          </span>
          <span className="font-semibold">${exact}</span>
        </div>
      </div>
      <div className="mt-2 text-emerald-800/70 dark:text-emerald-300">
        Base only — a bonus is settled at payout against the new rate, and equity is not paid by the
        day, so neither is owed here.
      </div>
    </div>
  );
};

export default BackPayWorking;
