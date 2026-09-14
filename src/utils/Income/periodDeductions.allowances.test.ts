import { describe, expect, it } from 'vitest';
import {
  applyOverrideToPeriods,
  buildPeriodOverrides,
  findOverride,
  upsertOverride,
  type PeriodDefaults,
} from './periodDeductions';
import { buildLedger, NO_ELECTIONS } from './tax/ledger';
import { FEDERAL_2026, LIMITS_2026 } from './tax/data/federal-2026';
import { flatStateTable } from './tax/data/states/flat';
import { EMPTY_W4 } from './tax/withholding';
import { buildPayPeriods } from './paySchedule';
import { allowanceSchedule, type Allowance } from './allowances';

const defaults: PeriodDefaults = {
  medical: 120,
  dental: 20,
  vision: 6,
  dependent: 0,
  pretax401kPercent: 6,
  roth401kPercent: 0,
  regularGross: 5000,
};

describe('per-paycheck allowance overrides', () => {
  const allowances: Allowance[] = [
    {
      id: 'wfh',
      label: 'WFH',
      amount: 100,
      treatment: 'TAXABLE' as const,
      timesPer: 1,
      unit: 'PAYCHECK' as const,
      payOn: 'FIRST' as const,
    },
    {
      id: 'meal',
      label: 'Meals',
      amount: 60,
      treatment: 'TAX_FREE' as const,
      timesPer: 1,
      unit: 'MONTH' as const,
      payOn: 'FIRST' as const,
    },
  ];
  const standing = {
    postTaxPerPeriod: 0,
    pretaxIncomeOnlyPerPeriod: 0,
    allowances,
    allowanceSchedule: allowanceSchedule(
      allowances,
      buildPayPeriods(2026, 24, { firstPayDate: '2026-01-15' })
    ),
  };

  it('routes each allowance into its own bucket', () => {
    const built = buildPeriodOverrides([{ periodIndex: 3 }], defaults, [], standing);
    expect(built[3].taxableAllowancePerPeriod).toBeCloseTo(100, 6);
    // The monthly one lands on the first paycheck of the month, which period 3 is.
    expect(built[3].taxFreeAllowancePerPeriod).toBeCloseTo(60, 6);
  });

  it('pays nothing extra on the second paycheck of a month', () => {
    const built = buildPeriodOverrides([{ periodIndex: 4 }], defaults, [], standing);
    expect(built[4].taxFreeAllowancePerPeriod).toBe(0);
  });

  it('lets an override replace one allowance for that paycheck', () => {
    const overrides = upsertOverride([], defaults, [], 3, { allowanceAmounts: { wfh: 250 } });
    const built = buildPeriodOverrides(overrides, defaults, [], standing);
    expect(built[3].taxableAllowancePerPeriod).toBeCloseTo(250, 6);
    expect(built[3].taxFreeAllowancePerPeriod).toBeCloseTo(60, 6);
  });

  it('treats zero as not paid on that paycheck', () => {
    const overrides = upsertOverride([], defaults, [], 3, { allowanceAmounts: { wfh: 0 } });
    const built = buildPeriodOverrides(overrides, defaults, [], standing);
    expect(built[3].taxableAllowancePerPeriod).toBe(0);
  });

  it('keeps an allowance override even when it equals the standing figure', () => {
    // The standing figure is derived from a frequency, so pinning it still carries meaning.
    const overrides = upsertOverride([], defaults, [], 3, { allowanceAmounts: { wfh: 100 } });
    expect(overrides).toHaveLength(1);
  });

  it('merges an allowance override with a deduction override', () => {
    let overrides = upsertOverride([], defaults, [], 3, { medical: 300 });
    overrides = upsertOverride(overrides, defaults, [], 3, { allowanceAmounts: { wfh: 0 } });
    expect(findOverride(overrides, 3)).toEqual({
      periodIndex: 3,
      medical: 300,
      allowanceAmounts: { wfh: 0 },
    });
  });

  it('applies an allowance override across a batch', () => {
    const overrides = applyOverrideToPeriods([], defaults, [], [1, 2], {
      allowanceAmounts: { meal: 0 },
    });
    expect(overrides).toHaveLength(2);
    const built = buildPeriodOverrides(overrides, defaults, [], standing);
    expect(built[1].taxFreeAllowancePerPeriod).toBe(0);
    expect(built[2].taxFreeAllowancePerPeriod).toBe(0);
  });
});

