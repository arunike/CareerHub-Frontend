import { describe, expect, it } from 'vitest';
import {
  annualAmount,
  defaultAllowance,
  perPeriodAverage,
  resolveAllowances,
  splitAllowances,
  splitResolved,
  allowanceSchedule,
  type Allowance,
} from './allowances';
import { buildPayPeriods } from './paySchedule';
import { buildLedger, NO_ELECTIONS, NO_EMPLOYER_CONTRIBUTIONS } from './tax/ledger';
import { FEDERAL_2026, LIMITS_2026 } from './tax/data/federal-2026';
import { flatStateTable } from './tax/data/states/flat';
import { EMPTY_W4 } from './tax/withholding';

const allowance = (overrides: Partial<Allowance>): Allowance => ({
  ...defaultAllowance('wfh'),
  label: 'WFH stipend',
  amount: 100,
  ...overrides,
});

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

describe('splitAllowances', () => {
  it('separates taxable from tax-free', () => {
    const totals = splitAllowances(
      [
        allowance({ id: 'a', amount: 100, treatment: 'TAXABLE' }),
        allowance({ id: 'b', amount: 50, treatment: 'TAX_FREE' }),
      ],
      24
    );
    expect(totals).toEqual({ taxable: 100, taxFree: 50 });
  });

  it('sums several of the same treatment', () => {
    const totals = splitAllowances(
      [allowance({ id: 'a', amount: 100 }), allowance({ id: 'b', amount: 25 })],
      24
    );
    expect(totals.taxable).toBe(125);
  });

  it('ignores blank and negative amounts', () => {
    expect(
      splitAllowances([allowance({ amount: 0 }), allowance({ id: 'b', amount: -10 })], 24)
    ).toEqual({ taxable: 0, taxFree: 0 });
  });
});

describe('a taxable allowance through the ledger', () => {
  const plain = buildLedger({ ...base, elections: NO_ELECTIONS });
  const withAllowance = buildLedger({
    ...base,
    elections: { ...NO_ELECTIONS, taxableAllowancePerPeriod: 100 },
  });

  it('joins gross pay', () => {
    expect(withAllowance.rows[0].gross).toBeCloseTo(plain.rows[0].gross + 100, 6);
    expect(withAllowance.rows[0].taxableAllowance).toBe(100);
  });

  it('is taxed, including FICA', () => {
    expect(withAllowance.rows[0].taxTotal).toBeGreaterThan(plain.rows[0].taxTotal);
    expect(withAllowance.rows[0].ficaWages).toBeCloseTo(plain.rows[0].ficaWages + 100, 6);
  });

  it('raises take-home by less than the allowance, because it is taxed', () => {
    const gain = withAllowance.rows[0].net - plain.rows[0].net;
    expect(gain).toBeGreaterThan(0);
    expect(gain).toBeLessThan(100);
  });

  it('adds up across the year', () => {
    expect(withAllowance.totals.taxableAllowance).toBeCloseTo(100 * 24, 6);
  });
});

describe('a tax-free allowance through the ledger', () => {
  const plain = buildLedger({ ...base, elections: NO_ELECTIONS });
  const withAllowance = buildLedger({
    ...base,
    elections: { ...NO_ELECTIONS, taxFreeAllowancePerPeriod: 100 },
  });

  it('stays out of gross pay', () => {
    expect(withAllowance.rows[0].gross).toBeCloseTo(plain.rows[0].gross, 6);
  });

  it('is not taxed at all', () => {
    expect(withAllowance.rows[0].taxTotal).toBeCloseTo(plain.rows[0].taxTotal, 6);
    expect(withAllowance.rows[0].ficaWages).toBeCloseTo(plain.rows[0].ficaWages, 6);
  });

  it('raises take-home by the full amount', () => {
    expect(withAllowance.rows[0].net).toBeCloseTo(plain.rows[0].net + 100, 6);
  });

  it('does not change the 401(k) deferral base', () => {
    const deferring = buildLedger({
      ...base,
      elections: { ...NO_ELECTIONS, pretax401kPercent: 10, taxFreeAllowancePerPeriod: 100 },
    });
    expect(deferring.rows[0].pretax401k).toBeCloseTo(plain.rows[0].gross * 0.1, 6);
  });
});

