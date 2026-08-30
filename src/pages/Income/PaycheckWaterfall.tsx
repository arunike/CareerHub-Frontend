import { useState } from 'react';
import { Button, Tag, Tooltip } from 'antd';
import {
  EditOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  RightOutlined,
  SlidersOutlined,
} from '@ant-design/icons';
import { type EffectiveRow } from './effectiveRows';
import {
  resolveCustomDeductions,
  resolvePeriodValues,
  type PeriodDefaults,
  type PeriodDeductionOverride,
  type PeriodPatch,
} from './periodDeductions';
import type { CustomDeduction } from './deductions';
import { resolveAllowances, type Allowance } from './allowances';
import { formatPayDate } from './paySchedule';
import { useMoney } from './amountPrivacy';
import PaycheckAdjustModal from './PaycheckAdjustModal';

interface Props {
  row: EffectiveRow;
  rows: EffectiveRow[];
  periodsPerYear: number;
  onSelectPeriod: (periodIndex: number) => void;
  deductionDefaults: PeriodDefaults;
  customDeductions: CustomDeduction[];
  allowances: Allowance[];
  scheduledAllowances: Record<string, number>;
  override?: PeriodDeductionOverride;
  onOverrideChange: (periodIndex: number, patch: PeriodPatch) => void;
  onOverrideClear: (periodIndex: number) => void;
  matchFormulaLabel: string;
}

interface Line {
  label: string;
  amount: number;
  hint?: string;
  balanced?: boolean;
}

interface Section {
  title: string;
  tone: string;
  lines: Line[];
}

const DEDUCTION_FIELDS: Array<{ key: keyof PeriodDefaults; label: string }> = [
  { key: 'medical', label: 'Medical' },
  { key: 'dental', label: 'Dental' },
  { key: 'vision', label: 'Vision' },
  { key: 'dependent', label: 'Dependent' },
];

const RATE_FIELDS: Array<{ key: keyof PeriodDefaults; label: string }> = [
  { key: 'pretax401kPercent', label: 'Traditional 401(k)' },
  { key: 'roth401kPercent', label: 'Roth 401(k)' },
];

const trimPercent = (value: number) => Number(value.toFixed(2)).toString();

const sectionsFor = (row: EffectiveRow): Section[] => {
  const preTax: Line[] = [];
  const taxes: Line[] = [];
  const postTax: Line[] = [];

  if (row.section125 > 0) {
    preTax.push({
      label: 'Insurance and pre-tax benefits',
      amount: row.section125,
      hint: 'Section 125 benefits. Reduce income tax and FICA.',
    });
  }
  if (row.hsa > 0) preTax.push({ label: 'HSA', amount: row.hsa });
  if (row.pretax401k > 0) {
    preTax.push({
      label: 'Traditional 401(k)',
      amount: row.pretax401k,
      hint: 'Reduces income tax but not Social Security or Medicare.',
    });
  }
  if (row.pretaxIncomeOnly > 0) {
    preTax.push({ label: 'Other pre-tax deductions', amount: row.pretaxIncomeOnly });
  }

  if (row.federalTax > 0) {
    taxes.push({
      label: 'Federal income tax',
      amount: row.federalTax,
      balanced: row.balancedFields.includes('federalTax'),
    });
  }
  if (row.stateTax > 0) {
    taxes.push({
      label: 'State income tax',
      amount: row.stateTax,
      balanced: row.balancedFields.includes('stateTax'),
    });
  }
  for (const tax of row.payrollTaxes) {
    if (tax.amount <= 0) continue;
    taxes.push({ label: tax.label, amount: tax.amount });
  }

  if (Math.abs(row.residual) > 0.005) {
    taxes.push({
      label: row.residual > 0 ? 'Other withholding' : 'Take-home exceeds gross pay',
      amount: row.residual,
      hint:
        row.residual > 0
          ? 'What the recorded take-home implies once every other line is accounted for.'
          : 'The recorded take-home is more than this gross can pay, so no tax is left to withhold. Record the gross from your payslip, or check the salary on this role.',
      balanced: true,
    });
  }

  if (row.roth401k > 0) postTax.push({ label: 'Roth 401(k)', amount: row.roth401k });
  const otherPostTax = row.postTax - row.roth401k;
  if (otherPostTax > 0) postTax.push({ label: 'Post-tax deductions', amount: otherPostTax });

  return [
    { title: 'Pre-tax deductions', tone: 'bg-sky-500', lines: preTax },
    { title: 'Taxes withheld', tone: 'bg-rose-400', lines: taxes },
    { title: 'Post-tax deductions', tone: 'bg-amber-400', lines: postTax },
  ].filter((section) => section.lines.length > 0);
};

