import { Collapse, DatePicker, Select, Switch } from 'antd';
import dayjs from 'dayjs';
import PercentInput from './PercentInput';
import { CADENCE_OPTIONS, Field } from './electionsFormPrimitives';

type Props = {
  Dollars: any;
  annualSalary: any;
  elections: any;
  firstPayDate: any;
  hsaLimit: any;
  onElectionsChange: any;
  onFirstPayDateChange: any;
  onPaychecksPerYearChange: any;
  onW4Change: any;
  paidPeriodCount: any;
  paychecksPerYear: any;
  source: any;
  w4: any;
  money: (value: number) => string;
};

const ElectionsAdvancedPanel = ({
  money,
  Dollars,
  annualSalary,
  elections,
  firstPayDate,
  hsaLimit,
  onElectionsChange,
  onFirstPayDateChange,
  onPaychecksPerYearChange,
  onW4Change,
  paidPeriodCount,
  paychecksPerYear,
  source,
  w4,
}: Props) => (
  <Collapse
    ghost
    size="small"
    expandIconPosition="end"
    className="mt-6 border-t border-slate-100 dark:border-white/[0.07] !bg-transparent pt-1 [&_.ant-collapse-content-box]:!px-0 [&_.ant-collapse-content-box]:!pb-4 [&_.ant-collapse-content-box]:!pt-1 [&_.ant-collapse-header]:!px-0 [&_.ant-collapse-header]:!py-3 [&_.ant-collapse-item]:!border-b [&_.ant-collapse-item]:!border-slate-100 dark:!border-white/[0.07]"
    items={[
      {
        key: 'schedule',
        label: (
          <span className="text-sm font-medium text-slate-700 dark:text-ink-100">Pay schedule</span>
        ),
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
                onChange={(value: number | null) => onPaychecksPerYearChange(Number(value))}
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
                onChange={(value: dayjs.Dayjs | null) =>
                  onFirstPayDateChange(value ? value.format('YYYY-MM-DD') : null)
                }
              />
            </Field>
          </div>
        ),
      },
      {
        key: 'advanced',
        label: (
          <span className="text-sm font-medium text-slate-700 dark:text-ink-100">
            Advanced options
          </span>
        ),
        children: (
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <Field
              label="HSA per paycheck"
              hint={`Pre-tax and FICA-exempt. Remaining room this year is ${money(hsaLimit)}.`}
            >
              <Dollars
                value={elections.hsaPerPeriod}
                onChange={(value: number | null) => onElectionsChange({ hsaPerPeriod: value })}
              />
            </Field>
            <Field label="FSA per paycheck" hint="Pre-tax and FICA-exempt, capped annually.">
              <Dollars
                value={elections.fsaPerPeriod}
                onChange={(value: number | null) => onElectionsChange({ fsaPerPeriod: value })}
              />
            </Field>
            <Field label="Other post-tax per paycheck">
              <Dollars
                value={elections.postTaxPerPeriod}
                onChange={(value: number | null) => onElectionsChange({ postTaxPerPeriod: value })}
              />
            </Field>
            <Field label="Extra withholding per paycheck" hint="W-4 Step 4c.">
              <Dollars
                value={w4.extraPerPeriod}
                onChange={(value: number | null) => onW4Change({ extraPerPeriod: value })}
              />
            </Field>
            <Field label="Dependents credit" hint="W-4 Step 3, as an annual dollar amount.">
              <Dollars
                value={w4.dependentsCredit}
                onChange={(value: number | null) => onW4Change({ dependentsCredit: value })}
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
                onChange={(value: number | null) => onW4Change({ dependents: Number(value ?? 0) })}
              />
            </Field>
            <div className="flex items-end gap-6 pb-1">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-ink-200">
                <Switch
                  size="small"
                  checked={elections.hsaFamilyCoverage}
                  onChange={(checked) => onElectionsChange({ hsaFamilyCoverage: checked })}
                />
                Family HSA
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-ink-200">
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
        label: (
          <span className="text-sm font-medium text-slate-700 dark:text-ink-100">
            From this role
          </span>
        ),
        children: (
          <div>
            <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
              <span className="text-slate-500 dark:text-ink-400">Base salary</span>
              <span className="tabular-nums text-slate-800 dark:text-ink-50">
                {money(annualSalary)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
              <span className="text-slate-500 dark:text-ink-400">Paychecks this year</span>
              <span className="tabular-nums text-slate-800 dark:text-ink-50">
                {paidPeriodCount} of {paychecksPerYear}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
              <span className="text-slate-500 dark:text-ink-400">Employer HSA contribution</span>
              <span className="tabular-nums text-slate-800 dark:text-ink-50">
                {source?.hasBenefitData ? money(source.employer.hsaAnnual) : 'Unknown'}
              </span>
            </div>
            {source && !source.hasBenefitData ? (
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-ink-400">
                This role has no linked offer, so premiums and match started at zero. Link an offer
                on the Experience page, or just type the amounts above.
              </p>
            ) : null}
          </div>
        ),
      },
    ]}
  />
);

export default ElectionsAdvancedPanel;
