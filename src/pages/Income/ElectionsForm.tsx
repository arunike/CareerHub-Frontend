import { AutoComplete, Button, Input, Select, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { FilingStatus } from '../../types/tax';
import type { Elections } from './tax/ledger';
import type { W4Inputs } from './tax/withholding';
import type { IncomeSource } from './incomeSources';
import {
  TREATMENT_HINTS,
  TREATMENT_LABELS,
  type CustomDeduction,
  type DeductionTreatment,
} from './deductions';
import type { DeductionLines } from './periodDeductions';
import type { PayPeriod } from './paySchedule';
import {
  ALLOWANCE_HINTS,
  ALLOWANCE_LABELS,
  ALLOWANCE_PRESETS,
  UNIT_LABELS,
  applyPreset,
  defaultAllowance,
  paymentAmount,
  perPeriodAverage,
  PAY_ON_LABELS,
  type Allowance,
  type AllowanceTreatment,
  type AllowanceUnit,
} from './allowances';
import CountInput from './CountInput';
import MoneyInput from './MoneyInput';
import { Field, SectionLabel } from './electionsFormPrimitives';
import ElectionsAdvancedPanel from './ElectionsAdvancedPanel';
import { useMoney } from './amountPrivacy';

interface Props {
  source: IncomeSource | null;
  filingStatus: FilingStatus;
  stateAbbr: string;
  elections: Elections;
  w4: W4Inputs;
  paychecksPerYear: number;
  annualSalary: number;
  firstPayDate: string;
  hsaLimit: number;
  paidPeriodCount: number;
  deductionLines: DeductionLines;
  customDeductions: CustomDeduction[];
  allowances: Allowance[];
  periods: PayPeriod[];
  onFilingStatusChange: (value: FilingStatus) => void;
  onStateChange: (value: string) => void;
  onElectionsChange: (patch: Partial<Elections>) => void;
  onW4Change: (patch: Partial<W4Inputs>) => void;
  onFirstPayDateChange: (value: string | null) => void;
  onPaychecksPerYearChange: (value: number | null) => void;
  onDeductionChange: (patch: Partial<DeductionLines>) => void;
  onCustomDeductionsChange: (deductions: CustomDeduction[]) => void;
  onAllowancesChange: (allowances: Allowance[]) => void;
}

const FILING_OPTIONS: Array<{ value: FilingStatus; label: string }> = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'MARRIED_FILING_JOINTLY', label: 'Married filing jointly' },
  { value: 'MARRIED_FILING_SEPARATELY', label: 'Married filing separately' },
  { value: 'HEAD_OF_HOUSEHOLD', label: 'Head of household' },
];

const ALLOWANCE_OPTIONS: Array<{ value: AllowanceTreatment; label: string }> = (
  ['TAXABLE', 'TAX_FREE'] as AllowanceTreatment[]
).map((value) => ({ value, label: ALLOWANCE_LABELS[value] }));

// Plain labels: AutoComplete puts the label in the input, so the cadence rides in optionRender.
const PRESET_OPTIONS = ALLOWANCE_PRESETS.map((preset) => ({
  value: preset.label,
  label: preset.label,
  unit: preset.unit,
}));

const ALLOWANCE_UNITS: AllowanceUnit[] = ['PAYCHECK', 'MONTH', 'YEAR', 'ONCE'];

const TREATMENT_OPTIONS: Array<{ value: DeductionTreatment; label: string }> = (
  ['SECTION_125', 'PRETAX_INCOME_ONLY', 'POST_TAX'] as DeductionTreatment[]
).map((value) => ({ value, label: TREATMENT_LABELS[value] }));

const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'DC',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
];

const Dollars = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => (
  <MoneyInput value={value} onChange={(next) => onChange(Number(next ?? 0))} />
);

