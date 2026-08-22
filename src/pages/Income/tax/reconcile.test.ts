import { describe, expect, it } from 'vitest';
import { FEDERAL_2026, LIMITS_2026 } from './data/federal-2026';
import { flatStateTable } from './data/states/flat';
import { buildLedger, NO_ELECTIONS, NO_EMPLOYER_CONTRIBUTIONS, type LedgerInput } from './ledger';
import { compareActuals, reconcileYear } from './reconcile';
import { EMPTY_W4 } from './withholding';

const NO_STATE = flatStateTable('WA', 0, 2026);

const input = (overrides: Partial<LedgerInput> = {}): LedgerInput => ({
  filingStatus: 'SINGLE',
  periodsPerYear: 24,
  annualSalary: 120000,
  incomeEvents: [],
  elections: NO_ELECTIONS,
  employer: NO_EMPLOYER_CONTRIBUTIONS,
  w4: EMPTY_W4,
  federal: FEDERAL_2026,
  state: NO_STATE,
  limits: LIMITS_2026,
  ...overrides,
});

const reconcile = (config: Partial<LedgerInput> = {}) => {
  const resolved = input(config);
  const { totals } = buildLedger(resolved);
  return reconcileYear(
    totals,
    resolved.federal,
    resolved.state,
    resolved.filingStatus,
    resolved.w4
  );
};

describe('reconcileYear', () => {
  it('reconciles exactly for a salary-only year', () => {
    const result = reconcile();
    expect(result.difference).toBeCloseTo(0, 6);
    expect(result.supplementalUnderWithheld).toBe(false);
  });

  // A $200,000 vest is withheld at 22% while the marginal rate on $400,000 is 35%.
  it('reports a shortfall when a large vest is withheld at the supplemental rate', () => {
    const result = reconcile({
      annualSalary: 200000,
      incomeEvents: [{ id: 'v1', kind: 'vest', periodIndex: 6, amount: 200000 }],
    });

    expect(result.taxableIncome).toBeCloseTo(400000, 6);
    expect(result.incomeTaxWithheld).toBeCloseTo(36734 + 44000, 6);
    expect(result.incomeTaxLiability).toBeCloseTo(103134.25, 6);
    expect(result.difference).toBeCloseTo(-22400.25, 6);
    expect(result.supplementalShare).toBeCloseTo(0.5, 6);
    expect(result.supplementalUnderWithheld).toBe(true);
  });

  it('excludes FICA from the comparison', () => {
    const resolved = input();
    const { totals } = buildLedger(resolved);
    const result = reconcileYear(totals, FEDERAL_2026, NO_STATE, 'SINGLE', EMPTY_W4);
    expect(result.incomeTaxWithheld).toBeCloseTo(totals.federalWithheld, 6);
    expect(totals.payrollWithheld).toBeGreaterThan(0);
  });

  it('counts state liability where a state taxes income', () => {
    const result = reconcile({ state: flatStateTable('IL', 4.95, 2026) });
    expect(result.stateLiability).toBeCloseTo(120000 * 0.0495, 4);
  });

  it('shows a refund when extra withholding is elected', () => {
    const result = reconcile({
      w4: {
        dependentsCredit: 0,
        dependents: 0,
        otherIncome: 0,
        deductions: 0,
        extraPerPeriod: 200,
      },
    });
    expect(result.difference).toBeCloseTo(200 * 24, 6);
  });
});

describe('compareActuals', () => {
  it('skips periods with no recorded actual instead of scoring them as zero', () => {
    const { rows } = buildLedger(input());
    const drift = compareActuals(rows, [
      { periodIndex: 1, net: rows[0].net - 25 },
      { periodIndex: 2, net: null },
      { periodIndex: 3 },
    ]);

    expect(drift.comparedCount).toBe(1);
    expect(drift.periods[0].netVariance).toBeCloseTo(-25, 6);
    expect(drift.totalNetVariance).toBeCloseTo(-25, 6);
    expect(drift.meanNetVariance).toBeCloseTo(-25, 6);
  });

  it('averages variance across the periods that do have actuals', () => {
    const { rows } = buildLedger(input());
    const drift = compareActuals(rows, [
      { periodIndex: 1, net: rows[0].net + 100 },
      { periodIndex: 2, net: rows[1].net - 50 },
    ]);

    expect(drift.comparedCount).toBe(2);
    expect(drift.totalNetVariance).toBeCloseTo(50, 6);
    expect(drift.meanNetVariance).toBeCloseTo(25, 6);
  });

  it('leaves the modelled values untouched', () => {
    const { rows } = buildLedger(input());
    const modelledNet = rows[0].net;
    compareActuals(rows, [{ periodIndex: 1, net: 1 }]);
    expect(rows[0].net).toBe(modelledNet);
  });

  it('reports an empty summary when there are no actuals', () => {
    const { rows } = buildLedger(input());
    const drift = compareActuals(rows, []);
    expect(drift.comparedCount).toBe(0);
    expect(drift.meanNetVariance).toBe(0);
  });
});
