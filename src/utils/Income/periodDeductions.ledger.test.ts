import { describe, expect, it } from 'vitest';
import {
  buildPeriodOverrides,
  totalOf,
  upsertOverride,
  type PeriodDefaults,
} from './periodDeductions';
import { buildLedger, NO_ELECTIONS, NO_EMPLOYER_CONTRIBUTIONS } from './tax/ledger';
import { FEDERAL_2026, LIMITS_2026 } from './tax/data/federal-2026';
import { flatStateTable } from './tax/data/states/flat';
import { EMPTY_W4 } from './tax/withholding';
import { buildPayPeriods } from './paySchedule';

const custom = [
  { id: 'life', label: 'Life insurance', amount: 25, treatment: 'SECTION_125' as const },
  { id: 'espp', label: 'Stock purchase', amount: 100, treatment: 'POST_TAX' as const },
];

const defaults: PeriodDefaults = {
  medical: 120,
  dental: 20,
  vision: 6,
  dependent: 0,
  pretax401kPercent: 6,
  roth401kPercent: 0,
  regularGross: 5000,
};

describe('buildPeriodOverrides through the ledger', () => {
  const periods = buildPayPeriods(2026, 24, { firstPayDate: '2026-01-15' });
  const base = {
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
    elections: {
      ...NO_ELECTIONS,
      section125PerPeriod: totalOf(defaults),
      pretax401kPercent: defaults.pretax401kPercent,
    },
  };

  it('applies the override to only the chosen paycheck', () => {
    const overrides = upsertOverride([], defaults, custom, 7, { medical: 320 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], {
        postTaxPerPeriod: 0,
        pretaxIncomeOnlyPerPeriod: 0,
        allowances: [],
        allowanceSchedule: {},
      }),
    });

    const adjusted = rows.find((row) => row.periodIndex === 7)!;
    const normal = rows.find((row) => row.periodIndex === 6)!;

    expect(adjusted.section125).toBeCloseTo(320 + 20 + 6, 6);
    expect(normal.section125).toBeCloseTo(totalOf(defaults), 6);
    expect(adjusted.isAdjusted).toBe(true);
    expect(normal.isAdjusted).toBe(false);
  });

  it('lowers take-home and FICA wages for the adjusted paycheck', () => {
    const overrides = upsertOverride([], defaults, custom, 7, { medical: 320 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], {
        postTaxPerPeriod: 0,
        pretaxIncomeOnlyPerPeriod: 0,
        allowances: [],
        allowanceSchedule: {},
      }),
    });

    const adjusted = rows.find((row) => row.periodIndex === 7)!;
    const normal = rows.find((row) => row.periodIndex === 6)!;
    expect(adjusted.ficaWages).toBeLessThan(normal.ficaWages);
    expect(adjusted.net).toBeLessThan(normal.net);
  });

  it('adds custom Section 125 deductions on top of an overridden paycheck', () => {
    const overrides = upsertOverride([], defaults, custom, 7, { medical: 320 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(
        overrides,
        defaults,
        [{ id: 'x', label: 'Commuter', amount: 45, treatment: 'SECTION_125' }],
        { postTaxPerPeriod: 0, pretaxIncomeOnlyPerPeriod: 0, allowances: [], allowanceSchedule: {} }
      ),
    });
    expect(rows.find((row) => row.periodIndex === 7)!.section125).toBeCloseTo(320 + 20 + 6 + 45, 6);
  });
});

describe('per-paycheck 401(k) rate overrides', () => {
  const periods = buildPayPeriods(2026, 24, { firstPayDate: '2026-01-15' });
  const base = {
    filingStatus: 'SINGLE' as const,
    periodsPerYear: 24,
    periods,
    annualSalary: 120000,
    incomeEvents: [],
    employer: { match401kPercent: 50, match401kLimitPercent: 6, hsaAnnual: 0 },
    w4: EMPTY_W4,
    federal: FEDERAL_2026,
    state: flatStateTable('WA', 0, 2026),
    limits: LIMITS_2026,
    elections: { ...NO_ELECTIONS, pretax401kPercent: 6 },
  };

  it('defers a different rate on the chosen paycheck only', () => {
    const overrides = upsertOverride([], defaults, custom, 5, { pretax401kPercent: 40 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], {
        postTaxPerPeriod: 0,
        pretaxIncomeOnlyPerPeriod: 0,
        allowances: [],
        allowanceSchedule: {},
      }),
    });
    const adjusted = rows.find((row) => row.periodIndex === 5)!;
    const normal = rows.find((row) => row.periodIndex === 4)!;

    expect(adjusted.pretax401k).toBeCloseTo(normal.gross * 0.4, 6);
    expect(normal.pretax401k).toBeCloseTo(normal.gross * 0.06, 6);
  });

  it('lets a paycheck skip contributions entirely', () => {
    const overrides = upsertOverride([], defaults, custom, 5, { pretax401kPercent: 0 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], {
        postTaxPerPeriod: 0,
        pretaxIncomeOnlyPerPeriod: 0,
        allowances: [],
        allowanceSchedule: {},
      }),
    });
    const adjusted = rows.find((row) => row.periodIndex === 5)!;
    expect(adjusted.pretax401k).toBe(0);
    expect(adjusted.net).toBeGreaterThan(rows.find((row) => row.periodIndex === 4)!.net);
  });

  it('earns no employer match on a paycheck that defers nothing', () => {
    const overrides = upsertOverride([], defaults, custom, 5, { pretax401kPercent: 0 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], {
        postTaxPerPeriod: 0,
        pretaxIncomeOnlyPerPeriod: 0,
        allowances: [],
        allowanceSchedule: {},
      }),
    });
    expect(rows.find((row) => row.periodIndex === 5)!.employerMatch401k).toBe(0);
    expect(rows.find((row) => row.periodIndex === 4)!.employerMatch401k).toBeGreaterThan(0);
  });

  it('still respects the annual deferral limit', () => {
    const overrides = upsertOverride([], defaults, custom, 5, { pretax401kPercent: 90 });
    const { totals } = buildLedger({
      ...base,
      annualSalary: 600000,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], {
        postTaxPerPeriod: 0,
        pretaxIncomeOnlyPerPeriod: 0,
        allowances: [],
        allowanceSchedule: {},
      }),
    });
    expect(totals.pretax401k).toBeLessThanOrEqual(24500);
  });

  it('drops a rate override that matches the standing rate', () => {
    expect(upsertOverride([], defaults, custom, 5, { pretax401kPercent: 6 })).toEqual([]);
  });
});

