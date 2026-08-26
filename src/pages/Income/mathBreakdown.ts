import { extrasTotal, type BonusExtra, type NextYearBonusEstimate } from './bonusSchedule';

// How a line joins the running total above it; the first line is the starting value.
export type MathOperator = 'plus' | 'minus' | 'times';

// A factor prints as ×62%, a percent as a plain rate.
export type MathValueKind = 'money' | 'factor' | 'percent';

export interface MathStep {
  label: string;
  value: number;
  op?: MathOperator;
  kind?: MathValueKind;
  note?: string;
  // Set only when more than one payroll contributed to the line.
  parts?: Array<{ label: string; value: number }>;
}

export interface MathBreakdown {
  steps: MathStep[];
  totalLabel: string;
  total: number;
  footnote?: string;
}

// The picker runs against the aggregate and each source, so both read the same field.
export interface AttributedSource<P> {
  label: string;
  parts: P;
}

const MAX_NAMED = 3;

const attribute = <P>(
  pick: (parts: P) => number,
  sources?: AttributedSource<P>[]
): Array<{ label: string; value: number }> | undefined => {
  if (!sources || sources.length < 2) return undefined;
  const named = sources
    .map((source) => ({ label: source.label, value: pick(source.parts) }))
    .filter((part) => Math.abs(part.value) > 0.005)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  if (named.length < 2) return undefined;
  // Folded, not dropped, so the named lines still add up to the line above.
  if (named.length > MAX_NAMED) {
    const tail = named.slice(MAX_NAMED);
    return [
      ...named.slice(0, MAX_NAMED),
      {
        label: `${tail.length} other role${tail.length === 1 ? '' : 's'}`,
        value: tail.reduce((total, part) => total + part.value, 0),
      },
    ];
  }
  return named;
};

// Replays the steps as printed, so a breakdown can be checked against the figure it explains.
export const resolveMath = (steps: MathStep[]) =>
  steps.reduce((running, step, index) => {
    if (index === 0) return step.value;
    if (step.op === 'minus') return running - step.value;
    if (step.op === 'times') return running * step.value;
    return running + step.value;
  }, 0);

// Whatever survives first becomes the anchor and loses its operator; ×0% always stays.
const trim = (steps: MathStep[]): MathStep[] => {
  const kept = steps.filter((step) => step.op === 'times' || Math.abs(step.value) > 0.005);
  if (kept.length === 0) return steps.slice(0, 1);
  const [first, ...rest] = kept;
  return [{ ...first, op: undefined }, ...rest];
};

export interface GrossParts {
  gross: number;
  supplementalGross: number;
  taxableAllowance: number;
}

const salaryOf = (parts: GrossParts) =>
  parts.gross - parts.supplementalGross - parts.taxableAllowance;

export const grossBreakdown = (
  parts: GrossParts,
  sources?: AttributedSource<GrossParts>[]
): MathBreakdown => ({
  steps: trim([
    {
      label: 'Salary paid',
      value: salaryOf(parts),
      parts: attribute(salaryOf, sources),
    },
    {
      label: 'Bonus and vested equity',
      value: parts.supplementalGross,
      op: 'plus',
      parts: attribute((role) => role.supplementalGross, sources),
    },
    {
      label: 'Taxable allowances',
      value: parts.taxableAllowance,
      op: 'plus',
      parts: attribute((role) => role.taxableAllowance, sources),
    },
  ]),
  totalLabel: 'Gross pay',
  total: parts.gross,
  footnote:
    'Payroll reports all of this as wages, which is why total comp adds only the employer match on top.',
});

export interface DeductionParts {
  section125: number;
  hsa: number;
  pretax401k: number;
  pretaxIncomeOnly: number;
  roth401k: number;
  postTax: number;
  // The ledger's own residual; a gap against the itemised lines is stated, not hidden.
  deductions: number;
}

export const deductionsBreakdown = (
  parts: DeductionParts,
  sources?: AttributedSource<DeductionParts>[]
): MathBreakdown => {
  // The ledger folds Roth into postTax, so naming both would count the deferral twice.
  const otherPostTax = (role: DeductionParts) => role.postTax - role.roth401k;
  const itemised = [
    {
      label: 'Insurance and pre-tax benefits',
      value: parts.section125,
      note: 'Section 125, including any FSA',
      parts: attribute((role) => role.section125, sources),
    },
    {
      label: 'HSA',
      value: parts.hsa,
      op: 'plus' as const,
      parts: attribute((role) => role.hsa, sources),
    },
    {
      label: 'Traditional 401(k)',
      value: parts.pretax401k,
      op: 'plus' as const,
      parts: attribute((role) => role.pretax401k, sources),
    },
    {
      label: 'Pre-tax, income tax only',
      value: parts.pretaxIncomeOnly,
      op: 'plus' as const,
      parts: attribute((role) => role.pretaxIncomeOnly, sources),
    },
    {
      label: 'Roth 401(k)',
      value: parts.roth401k,
      op: 'plus' as const,
      parts: attribute((role) => role.roth401k, sources),
    },
    {
      label: 'Other post-tax',
      value: otherPostTax(parts),
      op: 'plus' as const,
      parts: attribute(otherPostTax, sources),
    },
  ];
  const unexplained = parts.deductions - resolveMath(itemised);

  return {
    steps: trim([
      ...itemised,
      ...(Math.abs(unexplained) > 0.005
        ? [
            {
              label: 'Recorded but not itemised',
              value: unexplained,
              op: 'plus' as const,
              note: 'From a payslip whose take-home was typed in',
            },
          ]
        : []),
    ]),
    totalLabel: 'Withheld, not tax',
    total: parts.deductions,
  };
};

