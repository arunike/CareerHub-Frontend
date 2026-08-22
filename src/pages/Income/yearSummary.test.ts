import { describe, expect, it } from 'vitest';
import { summarizeYear, summarizeYears } from './yearSummary';
import { buildIncomeModel } from './incomeModel';
import { DEFAULT_SETTINGS } from './incomeSettings';
import type { IncomeSettings } from './incomeSettings';
import type { IncomeSource } from './incomeSources';
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
        source({ key: 'experience-1', company: 'Small', annualSalary: 30000 }),
        source({ key: 'experience-2', company: 'Large', annualSalary: 200000 }),
      ],
      resolver(),
      context
    );
    expect(summary.roles.map((role) => role.company)).toEqual(['Large', 'Small']);
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
