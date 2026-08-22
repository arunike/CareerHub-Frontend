import { describe, expect, it } from 'vitest';
import { maxMatchFor, summarizeRetirement } from './retirement';
import { buildLedger, NO_ELECTIONS, type EmployerContributions } from './tax/ledger';
import { FEDERAL_2026, LIMITS_2026 } from './tax/data/federal-2026';
import { flatStateTable } from './tax/data/states/flat';
import { EMPTY_W4 } from './tax/withholding';

const employer: EmployerContributions = {
  match401kPercent: 50,
  match401kLimitPercent: 6,
  hsaAnnual: 0,
};

const ledgerFor = (pretaxPercent: number, rothPercent = 0) =>
  buildLedger({
    filingStatus: 'SINGLE',
    periodsPerYear: 24,
    annualSalary: 120000,
    incomeEvents: [],
    elections: {
      ...NO_ELECTIONS,
      pretax401kPercent: pretaxPercent,
      roth401kPercent: rothPercent,
    },
    employer,
    w4: EMPTY_W4,
    federal: FEDERAL_2026,
    state: flatStateTable('WA', 0, 2026),
    limits: LIMITS_2026,
  });

describe('maxMatchFor', () => {
  it('is the match on the full matched percent of pay', () => {
    const { rows } = ledgerFor(6);
    expect(maxMatchFor(rows[0], employer)).toBeCloseTo(rows[0].gross * 0.06 * 0.5, 6);
  });
});

describe('summarizeRetirement', () => {
  it('totals employee and employer contributions', () => {
    const { rows } = ledgerFor(6);
    const summary = summarizeRetirement(rows, employer, null, null);
    expect(summary.employeePretax).toBeCloseTo(120000 * 0.06, 4);
    expect(summary.employerMatch).toBeCloseTo(120000 * 0.06 * 0.5, 4);
    expect(summary.totalContributed).toBeCloseTo(summary.employeeTotal + summary.employerMatch, 6);
  });

  it('splits traditional from Roth', () => {
    const { rows } = ledgerFor(4, 2);
    const summary = summarizeRetirement(rows, employer, null, null);
    expect(summary.employeePretax).toBeCloseTo(120000 * 0.04, 4);
    expect(summary.employeeRoth).toBeCloseTo(120000 * 0.02, 4);
  });

  it('reports no unclaimed match when the full matched percent is deferred', () => {
    const { rows } = ledgerFor(6);
    expect(summarizeRetirement(rows, employer, null, null).unclaimedMatch).toBeCloseTo(0, 6);
  });

  it('reports unclaimed match when deferring below the limit', () => {
    const { rows } = ledgerFor(3);
    const summary = summarizeRetirement(rows, employer, null, null);
    // Deferring 3% of a 6% match earns half of what was available.
    expect(summary.unclaimedMatch).toBeCloseTo(120000 * 0.03 * 0.5, 4);
  });

  it('reports no unclaimed match when there is no match on offer', () => {
    const { rows } = ledgerFor(0);
    const summary = summarizeRetirement(
      rows,
      { match401kPercent: 0, match401kLimitPercent: 0, hsaAnnual: 0 },
      null,
      null
    );
    expect(summary.unclaimedMatch).toBe(0);
  });

  it('leaves gains unknown without a starting balance', () => {
    const { rows } = ledgerFor(6);
    expect(summarizeRetirement(rows, employer, null, 200000).gains).toBeNull();
    expect(summarizeRetirement(rows, employer, 100000, null).gains).toBeNull();
  });

  it('derives gains from the balance change less contributions', () => {
    const { rows } = ledgerFor(6);
    const summary = summarizeRetirement(rows, employer, 100000, 130000);
    expect(summary.gains).toBeCloseTo(30000 - summary.totalContributed, 6);
  });

  it('reports a loss when the balance grew by less than the contributions', () => {
    const { rows } = ledgerFor(6);
    const summary = summarizeRetirement(rows, employer, 100000, 105000);
    expect(summary.gains!).toBeLessThan(0);
  });

  it('expresses gains against everything invested', () => {
    const { rows } = ledgerFor(6);
    const summary = summarizeRetirement(rows, employer, 100000, 130000);
    expect(summary.gainPercent).toBeCloseTo(
      summary.gains! / (100000 + summary.totalContributed),
      6
    );
  });

  it('avoids dividing by zero with nothing invested', () => {
    const summary = summarizeRetirement([], employer, 0, 0);
    expect(summary.gainPercent).toBeNull();
  });
});

describe('progress toward the deferral limit', () => {
  const limit = 24500;

  it('reports how much of the limit is used, in amount and percent', () => {
    const { rows } = ledgerFor(6);
    const summary = summarizeRetirement(rows, employer, null, null, limit);
    const contributed = 120000 * 0.06;
    expect(summary.employeeTotal).toBeCloseTo(contributed, 4);
    expect(summary.remainingToLimit).toBeCloseTo(limit - contributed, 4);
    expect(summary.percentOfLimit).toBeCloseTo(contributed / limit, 6);
    expect(summary.electiveLimit).toBe(limit);
  });

  it('excludes the employer match from the limit, which it does not count against', () => {
    const { rows } = ledgerFor(6);
    const summary = summarizeRetirement(rows, employer, null, null, limit);
    expect(summary.employerMatch).toBeGreaterThan(0);
    expect(summary.employeeTotal + summary.employerMatch).toBeCloseTo(summary.totalContributed, 6);
    // The used figure is the employee total, not the combined one.
    expect(summary.percentOfLimit).toBeCloseTo(summary.employeeTotal / limit, 6);
  });

  it('counts Roth toward the same limit', () => {
    const { rows } = ledgerFor(3, 3);
    const summary = summarizeRetirement(rows, employer, null, null, limit);
    expect(summary.employeeTotal).toBeCloseTo(120000 * 0.06, 4);
  });

  it('reports the paycheck where the limit is reached', () => {
    const { rows } = ledgerFor(40);
    const summary = summarizeRetirement(rows, employer, null, null, limit);
    expect(summary.limitReachedOnPeriod).not.toBeNull();
    expect(summary.remainingToLimit).toBe(0);
    expect(summary.percentOfLimit).toBeCloseTo(1, 6);
  });

  it('reports no crossing when the year finishes under the limit', () => {
    const { rows } = ledgerFor(6);
    const summary = summarizeRetirement(rows, employer, null, null, limit);
    expect(summary.limitReachedOnPeriod).toBeNull();
    expect(summary.remainingToLimit).toBeGreaterThan(0);
  });

  it('never reports more than the limit as remaining, or a negative remainder', () => {
    const { rows } = ledgerFor(40);
    const summary = summarizeRetirement(rows, employer, null, null, limit);
    expect(summary.remainingToLimit).toBeGreaterThanOrEqual(0);
  });

  it('handles no limit being supplied', () => {
    const { rows } = ledgerFor(6);
    const summary = summarizeRetirement(rows, employer, null, null);
    expect(summary.electiveLimit).toBe(0);
    expect(summary.percentOfLimit).toBe(0);
    expect(summary.limitReachedOnPeriod).toBeNull();
  });
});
