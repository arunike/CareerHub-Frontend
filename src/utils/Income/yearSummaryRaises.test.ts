import { describe, expect, it } from 'vitest';
import { summarizeYear } from './yearSummary';
import { buildIncomeModel } from './incomeModel';
import { DEFAULT_SETTINGS } from './incomeSettings';
import { context, resolver, source } from './yearSummary.fixtures';
import type { RaiseEntry } from '../../types';

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
      [source({ annualSalary: 160000, startDate: '2025-07-01' })],
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
      [source({ annualSalary: 144333, bonus: 24000, startDate: '2025-07-01' })],
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
  // Effective 1 Jul, but payroll only paid it from 1 Oct, so the months between were short.
  const retroRaise: RaiseEntry[] = [
    {
      id: 'r1',
      date: '2026-10-01',
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
    const july = ledger.rows.filter((row) => row.payDate && row.payDate < '2026-10-01');
    expect(july.at(-1)!.regularGross).toBeCloseTo(165000 / 26, 2);
  });

  it('adds the shortfall as a one-off on the first paycheck at the new rate', () => {
    const withRetro = role(retroRaise).gross;
    const withoutRetro = role([{ ...retroRaise[0], effective_date: null }]).gross;
    // Six fortnightly paychecks went out at the old rate, each short by 16,500 / 26.
    expect(withRetro - withoutRetro).toBeCloseTo((16500 / 26) * 6, 0);
  });

  it('changes nothing when payroll was on time', () => {
    const onTime = role([{ ...retroRaise[0], effective_date: '2026-10-01' }]).gross;
    const none = role([{ ...retroRaise[0], effective_date: null }]).gross;
    expect(onTime).toBeCloseTo(none, 6);
  });
});
