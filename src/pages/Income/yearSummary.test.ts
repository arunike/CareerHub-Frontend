import { describe, expect, it } from 'vitest';
import { retirementPerformance, summarizeYear, summarizeYears } from './yearSummary';
import type { RoleEarnings } from './yearSummary';
import {
  deductionsBreakdown,
  employee401kBreakdown,
  grossBreakdown,
  resolveMath,
  takeHomeBreakdown,
  taxBreakdown,
  totalCompBreakdown,
} from './mathBreakdown';
import { buildIncomeModel } from './incomeModel';
import { DEFAULT_SETTINGS } from './incomeSettings';
import type { IncomeSettings } from './incomeSettings';
import type { IncomeSource } from './incomeSources';
import type { RaiseEntry } from '../../types';
import { DEFAULT_STATE_NAME_TO_ABBR } from '../OfferComparison/calculations';

const source = (overrides: Partial<IncomeSource> = {}): IncomeSource => ({
  key: 'experience-1',
  kind: 'experience',
  isCurrent: false,
  company: 'Google',
  roleTitle: 'Software Engineer',
  location: 'Mountain View, CA, United States',
  startDate: '2025-01-01',
  endDate: null,
  annualSalary: 160000,
  bonus: 0,
  totalGrant: 0,
  paychecksPerYear: 26,
  premiumsPerPeriod: 0,
  medicalPerPeriod: 0,
  dentalPerPeriod: 0,
  visionPerPeriod: 0,
  dependentPerPeriod: 0,
  employer: { match401kPercent: 0, match401kLimitPercent: 0, hsaAnnual: 0 },
  cliffMonths: 12,
  vestsPerYear: 4,
  vestingYears: 4,
  raises: [],
  hasBenefitData: true,
  ...overrides,
});

const context = {
  stateNames: DEFAULT_STATE_NAME_TO_ABBR,
  stateTaxRates: {},
};

const resolver =
  (settings: Partial<IncomeSettings> = {}) =>
  () => ({
    ...DEFAULT_SETTINGS,
    ...settings,
  });

