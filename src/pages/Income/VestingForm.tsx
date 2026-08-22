import { Button, DatePicker, InputNumber, Select, Switch, Tooltip } from 'antd';
import { DeleteOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { IncomeEvent } from './tax/ledger';
import type { PayPeriod } from './paySchedule';
import { formatPayDate } from './paySchedule';
import MoneyInput from './MoneyInput';
import { fieldWidthStyle } from './numberField';
import { useMoney } from './amountPrivacy';

export interface VestingTerms {
  totalGrant: number;
  vestingYears: number;
  cliffMonths: number;
  vestsPerYear: number;
  grantDate: string | null;
}

interface Props {
  terms: VestingTerms;
  includeVestEvents: boolean;
  generatedVests: IncomeEvent[];
  manualEvents: IncomeEvent[];
  periods: PayPeriod[];
  onTermsChange: (patch: Partial<VestingTerms>) => void;
  onIncludeChange: (value: boolean) => void;
  onManualEventsChange: (events: IncomeEvent[]) => void;
}

const VEST_CADENCE_OPTIONS = [
  { value: 1, label: 'Once a year' },
  { value: 2, label: 'Twice a year' },
  { value: 3, label: 'Three times a year' },
  { value: 4, label: 'Quarterly' },
  { value: 6, label: 'Every two months' },
  { value: 12, label: 'Monthly' },
];

const KIND_OPTIONS = [
  { value: 'vest', label: 'Vest' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'other', label: 'Other' },
];

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

export const VestingForm = ({
  terms,
  includeVestEvents,
  generatedVests,
  manualEvents,
  periods,
  onTermsChange,
  onIncludeChange,
  onManualEventsChange,
}: Props) => {
  const { money, moneyCents } = useMoney();
  const periodOptions = periods.map((period) => ({
    value: period.periodIndex,
    label: formatPayDate(period.payDate),
  }));

  const addEvent = () => {
    onManualEventsChange([
      ...manualEvents,
      {
        id: `manual-${Date.now()}`,
        kind: 'vest',
        periodIndex: periods[0]?.periodIndex ?? 1,
        amount: 0,
        label: 'Manual vest',
      },
    ]);
  };

  const patchEvent = (id: string, patch: Partial<IncomeEvent>) => {
    onManualEventsChange(
      manualEvents.map((event) => (event.id === id ? { ...event, ...patch } : event))
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <p className="text-xs leading-relaxed text-slate-500">
            Off by default, because vesting terms vary too much to guess. Turn it on to set the
            cadence your company actually uses, or leave it off and enter each vest by hand.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-600">
          <Switch size="small" checked={includeVestEvents} onChange={onIncludeChange} />
          Generate from terms
        </label>
      </div>

      {!includeVestEvents ? (
        <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
          No vest income is included, so every figure on this page is salary only. Turn on
          <span className="font-medium"> Generate from terms </span>
          to set your grant, cadence and cliff, or add individual vests below.
        </p>
      ) : null}

      {includeVestEvents ? (
        <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field label="Total grant" hint="The whole grant, not the annualized value.">
            <MoneyInput
              value={terms.totalGrant}
              onChange={(value) => onTermsChange({ totalGrant: Number(value ?? 0) })}
            />
          </Field>
          <Field
            label="Vests per year"
            hint="Twice a year, three times, monthly — whatever applies."
          >
            <Select
              className="w-full"
              value={terms.vestsPerYear}
              options={VEST_CADENCE_OPTIONS}
              onChange={(value) => onTermsChange({ vestsPerYear: Number(value) })}
            />
          </Field>
          <Field label="Vesting years">
            <InputNumber
              style={fieldWidthStyle(String(terms.vestingYears ?? ''), 'middle', 3)}
              min={1}
              max={10}
              value={terms.vestingYears}
              onChange={(value) => onTermsChange({ vestingYears: Number(value ?? 4) })}
            />
          </Field>
          <Field
            label="Cliff (months)"
            hint="Value accrued before the cliff is released on the cliff date, not forfeited."
          >
            <InputNumber
              style={fieldWidthStyle(String(terms.cliffMonths ?? ''), 'middle', 3)}
              min={0}
              max={60}
              value={terms.cliffMonths}
              onChange={(value) => onTermsChange({ cliffMonths: Number(value ?? 0) })}
            />
          </Field>
          <Field
            label="Grant date"
            hint="Vest dates are counted from here. Defaults to the role start date."
          >
            <DatePicker
              className="w-full"
              allowClear={false}
              value={terms.grantDate ? dayjs(terms.grantDate) : null}
              onChange={(value) =>
                onTermsChange({ grantDate: value ? value.format('YYYY-MM-DD') : null })
              }
            />
          </Field>
        </div>
      ) : null}

      {includeVestEvents ? (
        <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Vests landing this year
          </div>
          {generatedVests.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              None — the cliff or the grant date puts every vest outside this year.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {generatedVests.map((event) => (
                <li
                  key={event.id}
                  className="flex items-baseline justify-between gap-3 text-sm text-slate-700"
                >
                  <span>{event.label}</span>
                  <span className="tabular-nums font-medium text-slate-900">
                    {moneyCents(event.amount)}
                  </span>
                </li>
              ))}
              <li className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-1.5 text-sm">
                <span className="font-medium text-slate-600">Total</span>
                <span className="tabular-nums font-semibold text-slate-900">
                  {money(generatedVests.reduce((sum, event) => sum + event.amount, 0))}
                </span>
              </li>
            </ul>
          )}
        </div>
      ) : null}

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Extra income events
          </span>
          <Button size="small" icon={<PlusOutlined />} onClick={addEvent}>
            Add
          </Button>
        </div>

        {manualEvents.length === 0 ? (
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            A one-off bonus, an off-cycle vest, or a refresh grant.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {manualEvents.map((event) => (
              <div key={event.id} className="flex flex-wrap items-center gap-2">
                <Select
                  size="small"
                  className="w-[92px]"
                  value={event.kind}
                  options={KIND_OPTIONS}
                  onChange={(value) => patchEvent(event.id, { kind: value as IncomeEvent['kind'] })}
                />
                <Select
                  size="small"
                  className="min-w-[150px] flex-1"
                  value={event.periodIndex}
                  options={periodOptions}
                  onChange={(value) => patchEvent(event.id, { periodIndex: Number(value) })}
                />
                <MoneyInput
                  size="small"
                  minChars={8}
                  value={event.amount}
                  onChange={(value) => patchEvent(event.id, { amount: Number(value ?? 0) })}
                />
                <Button
                  size="small"
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    onManualEventsChange(manualEvents.filter((other) => other.id !== event.id))
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-5 text-xs leading-relaxed text-slate-500">
        Vesting is the taxable event, so it is what drives a paycheck. When you can sell — a trading
        window twice a year, say — changes your capital gains, not this withholding.
      </p>
    </div>
  );
};

export default VestingForm;
