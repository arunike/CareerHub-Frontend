import type React from 'react';
import { Button, DatePicker } from 'antd';
import dayjs from 'dayjs';
import MoneyInput from './MoneyInput';
import Modal from '../../components/MobileModal';

type Props = {
  ACTUAL_INPUTS: any;
  actual: any;
  onActualChange: any;
  row: any;
  isRecorded: any;
  money: any;
  moneyCents: any;
  payDateLabel: any;
  recording: boolean;
  setRecording: React.Dispatch<React.SetStateAction<boolean>>;
};

const PaycheckRecordModal = ({
  isRecorded,
  money,
  moneyCents,
  payDateLabel,
  recording,
  setRecording,
  ACTUAL_INPUTS,
  actual,
  onActualChange,
  row,
}: Props) => (
  <Modal
    open={recording}
    width={560}
    destroyOnClose
    onCancel={() => setRecording(false)}
    title="What your payslip says"
    footer={
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">Recording {payDateLabel}</span>
        <Button type="primary" onClick={() => setRecording(false)}>
          Done
        </Button>
      </div>
    }
  >
    <p className="text-xs leading-relaxed text-slate-500">
      Anything you enter replaces the modelled figure for this paycheck. Leave a line blank to keep
      the model&rsquo;s number.
    </p>
    <label className="mt-3 block">
      <span className="text-xs font-medium text-slate-600">Pay date</span>
      <div className="mt-1">
        <DatePicker
          size="small"
          allowClear={false}
          className="w-full"
          value={row.payDate ? dayjs(row.payDate) : null}
          onChange={(next) =>
            onActualChange(row.periodIndex, {
              payDate: next ? next.format('YYYY-MM-DD') : null,
            })
          }
        />
      </div>
      <span className="mt-1 block text-[11px] text-slate-400">
        Move it when payday shifts, e.g. a federal holiday paying you a day early.
      </span>
    </label>

    <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
      {ACTUAL_INPUTS.map((field: { key: string; label: string }) => (
        <label key={field.key} className="block">
          <span className="text-xs font-medium text-slate-600">{field.label}</span>
          <div className="mt-1">
            <MoneyInput
              size="small"
              placeholder="Modelled"
              value={actual?.[field.key] ?? null}
              onChange={(value) => onActualChange(row.periodIndex, { [field.key]: value })}
            />
          </div>
        </label>
      ))}
    </div>
    {isRecorded ? (
      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-slate-200/70 pt-2 text-xs">
        <span className="text-slate-500">Model said</span>
        <span className="tabular-nums text-slate-600">
          {moneyCents(row.modelledNet)}{' '}
          <span className={row.net < row.modelledNet ? 'text-rose-600' : 'text-emerald-600'}>
            ({row.net < row.modelledNet ? '−' : '+'}
            {money(Math.abs(row.net - row.modelledNet))})
          </span>
        </span>
      </div>
    ) : null}
  </Modal>
);

export default PaycheckRecordModal;