export const ElectionsForm = ({
  source,
  filingStatus,
  stateAbbr,
  elections,
  w4,
  paychecksPerYear,
  annualSalary,
  firstPayDate,
  hsaLimit,
  paidPeriodCount,
  deductionLines,
  customDeductions,
  allowances,
  periods,
  onFilingStatusChange,
  onStateChange,
  onElectionsChange,
  onW4Change,
  onFirstPayDateChange,
  onPaychecksPerYearChange,
  onDeductionChange,
  onCustomDeductionsChange,
  onAllowancesChange,
}: Props) => {
  const { money, moneyCents } = useMoney();
  // Off-cycle payments carry no recurring items, so they cannot hold a one-time allowance either.
  const paycheckOptions = periods
    .filter((period) => !period.isOffCycle)
    .map((period) => ({
      value: period.periodIndex,
      label: `#${period.periodIndex} · ${dayjs(period.payDate).format('MMM D')}`,
    }));
  const allowanceTotal = allowances.reduce(
    (sum, allowance) => sum + perPeriodAverage(allowance, paychecksPerYear),
    0
  );
  const customTotal = customDeductions.reduce(
    (sum, deduction) => sum + (Number(deduction.amount) || 0),
    0
  );
  const deductionTotal =
    deductionLines.medical +
    deductionLines.dental +
    deductionLines.vision +
    deductionLines.dependent +
    customTotal;

  const patchCustom = (id: string, patch: Partial<CustomDeduction>) =>
    onCustomDeductionsChange(
      customDeductions.map((deduction) =>
        deduction.id === id ? { ...deduction, ...patch } : deduction
      )
    );

  return (
    <div>
      <p className="text-xs leading-relaxed text-slate-500">
        {source ? (
          <>
            Saved against <span className="font-medium text-slate-600">{source.company}</span> for
            this year only — each role keeps its own elections.
          </>
        ) : (
          'Premiums start from the linked offer. Anything you change here wins.'
        )}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field label="Filing status">
          <Select
            className="w-full"
            value={filingStatus}
            options={FILING_OPTIONS}
            onChange={onFilingStatusChange}
          />
        </Field>
        <Field
          label="Residence state"
          hint="Derived from the role's location. Override it if you live in a different state."
        >
          <Select
            className="w-full"
            value={stateAbbr || undefined}
            placeholder="Not set"
            showSearch
            options={US_STATES.map((code) => ({ value: code, label: code }))}
            onChange={onStateChange}
          />
        </Field>
      </div>

      <div className="mt-7 border-t border-slate-100 pt-5">
        <SectionLabel
          trailing={
            <span className="text-xs font-medium tabular-nums text-slate-600">
              {moneyCents(deductionTotal)}
            </span>
          }
        >
          Deductions per paycheck
        </SectionLabel>

        <div className="mt-3.5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field label="Medical insurance" hint="Pre-tax under Section 125, so it cuts FICA too.">
            <Dollars
              value={deductionLines.medical}
              onChange={(value) => onDeductionChange({ medical: value })}
            />
          </Field>
          <Field label="Dental insurance">
            <Dollars
              value={deductionLines.dental}
              onChange={(value) => onDeductionChange({ dental: value })}
            />
          </Field>
          <Field label="Vision insurance">
            <Dollars
              value={deductionLines.vision}
              onChange={(value) => onDeductionChange({ vision: value })}
            />
          </Field>
          <Field
            label="Dependent coverage"
            hint="Added premium for covering a spouse, partner or children."
          >
            <Dollars
              value={deductionLines.dependent}
              onChange={(value) => onDeductionChange({ dependent: value })}
            />
          </Field>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>Custom deductions</SectionLabel>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() =>
                onCustomDeductionsChange([
                  ...customDeductions,
                  {
                    id: `deduction-${Date.now()}`,
                    label: '',
                    amount: 0,
                    treatment: 'SECTION_125',
                  },
                ])
              }
            >
              Add
            </Button>
          </div>

          {customDeductions.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              Life insurance, commuter, union dues, stock purchase plan.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {customDeductions.map((deduction) => (
                <div key={deduction.id} className="flex flex-wrap items-center gap-2">
                  <Input
                    size="small"
                    className="min-w-[120px] flex-1"
                    placeholder="Label"
                    value={deduction.label}
                    onChange={(event) => patchCustom(deduction.id, { label: event.target.value })}
                  />
                  <MoneyInput
                    size="small"
                    minChars={8}
                    value={deduction.amount}
                    onChange={(value) => patchCustom(deduction.id, { amount: Number(value ?? 0) })}
                  />
                  <Tooltip title={TREATMENT_HINTS[deduction.treatment]}>
                    <Select
                      size="small"
                      className="w-[178px]"
                      value={deduction.treatment}
                      options={TREATMENT_OPTIONS}
                      onChange={(value) =>
                        patchCustom(deduction.id, { treatment: value as DeductionTreatment })
                      }
                    />
                  </Tooltip>
                  <Button
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      onCustomDeductionsChange(
                        customDeductions.filter((other) => other.id !== deduction.id)
                      )
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel
            trailing={
              allowanceTotal > 0 ? (
                <span className="text-xs font-medium tabular-nums text-slate-600">
                  {money(allowanceTotal * paychecksPerYear)} a year
                </span>
              ) : undefined
            }
          >
            Allowances
          </SectionLabel>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() =>
              onAllowancesChange([...allowances, defaultAllowance(`allowance-${Date.now()}`)])
            }
          >
            Add
          </Button>
        </div>

        {allowances.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">
            Work-from-home stipend, phone or internet allowance, commuter or meal benefit. Set how
            often it is paid; a monthly one is spread across your paychecks.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {allowances.map((allowance) => {
              const patch = (changes: Partial<Allowance>) =>
                onAllowancesChange(
                  allowances.map((other) =>
                    other.id === allowance.id ? { ...other, ...changes } : other
                  )
                );

              return (
                <div
                  key={allowance.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                >
                  <div className="flex items-center gap-2">
                    <AutoComplete
                      size="small"
                      className="min-w-0 flex-1"
                      placeholder="Pick a common one, or name your own"
                      value={allowance.label}
                      options={PRESET_OPTIONS}
                      optionRender={(option) => (
                        <span className="flex items-baseline justify-between gap-3">
                          <span>{option.data.label}</span>
                          <span className="text-[11px] text-slate-400">
                            {UNIT_LABELS[option.data.unit as AllowanceUnit]}
                          </span>
                        </span>
                      )}
                      filterOption={(input, option) =>
                        String(option?.value ?? '')
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      onChange={(value) => patch({ label: value ?? '' })}
                      onSelect={(value) => patch(applyPreset(value))}
                    />
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">
                      {allowance.unit === 'ONCE' ? (
                        <>{money(paymentAmount(allowance))} once</>
                      ) : (
                        <>
                          {allowance.unit === 'PAYCHECK' ? '' : 'averages '}
                          {money(perPeriodAverage(allowance, paychecksPerYear))} a paycheck
                        </>
                      )}
                    </span>
                    <Button
                      size="small"
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() =>
                        onAllowancesChange(allowances.filter((other) => other.id !== allowance.id))
                      }
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3">
                    <Field label="Amount">
                      <MoneyInput
                        fullWidth
                        size="small"
                        value={allowance.amount}
                        onChange={(value) => patch({ amount: Number(value ?? 0) })}
                      />
                    </Field>
                    {allowance.unit === 'ONCE' ? null : (
                      <Field label="Times paid">
                        <CountInput
                          fullWidth
                          size="small"
                          max={400}
                          value={allowance.timesPer}
                          onChange={(value) => patch({ timesPer: Number(value ?? 1) })}
                        />
                      </Field>
                    )}
                    <Field label="Per">
                      <Select
                        size="small"
                        style={{ width: '100%' }}
                        value={allowance.unit}
                        options={ALLOWANCE_UNITS.map((unit) => ({
                          value: unit,
                          label: UNIT_LABELS[unit],
                        }))}
                        onChange={(value) =>
                          patch(
                            value === 'ONCE'
                              ? { unit: value as AllowanceUnit, timesPer: 1 }
                              : { unit: value as AllowanceUnit }
                          )
                        }
                      />
                    </Field>
                    {allowance.unit === 'ONCE' ? (
                      <Field
                        label="Paycheck"
                        hint="The one paycheck this is paid on. Falls back to the first paycheck if that date is no longer in the year."
                      >
                        <Select
                          size="small"
                          style={{ width: '100%' }}
                          placeholder="First paycheck"
                          value={allowance.payPeriodIndex ?? undefined}
                          options={paycheckOptions}
                          onChange={(value) =>
                            patch({ payPeriodIndex: value === undefined ? null : Number(value) })
                          }
                        />
                      </Field>
                    ) : allowance.unit !== 'PAYCHECK' ? (
                      <Field
                        label="Lands on"
                        hint="Which paycheck of the period carries it, rather than spreading it across them."
                      >
                        <Select
                          size="small"
                          style={{ width: '100%' }}
                          value={allowance.payOn}
                          options={(['FIRST', 'LAST'] as const).map((payOn) => ({
                            value: payOn,
                            label: PAY_ON_LABELS[payOn],
                          }))}
                          onChange={(value) => patch({ payOn: value as Allowance['payOn'] })}
                        />
                      </Field>
                    ) : null}
                    <Field label="Tax" hint={ALLOWANCE_HINTS[allowance.treatment]}>
                      <Select
                        size="small"
                        style={{ width: '100%' }}
                        value={allowance.treatment}
                        options={ALLOWANCE_OPTIONS}
                        onChange={(value) => patch({ treatment: value as AllowanceTreatment })}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ElectionsAdvancedPanel
        money={money}
        Dollars={Dollars}
        annualSalary={annualSalary}
        elections={elections}
        firstPayDate={firstPayDate}
        hsaLimit={hsaLimit}
        onElectionsChange={onElectionsChange}
        onFirstPayDateChange={onFirstPayDateChange}
        onPaychecksPerYearChange={onPaychecksPerYearChange}
        onW4Change={onW4Change}
        paidPeriodCount={paidPeriodCount}
        paychecksPerYear={paychecksPerYear}
        source={source}
        w4={w4}
      />
    </div>
  );
};

export default ElectionsForm;
