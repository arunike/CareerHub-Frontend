import { describe, expect, it } from 'vitest';
import { calculatedRate, compareRates, deductionsOf, impliedRate } from './taxRates';
import { buildLedger, NO_ELECTIONS, NO_EMPLOYER_CONTRIBUTIONS } from './tax/ledger';
import { FEDERAL_2026, LIMITS_2026 } from './tax/data/federal-2026';
import { flatStateTable } from './tax/data/states/flat';
import { EMPTY_W4 } from './tax/withholding';

const ledger = buildLedger({
  filingStatus: 'SINGLE',
  periodsPerYear: 24,
  annualSalary: 120000,
  incomeEvents: [],
  elections: { ...NO_ELECTIONS, section125PerPeriod: 200 },
  employer: NO_EMPLOYER_CONTRIBUTIONS,
  w4: EMPTY_W4,
  federal: FEDERAL_2026,
  state: flatStateTable('WA', 0, 2026),
  limits: LIMITS_2026,
});

const row = ledger.rows[0];

describe('calculatedRate', () => {
  it('is tax over gross', () => {
    expect(calculatedRate(row)).toBeCloseTo(row.taxTotal / row.gross, 10);
  });

  it('is zero when there is no gross pay', () => {
    expect(calculatedRate({ ...row, gross: 0 })).toBe(0);
  });
});

describe('impliedRate', () => {
  it('matches the calculated rate when the actual equals the model', () => {
    expect(impliedRate(row, row.net)).toBeCloseTo(calculatedRate(row), 10);
  });

  it('reads higher when less landed than the model expected', () => {
    expect(impliedRate(row, row.net - 100)!).toBeGreaterThan(calculatedRate(row));
  });

  it('reads lower when more landed than expected', () => {
    expect(impliedRate(row, row.net + 100)!).toBeLessThan(calculatedRate(row));
  });

  it('holds deductions constant rather than folding them into tax', () => {
    const implied = impliedRate(row, row.net)!;
    expect(implied * row.gross).toBeCloseTo(row.gross - deductionsOf(row) - row.net, 6);
  });

  it('returns null without an actual', () => {
    expect(impliedRate(row, null)).toBeNull();
    expect(impliedRate(row, undefined)).toBeNull();
  });
});

describe('compareRates', () => {
  it('reports the annual calculated rate', () => {
    const result = compareRates(ledger.rows, []);
    expect(result.calculated).toBeCloseTo(ledger.totals.taxTotal / ledger.totals.gross, 10);
    expect(result.actual).toBeNull();
    expect(result.comparedCount).toBe(0);
  });

  it('compares only the paychecks that have an actual recorded', () => {
    const result = compareRates(ledger.rows, [
      { periodIndex: 1, net: ledger.rows[0].net },
      { periodIndex: 2, net: null },
    ]);
    expect(result.comparedCount).toBe(1);
    expect(result.differencePoints).toBeCloseTo(0, 6);
  });

  it('shows a positive gap when real withholding exceeds the model', () => {
    const result = compareRates(ledger.rows, [{ periodIndex: 1, net: ledger.rows[0].net - 150 }]);
    expect(result.differencePoints!).toBeGreaterThan(0);
  });

  it('shows a negative gap when real withholding is lower', () => {
    const result = compareRates(ledger.rows, [{ periodIndex: 1, net: ledger.rows[0].net + 150 }]);
    expect(result.differencePoints!).toBeLessThan(0);
  });

  it('does not let an unrecorded paycheck dilute the comparison', () => {
    const one = compareRates(ledger.rows, [{ periodIndex: 1, net: ledger.rows[0].net - 150 }]);
    const two = compareRates(ledger.rows, [
      { periodIndex: 1, net: ledger.rows[0].net - 150 },
      { periodIndex: 2, net: ledger.rows[1].net - 150 },
    ]);
    expect(two.differencePoints).toBeCloseTo(one.differencePoints!, 6);
  });
});
