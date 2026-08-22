import { describe, expect, it } from 'vitest';
import { splitCustomDeductions, type CustomDeduction } from './deductions';
import { buildLedger, NO_ELECTIONS, NO_EMPLOYER_CONTRIBUTIONS } from './tax/ledger';
import { FEDERAL_2026, LIMITS_2026 } from './tax/data/federal-2026';
import { flatStateTable } from './tax/data/states/flat';
import { EMPTY_W4 } from './tax/withholding';

const deduction = (overrides: Partial<CustomDeduction>): CustomDeduction => ({
  id: 'd1',
  label: 'Life insurance',
  amount: 25,
  treatment: 'SECTION_125',
  ...overrides,
});

describe('splitCustomDeductions', () => {
  it('routes each treatment to its own bucket', () => {
    const totals = splitCustomDeductions([
      deduction({ id: 'a', amount: 25, treatment: 'SECTION_125' }),
      deduction({ id: 'b', amount: 40, treatment: 'PRETAX_INCOME_ONLY' }),
      deduction({ id: 'c', amount: 15, treatment: 'POST_TAX' }),
    ]);
    expect(totals).toEqual({ section125: 25, pretaxIncomeOnly: 40, postTax: 15 });
  });

  it('sums several deductions with the same treatment', () => {
    const totals = splitCustomDeductions([
      deduction({ id: 'a', amount: 10 }),
      deduction({ id: 'b', amount: 30 }),
    ]);
    expect(totals.section125).toBe(40);
  });

  it('ignores blank and negative amounts', () => {
    const totals = splitCustomDeductions([
      deduction({ id: 'a', amount: 0 }),
      deduction({ id: 'b', amount: -50 }),
      deduction({ id: 'c', amount: Number.NaN }),
    ]);
    expect(totals).toEqual({ section125: 0, pretaxIncomeOnly: 0, postTax: 0 });
  });

  it('returns zeroes for an empty list', () => {
    expect(splitCustomDeductions([])).toEqual({
      section125: 0,
      pretaxIncomeOnly: 0,
      postTax: 0,
    });
  });
});

describe('custom deductions through the ledger', () => {
  const base = {
    filingStatus: 'SINGLE' as const,
    periodsPerYear: 24,
    annualSalary: 120000,
    incomeEvents: [],
    employer: NO_EMPLOYER_CONTRIBUTIONS,
    w4: EMPTY_W4,
    federal: FEDERAL_2026,
    state: flatStateTable('WA', 0, 2026),
    limits: LIMITS_2026,
  };

  it('treats a Section 125 deduction as reducing FICA', () => {
    const plain = buildLedger({ ...base, elections: NO_ELECTIONS });
    const withDeduction = buildLedger({
      ...base,
      elections: { ...NO_ELECTIONS, section125PerPeriod: 100 },
    });
    expect(withDeduction.rows[0].ficaWages).toBeCloseTo(plain.rows[0].ficaWages - 100, 6);
  });

  it('treats a post-tax deduction as changing take-home but no tax', () => {
    const plain = buildLedger({ ...base, elections: NO_ELECTIONS });
    const withDeduction = buildLedger({
      ...base,
      elections: { ...NO_ELECTIONS, postTaxPerPeriod: 100 },
    });
    expect(withDeduction.rows[0].taxTotal).toBeCloseTo(plain.rows[0].taxTotal, 6);
    expect(withDeduction.rows[0].net).toBeCloseTo(plain.rows[0].net - 100, 6);
  });
});
