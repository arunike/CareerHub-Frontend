import { describe, expect, it } from 'vitest';
import {
  applyOverrideToPeriods,
  buildPeriodOverrides,
  clearOverridesFor,
  findOverride,
  isRedundant,
  removeOverride,
  resolveDeductionLines,
  resolvePeriodValues,
  totalOf,
  upsertOverride,
  type PeriodDefaults,
  type PeriodDeductionOverride,
} from './periodDeductions';
import { buildLedger, NO_ELECTIONS, NO_EMPLOYER_CONTRIBUTIONS } from './tax/ledger';
import { FEDERAL_2026, LIMITS_2026 } from './tax/data/federal-2026';
import { flatStateTable } from './tax/data/states/flat';
import { EMPTY_W4 } from './tax/withholding';
import { buildPayPeriods } from './paySchedule';
import { allowanceSchedule, type Allowance } from './allowances';
import {
  clearFieldFromOverrides,
  periodsOverriding,
  resolveCustomDeductions,
  uniformValue,
} from './periodDeductions';

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

describe('resolveDeductionLines', () => {
  it('falls back to the standing amount for lines the override omits', () => {
    const lines = resolveDeductionLines(defaults, { periodIndex: 3, medical: 200 });
    expect(lines).toEqual({ medical: 200, dental: 20, vision: 6, dependent: 0 });
  });

  it('returns the defaults when there is no override', () => {
    expect(resolvePeriodValues(defaults)).toEqual(defaults);
  });

  it('keeps an explicit zero rather than treating it as unset', () => {
    expect(resolveDeductionLines(defaults, { periodIndex: 3, medical: 0 }).medical).toBe(0);
  });
});

describe('upsertOverride', () => {
  it('adds an override for a period that has none', () => {
    const result = upsertOverride([], defaults, custom, 4, { medical: 200 });
    expect(result).toEqual([{ periodIndex: 4, medical: 200 }]);
  });

  it('merges into an existing override for the same period', () => {
    const start = upsertOverride([], defaults, custom, 4, { medical: 200 });
    const result = upsertOverride(start, defaults, custom, 4, { dental: 30 });
    expect(result).toEqual([{ periodIndex: 4, medical: 200, dental: 30 }]);
  });

  it('drops an override that just restates the standing amounts', () => {
    const start = upsertOverride([], defaults, custom, 4, { medical: 200 });
    const result = upsertOverride(start, defaults, custom, 4, { medical: 120 });
    expect(result).toEqual([]);
  });

  it('keeps overrides ordered by period', () => {
    let result: PeriodDeductionOverride[] = [];
    result = upsertOverride(result, defaults, custom, 9, { medical: 200 });
    result = upsertOverride(result, defaults, custom, 2, { medical: 150 });
    expect(result.map((override) => override.periodIndex)).toEqual([2, 9]);
  });

  it('leaves other periods untouched', () => {
    let result = upsertOverride([], defaults, custom, 2, { medical: 150 });
    result = upsertOverride(result, defaults, custom, 9, { medical: 200 });
    expect(findOverride(result, 2)?.medical).toBe(150);
  });
});

describe('removeOverride and isRedundant', () => {
  it('removes only the requested period', () => {
    const start = upsertOverride(
      upsertOverride([], defaults, custom, 2, { medical: 1 }),
      defaults,
      custom,
      5,
      { medical: 2 }
    );
    expect(removeOverride(start, 2).map((o) => o.periodIndex)).toEqual([5]);
  });

  it('treats an all-matching override as redundant', () => {
    expect(isRedundant(defaults, custom, { periodIndex: 1, medical: 120, dental: 20 })).toBe(true);
    expect(isRedundant(defaults, custom, { periodIndex: 1, medical: 121 })).toBe(false);
  });
});

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

describe('applyOverrideToPeriods', () => {
  it('applies one change across every chosen paycheck', () => {
    const result = applyOverrideToPeriods([], defaults, custom, [3, 4, 5], { medical: 200 });
    expect(result.map((override) => override.periodIndex)).toEqual([3, 4, 5]);
    expect(result.every((override) => override.medical === 200)).toBe(true);
  });

  it('merges into overrides that already exist', () => {
    const start = upsertOverride([], defaults, custom, 4, { medical: 200 });
    const result = applyOverrideToPeriods(start, defaults, custom, [4, 5], {
      pretax401kPercent: 20,
    });
    expect(findOverride(result, 4)).toEqual({
      periodIndex: 4,
      medical: 200,
      pretax401kPercent: 20,
    });
    expect(findOverride(result, 5)).toEqual({ periodIndex: 5, pretax401kPercent: 20 });
  });

  it('leaves paychecks outside the selection alone', () => {
    const result = applyOverrideToPeriods([], defaults, custom, [3], { medical: 200 });
    expect(findOverride(result, 4)).toBeUndefined();
  });

  it('drops entries where the batch value matches the standing amount', () => {
    const result = applyOverrideToPeriods([], defaults, custom, [3, 4], {
      medical: defaults.medical,
    });
    expect(result).toEqual([]);
  });

  it('applies several fields at once', () => {
    const result = applyOverrideToPeriods([], defaults, custom, [2], {
      medical: 300,
      pretax401kPercent: 15,
    });
    expect(findOverride(result, 2)).toEqual({
      periodIndex: 2,
      medical: 300,
      pretax401kPercent: 15,
    });
  });

  it('is stable when given an empty selection', () => {
    const start = upsertOverride([], defaults, custom, 4, { medical: 200 });
    expect(applyOverrideToPeriods(start, defaults, custom, [], { medical: 999 })).toEqual(start);
  });
});

