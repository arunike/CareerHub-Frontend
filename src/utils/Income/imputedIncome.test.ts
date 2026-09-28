import { describe, expect, it } from 'vitest';
import { buildLedger, NO_ELECTIONS } from './tax/ledger';
import { FEDERAL_2026, LIMITS_2026 } from './tax/data/federal-2026';
import { flatStateTable } from './tax/data/states/flat';
import { EMPTY_W4 } from './tax/withholding';
import { buildPayPeriods } from './paySchedule';
import type { DeferralBase } from './tax/ledger';

const ANNUAL_SALARY = 165000;
const PERIODS = 26;
const BASE_PER_PERIOD = ANNUAL_SALARY / PERIODS;
// Employer-paid life and disability cover, the shape a payslip shows as imputed income.
const IMPUTED = 28;
const periods = buildPayPeriods(2026, PERIODS, { firstPayDate: '2026-01-15' });

const run = ({
  imputed = 0,
  deferralPercent = 0,
  deferralBase = 'ALL' as DeferralBase,
}: { imputed?: number; deferralPercent?: number; deferralBase?: DeferralBase } = {}) =>
  buildLedger({
    filingStatus: 'SINGLE',
    periodsPerYear: PERIODS,
    periods: periods.slice(0, 1),
    annualSalary: ANNUAL_SALARY,
    incomeEvents: [],
    elections: {
      ...NO_ELECTIONS,
      pretax401kPercent: deferralPercent,
      imputedPerPeriod: imputed,
      deferralBase,
    },
    employer: { match401kPercent: 0, match401kLimitPercent: 0, hsaAnnual: 0, matchTiers: [] },
    w4: EMPTY_W4,
    federal: FEDERAL_2026,
    state: flatStateTable('WA', 0, 2026),
    limits: LIMITS_2026,
  }).rows[0];

describe('imputed income', () => {
  it('raises taxable gross by the cover the employer paid for', () => {
    expect(run().gross).toBeCloseTo(BASE_PER_PERIOD, 2);
    expect(run({ imputed: IMPUTED }).gross).toBeCloseTo(BASE_PER_PERIOD + IMPUTED, 2);
  });

  it('leaves take-home untouched, because the money is never received', () => {
    const plain = run();
    const withImputed = run({ imputed: IMPUTED });
    // Every tax rises on the larger gross, so net falls by exactly that extra tax and no more.
    const extraTax = withImputed.taxTotal - plain.taxTotal;
    expect(withImputed.net).toBeCloseTo(plain.net - extraTax, 2);
  });

  it('is taxed: more gross means more withheld', () => {
    expect(run({ imputed: IMPUTED }).taxTotal).toBeGreaterThan(run().taxTotal);
  });

  it('never enters the 401(k) base, whatever the base is set to', () => {
    // A plan defers on pay; imputed income is pay the employee never gets.
    for (const deferralBase of ['ALL', 'NO_ALLOWANCES', 'SALARY_ONLY'] as DeferralBase[]) {
      const plain = run({ deferralPercent: 6, deferralBase });
      const withImputed = run({ deferralPercent: 6, imputed: IMPUTED, deferralBase });
      expect(withImputed.pretax401k).toBeCloseTo(plain.pretax401k, 6);
    }
  });

  it('defers on the salary line alone, which is what a payslip shows', () => {
    expect(run({ deferralPercent: 6, imputed: IMPUTED }).pretax401k).toBeCloseTo(
      BASE_PER_PERIOD * 0.06,
      2
    );
  });

  it('changes nothing at all when the employer pays for no cover', () => {
    expect(run({ imputed: 0 })).toEqual(run());
  });
});
