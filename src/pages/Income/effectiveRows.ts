import type { NamedAmount, PeriodRow } from './tax/ledger';

export const SOCIAL_SECURITY = 'Social Security';
export const MEDICARE = 'Medicare';

// A recorded paycheck. Every line is optional: whatever you enter wins, the rest stays
// modelled, so a partly-entered payslip is still usable.
export interface PeriodActual {
  periodIndex: number;
  gross?: number | null;
  federalTax?: number | null;
  stateTax?: number | null;
  socialSecurity?: number | null;
  medicare?: number | null;
  net?: number | null;
  note?: string | null;
  // Overrides the scheduled pay date, e.g. when payday falls on a federal holiday.
  payDate?: string | null;
}

export type ActualField =
  | 'gross'
  | 'federalTax'
  | 'stateTax'
  | 'socialSecurity'
  | 'medicare'
  | 'net';

export const ACTUAL_FIELDS: ActualField[] = [
  'gross',
  'federalTax',
  'stateTax',
  'socialSecurity',
  'medicare',
  'net',
];

// The row the page displays: modelled figures with any recorded values substituted in.
export interface EffectiveRow {
  periodIndex: number;
  note: string;
  payDate: string | null;
  isAdjustedDate: boolean;
  isMatchAdjusted: boolean;
  isOffCycle: boolean;
  isAdjusted: boolean;
  gross: number;
  supplementalGross: number;
  taxableAllowance: number;
  taxFreeAllowance: number;
  section125: number;
  hsa: number;
  pretax401k: number;
  pretaxIncomeOnly: number;
  roth401k: number;
  postTax: number;
  federalTax: number;
  stateTax: number;
  payrollTaxes: NamedAmount[];
  taxTotal: number;
  net: number;
  employerMatch401k: number;
  deferralPercent: number;
  matchedDeferralPercent: number;
  notes: string[];
  // Which lines came from a recorded paycheck rather than the model.
  actualFields: ActualField[];
  // Income tax lines that were scaled so the figures reconcile with a recorded take-home.
  balancedFields: Array<'federalTax' | 'stateTax'>;
  // Anything the income tax lines could not absorb, so the column still adds up.
  residual: number;
  modelledNet: number;
}

const provided = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined;

export const hasAnyActual = (actual?: PeriodActual) =>
  actual !== undefined && ACTUAL_FIELDS.some((field) => provided(actual[field]));

// A recorded take-home implies a total withholding. FICA is statutory and cannot be off,
// so any difference is attributed to the income tax lines that were not recorded. Tax can
// never come out negative: if the recorded take-home is more than gross less deductions
// can support, the income tax lines go to zero and the remainder is reported as a residual
// rather than as a negative tax.
const balanceTaxes = (input: {
  recordedNet: boolean;
  requiredTax: number;
  payrollTotal: number;
  federalTax: number;
  stateTax: number;
  federalRecorded: boolean;
  stateRecorded: boolean;
}) => {
  const modelledTotal = input.federalTax + input.stateTax + input.payrollTotal;
  if (!input.recordedNet) {
    return {
      federalTax: input.federalTax,
      stateTax: input.stateTax,
      taxTotal: modelledTotal,
      balancedFields: [] as Array<'federalTax' | 'stateTax'>,
      residual: 0,
    };
  }

  const fixed =
    input.payrollTotal +
    (input.federalRecorded ? input.federalTax : 0) +
    (input.stateRecorded ? input.stateTax : 0);
  const adjustable =
    (input.federalRecorded ? 0 : input.federalTax) + (input.stateRecorded ? 0 : input.stateTax);
  const target = input.requiredTax - fixed;

  let federalTax = input.federalTax;
  let stateTax = input.stateTax;
  const balancedFields: Array<'federalTax' | 'stateTax'> = [];

  if (Math.abs(target - adjustable) >= 0.005) {
    if (target > 0 && adjustable > 0) {
      const scale = target / adjustable;
      if (!input.federalRecorded) {
        federalTax = input.federalTax * scale;
        if (input.federalTax > 0) balancedFields.push('federalTax');
      }
      if (!input.stateRecorded) {
        stateTax = input.stateTax * scale;
        if (input.stateTax > 0) balancedFields.push('stateTax');
      }
    } else {
      // Either there is nothing to scale, or the recorded take-home leaves no room for
      // income tax at all.
      if (!input.federalRecorded) {
        if (input.federalTax > 0) balancedFields.push('federalTax');
        federalTax = 0;
      }
      if (!input.stateRecorded) {
        if (input.stateTax > 0) balancedFields.push('stateTax');
        stateTax = 0;
      }
    }
  }

  // Derived from the lines actually shown, so the column always adds up and the rate is
  // never negative.
  const taxTotal = Math.max(0, input.payrollTotal + federalTax + stateTax);
  return {
    federalTax,
    stateTax,
    taxTotal,
    balancedFields,
    residual: input.requiredTax - taxTotal,
  };
};

