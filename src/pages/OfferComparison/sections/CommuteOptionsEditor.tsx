import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { ReactNode } from 'react';
import UnitNumberInput from '../../../components/UnitNumberInput';
import { CONTROL_CLASS, FIELD_LABEL_CLASS } from '../../../components/formControls';
import {
  COMMUTE_MODES,
  COMMUTE_MODE_LABELS,
  annualCostFor,
  annualHoursFor,
  dailyMilesFor,
  effectiveFuelInputs,
  formatHours,
  fuelBreakdownFor,
  isFuelCosted,
  parseDuration,
  supportsFuelCosting,
  type CommuteMode,
  type CommuteOption,
  type CostFrequency,
  type DistanceBasis,
  type DrivingDefaults,
} from '../commute';

interface Props {
  options: CommuteOption[];
  onChange: (options: CommuteOption[]) => void;
  officeDays: number;
  // Shared across every offer, edited once on the Offers page.
  drivingDefaults?: Partial<DrivingDefaults> | null;
}

const money = (value: number) => `$${Math.round(value).toLocaleString()}`;

const newOption = (used: CommuteMode[]): CommuteOption => ({
  mode: COMMUTE_MODES.find((mode) => !used.includes(mode)) ?? 'OTHER',
  minutes_each_way: 30,
  cost_value: 0,
  cost_frequency: 'MONTHLY',
  is_primary: used.length === 0,
});

const Field = ({
  label,
  hint,
  onHintClick,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  // Makes the hint the undo for an override, keeping it beside the value it describes
  // instead of adding a second control to an already dense row.
  onHintClick?: () => void;
  children: ReactNode;
  className?: string;
}) => (
  <div className={`min-w-0 ${className}`}>
    <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span>
    {children}
    {hint ? (
      onHintClick ? (
        <button
          type="button"
          onClick={onHintClick}
          className="mt-1 block text-[10px] leading-3 font-semibold text-blue-600 transition-colors hover:text-blue-800"
        >
          {hint} · use shared
        </button>
      ) : (
        <span className="mt-1 block text-[10px] leading-3 text-slate-400">{hint}</span>
      )
    ) : null}
  </div>
);

// A shared figure, shown as a value rather than an input so it is clear it is not per-offer,
// with one click to take it over for this offer only.
const SharedValue = ({
  text,
  onOverride,
  label,
}: {
  text: string;
  onOverride: () => void;
  label: string;
}) => (
  <div className="flex h-[38px] items-center justify-between gap-2 rounded-[9px] border border-dashed border-slate-200 bg-slate-50 px-2.5">
    <span className="truncate text-sm text-slate-600 tabular-nums">{text}</span>
    <button
      type="button"
      onClick={onOverride}
      aria-label={label}
      title={label}
      className="shrink-0 rounded px-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600 transition-colors hover:text-blue-800"
    >
      Edit
    </button>
  </div>
);

