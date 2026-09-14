import type { ActualField, EffectiveRow } from './effectiveRows';
import { calculatedRate } from './taxRates';

export type FlagTone = 'quiet' | 'warn';

export interface LedgerFlag {
  key: string;
  label: string;
  title: string;
  tone: FlagTone;
}

// A recorded take-home below this leaves no gross for the model to withhold tax from.
const RESIDUAL_FLOOR = -0.005;

const FLAGS: Record<string, Omit<LedgerFlag, 'key'>> = {
  off: {
    label: 'off',
    title: 'Paid on its own date, separate from payroll',
    tone: 'quiet',
  },
  moved: {
    label: 'moved',
    title: 'Pay date moved from the regular schedule',
    tone: 'quiet',
  },
  adj: {
    label: 'adj',
    title: 'This paycheck uses adjusted deduction amounts',
    tone: 'quiet',
  },
  low: {
    label: 'low',
    title:
      "The recorded take-home is more than this gross can pay. Record the gross too, or check the role's salary.",
    tone: 'warn',
  },
};

const flag = (key: keyof typeof FLAGS): LedgerFlag => ({ key, ...FLAGS[key] });

export const preTaxTotal = (row: EffectiveRow) =>
  row.section125 + row.hsa + row.pretax401k + row.pretaxIncomeOnly;

export const isRecorded = (row: EffectiveRow, field: ActualField) =>
  row.actualFields.includes(field);

// The formatters from useMoney, passed in so the view stays pure and testable.
export interface AmountFormat {
  hidden: boolean;
  money: (value: number) => string;
  moneyCents: (value: number) => string;
}

export interface LedgerRowView {
  ordinal: string;
  dateFlags: LedgerFlag[];
  gross: string;
  grossFlags: LedgerFlag[];
  grossRecorded: boolean;
  supplemental: string | null;
  preTax: string;
  preTaxFlags: LedgerFlag[];
  tax: string;
  taxRate: string;
  takeHome: string;
  takeHomeRecorded: boolean;
  match: string | null;
  autoNotes: string[];
}

// Deductions read as a payslip does, so the sign carries the meaning rather than a colour.
const negated = (text: string, hidden: boolean) => (hidden ? text : `−${text}`);

export const ledgerRowView = (row: EffectiveRow, format: AmountFormat): LedgerRowView => ({
  ordinal: row.isOffCycle ? '·' : String(row.periodIndex),
  dateFlags: [
    ...(row.isOffCycle ? [flag('off')] : []),
    ...(row.isAdjustedDate ? [flag('moved')] : []),
  ],
  gross: format.money(row.gross),
  grossFlags: row.residual < RESIDUAL_FLOOR ? [flag('low')] : [],
  grossRecorded: isRecorded(row, 'gross'),
  supplemental: row.supplementalGross > 0 ? `+${format.money(row.supplementalGross)}` : null,
  preTax: negated(format.money(preTaxTotal(row)), format.hidden),
  preTaxFlags: row.isAdjusted ? [flag('adj')] : [],
  tax: negated(format.money(row.taxTotal), format.hidden),
  taxRate: `${(calculatedRate(row) * 100).toFixed(1)}%`,
  takeHome: format.moneyCents(row.net),
  takeHomeRecorded: isRecorded(row, 'net'),
  match: row.employerMatch401k > 0 ? format.money(row.employerMatch401k) : null,
  autoNotes: row.notes,
});