describe('allowances on an off-cycle payment', () => {
  it('are not paid again on a standalone bonus cheque', () => {
    const periods = [
      { periodIndex: 1, payDate: '2026-01-15' },
      { periodIndex: 1000, payDate: '2026-03-31', isOffCycle: true },
    ];
    const { rows } = buildLedger({
      ...base,
      periods,
      elections: {
        ...NO_ELECTIONS,
        taxableAllowancePerPeriod: 100,
        taxFreeAllowancePerPeriod: 50,
      },
      incomeEvents: [{ id: 'b', kind: 'bonus', periodIndex: 1000, amount: 10000 }],
    });
    const offCycle = rows.find((row) => row.periodIndex === 1000)!;
    expect(offCycle.taxableAllowance).toBe(0);
    expect(offCycle.taxFreeAllowance).toBe(0);
  });
});

describe('allowance frequency', () => {
  it('treats one per paycheck as the full amount every paycheck', () => {
    expect(perPeriodAverage(allowance({ amount: 100 }), 26)).toBeCloseTo(100, 6);
  });

  it('spreads a monthly allowance across the paychecks', () => {
    // $100 once a month is $1,200 a year, which is under $50 on a biweekly cheque.
    const monthly = allowance({ amount: 100, unit: 'MONTH', timesPer: 1 });
    expect(annualAmount(monthly, 26)).toBeCloseTo(1200, 6);
    expect(perPeriodAverage(monthly, 26)).toBeCloseTo(1200 / 26, 6);
  });

  it('handles many payments a month', () => {
    const meals = allowance({ amount: 15, unit: 'MONTH', timesPer: 10 });
    expect(annualAmount(meals, 26)).toBeCloseTo(15 * 10 * 12, 6);
  });

  it('handles an annual allowance', () => {
    expect(perPeriodAverage(allowance({ amount: 600, unit: 'YEAR', timesPer: 1 }), 24)).toBeCloseTo(
      25,
      6
    );
  });

  it('multiplies when paid several times per paycheck', () => {
    expect(perPeriodAverage(allowance({ amount: 20, timesPer: 3 }), 26)).toBeCloseTo(60, 6);
  });

  it('is zero when the count is zero', () => {
    expect(perPeriodAverage(allowance({ amount: 100, timesPer: 0 }), 26)).toBe(0);
  });

  it('avoids dividing by a missing cadence', () => {
    expect(perPeriodAverage(allowance({ amount: 100, unit: 'MONTH' }), 0)).toBe(0);
  });
});

describe('resolveAllowances', () => {
  it('uses the scheduled amount when there is no override', () => {
    const [resolved] = resolveAllowances([allowance({ amount: 100 })], { wfh: 50 });
    expect(resolved.perPeriod).toBe(50);
  });

  it('is nothing when the schedule put nothing on this paycheck', () => {
    const [resolved] = resolveAllowances([allowance({ amount: 100 })], {});
    expect(resolved.perPeriod).toBe(0);
  });

  it('lets a per-paycheck override replace the scheduled amount', () => {
    const [resolved] = resolveAllowances([allowance({ amount: 100 })], { wfh: 50 }, { wfh: 250 });
    expect(resolved.perPeriod).toBe(250);
  });

  it('treats an override of zero as none paid that paycheck', () => {
    const [resolved] = resolveAllowances([allowance({ amount: 100 })], { wfh: 50 }, { wfh: 0 });
    expect(resolved.perPeriod).toBe(0);
  });

  it('splits resolved amounts by treatment', () => {
    const resolved = resolveAllowances(
      [
        allowance({ id: 'a', amount: 100, treatment: 'TAXABLE' }),
        allowance({ id: 'b', amount: 40, treatment: 'TAX_FREE' }),
      ],
      { a: 100, b: 40 }
    );
    expect(splitResolved(resolved)).toEqual({ taxable: 100, taxFree: 40 });
  });
});

