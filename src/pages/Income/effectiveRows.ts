import type { NamedAmount, PeriodRow } from './tax/ledger';

export const SOCIAL_SECURITY = 'Social Security';
export const MEDICARE = 'Medicare';

// Every line is optional: what you enter wins, the rest stays modelled.
export interface PeriodActual {
  periodIndex: number;
  gross?: number | null;
  net?: number | null;
  note?: string | null;
  // Overrides the scheduled pay date, e.g. when payday falls on a federal holiday.
  payDate?: string | null;
}

// Only the two figures a payslip is read off in the ledger. The per-line tax fields were
// recorded by a modal nobody used: zero production rows carried one.
export type ActualField = 'gross' | 'net';

export const ACTUAL_FIELDS: ActualField[] = ['gross', 'net'];

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
  // What the model said before any recorded figure replaced it, so an editor can show it.
  modelledGross: number;
  modelledNet: number;
}

const provided = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined;

export const hasAnyActual = (actual?: PeriodActual) =>
  actual !== undefined && ACTUAL_FIELDS.some((field) => provided(actual[field]));

// A recorded take-home implies a total withholding. FICA is statutory, so the difference
// lands on the unrecorded income tax lines; those floor at zero and the rest is a residual.
const balanceTaxes = (input: {
  recordedNet: boolean;
  requiredTax: number;
  payrollTotal: number;
  federalTax: number;
  stateTax: number;
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

  // FICA is statutory, so only the income tax lines can move to reconcile a recorded take-home.
  const adjustable = input.federalTax + input.stateTax;
  const target = input.requiredTax - input.payrollTotal;

  let federalTax = input.federalTax;
  let stateTax = input.stateTax;
  const balancedFields: Array<'federalTax' | 'stateTax'> = [];

  if (Math.abs(target - adjustable) >= 0.005) {
    if (target > 0 && adjustable > 0) {
      const scale = target / adjustable;
      federalTax = input.federalTax * scale;
      if (input.federalTax > 0) balancedFields.push('federalTax');
      stateTax = input.stateTax * scale;
      if (input.stateTax > 0) balancedFields.push('stateTax');
    } else {
      // Nothing to scale, or no room left for income tax at all.
      if (input.federalTax > 0) balancedFields.push('federalTax');
      federalTax = 0;
      if (input.stateTax > 0) balancedFields.push('stateTax');
      stateTax = 0;
    }
  }

  // Derived from the lines shown, so the column always adds up.
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
  const federalTax = row.federalRegular + row.federalSupplemental;
  const stateTax = row.stateRegular + row.stateSupplemental;
  const payrollTaxes = row.payrollTaxes;

  const taxTotal =
    federalTax + stateTax + payrollTaxes.reduce((total, tax) => total + tax.amount, 0);

  const deductions = row.section125 + row.hsa + row.pretax401k + row.pretaxIncomeOnly + row.postTax;

  // A recorded net wins: what landed in the account beats what the lines imply.
  const derivedNet = gross - deductions - taxTotal + row.taxFreeAllowance;
  const net = provided(actual?.net) ? actual.net : derivedNet;

  const balanced = balanceTaxes({
    recordedNet: provided(actual?.net),
    requiredTax: gross - deductions + row.taxFreeAllowance - net,
    payrollTotal: payrollTaxes.reduce((total, tax) => total + tax.amount, 0),
    federalTax,
    stateTax,
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
    modelledGross: row.gross,
    modelledNet: row.net,
  };
};

export const toEffectiveRows = (rows: PeriodRow[], actuals: PeriodActual[]): EffectiveRow[] => {
  const byPeriod = new Map(actuals.map((actual) => [actual.periodIndex, actual]));
  return rows.map((row) => toEffectiveRow(row, byPeriod.get(row.periodIndex)));
};

// Falls back to the first row when nothing has paid yet, so a future year still shows something.
export const mostRecentPaidRow = <T extends { payDate: string | null }>(
  rows: T[],
  todayIso: string
): T | null => {
  if (rows.length === 0) return null;
  const latestPaid = rows.reduce<T | null>((latest, row) => {
    if (!row.payDate || row.payDate > todayIso) return latest;
    return !latest || row.payDate > (latest.payDate as string) ? row : latest;
  }, null);
  return latestPaid ?? rows[0];
};

export const effectiveTotals = (rows: EffectiveRow[]) => ({
  gross: rows.reduce((total, row) => total + row.gross, 0),
  taxTotal: rows.reduce((total, row) => total + row.taxTotal, 0),
  net: rows.reduce((total, row) => total + row.net, 0),
  recordedCount: rows.filter((row) => row.actualFields.length > 0).length,
});
