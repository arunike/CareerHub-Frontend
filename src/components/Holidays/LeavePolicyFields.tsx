import { InputNumber, Select, Switch } from 'antd';
import UnitNumberInput from '../inputs/UnitNumberInput';
import { DEFAULT_UNLIMITED_PTO_DAYS } from '../../utils/OfferComparison/decisionScoring';
import type { PtoPolicy } from '../../utils/TimeOff/ptoBalance';

// A landscape phone leaves under 400px, and the overlay is fixed against that, so it scrolls.
const PANEL_CLASS = 'max-h-[min(70vh,420px)] w-[264px] space-y-3 overflow-y-auto text-[12px]';

const LAPSE_MONTHS = [
  { value: 0, label: 'Never' },
  ...Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Date(2026, index, 1).toLocaleString(undefined, { month: 'long' }),
  })),
];

interface Props {
  policy: PtoPolicy;
  // Every control writes the offer it came from, so a change carries the model patch and its payload.
  onSave: (patch: Partial<PtoPolicy>, payload: Record<string, number | boolean>) => void;
  entitled: number;
  accrued: number;
  yearsWorked: number;
  // The carry starts the year after the switch is turned on, so the year in progress is left alone.
  todayYear: number;
}

const LeavePolicyFields = ({
  policy,
  onSave,
  entitled,
  accrued,
  yearsWorked,
  todayYear,
}: Props) => {
  // The mode re-labels one field; the fixed bank and the planning target stay separate columns.
  const saveDays = (value: number | null) =>
    policy.isUnlimited
      ? onSave(
          { unlimitedPlanningDays: value ?? DEFAULT_UNLIMITED_PTO_DAYS },
          { unlimited_pto_planning_days: value ?? DEFAULT_UNLIMITED_PTO_DAYS }
        )
      : onSave({ ptoDays: value ?? 0 }, { pto_days: value ?? 0 });

  const perPaycheck =
    policy.paychecksPerYear > 0 ? (entitled * policy.hoursPerDay) / policy.paychecksPerYear : 0;

  return (
    <div className={PANEL_CLASS}>
      <label className="flex items-center justify-between gap-2">
        <span className="text-slate-600 dark:text-ink-300">Unlimited PTO</span>
        <Switch
          size="small"
          checked={policy.isUnlimited}
          onChange={(next) => onSave({ isUnlimited: next }, { is_unlimited_pto: next })}
          aria-label="Unlimited PTO"
        />
      </label>

      <label className="flex items-center justify-between gap-2">
        <span className="text-slate-600 dark:text-ink-300">
          {policy.isUnlimited ? 'Days you plan to take' : 'Days a year'}
        </span>
        <UnitNumberInput
          value={policy.isUnlimited ? policy.unlimitedPlanningDays : policy.ptoDays}
          onChange={saveDays}
          min={0}
          max={policy.isUnlimited ? 60 : 365}
          size="small"
          className="w-16"
        />
      </label>

      {policy.isUnlimited ? (
        <p className="border-t border-slate-100 pt-2 text-slate-400 dark:border-white/[0.07] dark:text-ink-500">
          Unlimited leave has no bank, so nothing carries over and tenure adds nothing. Switch it
          off to track a fixed allowance that can roll over.
        </p>
      ) : (
        <>
          <label className="flex items-center justify-between gap-2">
            <span className="text-slate-600 dark:text-ink-300">
              Roll the balance into next year
            </span>
            <Switch
              size="small"
              checked={policy.rolloverEnabled}
              onChange={(next) =>
                onSave(
                  { rolloverEnabled: next, rolloverFromYear: next ? todayYear + 1 : 0 },
                  {
                    pto_rollover_enabled: next,
                    pto_rollover_from_year: next ? todayYear + 1 : 0,
                  }
                )
              }
              aria-label="Roll the balance into next year"
            />
          </label>

          {policy.rolloverEnabled && policy.rolloverFromYear > 0 && (
            <p className="text-slate-400 dark:text-ink-500">
              Carries from {policy.rolloverFromYear}, so {todayYear} is unchanged.
            </p>
          )}

          <label className="flex items-center justify-between gap-2">
            <span className="text-slate-600 dark:text-ink-300">
              Carry over, at most (0 = no limit)
            </span>
            <InputNumber
              disabled={!policy.rolloverEnabled}
              value={policy.rolloverMaxDays}
              onChange={(value) =>
                onSave({ rolloverMaxDays: value ?? 0 }, { pto_rollover_max_days: value ?? 0 })
              }
              min={0}
              max={90}
              size="small"
              className="w-16"
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span className="text-slate-600 dark:text-ink-300">Carried days lapse in</span>
            <Select
              disabled={!policy.rolloverEnabled}
              value={policy.rolloverExpiresMonth}
              onChange={(value) =>
                onSave({ rolloverExpiresMonth: value }, { pto_rollover_expires_month: value })
              }
              size="small"
              className="w-28"
              options={LAPSE_MONTHS}
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span className="text-slate-600 dark:text-ink-300">Extra days per year worked</span>
            <InputNumber
              value={policy.accrualDaysPerYear}
              onChange={(value) =>
                onSave(
                  { accrualDaysPerYear: value ?? 0 },
                  { pto_accrual_days_per_year: value ?? 0 }
                )
              }
              min={0}
              max={30}
              size="small"
              className="w-16"
            />
          </label>

          {policy.accrualDaysPerYear > 0 && (
            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-600 dark:text-ink-300">Stop once extras reach</span>
              <InputNumber
                value={policy.accrualMaxDays}
                onChange={(value) =>
                  onSave({ accrualMaxDays: value ?? 0 }, { pto_accrual_max_days: value ?? 0 })
                }
                min={0}
                max={60}
                size="small"
                placeholder="No cap"
                className="w-16"
              />
            </label>
          )}

          <label className="flex items-center justify-between gap-2">
            <span className="text-slate-600 dark:text-ink-300">Hours in a day</span>
            <InputNumber
              value={policy.hoursPerDay}
              onChange={(value) =>
                onSave({ hoursPerDay: value ?? 8 }, { pto_hours_per_day: value ?? 8 })
              }
              min={1}
              max={24}
              step={0.5}
              size="small"
              className="w-16"
            />
          </label>

          <p className="border-t border-slate-100 pt-2 text-slate-400 dark:border-white/[0.07] dark:text-ink-500">
            Accrues {perPaycheck.toFixed(2)}h per paycheck over {policy.paychecksPerYear} paychecks.
            {policy.accrualDaysPerYear > 0
              ? ` ${yearsWorked} year${yearsWorked === 1 ? '' : 's'} worked has added ${accrued}d${
                  policy.accrualMaxDays > 0 && accrued >= policy.accrualMaxDays
                    ? ', which is the cap'
                    : ''
                }.`
              : ''}
          </p>
        </>
      )}
    </div>
  );
};

export default LeavePolicyFields;
