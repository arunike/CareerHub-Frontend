import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Checkbox, Tooltip } from 'antd';
import UnitNumberInput from '../../../components/UnitNumberInput';
import { CONTROL_CLASS, FIELD_LABEL_CLASS } from '../../../components/formControls';
import {
  COMMUTE_MODES,
  COMMUTE_MODE_LABELS,
  annualCostFor,
  annualHoursFor,
  effectiveHoursFor,
  formatDuration,
  formatHours,
  parseDuration,
  type CommuteMode,
  type CommuteOption,
  type CostFrequency,
} from '../commute';

interface Props {
  options: CommuteOption[];
  onChange: (options: CommuteOption[]) => void;
  officeDays: number;
}

const money = (value: number) => `$${Math.round(value).toLocaleString()}`;

const newOption = (used: CommuteMode[]): CommuteOption => ({
  mode: COMMUTE_MODES.find((mode) => !used.includes(mode)) ?? 'OTHER',
  minutes_each_way: 30,
  cost_value: 0,
  cost_frequency: 'MONTHLY',
  is_usable_time: false,
  is_primary: used.length === 0,
});

const CommuteOptionsEditor = ({ options, onChange, officeDays }: Props) => {
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
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
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
        Door-to-door time each way — type 90, 1h30 or 1:30. Time and cost are both counted over{' '}
        <span className="font-semibold text-slate-600">{Math.round(officeDays)} office days</span> a
        year, from your RTO policy and time off.
      </p>

      {options.length === 0 ? (
        <p className="text-[11px] text-slate-400">
          No modes yet — add one to compare travel time as well as cost.
        </p>
      ) : (
        <div className="space-y-2">
          {options.map((option, index) => {
            const hours = annualHoursFor(option, officeDays);
            const effective = effectiveHoursFor(option, officeDays);
            const cost = annualCostFor(option, officeDays);
            return (
              <div
                key={index}
                className={`rounded-lg border p-2.5 transition-colors ${
                  option.is_primary ? 'border-blue-300 bg-white' : 'border-slate-200 bg-white/60'
                }`}
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[16px_minmax(0,1.1fr)_148px_minmax(0,1fr)_112px_32px] sm:items-center">
                  <Tooltip title={option.is_primary ? 'Primary mode' : 'Use as primary mode'}>
                    <input
                      type="radio"
                      checked={!!option.is_primary}
                      onChange={() => setPrimary(index)}
                      aria-label={`Use ${COMMUTE_MODE_LABELS[option.mode]} as the primary commute`}
                      className="h-4 w-4 cursor-pointer accent-blue-600"
                    />
                  </Tooltip>
                  <select
                    value={option.mode}
                    onChange={(event) => patch(index, { mode: event.target.value as CommuteMode })}
                    className={CONTROL_CLASS}
                    aria-label="Commute mode"
                  >
                    {COMMUTE_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {COMMUTE_MODE_LABELS[mode]}
                      </option>
                    ))}
                  </select>
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
                  <UnitNumberInput
                    unit="$"
                    min={0}
                    value={option.cost_value || null}
                    onChange={(value) => patch(index, { cost_value: value ?? 0 })}
                    placeholder="0"
                    aria-label="Commute cost"
                  />
                  <select
                    value={option.cost_frequency}
                    onChange={(event) =>
                      patch(index, { cost_frequency: event.target.value as CostFrequency })
                    }
                    className={CONTROL_CLASS}
                    aria-label="Cost frequency"
                  >
                    <option value="DAILY">/day</option>
                    <option value="MONTHLY">/month</option>
                    <option value="YEARLY">/year</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={`Remove ${COMMUTE_MODE_LABELS[option.mode]}`}
                    className="flex h-[38px] items-center justify-center rounded-[9px] text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <DeleteOutlined className="text-xs" />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-slate-500">
                  <Checkbox
                    checked={!!option.is_usable_time}
                    onChange={(event) => patch(index, { is_usable_time: event.target.checked })}
                  >
                    <span className="text-[11px] text-slate-500">Can work or read on the way</span>
                  </Checkbox>
                  <span className="tabular-nums">
                    {option.minutes_each_way > 0 && (
                      <span className="text-slate-600">
                        {formatDuration(option.minutes_each_way)} each way ·{' '}
                      </span>
                    )}
                    {formatHours(hours)}
                    {option.is_usable_time && hours > 0 && (
                      <span className="text-slate-400"> · {formatHours(effective)} effective</span>
                    )}
                    {cost > 0 && <span className="text-slate-400"> · {money(cost)}/yr</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommuteOptionsEditor;