export interface TaxParts {
  federalTax: number;
  stateTax: number;
  payrollTax: number;
  taxWithheld: number;
}

export const taxBreakdown = (
  parts: TaxParts,
  sources?: AttributedSource<TaxParts>[]
): MathBreakdown => ({
  steps: trim([
    {
      label: 'Federal income tax',
      value: parts.federalTax,
      parts: attribute((role) => role.federalTax, sources),
    },
    {
      label: 'State income tax',
      value: parts.stateTax,
      op: 'plus',
      parts: attribute((role) => role.stateTax, sources),
    },
    {
      label: 'Social Security and Medicare',
      value: parts.payrollTax,
      op: 'plus',
      parts: attribute((role) => role.payrollTax, sources),
    },
  ]),
  totalLabel: 'Tax withheld',
  total: parts.taxWithheld,
  footnote:
    'What payroll sent to the tax authorities during the year, not what you owe on the return.',
});

export interface TakeHomeParts {
  gross: number;
  taxFreeAllowance: number;
  taxWithheld: number;
  deductions: number;
  takeHome: number;
}

export const takeHomeBreakdown = (
  parts: TakeHomeParts,
  sources?: AttributedSource<TakeHomeParts>[]
): MathBreakdown => ({
  steps: trim([
    { label: 'Gross pay', value: parts.gross, parts: attribute((role) => role.gross, sources) },
    {
      label: 'Tax-free allowances',
      value: parts.taxFreeAllowance,
      op: 'plus',
      parts: attribute((role) => role.taxFreeAllowance, sources),
    },
    {
      label: 'Tax withheld',
      value: parts.taxWithheld,
      op: 'minus',
      parts: attribute((role) => role.taxWithheld, sources),
    },
    {
      label: 'Other deductions',
      value: parts.deductions,
      op: 'minus',
      parts: attribute((role) => role.deductions, sources),
    },
  ]),
  totalLabel: 'Take-home',
  total: parts.takeHome,
});

export interface Deferral401kParts {
  pretax401k: number;
  roth401k: number;
  employee401k: number;
  electiveLimit: number;
}

export const employee401kBreakdown = (
  parts: Deferral401kParts,
  sources?: AttributedSource<Deferral401kParts>[]
): MathBreakdown => ({
  steps: trim([
    {
      label: 'Traditional 401(k)',
      value: parts.pretax401k,
      parts: attribute((role) => role.pretax401k, sources),
    },
    {
      label: 'Roth 401(k)',
      value: parts.roth401k,
      op: 'plus',
      parts: attribute((role) => role.roth401k, sources),
    },
  ]),
  totalLabel: 'Deferred this year',
  total: parts.employee401k,
  footnote:
    parts.electiveLimit > 0
      ? `Against a ${parts.electiveLimit.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} elective limit, which the employer match does not count against.`
      : undefined,
});

export interface TotalCompParts {
  gross: number;
  employerMatch: number;
  totalComp: number;
}

export const totalCompBreakdown = (
  parts: TotalCompParts,
  sources?: AttributedSource<TotalCompParts>[]
): MathBreakdown => ({
  steps: trim([
    { label: 'Gross pay', value: parts.gross, parts: attribute((role) => role.gross, sources) },
    {
      label: 'Employer 401(k) match',
      value: parts.employerMatch,
      op: 'plus',
      parts: attribute((role) => role.employerMatch, sources),
    },
  ]),
  totalLabel: 'Total comp',
  total: parts.totalComp,
  footnote:
    'Bonus and vested equity are already inside gross, so adding them again would double count.',
});

export const refundBreakdown = (parts: {
  incomeTaxWithheld: number;
  federalLiability: number;
  stateLiability: number;
  difference: number;
}): MathBreakdown => ({
  steps: trim([
    { label: 'Income tax withheld', value: parts.incomeTaxWithheld },
    { label: 'Federal tax owed', value: parts.federalLiability, op: 'minus' },
    { label: 'State tax owed', value: parts.stateLiability, op: 'minus' },
  ]),
  totalLabel: parts.difference < 0 ? 'Balance due' : 'Refund',
  total: parts.difference,
  footnote:
    'Income tax only. Social Security and Medicare are exact by construction, so they cannot be over- or under-withheld.',
});

export const bonusBreakdown = (parts: {
  targetBonus: number;
  multiplierPercent: number;
  proration: number;
  prorated: boolean;
  extras: BonusExtra[];
  performanceYear: number;
  bonusTotal: number;
}): MathBreakdown => ({
  steps: trim([
    { label: 'Target bonus', value: parts.targetBonus },
    {
      label: 'Performance multiplier',
      value: parts.multiplierPercent / 100,
      op: 'times',
      kind: 'factor',
    },
    ...(parts.prorated
      ? [
          {
            label: `Share of ${parts.performanceYear} worked`,
            value: parts.proration,
            op: 'times' as const,
            kind: 'factor' as const,
          },
        ]
      : []),
    {
      label: 'Extra bonuses',
      value: extrasTotal(parts.extras),
      op: 'plus',
      note: 'Never prorated: a spot award is not earned across the year',
    },
  ]),
  totalLabel: 'Bonus',
  total: parts.bonusTotal,
});

export const nextYearBonusBreakdown = (
  estimate: NextYearBonusEstimate,
  targetBonus: number
): MathBreakdown => ({
  steps: [
    { label: 'Target bonus', value: targetBonus },
    {
      label: `Share of ${estimate.earnedInYear} this role covers`,
      value: estimate.proration,
      op: 'times',
      kind: 'factor',
    },
  ],
  totalLabel: `Estimated for ${estimate.paidInYear}`,
  total: estimate.amount,
  footnote:
    "At target rather than at this year's multiplier, and not counted as income anywhere: it is next year's money.",
});