describe('per-paycheck employer match overrides', () => {
  const employer = {
    match401kPercent: 50,
    match401kLimitPercent: 6,
    hsaAnnual: 0,
    matchTiers: [{ id: 'a', matchPercent: 50, uptoPercent: 6 }],
  };
  const periods = buildPayPeriods(2026, 24, { firstPayDate: '2026-01-15' });
  const base = {
    filingStatus: 'SINGLE' as const,
    periodsPerYear: 24,
    periods,
    annualSalary: 120000,
    incomeEvents: [],
    employer,
    w4: EMPTY_W4,
    federal: FEDERAL_2026,
    state: flatStateTable('WA', 0, 2026),
    limits: LIMITS_2026,
    elections: { ...NO_ELECTIONS, pretax401kPercent: 6 },
  };
  const standing = {
    postTaxPerPeriod: 0,
    pretaxIncomeOnlyPerPeriod: 0,
    allowances: [],
    allowanceSchedule: {},
  };

  it('replaces the formula amount on the chosen paycheck only', () => {
    const overrides = upsertOverride([], defaults, [], 5, { employerMatch: 400 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], standing),
    });
    expect(rows.find((row) => row.periodIndex === 5)!.employerMatch401k).toBe(400);
    expect(rows.find((row) => row.periodIndex === 4)!.employerMatch401k).toBeCloseTo(
      5000 * 0.03,
      6
    );
  });

  it('supports a paycheck with no match at all', () => {
    const overrides = upsertOverride([], defaults, [], 5, { employerMatch: 0 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], standing),
    });
    expect(rows.find((row) => row.periodIndex === 5)!.employerMatch401k).toBe(0);
  });

  it('flags the adjusted paycheck', () => {
    const overrides = upsertOverride([], defaults, [], 5, { employerMatch: 400 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], standing),
    });
    expect(rows.find((row) => row.periodIndex === 5)!.notes).toContain('Match adjusted');
  });

  it('carries the override into the annual total', () => {
    const overrides = upsertOverride([], defaults, [], 5, { employerMatch: 400 });
    const { totals } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], standing),
    });
    // Twenty-three periods at $150 plus one at $400.
    expect(totals.employerMatch401k).toBeCloseTo(23 * 150 + 400, 6);
  });

  it('keeps the override even when it equals the formula amount', () => {
    // The formula figure is derived per paycheck, so pinning it still carries meaning.
    expect(upsertOverride([], defaults, [], 5, { employerMatch: 150 })).toHaveLength(1);
  });

  it('merges with a deduction override on the same paycheck', () => {
    let overrides = upsertOverride([], defaults, [], 5, { medical: 300 });
    overrides = upsertOverride(overrides, defaults, [], 5, { employerMatch: 400 });
    expect(findOverride(overrides, 5)).toEqual({
      periodIndex: 5,
      medical: 300,
      employerMatch: 400,
    });
  });

  it('applies across a batch', () => {
    const overrides = applyOverrideToPeriods([], defaults, [], [1, 2], { employerMatch: 0 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], standing),
    });
    expect(rows[0].employerMatch401k).toBe(0);
    expect(rows[1].employerMatch401k).toBe(0);
  });
});

describe('the match label follows the amount', () => {
  const employer = {
    match401kPercent: 50,
    match401kLimitPercent: 6,
    hsaAnnual: 0,
    matchTiers: [{ id: 'a', matchPercent: 50, uptoPercent: 6 }],
  };
  const periods = buildPayPeriods(2026, 24, { firstPayDate: '2026-01-15' });
  const base = {
    filingStatus: 'SINGLE' as const,
    periodsPerYear: 24,
    periods,
    annualSalary: 120000,
    incomeEvents: [],
    employer,
    w4: EMPTY_W4,
    federal: FEDERAL_2026,
    state: flatStateTable('WA', 0, 2026),
    limits: LIMITS_2026,
    elections: { ...NO_ELECTIONS, pretax401kPercent: 6 },
  };
  const standing = {
    postTaxPerPeriod: 0,
    pretaxIncomeOnlyPerPeriod: 0,
    allowances: [],
    allowanceSchedule: {},
  };

  it('marks a paycheck whose match was recorded rather than derived', () => {
    const overrides = upsertOverride([], defaults, [], 5, { employerMatch: 98 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], standing),
    });
    expect(rows.find((row) => row.periodIndex === 5)!.isMatchAdjusted).toBe(true);
    expect(rows.find((row) => row.periodIndex === 4)!.isMatchAdjusted).toBe(false);
  });

  it('keeps the recorded amount, so the label and the figure agree', () => {
    const overrides = upsertOverride([], defaults, [], 5, { employerMatch: 98 });
    const { rows } = buildLedger({
      ...base,
      periodOverrides: buildPeriodOverrides(overrides, defaults, [], standing),
    });
    const row = rows.find((candidate) => candidate.periodIndex === 5)!;
    expect(row.employerMatch401k).toBe(98);
    // The formula would have paid 3% of pay; the recorded figure does not match it.
    expect(row.employerMatch401k).not.toBeCloseTo(row.gross * 0.03, 2);
  });

  it('leaves an unadjusted paycheck describable by the formula', () => {
    const { rows } = buildLedger({ ...base });
    const row = rows[0];
    expect(row.isMatchAdjusted).toBe(false);
    expect(row.employerMatch401k).toBeCloseTo(row.gross * 0.03, 6);
  });
});