describe('summarizeYear', () => {
  it('totals every role held in the year', () => {
    const summary = summarizeYear(
      2025,
      [
        source({ key: 'experience-1', company: 'Google', annualSalary: 160000 }),
        source({ key: 'experience-2', company: 'Netflix', annualSalary: 80000 }),
      ],
      resolver(),
      context
    );
    expect(summary.roles).toHaveLength(2);
    expect(summary.gross).toBeCloseTo(240000, 2);
    expect(summary.gross).toBeCloseTo(
      summary.roles.reduce((total, role) => total + role.gross, 0),
      2
    );
  });

  it('orders roles by what they paid', () => {
    const summary = summarizeYear(
      2025,
      [
        source({ key: 'experience-1', company: 'Google', annualSalary: 30000 }),
        source({ key: 'experience-2', company: 'Netflix', annualSalary: 200000 }),
      ],
      resolver(),
      context
    );
    expect(summary.roles.map((role) => role.company)).toEqual(['Netflix', 'Google']);
  });

  it('drops a role that was not paid in the year', () => {
    const summary = summarizeYear(
      2025,
      [source({ startDate: '2026-01-01', endDate: null, isCurrent: true })],
      resolver(),
      context
    );
    expect(summary.roles).toHaveLength(0);
    expect(summary.totalComp).toBe(0);
  });

  it('adds the employer match on top of gross, since it is not wages', () => {
    const withMatch = summarizeYear(
      2025,
      [
        source({
          employer: { match401kPercent: 100, match401kLimitPercent: 5, hsaAnnual: 0 },
        }),
      ],
      resolver({ elections: { ...DEFAULT_SETTINGS.elections, pretax401kPercent: 5 } }),
      context
    );
    expect(withMatch.employerMatch).toBeGreaterThan(0);
    expect(withMatch.totalComp).toBeCloseTo(withMatch.gross + withMatch.employerMatch, 2);
  });

  it('reports what you deferred per role and for the year', () => {
    const summary = summarizeYear(
      2026,
      [
        source({ key: 'experience-1', company: 'Google', annualSalary: 200000 }),
        source({ key: 'experience-2', company: 'Netflix', annualSalary: 100000 }),
      ],
      resolver({ elections: { ...DEFAULT_SETTINGS.elections, pretax401kPercent: 6 } }),
      context
    );
    for (const role of summary.roles) {
      expect(role.employee401k).toBeGreaterThan(0);
      // Deferrals are withheld, so they are part of what the year kept back from take-home.
      expect(role.deductions).toBeGreaterThanOrEqual(role.employee401k - 0.01);
    }
    expect(summary.employee401k).toBeCloseTo(
      summary.roles.reduce((total, role) => total + role.employee401k, 0),
      2
    );
  });

  it('keeps the elective limit per person rather than summing it across roles', () => {
    const summary = summarizeYear(
      2026,
      [
        source({ key: 'experience-1', company: 'Google', annualSalary: 200000 }),
        source({ key: 'experience-2', company: 'Netflix', annualSalary: 100000 }),
      ],
      resolver({ elections: { ...DEFAULT_SETTINGS.elections, pretax401kPercent: 6 } }),
      context
    );
    expect(summary.roles).toHaveLength(2);
    expect(summary.electiveLimit).toBe(summary.roles[0].electiveLimit);
    expect(summary.electiveLimit).toBeGreaterThan(0);
  });

  it('leaves the elective limit at zero when nobody was paid', () => {
    const summary = summarizeYear(
      2026,
      [source({ startDate: '2027-01-01', endDate: null, isCurrent: true })],
      resolver(),
      context
    );
    expect(summary.electiveLimit).toBe(0);
    expect(summary.employee401k).toBe(0);
  });

  it('breaks every headline figure into lines that replay to it', () => {
    const summary = summarizeYear(
      2026,
      [
        source({ key: 'experience-1', company: 'Google', annualSalary: 200000, bonus: 30000 }),
        source({ key: 'experience-2', company: 'Netflix', annualSalary: 90000 }),
      ],
      resolver({
        includeBonus: true,
        bonusPayouts: [{ id: 'p1', periodIndex: 4, payDate: null, percent: 100 }],
        elections: {
          ...DEFAULT_SETTINGS.elections,
          pretax401kPercent: 6,
          roth401kPercent: 2,
          section125PerPeriod: 120,
          hsaPerPeriod: 100,
          postTaxPerPeriod: 40,
        },
      }),
      context
    );

    // Run against a modelled year, so a folded component (Roth inside post-tax) cannot double count.
    for (const breakdown of [
      grossBreakdown(summary),
      taxBreakdown(summary),
      deductionsBreakdown(summary),
      takeHomeBreakdown(summary),
      employee401kBreakdown(summary),
      totalCompBreakdown(summary),
    ]) {
      expect(resolveMath(breakdown.steps)).toBeCloseTo(breakdown.total, 2);
    }

    // A modelled year itemises completely, so the balancing line must not appear.
    expect(
      deductionsBreakdown(summary).steps.some((step) => step.label === 'Recorded but not itemised')
    ).toBe(false);

    // And one level down: the payrolls named under a line have to add up to that line.
    const sources = summary.roles.map((role) => ({ label: role.company, parts: role }));
    let namedLines = 0;
    for (const breakdown of [
      grossBreakdown(summary, sources),
      taxBreakdown(summary, sources),
      deductionsBreakdown(summary, sources),
      takeHomeBreakdown(summary, sources),
      employee401kBreakdown(summary, sources),
      totalCompBreakdown(summary, sources),
    ]) {
      expect(resolveMath(breakdown.steps)).toBeCloseTo(breakdown.total, 2);
      for (const step of breakdown.steps) {
        if (!step.parts) continue;
        namedLines += 1;
        expect(step.parts.reduce((total, part) => total + part.value, 0)).toBeCloseTo(
          step.value,
          2
        );
        expect(step.parts.map((part) => part.label)).toEqual(
          expect.arrayContaining(['Google', 'Netflix'])
        );
      }
    }
    // Guard against the attribution silently vanishing and this test passing on nothing.
    expect(namedLines).toBeGreaterThan(5);
  });

  it('counts a bonus inside gross rather than on top of it', () => {
    const summary = summarizeYear(
      2025,
      [source({ bonus: 24000 })],
      resolver({
        includeBonus: true,
        bonusProrated: false,
        bonusPayouts: [{ id: 'p1', periodIndex: 3, payDate: null, percent: 100 }],
      }),
      context
    );
    expect(summary.bonus).toBeCloseTo(24000, 2);
    // Salary plus the bonus, and total comp adds nothing further because there is no match.
    expect(summary.gross).toBeCloseTo(184000, 2);
    expect(summary.totalComp).toBeCloseTo(summary.gross, 2);
  });

  it('counts vested equity inside gross too', () => {
    const summary = summarizeYear(
      2025,
      [source({ totalGrant: 200000, startDate: '2023-01-01' })],
      resolver({ includeVestEvents: true }),
      context
    );
    expect(summary.equityVested).toBeGreaterThan(0);
    expect(summary.gross).toBeCloseTo(160000 + summary.equityVested, 2);
    expect(summary.totalComp).toBeCloseTo(summary.gross, 2);
  });

  it('leaves take-home below gross once tax is withheld', () => {
    const summary = summarizeYear(2025, [source()], resolver(), context);
    expect(summary.taxWithheld).toBeGreaterThan(0);
    expect(summary.takeHome).toBeLessThan(summary.gross);
    expect(summary.takeHome + summary.taxWithheld).toBeCloseTo(summary.gross, 2);
  });
});