describe('allowanceSchedule', () => {
  const periods = buildPayPeriods(2026, 24, { firstPayDate: '2026-01-15' });

  it('pays a per-paycheck allowance every paycheck', () => {
    const schedule = allowanceSchedule([allowance({ amount: 50 })], periods);
    expect(Object.values(schedule).every((entry) => entry.taxable === 50)).toBe(true);
  });

  it('pays a monthly allowance on one paycheck of each month, not spread', () => {
    const monthly = allowance({ amount: 50, unit: 'MONTH' });
    const schedule = allowanceSchedule([monthly], periods);
    const paid = Object.values(schedule).filter((entry) => entry.taxable > 0);
    expect(paid).toHaveLength(12);
    expect(paid.every((entry) => entry.taxable === 50)).toBe(true);
    // The other paycheck of each month receives nothing.
    expect(Object.values(schedule).filter((entry) => entry.taxable === 0)).toHaveLength(12);
  });

  it('puts a monthly allowance on the first paycheck of the month by default', () => {
    const schedule = allowanceSchedule([allowance({ amount: 50, unit: 'MONTH' })], periods);
    expect(schedule[1].taxable).toBe(50);
    expect(schedule[2].taxable).toBe(0);
  });

  it('can put it on the last paycheck of the month instead', () => {
    const schedule = allowanceSchedule(
      [allowance({ amount: 50, unit: 'MONTH', payOn: 'LAST' })],
      periods
    );
    expect(schedule[1].taxable).toBe(0);
    expect(schedule[2].taxable).toBe(50);
  });

  it('multiplies the count into a single monthly payment', () => {
    const schedule = allowanceSchedule(
      [allowance({ amount: 15, unit: 'MONTH', timesPer: 10 })],
      periods
    );
    expect(schedule[1].taxable).toBe(150);
  });

  it('pays an annual allowance once in the year', () => {
    const schedule = allowanceSchedule([allowance({ amount: 600, unit: 'YEAR' })], periods);
    const paid = Object.values(schedule).filter((entry) => entry.taxable > 0);
    expect(paid).toHaveLength(1);
    expect(paid[0].taxable).toBe(600);
  });

  it('never puts an allowance on an off-cycle payment', () => {
    const withOffCycle = [
      ...periods,
      { periodIndex: 1000, payDate: '2026-03-31', isOffCycle: true },
    ];
    const schedule = allowanceSchedule([allowance({ amount: 50 })], withOffCycle);
    expect(schedule[1000]).toBeUndefined();
  });

  it('keeps taxable and tax-free apart', () => {
    const schedule = allowanceSchedule(
      [
        allowance({ id: 'a', amount: 50, treatment: 'TAXABLE' }),
        allowance({ id: 'b', amount: 20, treatment: 'TAX_FREE' }),
      ],
      periods
    );
    expect(schedule[1]).toMatchObject({ taxable: 50, taxFree: 20 });
    expect(schedule[1].byAllowance).toEqual({ a: 50, b: 20 });
  });

  it('sums an annual total equal to the yearly value', () => {
    const monthly = allowance({ amount: 50, unit: 'MONTH' });
    const schedule = allowanceSchedule([monthly], periods);
    const total = Object.values(schedule).reduce((sum, entry) => sum + entry.taxable, 0);
    expect(total).toBe(annualAmount(monthly, 24));
  });
});

describe('the schedule through the ledger', () => {
  const periods = buildPayPeriods(2026, 24, { firstPayDate: '2026-01-15' });
  const ledgerBase = {
    filingStatus: 'SINGLE' as const,
    periodsPerYear: 24,
    periods,
    annualSalary: 120000,
    incomeEvents: [],
    employer: NO_EMPLOYER_CONTRIBUTIONS,
    w4: EMPTY_W4,
    federal: FEDERAL_2026,
    state: flatStateTable('WA', 0, 2026),
    limits: LIMITS_2026,
    elections: NO_ELECTIONS,
  };

  it('pays a monthly allowance on one paycheck, not every one', () => {
    const monthly = allowance({ amount: 50, unit: 'MONTH' });
    const { rows } = buildLedger({
      ...ledgerBase,
      allowanceByPeriod: allowanceSchedule([monthly], periods),
    });

    expect(rows[0].taxableAllowance).toBe(50);
    expect(rows[1].taxableAllowance).toBe(0);
    expect(rows.filter((row) => row.taxableAllowance > 0)).toHaveLength(12);
  });

  it('gives the same annual total as the old averaging did', () => {
    const monthly = allowance({ amount: 50, unit: 'MONTH' });
    const { totals } = buildLedger({
      ...ledgerBase,
      allowanceByPeriod: allowanceSchedule([monthly], periods),
    });
    expect(totals.taxableAllowance).toBeCloseTo(600, 6);
  });

  it('taxes the paycheck that carries it, and only that one', () => {
    const monthly = allowance({ amount: 500, unit: 'MONTH' });
    const { rows } = buildLedger({
      ...ledgerBase,
      allowanceByPeriod: allowanceSchedule([monthly], periods),
    });
    expect(rows[0].gross).toBeGreaterThan(rows[1].gross);
    expect(rows[0].taxTotal).toBeGreaterThan(rows[1].taxTotal);
  });
});
