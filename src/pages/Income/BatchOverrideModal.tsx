import { useEffect, useMemo, useState } from 'react';
import { Button } from 'antd';
import Modal from '../../components/MobileModal';
import type { CustomDeduction } from './deductions';
import { resolveAllowances, type Allowance } from './allowances';
import {
  findOverride,
  resolveCustomDeductions,
  resolvePeriodValues,
  uniformValue,
  type PeriodDefaults,
  type PeriodDeductionOverride,
  type PeriodPatch,
} from './periodDeductions';
import MoneyInput from './MoneyInput';
import { roundCents } from './numberField';
import PercentInput from './PercentInput';

interface Props {
  open: boolean;
  selectedKeys: number[];
  defaults: PeriodDefaults;
  customDeductions: CustomDeduction[];
  allowances: Allowance[];
  allowanceSchedule: Record<number, { byAllowance: Record<string, number> }>;
  matchByPeriod: Record<number, number>;
  overrides: PeriodDeductionOverride[];
  onCancel: () => void;
  onApply: (patch: PeriodPatch) => void;
  onClear: () => void;
}

const MONEY_FIELDS: Array<{ key: keyof PeriodDefaults; label: string }> = [
  { key: 'regularGross', label: 'Gross pay' },
  { key: 'medical', label: 'Medical insurance' },
  { key: 'dental', label: 'Dental insurance' },
  { key: 'vision', label: 'Vision insurance' },
  { key: 'dependent', label: 'Dependent coverage' },
];

const RATE_FIELDS: Array<{ key: keyof PeriodDefaults; label: string }> = [
  { key: 'pretax401kPercent', label: 'Traditional 401(k)' },
  { key: 'roth401kPercent', label: 'Roth 401(k)' },
];

// Prefills are calculated, so they are shown to the cent rather than at full float width.
const cents = (value: number | null | undefined) =>
  value === null || value === undefined ? null : roundCents(value);