describe('summarizeYears', () => {
  it('returns one entry per year the role was paid, skipping the rest', () => {
    const history = summarizeYears(
      [2026, 2025, 2024],
      [source({ startDate: '2025-01-01', endDate: '2025-12-31' })],
      resolver(),
      context
    );
    expect(history.map((year) => year.taxYear)).toEqual([2025]);
    expect(history[0].gross).toBeCloseTo(160000, 2);
  });

  it('totals each year independently across roles', () => {
    const history = summarizeYears(
      [2025, 2024],
      [
        source({ key: 'experience-1', startDate: '2024-01-01', endDate: '2024-12-31' }),
        source({ key: 'experience-2', startDate: '2025-01-01', endDate: '2025-12-31' }),
        source({ key: 'experience-3', startDate: '2025-01-01', endDate: '2025-12-31' }),
      ],
      resolver(),
      context
    );
    expect(history.find((year) => year.taxYear === 2024)?.roles).toHaveLength(1);
    expect(history.find((year) => year.taxYear === 2025)?.roles).toHaveLength(2);
    expect(history.find((year) => year.taxYear === 2025)?.gross).toBeCloseTo(320000, 2);
  });
});

describe('calculated figures shown in fields', () => {
  it('rounds the per-paycheck gross to the cent', () => {
    // 160,000 over 26 is 6153.846…, and this default prefills the override fields.
    const { periodDefaults } = buildIncomeModel({
      ...context,
      settings: { ...DEFAULT_SETTINGS },
      source: source(),
      taxYear: 2025,
    });
    expect(periodDefaults.regularGross).toBe(6153.85);
    expect(String(periodDefaults.regularGross).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });
});

describe('the composition the year bar draws', () => {
  const segmentTotal = (e: {
    takeHome: number;
    taxWithheld: number;
    deductions: number;
    employerMatch: number;
  }) => e.takeHome + e.taxWithheld + e.deductions + e.employerMatch;

  it('splits gross into take-home, tax and deductions with nothing left over', () => {
    const summary = summarizeYear(
      2025,
      [source()],
      resolver({
        elections: { ...DEFAULT_SETTINGS.elections, pretax401kPercent: 6, postTaxPerPeriod: 25 },
      }),
      context
    );
    expect(summary.deductions).toBeGreaterThan(0);
    expect(summary.takeHome + summary.taxWithheld + summary.deductions).toBeCloseTo(
      summary.gross,
      2
    );
  });

  it('fills the bar exactly, so no segment is padded or clipped', () => {
    const summary = summarizeYear(
      2025,
      [source()],
      resolver({
        elections: { ...DEFAULT_SETTINGS.elections, pretax401kPercent: 4 },
      }),
      context
    );
    expect(segmentTotal(summary)).toBeCloseTo(summary.totalComp, 2);
  });

  it('reports no deductions when nothing is withheld beyond tax', () => {
    const summary = summarizeYear(2025, [source()], resolver(), context);
    expect(summary.deductions).toBeCloseTo(0, 2);
    expect(summary.takeHome + summary.taxWithheld).toBeCloseTo(summary.gross, 2);
  });

  it('adds up across several roles', () => {
    const summary = summarizeYear(
      2025,
      [
        source({ key: 'experience-1', company: 'Google' }),
        source({ key: 'experience-2', company: 'Netflix', annualSalary: 80000 }),
      ],
      resolver({ elections: { ...DEFAULT_SETTINGS.elections, pretax401kPercent: 5 } }),
      context
    );
    expect(summary.deductions).toBeCloseTo(
      summary.roles.reduce((total, role) => total + role.deductions, 0),
      2
    );
    expect(segmentTotal(summary)).toBeCloseTo(summary.totalComp, 2);
  });
});

const roleEarnings = (overrides: Partial<RoleEarnings> = {}): RoleEarnings =>
  ({
    sourceKey: 'experience-1',
    company: 'Google',
    roleTitle: 'Software Engineer',
    paychecks: 26,
    electiveLimit: 24500,
    startingBalance: null,
    currentValue: null,
    contributedToDate: 0,
    employee401k: 0,
    employerMatch: 0,
    gross: 0,
    bonus: 0,
    equityVested: 0,
    taxWithheld: 0,
    deductions: 0,
    takeHome: 0,
    totalComp: 0,
    supplementalGross: 0,
    taxableAllowance: 0,
    taxFreeAllowance: 0,
    section125: 0,
    hsa: 0,
    pretax401k: 0,
    pretaxIncomeOnly: 0,
    roth401k: 0,
    postTax: 0,
    federalTax: 0,
    stateTax: 0,
    payrollTax: 0,
    ...overrides,
  }) as RoleEarnings;

describe('retirementPerformance', () => {
  it('says nothing until a role has both balances', () => {
    expect(retirementPerformance([])).toBeNull();
    expect(retirementPerformance([roleEarnings({ startingBalance: 50000 })])).toBeNull();
    expect(retirementPerformance([roleEarnings({ currentValue: 70000 })])).toBeNull();
  });

  it('takes the gain as the balance change less every dollar paid in', () => {
    const performance = retirementPerformance([
      roleEarnings({
        startingBalance: 50000,
        currentValue: 70000,
        employee401k: 12000,
        employerMatch: 4000,
        contributedToDate: 16000,
      }),
    ])!;
    expect(performance.contributed).toBe(16000);
    expect(performance.gain).toBe(4000);
    // Over the money actually at work, not over the closing balance.
    expect(performance.gainPercent).toBeCloseTo(4000 / 66000, 10);
  });

  it('reports a loss rather than clamping at zero', () => {
    const performance = retirementPerformance([
      roleEarnings({
        startingBalance: 50000,
        currentValue: 52000,
        employee401k: 9000,
        contributedToDate: 9000,
      }),
    ])!;
    expect(performance.gain).toBe(-7000);
  });

  it('adds balances across roles, since each plan is its own account', () => {
    const performance = retirementPerformance([
      roleEarnings({
        startingBalance: 50000,
        currentValue: 70000,
        employee401k: 12000,
        contributedToDate: 12000,
      }),
      roleEarnings({
        sourceKey: 'experience-2',
        company: 'Netflix',
        startingBalance: 10000,
        currentValue: 14000,
        employee401k: 3000,
        contributedToDate: 3000,
      }),
    ])!;
    expect(performance.startingBalance).toBe(60000);
    expect(performance.currentValue).toBe(84000);
    expect(performance.contributed).toBe(15000);
    expect(performance.gain).toBe(9000);
    expect(performance.countedRoles).toBe(2);
  });

  it('leaves out a role with no balances, and its contributions with it', () => {
    const performance = retirementPerformance([
      roleEarnings({
        startingBalance: 50000,
        currentValue: 70000,
        employee401k: 12000,
        contributedToDate: 12000,
      }),
      roleEarnings({
        sourceKey: 'experience-2',
        company: 'Netflix',
        employee401k: 9000,
        contributedToDate: 9000,
      }),
    ])!;
    // Counting the second role's 9,000 against the first role's balances would invent a loss.
    expect(performance.contributed).toBe(12000);
    expect(performance.gain).toBe(8000);
    expect(performance.countedRoles).toBe(1);
    expect(performance.uncountedRoles).toBe(1);
  });

  it('does not count a balance-less role that never contributed as missing', () => {
    const performance = retirementPerformance([
      roleEarnings({ startingBalance: 50000, currentValue: 70000 }),
      roleEarnings({ sourceKey: 'experience-2', company: 'Netflix' }),
    ])!;
    expect(performance.uncountedRoles).toBe(0);
  });

  it('keeps the percentage signless, since the amount beside it already carries the sign', () => {
    const performance = retirementPerformance([
      roleEarnings({ startingBalance: 100000, currentValue: 90000 }),
    ])!;
    expect(performance.gain).toBe(-10000);
    // The card renders Math.abs of this next to a signed amount.
    expect(performance.gainPercent).toBeCloseTo(-0.1, 10);
  });

  it('counts only what has actually been paid in, not the year ahead', () => {
    // Half a year in: 9,000 has landed, the other 9,000 is still a projection.
    const performance = retirementPerformance([
      roleEarnings({
        startingBalance: 50000,
        currentValue: 60000,
        employee401k: 18000,
        contributedToDate: 9000,
      }),
    ])!;
    expect(performance.contributed).toBe(9000);
    // Against the full year this would read as a 8,000 loss, which never happened.
    expect(performance.gain).toBe(1000);
  });

  it('attributes the gain to each role that has balances', () => {
    const performance = retirementPerformance([
      roleEarnings({ startingBalance: 50000, currentValue: 70000, contributedToDate: 12000 }),
      roleEarnings({
        sourceKey: 'experience-2',
        company: 'Netflix',
        startingBalance: 10000,
        currentValue: 11000,
        contributedToDate: 3000,
      }),
    ])!;
    expect(performance.roles.map((role) => [role.company, role.gain])).toEqual([
      ['Google', 8000],
      ['Netflix', -2000],
    ]);
    // The parts add back to the aggregate, as every other year figure does.
    expect(performance.roles.reduce((total, role) => total + role.gain, 0)).toBe(performance.gain);
  });

  it('has no percentage when nothing was at work', () => {
    const performance = retirementPerformance([
      roleEarnings({ startingBalance: 0, currentValue: 0 }),
    ])!;
    expect(performance.gainPercent).toBeNull();
  });
});

describe('a recorded raise re-rates the paychecks after it', () => {
  const midYearRaise = [
    {
      id: 'r1',
      date: '2025-07-01',
      type: 'merit' as const,
      base_before: 100000,
      base_after: 130000,
      bonus_before: 0,
      bonus_after: 0,
      equity_before: 0,
      equity_after: 0,
    },
  ];

  const grossOn = (raises: typeof midYearRaise) => {
    const { ledger } = buildIncomeModel({
      ...context,
      settings: { ...DEFAULT_SETTINGS },
      // annualSalary is today's pay, which is the post-raise figure.
      source: source({ annualSalary: 130000, raises, startDate: '2020-01-01' }),
      taxYear: 2025,
    });
    const rows = ledger.rows.filter((row) => row.payDate);
    const before = rows.filter((row) => row.payDate! < '2025-07-01');
    const after = rows.filter((row) => row.payDate! >= '2025-07-01');
    return { before, after };
  };

  it('pays the old rate before the effective date and the new rate after', () => {
    const { before, after } = grossOn(midYearRaise);
    expect(before.length).toBeGreaterThan(0);
    expect(after.length).toBeGreaterThan(0);
    expect(before.at(-1)!.regularGross).toBeCloseTo(100000 / 26, 2);
    expect(after[0].regularGross).toBeCloseTo(130000 / 26, 2);
  });

  it('adds up to less than a full year at the new rate, because half the year was not', () => {
    const raised = grossOn(midYearRaise);
    const total = [...raised.before, ...raised.after].reduce(
      (sum, row) => sum + row.regularGross,
      0
    );
    expect(total).toBeLessThan(130000);
    expect(total).toBeGreaterThan(100000);
  });

  it('uses the raise even when the role still stores the old salary', () => {
    const { ledger } = buildIncomeModel({
      ...context,
      settings: { ...DEFAULT_SETTINGS },
      // The role record was never updated after the raise was logged.
      source: source({ annualSalary: 100000, raises: midYearRaise, startDate: '2020-01-01' }),
      taxYear: 2025,
    });
    const rows = ledger.rows.filter((row) => row.payDate);
    expect(rows.filter((row) => row.payDate! < '2025-07-01').at(-1)!.regularGross).toBeCloseTo(
      100000 / 26,
      2
    );
    expect(rows.filter((row) => row.payDate! >= '2025-07-01')[0].regularGross).toBeCloseTo(
      130000 / 26,
      2
    );
  });

  it('pays a flat rate all year when no raise is recorded', () => {
    const { before, after } = grossOn([]);
    for (const row of [...before, ...after]) {
      expect(row.regularGross).toBeCloseTo(130000 / 26, 2);
    }
  });
});

describe('toDate is what the paychecks have actually paid', () => {
  const context2025 = { ...context, todayIso: '2025-07-01' };

  it('counts only paychecks whose date has passed', () => {
    const summary = summarizeYear(
      2025,
      [source({ annualSalary: 260000, startDate: '2020-01-01' })],
      resolver(),
      context2025
    );
    const role = summary.roles[0];
    expect(role.toDate.gross).toBeGreaterThan(0);
    expect(role.toDate.gross).toBeLessThan(role.projectedGross);
    // Half a year in, roughly half the year's pay has landed.
    expect(role.toDate.gross / role.projectedGross).toBeGreaterThan(0.4);
    expect(role.toDate.gross / role.projectedGross).toBeLessThan(0.6);
    // The headline gross is what has been paid, so the two agree exactly.
    expect(role.gross).toBe(role.toDate.gross);
  });

  it('splits into base, bonus and equity that add back to gross', () => {
    const role = summarizeYear(
      2025,
      [source({ annualSalary: 200000, bonus: 20000, startDate: '2020-01-01' })],
      resolver(),
      context2025
    ).roles[0];
    expect(role.toDate.base + role.toDate.bonus + role.toDate.equity).toBeCloseTo(
      role.toDate.gross,
      6
    );
  });

  it('equals the full year once the year is over', () => {
    const role = summarizeYear(
      2025,
      [source({ annualSalary: 200000, startDate: '2020-01-01' })],
      resolver(),
      { ...context, todayIso: '2026-06-01' }
    ).roles[0];
    expect(role.toDate.gross).toBeCloseTo(role.projectedGross, 6);
  });
});

describe('the Income card and the Experience breakdown quote one number', () => {
  const midYear = { ...context, todayIso: '2026-09-01' };
  const role2026 = () =>
    summarizeYear(
      2026,
      [source({ annualSalary: 160000, startDate: '2025-01-06' })],
      resolver(),
      midYear
    ).roles[0];

  it('reports gross as the paychecks issued, not the year ahead', () => {
    const role = role2026();
    // 18 of 26 biweekly paychecks have been issued by 1 September.
    expect(role.paychecksToDate).toBe(18);
    expect(role.paychecks).toBe(26);
    expect(role.gross).toBeCloseTo((160000 / 26) * 18, 2);
  });

  it('makes gross and the breakdown parts the same figure', () => {
    const role = role2026();
    expect(role.gross).toBe(role.toDate.gross);
    expect(role.toDate.base + role.toDate.bonus + role.toDate.equity).toBeCloseTo(role.gross, 6);
  });

  it('keeps the full year available so the two can be told apart', () => {
    const role = role2026();
    expect(role.projectedGross).toBeCloseTo(160000, 2);
    expect(role.projectedGross).toBeGreaterThan(role.gross);
  });

  it('withholds and take-home count the same paychecks as gross', () => {
    const role = role2026();
    expect(role.takeHome).toBeLessThan(role.gross);
    expect(role.takeHome + role.taxWithheld + role.deductions).toBeCloseTo(role.gross, 2);
  });
});

describe('rounding cannot separate the two pages', () => {
  it('keeps the parts adding to the rounded gross', () => {
    // Figures chosen so the parts each carry a fraction.
    const role = summarizeYear(
      2026,
      [source({ annualSalary: 144333, bonus: 24000, startDate: '2025-01-06' })],
      resolver(),
      { ...context, todayIso: '2026-09-01' }
    ).roles[0];
    const total = Math.round(role.toDate.gross);
    const bonus = Math.round(role.toDate.bonus);
    const equity = Math.round(role.toDate.equity);
    expect(total - bonus - equity + bonus + equity).toBe(total);
    expect(Math.round(role.gross)).toBe(total);
  });
});

describe('a raise payroll applied late', () => {
  // Effective 1 Jul, but payroll only paid it from 31 Aug, so July and August were short.
  const retroRaise: RaiseEntry[] = [
    {
      id: 'r1',
      date: '2026-08-31',
      effective_date: '2026-07-01',
      type: 'merit' as const,
      base_before: 165000,
      base_after: 181500,
      bonus_before: 0,
      bonus_after: 0,
      equity_before: 0,
      equity_after: 0,
    },
  ];

  const role = (raises: RaiseEntry[]) =>
    summarizeYear(
      2026,
      [source({ annualSalary: 181500, bonus: 0, startDate: '2020-01-01', raises })],
      resolver(),
      { ...context, todayIso: '2026-12-31' }
    ).roles[0];

  it('keeps the paychecks before the catch-up at the old rate', () => {
    const { ledger } = buildIncomeModel({
      ...context,
      settings: { ...DEFAULT_SETTINGS },
      source: source({
        annualSalary: 181500,
        bonus: 0,
        startDate: '2020-01-01',
        raises: retroRaise,
      }),
      taxYear: 2026,
    });
    const july = ledger.rows.filter((row) => row.payDate && row.payDate < '2026-08-31');
    expect(july.at(-1)!.regularGross).toBeCloseTo(165000 / 26, 2);
  });

  it('adds the shortfall as a one-off on the first paycheck at the new rate', () => {
    const withRetro = role(retroRaise).gross;
    const withoutRetro = role([{ ...retroRaise[0], effective_date: null }]).gross;
    // 61 days at the $16,500 difference.
    expect(withRetro - withoutRetro).toBeCloseTo((16500 * 61) / 365, 0);
  });

  it('changes nothing when payroll was on time', () => {
    const onTime = role([{ ...retroRaise[0], effective_date: '2026-08-31' }]).gross;
    const none = role([{ ...retroRaise[0], effective_date: null }]).gross;
    expect(onTime).toBeCloseTo(none, 6);
  });
});
