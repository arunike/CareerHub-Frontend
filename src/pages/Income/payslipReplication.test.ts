import { describe, expect, it } from 'vitest';
import { buildLedger, NO_ELECTIONS } from './tax/ledger';
import { FEDERAL_2026, LIMITS_2026 } from './tax/data/federal-2026';
import { flatStateTable } from './tax/data/states/flat';
import { EMPTY_W4 } from './tax/withholding';
import { buildPayPeriods } from './paySchedule';

const ANNUAL_SALARY = 160000;
const BASE_PER_PERIOD = ANNUAL_SALARY / 26;
const ALLOWANCE = 30;
const periods = buildPayPeriods(2025, 26, { firstPayDate: '2025-02-07' });

const run = (deferralPercent: number, excludeAllowances: boolean) =>
  buildLedger({
    filingStatus: 'SINGLE',
    periodsPerYear: 26,
    periods: periods.slice(0, 1),
    annualSalary: ANNUAL_SALARY,
    incomeEvents: [],
    elections: {
      ...NO_ELECTIONS,
      pretax401kPercent: deferralPercent,
      taxableAllowancePerPeriod: ALLOWANCE,
      excludeAllowancesFromDeferralBase: excludeAllowances,
    },
    employer: {
      match401kPercent: 0,
      match401kLimitPercent: 0,
      hsaAnnual: 0,
      matchTiers: [
        { id: 'a', matchPercent: 100, uptoPercent: 1 },
        { id: 'b', matchPercent: 60, uptoPercent: 6 },
      ],
    },
    w4: EMPTY_W4,
    federal: FEDERAL_2026,
    state: flatStateTable('WA', 0, 2026),
    limits: LIMITS_2026,
  }).rows[0];

describe('matching a payslip', () => {
  it('puts the allowance into gross', () => {
    expect(run(3, true).gross).toBeCloseTo(BASE_PER_PERIOD + ALLOWANCE, 2);
  });

  it('computes the 3% contribution to the cent', () => {
    expect(run(3, true).pretax401k).toBeCloseTo(BASE_PER_PERIOD * 0.03, 2);
  });

  it('computes the 4% contribution to the cent', () => {
    expect(run(4, true).pretax401k).toBeCloseTo(BASE_PER_PERIOD * 0.04, 2);
  });

  it('reproduces the match at 3%', () => {
    expect(run(3, true).employerMatch401k).toBeCloseTo(BASE_PER_PERIOD * 0.022, 2);
  });

  it('reproduces the match at 4%', () => {
    expect(run(4, true).employerMatch401k).toBeCloseTo(BASE_PER_PERIOD * 0.028, 2);
  });

  it('overstates both when the allowance is left in the base', () => {
    // The gap that made the app disagree with the payslip.
    expect(run(4, false).pretax401k).toBeGreaterThan(140);
    expect(run(4, false).employerMatch401k).toBeGreaterThan(98);
  });

  it('still taxes the allowance, which is wages either way', () => {
    const excluded = run(4, true);
    const included = run(4, false);
    expect(excluded.taxableAllowance).toBeCloseTo(ALLOWANCE, 2);
    expect(excluded.ficaWages).toBeCloseTo(included.ficaWages, 2);
  });

  it('grosses base pay alone on the paychecks that paid no allowance', () => {
    const noAllowance = buildLedger({
      filingStatus: 'SINGLE',
      periodsPerYear: 26,
      periods: periods.slice(0, 1),
      annualSalary: ANNUAL_SALARY,
      incomeEvents: [],
      elections: { ...NO_ELECTIONS, pretax401kPercent: 4, excludeAllowancesFromDeferralBase: true },
      employer: {
        match401kPercent: 0,
        match401kLimitPercent: 0,
        hsaAnnual: 0,
        matchTiers: [
          { id: 'a', matchPercent: 100, uptoPercent: 1 },
          { id: 'b', matchPercent: 60, uptoPercent: 6 },
        ],
      },
      w4: EMPTY_W4,
      federal: FEDERAL_2026,
      state: flatStateTable('WA', 0, 2026),
      limits: LIMITS_2026,
    }).rows[0];
    expect(noAllowance.gross).toBeCloseTo(BASE_PER_PERIOD, 2);
    expect(noAllowance.pretax401k).toBeCloseTo(BASE_PER_PERIOD * 0.04, 2);
  });

  it('leaves the deferral on gross when the option is off', () => {
    expect(run(4, false).pretax401k).toBeCloseTo((BASE_PER_PERIOD + ALLOWANCE) * 0.04, 2);
  });

  it('raises the match when the deferral rises, which a single capped band cannot', () => {
    expect(run(4, true).employerMatch401k).toBeGreaterThan(run(3, true).employerMatch401k);
  });
});