const Row = ({
  label,
  hint,
  amount,
  negative,
  balanced,
}: {
  label: string;
  hint?: string;
  amount: number;
  negative?: boolean;
  balanced?: boolean;
}) => {
  const { moneyCents } = useMoney();
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="flex min-w-0 items-center gap-1.5 text-sm text-slate-600">
        <span className="truncate">{label}</span>
        {hint ? (
          <Tooltip title={hint}>
            <InfoCircleOutlined className="shrink-0 text-[11px] text-slate-300" />
          </Tooltip>
        ) : null}
        {balanced ? (
          <Tooltip title="Scaled so the lines add up to your recorded take-home. Social Security and Medicare are statutory, so the difference is attributed to income tax.">
            <span className="shrink-0 rounded bg-amber-50 px-1 text-[10px] font-semibold uppercase text-amber-700">
              balanced
            </span>
          </Tooltip>
        ) : null}
      </span>
      <span className="shrink-0 tabular-nums text-sm text-slate-700">
        {negative && amount >= 0 ? '−' : ''}
        {negative && amount < 0 ? '+' : ''}
        {moneyCents(Math.abs(amount))}
      </span>
    </div>
  );
};

export const PaycheckWaterfall = ({
  row,
  rows,
  periodsPerYear,
  onSelectPeriod,
  deductionDefaults,
  customDeductions,
  allowances,
  scheduledAllowances,
  override,
  onOverrideChange,
  onOverrideClear,
  matchFormulaLabel,
}: Props) => {
  const { moneyCents } = useMoney();
  const [editing, setEditing] = useState(false);
  const payDateLabel = row.payDate ? formatPayDate(row.payDate) : `paycheck ${row.periodIndex}`;
  const effective = resolvePeriodValues(deductionDefaults, override);
  const effectiveCustom = resolveCustomDeductions(customDeductions, override);
  const effectiveAllowances = resolveAllowances(
    allowances,
    scheduledAllowances,
    override?.allowanceAmounts
  );

  const sections = sectionsFor(row);
  const position = rows.findIndex((candidate) => candidate.periodIndex === row.periodIndex);
  const previous = rows[position - 1];
  const next = rows[position + 1];
  const isRecorded = row.actualFields.length > 0;
  const contributed = row.pretax401k + row.roth401k;

  const gross = Math.max(row.gross, 1);
  const preTaxTotal = row.section125 + row.hsa + row.pretax401k + row.pretaxIncomeOnly;
  const segments = [
    { width: (row.net / gross) * 100, tone: 'bg-emerald-500' },
    { width: (row.taxTotal / gross) * 100, tone: 'bg-rose-400' },
    { width: (preTaxTotal / gross) * 100, tone: 'bg-sky-500' },
    { width: (row.postTax / gross) * 100, tone: 'bg-amber-400' },
  ].filter((segment) => segment.width > 0.2);

  return (
    <div className="enterprise-card px-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {row.isOffCycle
              ? 'Off-cycle payment'
              : `Paycheck ${row.periodIndex} of ${periodsPerYear}`}
          </p>
          <h3 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-slate-900">
            {row.payDate ? formatPayDate(row.payDate) : `Paycheck ${row.periodIndex}`}
          </h3>
          {row.isAdjustedDate ? (
            <p className="mt-1 text-[11px] text-blue-600">Pay date moved from the schedule</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!row.isOffCycle ? (
            <Tooltip
              title={
                row.isAdjusted
                  ? 'Edit this paycheck’s deductions and 401(k)'
                  : 'Adjust this paycheck’s deductions and 401(k)'
              }
            >
              <Button
                size="small"
                icon={<SlidersOutlined />}
                onClick={() => setEditing(true)}
                className="mr-1"
              >
                Edit
              </Button>
            </Tooltip>
          ) : null}
          <Tooltip title="Previous paycheck">
            <Button
              shape="circle"
              size="small"
              icon={<LeftOutlined />}
              disabled={!previous}
              onClick={() => previous && onSelectPeriod(previous.periodIndex)}
            />
          </Tooltip>
          <Tooltip title="Next paycheck">
            <Button
              shape="circle"
              size="small"
              icon={<RightOutlined />}
              disabled={!next}
              onClick={() => next && onSelectPeriod(next.periodIndex)}
            />
          </Tooltip>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Take-home
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
            {moneyCents(row.net)}
          </p>
        </div>
        <div className="pb-1 text-right">
          <p className="text-xs text-slate-500">of {moneyCents(row.gross)} gross</p>
          <p className="mt-1 text-xs text-slate-500">
            <span className="font-medium text-slate-700">
              {((row.taxTotal / gross) * 100).toFixed(1)}%
            </span>{' '}
            tax rate
          </p>
        </div>
      </div>

      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.map((segment, index) => (
          <div key={index} className={segment.tone} style={{ width: `${segment.width}%` }} />
        ))}
      </div>

      {row.notes.length > 0 || row.isAdjusted || row.isOffCycle || isRecorded ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {isRecorded ? (
            <Tag color="green" className="!mr-0">
              From your payslip
            </Tag>
          ) : null}
          {row.residual < -0.005 ? (
            <Tooltip title="The recorded take-home is more than this gross can pay. Record the gross too, or check the role's salary.">
              <Tag color="red" className="!mr-0">
                Gross looks too low
              </Tag>
            </Tooltip>
          ) : null}
          {row.isOffCycle ? (
            <Tag color="purple" className="!mr-0">
              Paid separately from payroll
            </Tag>
          ) : null}
          {row.isAdjusted ? (
            <Tag color="purple" className="!mr-0">
              Deductions adjusted
            </Tag>
          ) : null}
          {row.notes.map((note) => (
            <Tag key={note} color={note.includes('reached') ? 'gold' : 'blue'} className="!mr-0">
              {note}
            </Tag>
          ))}
        </div>
      ) : null}

      <div className="mt-6 border-t border-slate-100 pt-1">
        <div className="flex items-baseline justify-between gap-3 py-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
            Gross pay
            {row.actualFields.includes('gross') ? (
              <span className="rounded bg-emerald-50 px-1 text-[10px] font-semibold uppercase text-emerald-700">
                actual
              </span>
            ) : null}
          </span>
          <span className="tabular-nums text-sm font-medium text-slate-900">
            {moneyCents(row.gross)}
          </span>
        </div>
        {row.supplementalGross > 0 ? (
          <div className="flex items-baseline justify-between gap-3 pb-2 pl-3">
            <span className="text-xs text-slate-500">including bonus or vest</span>
            <span className="tabular-nums text-xs text-slate-500">
              {moneyCents(row.supplementalGross)}
            </span>
          </div>
        ) : null}
        {row.taxableAllowance > 0 ? (
          <div className="flex items-baseline justify-between gap-3 pb-2 pl-3">
            <span className="text-xs text-slate-500">including taxable allowances</span>
            <span className="tabular-nums text-xs text-slate-500">
              {moneyCents(row.taxableAllowance)}
            </span>
          </div>
        ) : null}

        {sections.map((section) => (
          <div key={section.title} className="mt-2 border-t border-slate-100 pt-2">
            <div className="flex items-center justify-between gap-2 py-1">
              <span className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${section.tone}`} />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.title}
                </span>
              </span>
              {section.title === 'Pre-tax deductions' && !editing ? (
                <Tooltip title="Change insurance, other deductions or 401(k) rates for this paycheck only">
                  <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined />}
                    className="!h-6 !text-slate-400 hover:!text-slate-700"
                    onClick={() => setEditing(true)}
                  >
                    <span className="text-xs">Edit</span>
                  </Button>
                </Tooltip>
              ) : null}
            </div>
            {section.lines.map((line) => (
              <Row
                key={line.label}
                label={line.label}
                hint={line.hint}
                amount={line.amount}
                balanced={line.balanced}
                negative
              />
            ))}
          </div>
        ))}

        {row.taxFreeAllowance > 0 ? (
          <div className="mt-2 border-t border-slate-100 pt-2">
            <div className="flex items-center gap-2 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Added after tax
              </span>
            </div>
            <Row
              label="Tax-free allowances"
              hint="Paid on top without tax, so it raises take-home without raising taxable pay."
              amount={row.taxFreeAllowance}
            />
          </div>
        ) : null}

        <div className="mt-3 flex items-baseline justify-between gap-3 rounded-lg bg-emerald-50/70 px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            Take-home
            {row.actualFields.includes('net') ? (
              <span className="rounded bg-white px-1 text-[10px] font-semibold uppercase text-emerald-700">
                actual
              </span>
            ) : null}
          </span>
          <span className="tabular-nums text-base font-semibold text-slate-900">
            {moneyCents(row.net)}
          </span>
        </div>
      </div>

      <PaycheckAdjustModal
        row={row}
        DEDUCTION_FIELDS={DEDUCTION_FIELDS}
        RATE_FIELDS={RATE_FIELDS}
        onOverrideChange={onOverrideChange}
        onOverrideClear={onOverrideClear}
        editing={editing}
        effective={effective}
        effectiveAllowances={effectiveAllowances}
        effectiveCustom={effectiveCustom}
        payDateLabel={payDateLabel}
        setEditing={setEditing}
      />

      {row.employerMatch401k > 0 ? (
        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Paid by your employer
            </span>
            <Tooltip title="Real compensation, but it goes straight to your 401(k) rather than through your paycheck, so it is not part of take-home.">
              <InfoCircleOutlined className="text-[11px] text-slate-300" />
            </Tooltip>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <span className="text-sm text-slate-600">401(k) match</span>
            <span className="tabular-nums text-sm font-medium text-slate-800">
              {moneyCents(row.employerMatch401k)}
            </span>
          </div>
          {/* What you put in, what the employer added, and how much of the deferral was eligible. */}
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            {contributed > 0 ? (
              <>
                <span className="tabular-nums">
                  {((row.employerMatch401k / contributed) * 100).toFixed(0)}%
                </span>{' '}
                of your <span className="tabular-nums">{moneyCents(contributed)}</span>{' '}
                contribution, matched on the first{' '}
                <span className="tabular-nums">{trimPercent(row.matchedDeferralPercent)}%</span> of
                pay
              </>
            ) : (
              'Paid regardless of what you defer'
            )}
            {row.gross > 0 ? (
              <>
                {' · '}
                <span className="tabular-nums">
                  {((row.employerMatch401k / row.gross) * 100).toFixed(2)}% of this paycheck
                </span>
              </>
            ) : null}
            {row.isMatchAdjusted ? ' · recorded, not from the formula' : ''}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{matchFormulaLabel}</p>
        </div>
      ) : null}
    </div>
  );
};

export default PaycheckWaterfall;
