import { useState } from 'react';
import { Popover } from 'antd';
import UnitNumberInput from '../../../components/UnitNumberInput';
import { FIELD_HINT_CLASS, FIELD_LABEL_CLASS } from '../../../components/formControls';

const MAX_YEARS = 4;
const DEFAULT_YEARS = 2;

const money = (value: number) => `$${Math.round(value).toLocaleString()}`;

// Two rows by default; a sign-on split beyond year 2 is rare.
const normalise = (schedule: number[], total: number) => {
  const rows = schedule.length > 0 ? schedule.map((value) => Number(value) || 0) : [total, 0];
  while (rows.length < DEFAULT_YEARS) rows.push(0);
  return rows.slice(0, MAX_YEARS);
};

interface Props {
  total: number;
  schedule: number[];
  onChange: (schedule: number[]) => void;
}

const SignOnScheduleEditor = ({ total, schedule, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const rows = normalise(schedule, total);
  const allocated = rows.reduce((sum, value) => sum + value, 0);
  const remainder = total - allocated;
  const balanced = Math.round(remainder) === 0;

  const setYear = (index: number, value: number) => {
    const next = [...rows];
    next[index] = Math.max(0, value);
    onChange(next);
  };

  const editor = (
    <div className="w-[320px] max-w-[calc(100vw-48px)]">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className={FIELD_LABEL_CLASS}>Payout by year</div>
          <div className="mt-0.5 text-[11px] text-gray-400 dark:text-ink-500">
            Allocated {money(allocated)} of {money(total)}
          </div>
        </div>
        {!balanced && (
          <button
            type="button"
            onClick={() => onChange([total, ...rows.slice(1).map(() => 0)])}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-300 hover:bg-blue-50"
          >
            All in Y1
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {rows.map((amount, index) => (
          <label key={index} className="flex min-w-0 items-center gap-2">
            <span className="w-6 shrink-0 text-[11px] font-bold uppercase text-gray-500 dark:text-ink-400">
              Y{index + 1}
            </span>
            <UnitNumberInput
              unit="$"
              min={0}
              value={amount || null}
              placeholder="0"
              onChange={(value) => setYear(index, value ?? 0)}
              className="min-w-0 flex-1"
            />
          </label>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-white/[0.07] pt-2">
        {rows.length < MAX_YEARS ? (
          <button
            type="button"
            onClick={() => onChange([...rows, 0])}
            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-300 hover:bg-blue-50"
          >
            + Year {rows.length + 1}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-500 dark:text-ink-400 hover:bg-gray-50"
        >
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div className={FIELD_HINT_CLASS}>
      <span
        className={`min-w-0 truncate ${balanced ? 'text-gray-400 dark:text-ink-500' : 'text-amber-600 dark:text-amber-300'}`}
      >
        {balanced
          ? `Split over ${rows.filter((amount) => amount > 0).length || 1} year${rows.filter((amount) => amount > 0).length === 1 ? '' : 's'}`
          : `${money(Math.abs(remainder))} ${remainder > 0 ? 'unallocated' : 'over the total'}`}
      </span>
      <Popover
        trigger="click"
        placement="bottomRight"
        open={open}
        onOpenChange={setOpen}
        content={editor}
      >
        <button
          type="button"
          className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-300 hover:bg-blue-50"
        >
          Payout by year
        </button>
      </Popover>
    </div>
  );
};

export default SignOnScheduleEditor;