const CommuteOptionsEditor = ({ options, onChange, officeDays, drivingDefaults }: Props) => {
  const patch = (index: number, changes: Partial<CommuteOption>) =>
    onChange(options.map((option, i) => (i === index ? { ...option, ...changes } : option)));

  // Exactly one primary, and never zero once a row exists.
  const setPrimary = (index: number) =>
    onChange(options.map((option, i) => ({ ...option, is_primary: i === index })));

  const remove = (index: number) => {
    const next = options.filter((_, i) => i !== index);
    if (next.length && !next.some((option) => option.is_primary)) next[0].is_primary = true;
    onChange(next);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span className={FIELD_LABEL_CLASS}>Commute</span>
        <button
          type="button"
          onClick={() => onChange([...options, newOption(options.map((o) => o.mode))])}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-50"
        >
          <PlusOutlined className="text-[10px]" /> Add mode
        </button>
      </div>
      <p className="mb-3 text-[11px] leading-4 text-slate-500">
        Time and cost are both counted over{' '}
        <span className="font-semibold text-slate-600">{Math.round(officeDays)} office days</span> a
        year, from this offer&apos;s RTO policy and time off. For driving, set Cost to{' '}
        <span className="font-semibold text-slate-600">From gas</span> to work it out from distance
        and pump price instead of guessing a yearly total.
      </p>

      {options.length === 0 ? (
        <p className="text-[11px] text-slate-400">
          No modes yet — add one to compare travel time as well as cost.
        </p>
      ) : (
        <div className="space-y-3">
          {options.map((option, index) => {
            const hours = annualHoursFor(option, officeDays);
            const cost = annualCostFor(option, officeDays, drivingDefaults);
            const fuelCosted = isFuelCosted(option);
            const fuel = fuelCosted ? fuelBreakdownFor(option, officeDays, drivingDefaults) : null;
            const fuelInputs = effectiveFuelInputs(option, drivingDefaults);
            const perDayMiles = dailyMilesFor(option);

            return (
              <div
                key={index}
                className={`rounded-xl border p-3 transition-colors ${
                  option.is_primary ? 'border-blue-300 bg-white' : 'border-slate-200 bg-white/60'
                }`}
              >
                {/* The row's own bottom line sits in its header, because that is the number
                    being compared between modes — previously it was a grey footnote. */}
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                  <Tooltip title={option.is_primary ? 'Primary mode' : 'Use as primary mode'}>
                    <label className="flex min-w-0 cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        checked={!!option.is_primary}
                        onChange={() => setPrimary(index)}
                        aria-label={`Use ${COMMUTE_MODE_LABELS[option.mode]} as the primary commute`}
                        className="h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
                      />
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {COMMUTE_MODE_LABELS[option.mode]}
                      </span>
                      {option.is_primary && (
                        <span className="shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                          Primary
                        </span>
                      )}
                    </label>
                  </Tooltip>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs tabular-nums text-slate-500">
                      {cost > 0 && (
                        <span className="font-bold text-slate-900">{money(cost)}/yr</span>
                      )}
                      {cost > 0 && hours > 0 && ' · '}
                      {hours > 0 && formatHours(hours)}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      aria-label={`Remove ${COMMUTE_MODE_LABELS[option.mode]}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <DeleteOutlined className="text-xs" />
                    </button>
                  </div>
                </div>

                {/* Mode and Cost decide which fields below even apply, so they lead and are
                    set apart rather than sitting at the same weight as the values. */}
                <div className="mb-3 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 sm:grid-cols-2">
                  <Field label="Mode">
                    <select
                      value={option.mode}
                      onChange={(event) =>
                        patch(index, { mode: event.target.value as CommuteMode })
                      }
                      className={CONTROL_CLASS}
                      aria-label="Commute mode"
                    >
                      {COMMUTE_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {COMMUTE_MODE_LABELS[mode]}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Cost">
                    <select
                      value={fuelCosted ? 'FUEL' : option.cost_frequency}
                      onChange={(event) => {
                        const next = event.target.value;
                        if (next === 'FUEL') {
                          // Do not copy the shared figures onto the offer or it becomes an override.
                          patch(index, {
                            cost_mode: 'FUEL',
                            distance_basis: option.distance_basis || 'ONE_WAY',
                          });
                        } else {
                          patch(index, {
                            cost_mode: 'FIXED',
                            cost_frequency: next as CostFrequency,
                          });
                        }
                      }}
                      className={CONTROL_CLASS}
                      aria-label="How the cost is worked out"
                    >
                      <option value="DAILY">Fixed, per day</option>
                      <option value="MONTHLY">Fixed, per month</option>
                      <option value="YEARLY">Fixed, per year</option>
                      {supportsFuelCosting(option.mode) && (
                        <option value="FUEL">From gas &amp; miles</option>
                      )}
                    </select>
                  </Field>
                </div>

                {/* Everything the two choices above imply, in one grid that reflows to two
                    columns on a phone. */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3">
                  <Field label="Time each way" hint="90, 1h30 or 1:30">
                    <UnitNumberInput
                      unit="min"
                      min={0}
                      max={600}
                      value={option.minutes_each_way || null}
                      onChange={(value) => patch(index, { minutes_each_way: value ?? 0 })}
                      parseText={parseDuration}
                      placeholder="0"
                      aria-label="Minutes each way"
                    />
                  </Field>

                  {fuelCosted ? (
                    <>
                      <Field label="Distance">
                        <UnitNumberInput
                          unit="mi"
                          min={0}
                          value={option.miles_each_way || null}
                          onChange={(value) => patch(index, { miles_each_way: value ?? 0 })}
                          placeholder="0"
                          aria-label="Commute distance"
                        />
                      </Field>

                      {/* The fix for the wrong total: the trip being described is now stated
                          rather than assumed, so a round-trip figure is not doubled again. */}
                      <Field
                        label="Counts as"
                        hint={
                          perDayMiles > 0 ? `${perDayMiles.toLocaleString()} mi per office day` : ''
                        }
                      >
                        <select
                          value={option.distance_basis ?? 'ONE_WAY'}
                          onChange={(event) =>
                            patch(index, {
                              distance_basis: event.target.value as DistanceBasis,
                            })
                          }
                          className={CONTROL_CLASS}
                          aria-label="Whether the distance is one way or a round trip"
                        >
                          <option value="ONE_WAY">One way</option>
                          <option value="ROUND_TRIP">Round trip</option>
                        </select>
                      </Field>

                      {/* Your car and your pump price are the same whichever offer you take,
                          so they are read-only here and shared across offers. Overriding is
                          possible but deliberate, for the offer that really does differ. */}
                      <Field
                        label="Efficiency"
                        hint={fuelInputs.mpgOverridden ? 'overridden' : 'shared'}
                        onHintClick={
                          fuelInputs.mpgOverridden ? () => patch(index, { mpg: null }) : undefined
                        }
                      >
                        {fuelInputs.mpgOverridden ? (
                          <UnitNumberInput
                            unit="mpg"
                            min={1}
                            max={200}
                            value={option.mpg ?? null}
                            onChange={(value) => patch(index, { mpg: value ?? null })}
                            aria-label="Miles per gallon override"
                          />
                        ) : (
                          <SharedValue
                            text={`${fuelInputs.mpg} mpg`}
                            onOverride={() => patch(index, { mpg: fuelInputs.mpg })}
                            label="Override efficiency for this offer"
                          />
                        )}
                      </Field>

                      <Field
                        label="Gas price"
                        hint={fuelInputs.priceOverridden ? 'overridden' : 'shared'}
                        onHintClick={
                          fuelInputs.priceOverridden
                            ? () => patch(index, { gas_price_per_gallon: null })
                            : undefined
                        }
                      >
                        {fuelInputs.priceOverridden ? (
                          <UnitNumberInput
                            unit="$/gal"
                            min={0}
                            step={0.1}
                            value={option.gas_price_per_gallon ?? null}
                            onChange={(value) =>
                              patch(index, { gas_price_per_gallon: value ?? null })
                            }
                            aria-label="Gas price per gallon override"
                          />
                        ) : (
                          <SharedValue
                            text={`$${fuelInputs.gasPricePerGallon}/gal`}
                            onOverride={() =>
                              patch(index, { gas_price_per_gallon: fuelInputs.gasPricePerGallon })
                            }
                            label="Override gas price for this offer"
                          />
                        )}
                      </Field>

                      <Field label="Parking & tolls" hint="per office day">
                        <UnitNumberInput
                          unit="$/day"
                          min={0}
                          value={option.parking_tolls_per_day ?? null}
                          onChange={(value) => patch(index, { parking_tolls_per_day: value ?? 0 })}
                          placeholder="0"
                          aria-label="Parking and tolls per office day"
                        />
                      </Field>
                    </>
                  ) : (
                    <Field label="Amount">
                      <UnitNumberInput
                        unit="$"
                        min={0}
                        value={option.cost_value || null}
                        onChange={(value) => patch(index, { cost_value: value ?? 0 })}
                        placeholder="0"
                        aria-label="Commute cost"
                      />
                    </Field>
                  )}
                </div>

                {/* The derived total shows every step, so a number that looks wrong can be
                    traced to the input that caused it. */}
                {fuelCosted && (
                  <p className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] leading-4 text-slate-500 tabular-nums">
                    {fuel ? (
                      <>
                        {perDayMiles.toLocaleString()} mi/day × {Math.round(officeDays)} days ={' '}
                        {Math.round(fuel.annualMiles).toLocaleString()} mi · {money(fuel.fuelCost)}{' '}
                        gas
                        {fuel.parkingCost > 0 && <> · {money(fuel.parkingCost)} parking</>} ={' '}
                        <span className="font-semibold text-slate-700">
                          {money(fuel.annualCost)}/yr
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400">
                        Add distance, efficiency and gas price for an estimate.
                      </span>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommuteOptionsEditor;