describe('gross pay overrides', () => {
  const periods = buildPayPeriods(2026, 24, { firstPayDate: '2026-01-15' });
  const base = {
    filingStatus: 'SINGLE' as const,
    periodsPerYear: 24,
    periods,
    annualSalary: 120000,
    incomeEvents: [],
    employer: { match401kPercent: 50, match401kLimitPercent: 6, hsaAnnual: 0 },
    w4: EMPTY_W4,
    federal: FEDERAL_2026,
    state: flatStateTable('WA', 0, 2026),
    limits: LIMITS_2026,
    elections: { ...NO_ELECTIONS, pretax401kPercent: 6 },
  };

  it('pays a different gross on the chosen paycheck only', () => {
    const overrides = upsertOverride([], defaults, custom, 6, { regularGross: 2500 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], {
        postTaxPerPeriod: 0,
        pretaxIncomeOnlyPerPeriod: 0,
        allowances: [],
        allowanceSchedule: {},
      }),
    });
    expect(rows.find((row) => row.periodIndex === 6)!.gross).toBeCloseTo(2500, 6);
    expect(rows.find((row) => row.periodIndex === 5)!.gross).toBeCloseTo(5000, 6);
  });

  it('lowers tax and take-home on the reduced paycheck', () => {
    const overrides = upsertOverride([], defaults, custom, 6, { regularGross: 2500 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], {
        postTaxPerPeriod: 0,
        pretaxIncomeOnlyPerPeriod: 0,
        allowances: [],
        allowanceSchedule: {},
      }),
    });
    const reduced = rows.find((row) => row.periodIndex === 6)!;
    const normal = rows.find((row) => row.periodIndex === 5)!;
    expect(reduced.taxTotal).toBeLessThan(normal.taxTotal);
    expect(reduced.net).toBeLessThan(normal.net);
    expect(reduced.ficaWages).toBeLessThan(normal.ficaWages);
  });

  it('scales the contribution and the match with the smaller gross', () => {
    const overrides = upsertOverride([], defaults, custom, 6, { regularGross: 2500 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], {
        postTaxPerPeriod: 0,
        pretaxIncomeOnlyPerPeriod: 0,
        allowances: [],
        allowanceSchedule: {},
      }),
    });
    const reduced = rows.find((row) => row.periodIndex === 6)!;
    expect(reduced.pretax401k).toBeCloseTo(2500 * 0.06, 6);
    expect(reduced.employerMatch401k).toBeCloseTo(2500 * 0.06 * 0.5, 6);
  });

  it('lowers the annual gross by the difference', () => {
    const overrides = upsertOverride([], defaults, custom, 6, { regularGross: 2500 });
    const { totals } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], {
        postTaxPerPeriod: 0,
        pretaxIncomeOnlyPerPeriod: 0,
        allowances: [],
        allowanceSchedule: {},
      }),
    });
    expect(totals.gross).toBeCloseTo(120000 - 2500, 6);
  });

  it('supports an unpaid paycheck', () => {
    const overrides = upsertOverride([], defaults, custom, 6, { regularGross: 0 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], {
        postTaxPerPeriod: 0,
        pretaxIncomeOnlyPerPeriod: 0,
        allowances: [],
        allowanceSchedule: {},
      }),
    });
    const unpaid = rows.find((row) => row.periodIndex === 6)!;
    expect(unpaid.gross).toBe(0);
    expect(unpaid.employerMatch401k).toBe(0);
  });

  it('drops a gross override that matches the standing amount', () => {
    expect(upsertOverride([], defaults, custom, 6, { regularGross: 5000 })).toEqual([]);
  });
});
