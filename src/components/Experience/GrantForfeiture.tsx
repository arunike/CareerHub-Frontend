import { useState } from 'react';
import dayjs from 'dayjs';
import { Button, DatePicker } from 'antd';
import { fmtMoney } from '../../utils/Experience/compensationBreakdownFormat';
import { retainedGrant, type EquityVestingPlan } from '../../utils/Experience/equityVesting';

const dateLabel = (iso: string) => dayjs(iso).format('MMM D, YYYY');

// 6.25% of a grant reads better than 6.3%, and a whole quarter must not print as 25.00%.
const grantShare = (value: number, total: number) =>
  total > 0 ? `${Number(((value / total) * 100).toFixed(2))}%` : '';

// A plain button in a modal body is outside the global 44px floor.
const TEXT_BUTTON = 'min-h-11 !px-1.5 text-[11px] font-semibold lg:min-h-0';

const Figure = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <div className="min-w-0">
    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-500">
      {label}
    </div>
    <div className={`text-lg font-bold tabular-nums ${tone ?? 'text-gray-900 dark:text-ink-50'}`}>
      {value}
    </div>
  </div>
);

export const GrantForfeiture = ({
  plan,
  roleLastDay,
  ownDate,
  onSave,
  lockedReason,
}: {
  plan: EquityVestingPlan;
  // The role's own last day, which the grant falls back to when it records no date of its own.
  roleLastDay: string | null;
  ownDate: string | null;
  onSave?: (stoppedOn: string | null) => Promise<void>;
  // Why the date cannot be set, so a missing control is never silent.
  lockedReason?: string;
}) => {
  const [saving, setSaving] = useState(false);
  const kept = retainedGrant(plan);

  const save = async (stoppedOn: string | null) => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(stoppedOn);
    } catch {
      // The caller reports it; the picker keeps the date it had.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-xs font-medium text-slate-600 dark:text-ink-200">
          Vesting stopped on
        </span>
        {onSave ? (
          <div className="grant-price-row flex flex-wrap items-center gap-2">
            <DatePicker
              size="small"
              allowClear={false}
              disabled={saving}
              placeholder="Pick the day"
              value={plan.lastDay ? dayjs(plan.lastDay) : null}
              disabledDate={(day) => day.isBefore(dayjs(plan.grantDate), 'day')}
              onChange={(day) => day && void save(day.format('YYYY-MM-DD'))}
            />
            {ownDate && (
              <Button
                type="text"
                size="small"
                loading={saving}
                onClick={() => void save(null)}
                className={`${TEXT_BUTTON} !text-slate-500 dark:!text-ink-400`}
              >
                {roleLastDay ? "Use the role's last day" : 'Still vesting'}
              </Button>
            )}
          </div>
        ) : (
          <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-ink-100">
            {plan.lastDay ? dateLabel(plan.lastDay) : 'Still vesting'}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Figure label="Kept" value={fmtMoney(kept)} />
        <Figure
          label="Forfeited"
          value={fmtMoney(plan.forfeited)}
          tone={plan.forfeited > 0 ? 'text-amber-700 dark:text-amber-300' : undefined}
        />
      </div>

      {plan.forfeitedVests.length > 0 && (
        <div className="mt-2 max-h-[150px] divide-y divide-slate-200/70 overflow-y-auto pr-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar]:w-1.5 dark:divide-white/[0.08] dark:[&::-webkit-scrollbar-thumb]:bg-ink-700">
          {plan.forfeitedVests.map((vest) => (
            <div
              key={vest.monthsFromGrant}
              className="flex items-center justify-between gap-2 py-1 text-xs"
            >
              <span className="tabular-nums text-slate-500 dark:text-ink-400">
                {dateLabel(vest.date)}
              </span>
              <span className="flex items-baseline gap-2">
                <span className="text-[11px] text-slate-400 dark:text-ink-500">
                  {grantShare(vest.value, plan.totalGrant)}
                </span>
                <span className="font-semibold tabular-nums text-slate-500 line-through dark:text-ink-400">
                  {fmtMoney(vest.value)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-ink-400">
        {!onSave
          ? (lockedReason ?? 'The day a grant stopped vesting is recorded on the linked offer.')
          : plan.forfeited > 0
            ? `Every vest after this day is dropped from the chart, the schedule and the pay totals. ${
                ownDate
                  ? 'This date is recorded against the grant.'
                  : 'This is the last day on the role itself; pick another to record one against the grant.'
              }`
            : roleLastDay || ownDate
              ? 'Nothing was forfeited: the grant had finished vesting by this day.'
              : 'Nothing is forfeited while the grant is still vesting. Pick the day you left and the vests after it stop counting.'}
      </p>
    </div>
  );
};

export default GrantForfeiture;
