import { Button, Collapse, DatePicker, Input, Select, Switch, Tooltip } from 'antd';
import { DeleteOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
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
import {
  ALLOWANCE_HINTS,
  ALLOWANCE_LABELS,
  UNIT_LABELS,
  defaultAllowance,
  perPeriodAverage,
  PAY_ON_LABELS,
  type Allowance,
  type AllowanceTreatment,
  type AllowanceUnit,
} from './allowances';
import CountInput from './CountInput';
import MoneyInput from './MoneyInput';
import PercentInput from './PercentInput';
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

const CADENCE_OPTIONS = [
  { value: 52, label: 'Weekly (52)' },
  { value: 26, label: 'Biweekly (26)' },
  { value: 27, label: 'Biweekly, 27-cheque year' },
  { value: 24, label: 'Semi-monthly (24)' },
  { value: 12, label: 'Monthly (12)' },
];

const ALLOWANCE_OPTIONS: Array<{ value: AllowanceTreatment; label: string }> = (
  ['TAXABLE', 'TAX_FREE'] as AllowanceTreatment[]
).map((value) => ({ value, label: ALLOWANCE_LABELS[value] }));

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
                    <Input
                      size="small"
                      className="min-w-0 flex-1"
                      placeholder="Label, e.g. WFH stipend"
                      value={allowance.label}
                      onChange={(event) => patch({ label: event.target.value })}
                    />
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">
                      {allowance.unit === 'PAYCHECK' ? '' : 'averages '}
                      {money(perPeriodAverage(allowance, paychecksPerYear))} a paycheck
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
                    <Field label="Times paid">
                      <CountInput
                        fullWidth
                        size="small"
                        max={400}
                        value={allowance.timesPer}
                        onChange={(value) => patch({ timesPer: Number(value ?? 1) })}
                      />
                    </Field>
                    <Field label="Per">
                      <Select
                        size="small"
                        style={{ width: '100%' }}
                        value={allowance.unit}
                        options={(['PAYCHECK', 'MONTH', 'YEAR'] as AllowanceUnit[]).map((unit) => ({
                          value: unit,
                          label: UNIT_LABELS[unit],
                        }))}
                        onChange={(value) => patch({ unit: value as AllowanceUnit })}
                      />
                    </Field>
                    {allowance.unit !== 'PAYCHECK' ? (
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

      <Collapse
        ghost
        size="small"
        expandIconPosition="end"
        className="mt-6 border-t border-slate-100 !bg-transparent pt-1 [&_.ant-collapse-content-box]:!px-0 [&_.ant-collapse-content-box]:!pb-4 [&_.ant-collapse-content-box]:!pt-1 [&_.ant-collapse-header]:!px-0 [&_.ant-collapse-header]:!py-3 [&_.ant-collapse-item]:!border-b [&_.ant-collapse-item]:!border-slate-100"
        items={[
          {
            key: 'schedule',
            label: <span className="text-sm font-medium text-slate-700">Pay schedule</span>,
            children: (
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                <Field
                  label="Pay cadence"
                  hint="How many paychecks a full year of this role would have."
                >
                  <Select
                    className="w-full"
                    value={paychecksPerYear}
                    options={CADENCE_OPTIONS}
                    onChange={(value) => onPaychecksPerYearChange(Number(value))}
                  />
                </Field>
                <Field
                  label="First pay date of the year"
                  hint="Two employers on the same biweekly cadence rarely pay on the same day, so this anchors every pay date."
                >
                  <DatePicker
                    className="w-full"
                    allowClear={false}
                    value={dayjs(firstPayDate)}
                    onChange={(value) =>
                      onFirstPayDateChange(value ? value.format('YYYY-MM-DD') : null)
                    }
                  />
                </Field>
              </div>
            ),
          },
          {
            key: 'advanced',
            label: <span className="text-sm font-medium text-slate-700">Advanced options</span>,
            children: (
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                <Field
                  label="HSA per paycheck"
                  hint={`Pre-tax and FICA-exempt. Remaining room this year is ${money(hsaLimit)}.`}
                >
                  <Dollars
                    value={elections.hsaPerPeriod}
                    onChange={(value) => onElectionsChange({ hsaPerPeriod: value })}
                  />
                </Field>
                <Field label="FSA per paycheck" hint="Pre-tax and FICA-exempt, capped annually.">
                  <Dollars
                    value={elections.fsaPerPeriod}
                    onChange={(value) => onElectionsChange({ fsaPerPeriod: value })}
                  />
                </Field>
                <Field label="Other post-tax per paycheck">
                  <Dollars
                    value={elections.postTaxPerPeriod}
                    onChange={(value) => onElectionsChange({ postTaxPerPeriod: value })}
                  />
                </Field>
                <Field label="Extra withholding per paycheck" hint="W-4 Step 4c.">
                  <Dollars
                    value={w4.extraPerPeriod}
                    onChange={(value) => onW4Change({ extraPerPeriod: value })}
                  />
                </Field>
                <Field label="Dependents credit" hint="W-4 Step 3, as an annual dollar amount.">
                  <Dollars
                    value={w4.dependentsCredit}
                    onChange={(value) => onW4Change({ dependentsCredit: value })}
                  />
                </Field>
                <Field
                  label="Dependents claimed"
                  hint="A head count, not a dollar amount. Only affects years before 2018, when each person claimed a personal exemption."
                >
                  <PercentInput
                    max={20}
                    minChars={2}
                    value={w4.dependents}
                    onChange={(value) => onW4Change({ dependents: Number(value ?? 0) })}
                  />
                </Field>
                <div className="flex items-end gap-6 pb-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Switch
                      size="small"
                      checked={elections.hsaFamilyCoverage}
                      onChange={(checked) => onElectionsChange({ hsaFamilyCoverage: checked })}
                    />
                    Family HSA
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Switch
                      size="small"
                      checked={elections.age50Plus}
                      onChange={(checked) => onElectionsChange({ age50Plus: checked })}
                    />
                    Catch-up (50+)
                  </label>
                </div>
              </div>
            ),
          },
          {
            key: 'role',
            label: <span className="text-sm font-medium text-slate-700">From this role</span>,
            children: (
              <div>
                <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
                  <span className="text-slate-500">Base salary</span>
                  <span className="tabular-nums text-slate-800">{money(annualSalary)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
                  <span className="text-slate-500">Paychecks this year</span>
                  <span className="tabular-nums text-slate-800">
                    {paidPeriodCount} of {paychecksPerYear}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
                  <span className="text-slate-500">Employer HSA contribution</span>
                  <span className="tabular-nums text-slate-800">
                    {source?.hasBenefitData ? money(source.employer.hsaAnnual) : 'Unknown'}
                  </span>
                </div>
                {source && !source.hasBenefitData ? (
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    This role has no linked offer, so premiums and match started at zero. Link an
                    offer on the Experience page, or just type the amounts above.
                  </p>
                ) : null}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default ElectionsForm;