export const toEffectiveRow = (row: PeriodRow, actual?: PeriodActual): EffectiveRow => {
  const actualFields = actual ? ACTUAL_FIELDS.filter((field) => provided(actual[field])) : [];

  const gross = provided(actual?.gross) ? actual.gross : row.gross;
  const federalTax = provided(actual?.federalTax)
    ? actual.federalTax
    : row.federalRegular + row.federalSupplemental;
  const stateTax = provided(actual?.stateTax)
    ? actual.stateTax
    : row.stateRegular + row.stateSupplemental;

  const payrollTaxes = row.payrollTaxes.map((tax) => {
    if (tax.label === SOCIAL_SECURITY && provided(actual?.socialSecurity)) {
      return { label: tax.label, amount: actual.socialSecurity };
    }
    if (tax.label === MEDICARE && provided(actual?.medicare)) {
      return { label: tax.label, amount: actual.medicare };
    }
    return tax;
  });

  const taxTotal =
    federalTax + stateTax + payrollTaxes.reduce((total, tax) => total + tax.amount, 0);

  const deductions = row.section125 + row.hsa + row.pretax401k + row.pretaxIncomeOnly + row.postTax;

  // Net follows from the lines unless it was recorded outright, in which case what landed
  // in the account wins.
  const derivedNet = gross - deductions - taxTotal + row.taxFreeAllowance;
  const net = provided(actual?.net) ? actual.net : derivedNet;

  const balanced = balanceTaxes({
    recordedNet: provided(actual?.net),
    requiredTax: gross - deductions + row.taxFreeAllowance - net,
    payrollTotal: payrollTaxes.reduce((total, tax) => total + tax.amount, 0),
    federalTax,
    stateTax,
    federalRecorded: provided(actual?.federalTax),
    stateRecorded: provided(actual?.stateTax),
  });

  return {
    periodIndex: row.periodIndex,
    note: actual?.note ?? '',
    payDate: row.payDate,
    isAdjustedDate: row.isAdjustedDate,
    isMatchAdjusted: row.isMatchAdjusted,
    isOffCycle: row.isOffCycle,
    isAdjusted: row.isAdjusted,
    gross,
    supplementalGross: row.supplementalGross,
    taxableAllowance: row.taxableAllowance,
    taxFreeAllowance: row.taxFreeAllowance,
    section125: row.section125,
    hsa: row.hsa,
    pretax401k: row.pretax401k,
    pretaxIncomeOnly: row.pretaxIncomeOnly,
    roth401k: row.roth401k,
    postTax: row.postTax,
    federalTax: balanced.federalTax,
    stateTax: balanced.stateTax,
    payrollTaxes,
    taxTotal: balanced.taxTotal,
    net,
    employerMatch401k: row.employerMatch401k,
    deferralPercent: row.deferralPercent,
    matchedDeferralPercent: row.matchedDeferralPercent,
    notes: row.notes,
    actualFields,
    balancedFields: balanced.balancedFields,
    residual: balanced.residual,
    modelledNet: row.net,
  };
};

export const toEffectiveRows = (rows: PeriodRow[], actuals: PeriodActual[]): EffectiveRow[] => {
  const byPeriod = new Map(actuals.map((actual) => [actual.periodIndex, actual]));
  return rows.map((row) => toEffectiveRow(row, byPeriod.get(row.periodIndex)));
};

export const effectiveTotals = (rows: EffectiveRow[]) => ({
  gross: rows.reduce((total, row) => total + row.gross, 0),
  taxTotal: rows.reduce((total, row) => total + row.taxTotal, 0),
  net: rows.reduce((total, row) => total + row.net, 0),
  recordedCount: rows.filter((row) => row.actualFields.length > 0).length,
});