describe('clearOverridesFor', () => {
  it('removes overrides for the chosen paychecks only', () => {
    const start = applyOverrideToPeriods([], defaults, custom, [1, 2, 3], { medical: 200 });
    const result = clearOverridesFor(start, [1, 3]);
    expect(result.map((override) => override.periodIndex)).toEqual([2]);
  });

  it('is a no-op for paychecks with no override', () => {
    const start = applyOverrideToPeriods([], defaults, custom, [1], { medical: 200 });
    expect(clearOverridesFor(start, [9])).toEqual(start);
  });
});

describe('custom deduction overrides', () => {
  it('overrides one custom line and leaves the others standing', () => {
    const result = upsertOverride([], defaults, custom, 4, { customAmounts: { life: 60 } });
    const resolved = resolveCustomDeductions(custom, findOverride(result, 4));
    expect(resolved.find((entry) => entry.id === 'life')!.amount).toBe(60);
    expect(resolved.find((entry) => entry.id === 'espp')!.amount).toBe(100);
  });

  it('merges a second custom override into the same paycheck', () => {
    let result = upsertOverride([], defaults, custom, 4, { customAmounts: { life: 60 } });
    result = upsertOverride(result, defaults, custom, 4, { customAmounts: { espp: 250 } });
    expect(findOverride(result, 4)!.customAmounts).toEqual({ life: 60, espp: 250 });
  });

  it('keeps a scalar override when a custom override is added', () => {
    let result = upsertOverride([], defaults, custom, 4, { medical: 300 });
    result = upsertOverride(result, defaults, custom, 4, { customAmounts: { life: 60 } });
    expect(findOverride(result, 4)).toEqual({
      periodIndex: 4,
      medical: 300,
      customAmounts: { life: 60 },
    });
  });

  it('drops a custom override that matches the standing amount', () => {
    expect(upsertOverride([], defaults, custom, 4, { customAmounts: { life: 25 } })).toEqual([]);
  });

  it('treats an amount for a deleted custom line as redundant', () => {
    expect(upsertOverride([], defaults, custom, 4, { customAmounts: { gone: 99 } })).toEqual([]);
  });

  it('routes an overridden custom line into its own tax bucket', () => {
    const overrides = upsertOverride([], defaults, custom, 3, { customAmounts: { espp: 400 } });
    const built = buildPeriodOverrides(overrides, defaults, custom, {
      postTaxPerPeriod: 10,
      pretaxIncomeOnlyPerPeriod: 0,
      allowances: [],
      allowanceSchedule: {},
    });
    // espp is post-tax, so it lands there rather than in Section 125.
    expect(built[3].postTaxPerPeriod).toBe(410);
    expect(built[3].section125PerPeriod).toBe(totalOf(defaults) + 25);
  });

  it('applies a custom override across a batch', () => {
    const result = applyOverrideToPeriods([], defaults, custom, [1, 2], {
      customAmounts: { life: 75 },
    });
    expect(result).toHaveLength(2);
    expect(result.every((override) => override.customAmounts?.life === 75)).toBe(true);
  });
});

describe('uniformValue', () => {
  it('returns the shared value', () => {
    expect(uniformValue([5, 5, 5])).toBe(5);
  });

  it('returns null when the values disagree', () => {
    expect(uniformValue([5, 6])).toBeNull();
  });

  it('returns null for an empty selection', () => {
    expect(uniformValue([])).toBeNull();
  });
});

describe('periodsOverriding', () => {
  it('finds the paychecks pinning a scalar field', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [2, 5], { medical: 300 });
    expect(periodsOverriding(overrides, 'medical')).toEqual([2, 5]);
  });

  it('ignores paychecks that pin a different field', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [2], { dental: 40 });
    expect(periodsOverriding(overrides, 'medical')).toEqual([]);
  });

  it('finds the paychecks pinning a custom deduction', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [3], {
      customAmounts: { life: 60 },
    });
    expect(periodsOverriding(overrides, 'life')).toEqual([3]);
  });

  it('treats an explicit zero as an override', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [4], { medical: 0 });
    expect(periodsOverriding(overrides, 'medical')).toEqual([4]);
  });
});

describe('clearFieldFromOverrides', () => {
  it('removes one field and keeps the rest of the override', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [2], {
      medical: 300,
      dental: 40,
    });
    const result = clearFieldFromOverrides(overrides, 'medical');
    expect(findOverride(result, 2)).toEqual({ periodIndex: 2, dental: 40 });
  });

  it('drops an override that held only that field', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [2, 3], { medical: 300 });
    expect(clearFieldFromOverrides(overrides, 'medical')).toEqual([]);
  });

  it('removes a custom amount without touching the others', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [2], {
      customAmounts: { life: 60, espp: 250 },
    });
    const result = clearFieldFromOverrides(overrides, 'life');
    expect(findOverride(result, 2)!.customAmounts).toEqual({ espp: 250 });
  });

  it('drops an override whose last custom amount was removed', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [2], {
      customAmounts: { life: 60 },
    });
    expect(clearFieldFromOverrides(overrides, 'life')).toEqual([]);
  });

  it('leaves overrides alone when the field is not pinned anywhere', () => {
    const overrides = applyOverrideToPeriods([], defaults, custom, [2], { medical: 300 });
    expect(clearFieldFromOverrides(overrides, 'vision')).toEqual(overrides);
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