const Field = ({
  label,
  mixed,
  children,
}: {
  label: string;
  mixed?: boolean;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="flex items-baseline gap-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {mixed ? <span className="text-[10px] uppercase text-amber-600">mixed</span> : null}
    </span>
    <div className="mt-1.5">{children}</div>
  </label>
);

export const BatchOverrideModal = ({
  open,
  selectedKeys,
  defaults,
  customDeductions,
  allowances,
  allowanceSchedule,
  matchByPeriod,
  overrides,
  onCancel,
  onApply,
  onClear,
}: Props) => {
  // A field the selection disagrees on is left blank and marked mixed, never flattened.
  const current = useMemo(() => {
    const resolved = selectedKeys.map((periodIndex) => {
      const override = findOverride(overrides, periodIndex);
      return {
        values: resolvePeriodValues(defaults, override),
        custom: resolveCustomDeductions(customDeductions, override),
        allowance: resolveAllowances(
          allowances,
          allowanceSchedule[periodIndex]?.byAllowance ?? {},
          override?.allowanceAmounts
        ),
      };
    });

    const values: Partial<Record<keyof PeriodDefaults, number | null>> = {};
    for (const field of [...MONEY_FIELDS, ...RATE_FIELDS]) {
      values[field.key] = uniformValue(resolved.map((item) => item.values[field.key]));
    }

    const custom: Record<string, number | null> = {};
    for (const deduction of customDeductions) {
      custom[deduction.id] = uniformValue(
        resolved.map((item) => item.custom.find((entry) => entry.id === deduction.id)?.amount ?? 0)
      );
    }

    const match = uniformValue(selectedKeys.map((periodIndex) => matchByPeriod[periodIndex] ?? 0));

    const allowance: Record<string, number | null> = {};
    for (const item of allowances) {
      allowance[item.id] = uniformValue(
        resolved.map((entry) => entry.allowance.find((row) => row.id === item.id)?.perPeriod ?? 0)
      );
    }

    return { values, custom, allowance, match };
  }, [
    allowanceSchedule,
    allowances,
    customDeductions,
    defaults,
    matchByPeriod,
    overrides,
    selectedKeys,
  ]);

  const [values, setValues] = useState(current.values);
  const [custom, setCustom] = useState(current.custom);
  const [allowance, setAllowance] = useState(current.allowance);
  const [match, setMatch] = useState(current.match);
  const [touched, setTouched] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setValues(current.values);
    setCustom(current.custom);
    setAllowance(current.allowance);
    setMatch(current.match);
    setTouched([]);
  }, [current, open]);

  const patch = useMemo(() => {
    const result: PeriodPatch = {};
    for (const field of [...MONEY_FIELDS, ...RATE_FIELDS]) {
      const value = values[field.key];
      if (touched.includes(field.key) && value !== null && value !== undefined) {
        result[field.key] = value;
      }
    }
    const customAmounts: Record<string, number> = {};
    for (const deduction of customDeductions) {
      const value = custom[deduction.id];
      if (touched.includes(deduction.id) && value !== null && value !== undefined) {
        customAmounts[deduction.id] = value;
      }
    }
    if (Object.keys(customAmounts).length > 0) result.customAmounts = customAmounts;

    const allowanceAmounts: Record<string, number> = {};
    for (const item of allowances) {
      const value = allowance[item.id];
      if (touched.includes(item.id) && value !== null && value !== undefined) {
        allowanceAmounts[item.id] = value;
      }
    }
    if (Object.keys(allowanceAmounts).length > 0) result.allowanceAmounts = allowanceAmounts;
    if (touched.includes('employerMatch') && match !== null && match !== undefined) {
      result.employerMatch = match;
    }
    return result;
  }, [allowance, allowances, custom, customDeductions, match, touched, values]);

  const changedCount =
    Object.keys(patch).filter((key) => key !== 'customAmounts' && key !== 'allowanceAmounts')
      .length +
    Object.keys(patch.customAmounts ?? {}).length +
    Object.keys(patch.allowanceAmounts ?? {}).length;

  const mark = (key: string) => setTouched((previous) => [...new Set([...previous, key])]);

  return (
    <Modal
      open={open}
      width={680}
      onCancel={onCancel}
      title={`Edit ${selectedKeys.length} paycheck${selectedKeys.length === 1 ? '' : 's'}`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button danger type="text" onClick={onClear}>
            Clear overrides
          </Button>
          <div className="flex items-center gap-2">
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" disabled={changedCount === 0} onClick={() => onApply(patch)}>
              Apply{' '}
              {changedCount > 0 ? `${changedCount} change${changedCount === 1 ? '' : 's'}` : ''}
            </Button>
          </div>
        </div>
      }
    >
      <p className="text-xs leading-relaxed text-slate-500">
        Prefilled with what these paychecks use now. Only fields you change are applied.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        {MONEY_FIELDS.map((field) => (
          <Field key={field.key} label={field.label} mixed={current.values[field.key] === null}>
            <MoneyInput
              value={cents(values[field.key])}
              placeholder="Mixed"
              onChange={(value) => {
                mark(field.key);
                setValues((previous) => ({ ...previous, [field.key]: value }));
              }}
            />
          </Field>
        ))}
        {RATE_FIELDS.map((field) => (
          <Field key={field.key} label={field.label} mixed={current.values[field.key] === null}>
            <PercentInput
              value={values[field.key] ?? null}
              onChange={(value) => {
                mark(field.key);
                setValues((previous) => ({ ...previous, [field.key]: value }));
              }}
            />
          </Field>
        ))}
      </div>

      {customDeductions.length > 0 ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Custom deductions
          </span>
          <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            {customDeductions.map((deduction) => (
              <Field
                key={deduction.id}
                label={deduction.label || 'Untitled deduction'}
                mixed={current.custom[deduction.id] === null}
              >
                <MoneyInput
                  value={custom[deduction.id] ?? null}
                  placeholder="Mixed"
                  onChange={(value) => {
                    mark(deduction.id);
                    setCustom((previous) => ({ ...previous, [deduction.id]: value }));
                  }}
                />
              </Field>
            ))}
          </div>
        </div>
      ) : null}

      {allowances.length > 0 ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Allowances
          </span>
          <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            {allowances.map((item) => (
              <Field
                key={item.id}
                label={item.label || 'Untitled allowance'}
                mixed={current.allowance[item.id] === null}
              >
                <MoneyInput
                  value={cents(allowance[item.id])}
                  placeholder="Mixed"
                  onChange={(value) => {
                    mark(item.id);
                    setAllowance((previous) => ({ ...previous, [item.id]: value }));
                  }}
                />
              </Field>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Employer match
        </span>
        <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field label="Match on these paychecks" mixed={current.match === null}>
            <MoneyInput
              value={cents(match)}
              placeholder="Mixed"
              onChange={(value) => {
                mark('employerMatch');
                setMatch(value);
              }}
            />
          </Field>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Clearing removes every per-paycheck override on the selected paychecks, returning them to
        your standing elections.
      </p>
    </Modal>
  );
};

export default BatchOverrideModal;
