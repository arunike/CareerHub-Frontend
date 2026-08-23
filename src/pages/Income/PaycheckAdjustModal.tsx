import type React from 'react';
import { Button } from 'antd';
import MoneyInput from './MoneyInput';
import { roundCents } from './numberField';
import Modal from '../../components/MobileModal';
import PercentInput from './PercentInput';

type Props = {
  DEDUCTION_FIELDS: any;
  RATE_FIELDS: any;
  onOverrideChange: any;
  onOverrideClear: any;
  row: any;
  editing: boolean;
  effective: any;
  effectiveAllowances: any;
  effectiveCustom: any;
  payDateLabel: any;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
};

const PaycheckAdjustModal = ({
  editing,
  effective,
  effectiveAllowances,
  effectiveCustom,
  payDateLabel,
  setEditing,
  DEDUCTION_FIELDS,
  RATE_FIELDS,
  onOverrideChange,
  onOverrideClear,
  row,
}: Props) => (
  <Modal
    open={editing}
    width={560}
    destroyOnClose
    onCancel={() => setEditing(false)}
    title="This paycheck only"
    footer={
      <div className="flex items-center justify-between gap-3">
        {row.isAdjusted ? (
          <Button danger type="text" onClick={() => onOverrideClear(row.periodIndex)}>
            Reset to the standing amounts
          </Button>
        ) : (
          <span className="text-xs text-slate-500">Nothing overridden yet</span>
        )}
        <Button type="primary" onClick={() => setEditing(false)}>
          Done
        </Button>
      </div>
    }
  >
    <p className="text-xs leading-relaxed text-slate-500">
      Changes here apply to {payDateLabel} and leave every other paycheck alone.
    </p>
    <label className="mt-3 block">
      <span className="text-xs font-medium text-slate-600">Gross pay</span>
      <div className="mt-1">
        <MoneyInput
          size="small"
          value={roundCents(effective.regularGross)}
          onChange={(value) =>
            onOverrideChange(row.periodIndex, { regularGross: Number(value ?? 0) })
          }
        />
      </div>
      <span className="mt-1 block text-[11px] text-slate-400">
        Regular pay only. A bonus or vest on this paycheck is unaffected.
      </span>
    </label>

    <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
      {DEDUCTION_FIELDS.map((field: { key: string; label: string }) => (
        <label key={field.key} className="block">
          <span className="text-xs font-medium text-slate-600">{field.label}</span>
          <div className="mt-1">
            <MoneyInput
              size="small"
              value={effective[field.key]}
              onChange={(value) =>
                onOverrideChange(row.periodIndex, { [field.key]: Number(value ?? 0) })
              }
            />
          </div>
        </label>
      ))}
    </div>

    <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
      {RATE_FIELDS.map((field: { key: string; label: string }) => (
        <label key={field.key} className="block">
          <span className="text-xs font-medium text-slate-600">{field.label}</span>
          <div className="mt-1">
            <PercentInput
              size="small"
              value={effective[field.key]}
              onChange={(value) =>
                onOverrideChange(row.periodIndex, { [field.key]: Number(value ?? 0) })
              }
            />
          </div>
        </label>
      ))}
    </div>

    {effectiveCustom.length > 0 ? (
      <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
        {effectiveCustom.map((deduction: any) => (
          <label key={deduction.id} className="block">
            <span className="truncate text-xs font-medium text-slate-600">
              {deduction.label || 'Untitled deduction'}
            </span>
            <div className="mt-1">
              <MoneyInput
                size="small"
                value={deduction.amount}
                onChange={(value) =>
                  onOverrideChange(row.periodIndex, {
                    customAmounts: { [deduction.id]: Number(value ?? 0) },
                  })
                }
              />
            </div>
          </label>
        ))}
      </div>
    ) : null}

    {effectiveAllowances.length > 0 ? (
      <div className="mt-3 border-t border-slate-100 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Allowances this paycheck
        </span>
        <p className="mt-1 text-[11px] text-slate-400">
          Set one to zero for a paycheck it was not paid on.
        </p>
        <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          {effectiveAllowances.map((allowance: any) => (
            <label key={allowance.id} className="block">
              <span className="truncate text-xs font-medium text-slate-600">
                {allowance.label || 'Untitled allowance'}
              </span>
              <div className="mt-1">
                <MoneyInput
                  size="small"
                  value={roundCents(allowance.perPeriod)}
                  onChange={(value) =>
                    onOverrideChange(row.periodIndex, {
                      allowanceAmounts: { [allowance.id]: Number(value ?? 0) },
                    })
                  }
                />
              </div>
            </label>
          ))}
        </div>
      </div>
    ) : null}

    <label className="mt-3 block border-t border-slate-100 pt-3">
      <span className="text-xs font-medium text-slate-600">Match on this paycheck</span>
      <div className="mt-1">
        <MoneyInput
          size="small"
          value={roundCents(row.employerMatch401k)}
          onChange={(value) =>
            onOverrideChange(row.periodIndex, { employerMatch: Number(value ?? 0) })
          }
        />
      </div>
      <span className="mt-1 block text-[11px] text-slate-400">
        Set it when the employer paid something other than the formula, such as a true-up.
      </span>
    </label>
  </Modal>
);

export default PaycheckAdjustModal;
