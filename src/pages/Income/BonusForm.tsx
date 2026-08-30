import { AutoComplete, Button, DatePicker, Select, Switch, Tooltip } from 'antd';
import { DeleteOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { IncomeEvent } from './tax/ledger';
import type { PayPeriod } from './paySchedule';
import { formatPayDate } from './paySchedule';
import {
  BONUS_EXTRA_PRESETS,
  amountFromPercent,
  bonusFromPercent,
  bonusPercentOfBase,
  defaultBonusPayout,
  extrasTotal,
  payoutSharesTotal,
  percentFromAmount,
  type BonusExtra,
  type BonusPayout,
} from './bonusSchedule';
import SegmentedToggle from '../../components/SegmentedToggle';
import FigureMath from './FigureMath';
import { bonusBreakdown } from './mathBreakdown';
import MoneyInput from './MoneyInput';
import PercentInput from './PercentInput';
import { useMoney } from './amountPrivacy';

interface Props {
  includeBonus: boolean;
  targetBonus: number;
  bonusTotal: number;
  offerBonus: number;
  annualSalary: number;
  multiplierPercent: number;
  prorated: boolean;
  prorationFactor: number;
  performanceYear: number;
  performanceYearOptions: number[];
  prorationDays: { daysHeld: number; daysInYear: number };
  extras: BonusExtra[];
  payouts: BonusPayout[];
  bonusEvents: IncomeEvent[];
  periods: PayPeriod[];
  taxYear: number;
  onIncludeChange: (value: boolean) => void;
  onBonusChange: (value: number | null) => void;
  onMultiplierChange: (value: number) => void;
  onProratedChange: (value: boolean) => void;
  onPerformanceYearChange: (value: number) => void;
  onExtrasChange: (extras: BonusExtra[]) => void;
  onPayoutsChange: (payouts: BonusPayout[]) => void;
}

const BONUS_EXTRA_OPTIONS = BONUS_EXTRA_PRESETS.map((label) => ({ value: label, label }));

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
      {label}
      {hint ? (
        <Tooltip title={hint}>
          <InfoCircleOutlined className="text-slate-400" />
        </Tooltip>
      ) : null}
    </span>
    <div className="mt-1.5">{children}</div>
  </label>
);

