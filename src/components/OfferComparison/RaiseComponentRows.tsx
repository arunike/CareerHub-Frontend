import type { Dispatch, SetStateAction } from 'react';

import ModeToggle from '../inputs/ModeToggle';
import UnitNumberInput from '../inputs/UnitNumberInput';
import { SALARY_HOURS_PER_YEAR } from '../../utils/Experience/payGrowth';
import {
  annualFromHourly,
  changeBetween,
  formatPercentChange,
  hourlyFromAnnual,
} from '../../utils/OfferComparison/raiseAfterValues';
import { bonusFromPercent, bonusPercentOf } from '../../utils/bonusPercent';
import {
  fmt,
  type AfterModes,
  type BaseEquityMode,
  type BaseMode,
  type BonusMode,
  type PctInputs,
} from './raiseHistoryFields';
import type { RaiseEntry } from '../../types';

type Form = Omit<RaiseEntry, 'id'>;

type Props = {
  form: Form;
  setF: (key: keyof Form, val: unknown) => void;
  afterModes: AfterModes;
  setAfterModes: Dispatch<SetStateAction<AfterModes>>;
  pctInputs: PctInputs;
  setPctInputs: Dispatch<SetStateAction<PctInputs>>;
  hourlyInput: string;
  setHourlyInput: Dispatch<SetStateAction<string>>;
  setBonusTouched: Dispatch<SetStateAction<boolean>>;
};

