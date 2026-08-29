import { describe, expect, it } from 'vitest';
import type { EffectiveRow } from './effectiveRows';
import { money, moneyCents } from './format';
import { ledgerRowView, preTaxTotal, type AmountFormat } from './ledgerRowView';

const BASE_SALARY = 160000;
const PERIODS = 26;
const PERIOD_GROSS = BASE_SALARY / PERIODS;

const PLAIN: AmountFormat = { hidden: false, money, moneyCents };
const MASKED: AmountFormat = { hidden: true, money: () => '••••••', moneyCents: () => '••••••' };

const rowWith = (overrides: Partial<EffectiveRow> = {}): EffectiveRow => ({
  periodIndex: 1,
  note: '',
  payDate: '2026-07-01',
  isAdjustedDate: false,
  isMatchAdjusted: false,
  isOffCycle: false,
  isAdjusted: false,
  gross: PERIOD_GROSS,
  supplementalGross: 0,
  taxableAllowance: 0,
  taxFreeAllowance: 0,
  section125: 100,
  hsa: 50,
  pretax401k: 200,
  pretaxIncomeOnly: 25,
  roth401k: 0,
  postTax: 0,
  federalTax: 900,
  stateTax: 300,
  payrollTaxes: [],
  taxTotal: 1200,
  net: 2000,
  employerMatch401k: 0,
  deferralPercent: 0,
  matchedDeferralPercent: 0,
  notes: [],
  actualFields: [],
  balancedFields: [],
  residual: 0,
  modelledGross: PERIOD_GROSS,
  modelledNet: 2000,
  ...overrides,
});

describe('preTaxTotal', () => {
  it('sums only the pre-tax lines, leaving Roth and post-tax out', () => {
    const row = rowWith({ roth401k: 500, postTax: 75 });
    expect(preTaxTotal(row)).toBe(375);
  });
});

describe('ledgerRowView', () => {
  it('signs deductions and leaves gross and take-home unsigned', () => {
    const view = ledgerRowView(rowWith(), PLAIN);
    expect(view.preTax).toBe('−$375.00');
    expect(view.tax).toBe('−$1,200.00');
    expect(view.gross).toBe('$6,153.85');
    expect(view.takeHome).toBe('$2,000.00');
  });

  it('drops the sign when amounts are hidden, so the mask is not read as negative', () => {
    const view = ledgerRowView(rowWith(), MASKED);
    expect(view.preTax).toBe('••••••');
    expect(view.tax).toBe('••••••');
  });

  it('shows a dot instead of an ordinal for an off-cycle payment', () => {
    expect(ledgerRowView(rowWith({ periodIndex: 7, isOffCycle: true }), PLAIN).ordinal).toBe('·');
    expect(ledgerRowView(rowWith({ periodIndex: 7 }), PLAIN).ordinal).toBe('7');
  });

  it('flags an off-cycle and a moved pay date on the date, not the figures', () => {
    const view = ledgerRowView(rowWith({ isOffCycle: true, isAdjustedDate: true }), PLAIN);
    expect(view.dateFlags.map((entry) => entry.key)).toEqual(['off', 'moved']);
    expect(view.grossFlags).toEqual([]);
  });

  it('warns on gross only once the residual is past the floor', () => {
    expect(ledgerRowView(rowWith({ residual: -0.004 }), PLAIN).grossFlags).toEqual([]);
    const flagged = ledgerRowView(rowWith({ residual: -12 }), PLAIN).grossFlags;
    expect(flagged.map((entry) => entry.key)).toEqual(['low']);
    expect(flagged[0].tone).toBe('warn');
  });

  it('marks adjusted deductions beside the pre-tax figure', () => {
    const view = ledgerRowView(rowWith({ isAdjusted: true }), PLAIN);
    expect(view.preTaxFlags.map((entry) => entry.key)).toEqual(['adj']);
  });

  it('omits a supplemental chip and a match when there is nothing to show', () => {
    const view = ledgerRowView(rowWith(), PLAIN);
    expect(view.supplemental).toBeNull();
    expect(view.match).toBeNull();
  });

  it('signs a supplemental gross as an addition to the period', () => {
    const view = ledgerRowView(rowWith({ supplementalGross: 24000 }), PLAIN);
    expect(view.supplemental).toBe('+$24,000.00');
  });

  it('reports which figures came from a recorded paycheck', () => {
    const view = ledgerRowView(rowWith({ actualFields: ['net'] }), PLAIN);
    expect(view.takeHomeRecorded).toBe(true);
    expect(view.grossRecorded).toBe(false);
  });

  it('states the tax rate to one decimal of gross', () => {
    const view = ledgerRowView(rowWith({ gross: 1000, taxTotal: 301 }), PLAIN);
    expect(view.taxRate).toBe('30.1%');
  });

  it('reads a zero tax rate off a period with no gross rather than dividing by zero', () => {
    expect(ledgerRowView(rowWith({ gross: 0, taxTotal: 0 }), PLAIN).taxRate).toBe('0.0%');
  });
});