const SectionLabel = ({
  children,
  trailing,
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </span>
    {trailing}
  </div>
);

export const BonusForm = ({
  includeBonus,
  targetBonus,
  bonusTotal,
  offerBonus,
  annualSalary,
  multiplierPercent,
  prorated,
  prorationFactor,
  performanceYear,
  performanceYearOptions,
  prorationDays,
  extras,
  payouts,
  bonusEvents,
  periods,
  taxYear,
  onIncludeChange,
  onBonusChange,
  onMultiplierChange,
  onProratedChange,
  onPerformanceYearChange,
  onExtrasChange,
  onPayoutsChange,
}: Props) => {
  const { money, moneyCents } = useMoney();
  const percentOfBase = bonusPercentOfBase(targetBonus, annualSalary);
  const isPartYear = prorationFactor < 0.999;
  const proratedTarget = targetBonus * (multiplierPercent / 100) * (prorated ? prorationFactor : 1);
  const sharesTotal = payoutSharesTotal(payouts);
  const scheduled = bonusEvents.reduce((sum, event) => sum + event.amount, 0);
  const periodOptions = periods
    .filter((period) => !period.isOffCycle)
    .map((period) => ({ value: period.periodIndex, label: formatPayDate(period.payDate) }));

  const patchPayout = (id: string, patch: Partial<BonusPayout>) =>
    onPayoutsChange(payouts.map((payout) => (payout.id === id ? { ...payout, ...patch } : payout)));

  const patchExtra = (id: string, patch: Partial<BonusExtra>) =>
    onExtrasChange(extras.map((extra) => (extra.id === id ? { ...extra, ...patch } : extra)));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <p className="text-xs leading-relaxed text-slate-500">
            The target comes from your offer. Multipliers, extras and payout timing are yours to
            set.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-600">
          <Switch size="small" checked={includeBonus} onChange={onIncludeChange} />
          Include bonus
        </label>
      </div>

      {!includeBonus ? (
        <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
          No bonus is included, so take-home reflects base salary only. Your offer records a target
          of <span className="font-medium">{money(offerBonus)}</span>
          {annualSalary > 0 ? (
            <>
              {' '}
              (
              <span className="font-medium">
                {bonusPercentOfBase(offerBonus, annualSalary).toFixed(1)}%
              </span>{' '}
              of base)
            </>
          ) : null}
          .
        </p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <Field
              label="Target bonus"
              hint="Defaults to the target bonus on your offer. Edit it to model an actual payout."
            >
              <MoneyInput value={targetBonus} onChange={onBonusChange} />
            </Field>
            <Field label="Percent of base">
              <PercentInput
                max={200}
                value={Number(percentOfBase.toFixed(2))}
                disabled={annualSalary <= 0}
                onChange={(value) =>
                  onBonusChange(bonusFromPercent(Number(value ?? 0), annualSalary))
                }
              />
            </Field>
            <Field
              label="Company multiplier"
              hint="Company performance often scales the whole pool. 100% pays the target, 115% pays 15% more."
            >
              <PercentInput
                max={400}
                value={multiplierPercent}
                onChange={(value) => onMultiplierChange(Number(value ?? 100))}
              />
            </Field>
            <div className="flex items-end pb-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                Total bonus
                <FigureMath
                  label="Total bonus"
                  breakdown={bonusBreakdown({
                    targetBonus,
                    multiplierPercent,
                    proration: prorationFactor,
                    prorated,
                    extras,
                    performanceYear,
                    bonusTotal,
                  })}
                />
                <span className="ml-0.5 text-base font-semibold tabular-nums text-slate-900">
                  {money(bonusTotal)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                Performance year
                <Tooltip title="A bonus is usually earned in one year and paid in the next, so proration is measured against the year it was earned, not the year the money arrives. Defaults to the year before this one.">
                  <InfoCircleOutlined className="text-slate-400" />
                </Tooltip>
              </span>
              <Select
                size="small"
                className="w-[104px]"
                value={performanceYear}
                // Only years the role was held; any other prorates the target to zero.
                options={performanceYearOptions.map((year) => ({
                  value: year,
                  label: String(year),
                }))}
                onChange={(value) => onPerformanceYearChange(Number(value))}
              />
            </div>

            <label className="mt-2.5 flex items-center justify-between gap-3 border-t border-slate-200/70 pt-2.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                Prorate for time worked
                <Tooltip title="A target bonus is earned across the performance year, so a part year earns part of it. Extra bonuses are never prorated.">
                  <InfoCircleOutlined className="text-slate-400" />
                </Tooltip>
              </span>
              <Switch size="small" checked={prorated} onChange={onProratedChange} />
            </label>

            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              {prorationFactor === 0 ? (
                <>
                  This role was not held during {performanceYear}, so a prorated bonus comes to
                  nothing. Change the performance year if the bonus was earned in {taxYear} instead.
                </>
              ) : isPartYear ? (
                prorated ? (
                  <>
                    Held{' '}
                    <span className="font-medium text-slate-700">
                      {prorationDays.daysHeld} of {prorationDays.daysInYear} days
                    </span>{' '}
                    in {performanceYear}, so {money(targetBonus)} ×{' '}
                    {(prorationFactor * 100).toFixed(1)}% ={' '}
                    <span className="font-medium text-slate-700">{money(proratedTarget)}</span>.
                  </>
                ) : (
                  <>
                    Off, so the full {money(targetBonus)} counts even though the role was held only{' '}
                    {prorationDays.daysHeld} of {prorationDays.daysInYear} days in {performanceYear}
                    .
                  </>
                )
              ) : (
                <>The role covered all of {performanceYear}, so proration changes nothing.</>
              )}
            </p>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel
                trailing={
                  extras.length > 0 ? (
                    <span className="text-xs font-medium tabular-nums text-slate-600">
                      {money(extrasTotal(extras))}
                    </span>
                  ) : undefined
                }
              >
                Extra bonuses
              </SectionLabel>
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={() =>
                  onExtrasChange([...extras, { id: `extra-${Date.now()}`, label: '', amount: 0 }])
                }
              >
                Add
              </Button>
            </div>

            {extras.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">
                Stacked on top of the target: exceeding expectations, a spot award, a retention
                bonus.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {extras.map((extra) => (
                  <div key={extra.id} className="flex flex-wrap items-center gap-2">
                    <AutoComplete
                      size="small"
                      className="min-w-[140px] flex-1"
                      placeholder="Pick a common one, or name your own"
                      value={extra.label}
                      options={BONUS_EXTRA_OPTIONS}
                      filterOption={(input, option) =>
                        String(option?.value ?? '')
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      onChange={(value) => patchExtra(extra.id, { label: value ?? '' })}
                    />
                    <MoneyInput
                      size="small"
                      minChars={8}
                      value={extra.amount}
                      onChange={(value) => patchExtra(extra.id, { amount: Number(value ?? 0) })}
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() =>
                        onExtrasChange(extras.filter((other) => other.id !== extra.id))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel>Payout schedule</SectionLabel>
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={() =>
                  onPayoutsChange([
                    ...payouts,
                    {
                      ...defaultBonusPayout(periods),
                      id: `payout-${Date.now()}`,
                      percent: Math.max(0, 100 - sharesTotal),
                    },
                  ])
                }
              >
                Add
              </Button>
            </div>

            {payouts.length === 0 ? (
              <div className="mt-2">
                <p className="text-xs text-slate-400">
                  Nothing scheduled yet, so no bonus lands on any paycheck.
                </p>
                <Button
                  size="small"
                  type="link"
                  className="!px-0"
                  onClick={() => onPayoutsChange([defaultBonusPayout(periods)])}
                >
                  Pay it all on one paycheck
                </Button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {payouts.map((payout) => {
                  const offCycle = payout.periodIndex === null;
                  return (
                    <div
                      key={payout.id}
                      className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* antd's Segmented track is the same tint as this panel, so the active pill floats on nothing. */}
                        <SegmentedToggle
                          value={offCycle ? 'own' : 'paycheck'}
                          wrapperClassName="bg-white"
                          buttonClassName="!min-h-0 px-2.5 py-1 text-xs"
                          onChange={(value) =>
                            patchPayout(
                              payout.id,
                              value === 'own'
                                ? {
                                    periodIndex: null,
                                    payDate: payout.payDate ?? `${taxYear}-03-15`,
                                  }
                                : {
                                    periodIndex:
                                      periods.find((period) => !period.isOffCycle)?.periodIndex ??
                                      1,
                                    payDate: null,
                                  }
                            )
                          }
                          options={[
                            { label: 'With paycheck', value: 'paycheck' },
                            { label: 'Own date', value: 'own' },
                          ]}
                        />
                        <Button
                          size="small"
                          type="text"
                          icon={<DeleteOutlined />}
                          onClick={() =>
                            onPayoutsChange(payouts.filter((other) => other.id !== payout.id))
                          }
                        />
                      </div>

                      {/* Three unlabelled boxes read as one long number; each says what it is. */}
                      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
                        <Field label={offCycle ? 'Pay date' : 'Paycheck'}>
                          {offCycle ? (
                            <DatePicker
                              size="small"
                              className="w-full"
                              allowClear={false}
                              value={payout.payDate ? dayjs(payout.payDate) : null}
                              onChange={(value) =>
                                patchPayout(payout.id, {
                                  payDate: value ? value.format('YYYY-MM-DD') : null,
                                })
                              }
                            />
                          ) : (
                            <Select
                              size="small"
                              style={{ width: '100%' }}
                              value={payout.periodIndex ?? undefined}
                              options={periodOptions}
                              onChange={(value) =>
                                patchPayout(payout.id, {
                                  periodIndex: Number(value),
                                  payDate: null,
                                })
                              }
                            />
                          )}
                        </Field>
                        <Field label="Share">
                          <PercentInput
                            fullWidth
                            size="small"
                            value={Number(payout.percent.toFixed(2))}
                            onChange={(value) =>
                              patchPayout(payout.id, { percent: Number(value ?? 0) })
                            }
                          />
                        </Field>
                        <Field
                          label="Amount"
                          hint={
                            bonusTotal > 0
                              ? 'Edit either side: the share and the amount stay in step.'
                              : 'Set a target bonus first, then an amount can be split out of it.'
                          }
                        >
                          <MoneyInput
                            fullWidth
                            size="small"
                            value={Number(amountFromPercent(payout.percent, bonusTotal).toFixed(2))}
                            onChange={(value) =>
                              patchPayout(payout.id, {
                                percent: percentFromAmount(Number(value ?? 0), bonusTotal),
                              })
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-baseline justify-between gap-3 border-t border-slate-100 pt-2 text-xs">
                  <span className="text-slate-500">
                    Scheduled {sharesTotal.toFixed(0)}% of the bonus
                  </span>
                  <span className="font-medium tabular-nums text-slate-700">
                    {moneyCents(scheduled)}
                  </span>
                </div>
                {sharesTotal !== 100 ? (
                  <p className="text-xs text-amber-600">
                    {sharesTotal < 100
                      ? `${(100 - sharesTotal).toFixed(0)}% of the bonus is not scheduled to any paycheck.`
                      : `The schedule adds up to ${sharesTotal.toFixed(0)}%, more than the full bonus.`}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-400">
            A bonus is withheld at the flat 22% supplemental rate. Paid on its own date it carries
            no salary and no recurring deductions, so the whole amount is supplemental.
          </p>
        </>
      )}
    </div>
  );
};

export default BonusForm;