// Base, bonus and equity each carry their own modes and conversions, so they stay three rows.
const RaiseComponentRows = ({
  form,
  setF,
  afterModes,
  setAfterModes,
  pctInputs,
  setPctInputs,
  hourlyInput,
  setHourlyInput,
  setBonusTouched,
}: Props) => {
  const changeLine = (before: number, after: number) => {
    const { amount, percent } = changeBetween(before, after);
    if (amount === 0 && percent === null) return null;
    const tone =
      amount > 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : amount < 0
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-slate-400 dark:text-ink-500';
    return (
      <div className={`mt-1 text-xs tabular-nums ${tone}`}>
        {amount > 0 ? '+' : amount < 0 ? '−' : ''}
        {fmt(Math.abs(amount))}
        {percent !== null && <span className="ml-1.5">· {formatPercentChange(percent)}</span>}
      </div>
    );
  };

  // One row per figure, so the two columns cannot drift as the After side grows a toggle or a hint.
  const metricRow = (
    label: string,
    before: number,
    modes: React.ReactNode,
    after: React.ReactNode,
    hint?: React.ReactNode
  ) => (
    <div className="px-4 py-3.5">
      <div className="mb-2 flex min-h-11 items-center justify-between gap-3 sm:grid sm:min-h-7 sm:grid-cols-2 sm:gap-4">
        <label className="text-xs font-medium text-slate-600 dark:text-ink-200">{label}</label>
        <div className="flex items-center justify-end">{modes}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-ink-500 sm:hidden">
            Before
          </span>
          <div className="flex h-[38px] items-center rounded-[9px] border border-dashed border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-ink-800 px-3 text-sm text-slate-500 dark:text-ink-400">
            {before > 0 ? fmt(before) : '—'}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300 sm:hidden">
            After
          </span>
          {after}
          {hint}
        </div>
      </div>
    </div>
  );

  const switchBaseMode = (mode: BaseMode) => {
    setAfterModes((m) => ({ ...m, base: mode }));
    if (mode === 'rate') {
      const hourly = hourlyFromAnnual(form.base_after || form.base_before);
      setHourlyInput(hourly ? hourly.toFixed(2) : '');
    }
    if (mode === '%change') {
      const p = form.base_before
        ? ((form.base_after - form.base_before) / form.base_before) * 100
        : 0;
      setPctInputs((pi) => ({ ...pi, base: p.toFixed(1) }));
    }
  };

  const switchBonusMode = (mode: BonusMode) => {
    setAfterModes((m) => ({ ...m, bonus: mode }));
    if (mode === '%change') {
      const p = form.bonus_before
        ? ((form.bonus_after - form.bonus_before) / form.bonus_before) * 100
        : 0;
      setPctInputs((pi) => ({ ...pi, bonus: p.toFixed(1) }));
    } else if (mode === '%ofbase') {
      const p = bonusPercentOf(form.base_after, form.bonus_after);
      setPctInputs((pi) => ({ ...pi, bonus: p.toFixed(1) }));
    }
  };

  const switchEquityMode = (mode: BaseEquityMode) => {
    setAfterModes((m) => ({ ...m, equity: mode }));
    if (mode === '%change') {
      const p = form.equity_before
        ? ((form.equity_after - form.equity_before) / form.equity_before) * 100
        : 0;
      setPctInputs((pi) => ({ ...pi, equity: p.toFixed(1) }));
    }
  };

  const baseRow = () => {
    const mode = afterModes.base;
    return metricRow(
      'Base Salary',
      form.base_before,
      <ModeToggle
        value={mode}
        onChange={switchBaseMode}
        options={[
          { label: '$', value: '$' },
          { label: '% increase', value: '%change' },
          { label: '$/hr', value: 'rate' },
        ]}
      />,
      mode === '$' ? (
        <UnitNumberInput
          unit="$"
          min={0}
          value={form.base_after || null}
          onChange={(value) => setF('base_after', value ?? 0)}
        />
      ) : mode === 'rate' ? (
        <UnitNumberInput
          unit="$/hr"
          min={0}
          value={hourlyInput === '' ? null : Number(hourlyInput)}
          onChange={(value) => {
            setHourlyInput(value == null ? '' : String(value));
            if (value != null) setF('base_after', annualFromHourly(value));
          }}
          placeholder="e.g. 80"
        />
      ) : (
        <UnitNumberInput
          unit="%"
          value={pctInputs.base === '' ? null : Number(pctInputs.base)}
          onChange={(value) => {
            setPctInputs((pi) => ({ ...pi, base: value == null ? '' : String(value) }));
            if (value != null) setF('base_after', Math.round(form.base_before * (1 + value / 100)));
          }}
          placeholder="e.g. 4.2"
        />
      ),
      <>
        {mode !== '$' && form.base_after > 0 ? (
          <div className="mt-0.5 text-xs text-gray-400 dark:text-ink-500">
            {fmt(form.base_after)}
            {mode === 'rate' && ` · ${SALARY_HOURS_PER_YEAR.toLocaleString()} hrs/yr`}
          </div>
        ) : null}
        {changeLine(form.base_before, form.base_after)}
      </>
    );
  };

  const bonusRow = () => {
    const mode = afterModes.bonus;
    return metricRow(
      'Annual Bonus',
      form.bonus_before,
      <ModeToggle
        value={mode}
        onChange={switchBonusMode}
        options={[
          { label: '$', value: '$' },
          { label: '% increase', value: '%change' },
          { label: '% of base', value: '%ofbase' },
        ]}
      />,
      mode === '$' ? (
        <UnitNumberInput
          unit="$"
          min={0}
          value={form.bonus_after || null}
          onChange={(value) => {
            setBonusTouched(true);
            setF('bonus_after', value ?? 0);
          }}
        />
      ) : (
        <UnitNumberInput
          unit="%"
          value={pctInputs.bonus === '' ? null : Number(pctInputs.bonus)}
          onChange={(value) => {
            setPctInputs((pi) => ({ ...pi, bonus: value == null ? '' : String(value) }));
            if (value != null) {
              if (mode === '%change') {
                setF('bonus_after', Math.round(form.bonus_before * (1 + value / 100)));
              } else {
                setF('bonus_after', bonusFromPercent(value, form.base_after));
              }
            }
          }}
          placeholder={mode === '%ofbase' ? 'e.g. 20' : 'e.g. 5'}
        />
      ),
      <>
        {mode !== '$' && form.bonus_after > 0 ? (
          <div className="mt-0.5 text-xs text-gray-400 dark:text-ink-500">
            {fmt(form.bonus_after)}
            {mode === '%ofbase' && form.base_after > 0 && (
              <span className="ml-1 text-blue-400">of {fmt(form.base_after)} base</span>
            )}
          </div>
        ) : null}
        {changeLine(form.bonus_before, form.bonus_after)}
      </>
    );
  };

  const equityRow = () => {
    const mode = afterModes.equity;
    return metricRow(
      'Annual RSU',
      form.equity_before,
      <ModeToggle
        value={mode}
        onChange={switchEquityMode}
        options={[
          { label: '$', value: '$' },
          { label: '% increase', value: '%change' },
        ]}
      />,
      mode === '$' ? (
        <UnitNumberInput
          unit="$"
          min={0}
          value={form.equity_after || null}
          onChange={(value) => setF('equity_after', value ?? 0)}
        />
      ) : (
        <UnitNumberInput
          unit="%"
          value={pctInputs.equity === '' ? null : Number(pctInputs.equity)}
          onChange={(value) => {
            setPctInputs((pi) => ({ ...pi, equity: value == null ? '' : String(value) }));
            if (value != null)
              setF('equity_after', Math.round(form.equity_before * (1 + value / 100)));
          }}
          placeholder="e.g. 4.2"
        />
      ),
      <>
        {mode === '%change' && form.equity_after > 0 ? (
          <div className="mt-0.5 text-xs text-gray-400 dark:text-ink-500">
            {fmt(form.equity_after)}
          </div>
        ) : null}
        {changeLine(form.equity_before, form.equity_after)}
      </>
    );
  };

  return (
    <>
      {baseRow()}
      {bonusRow()}
      {equityRow()}
    </>
  );
};

export default RaiseComponentRows;
