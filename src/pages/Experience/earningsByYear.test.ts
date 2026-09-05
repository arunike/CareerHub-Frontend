import { describe, expect, it } from 'vitest';
import {
  buildComponentBreakdown,
  buildEarningsByYear,
  buildEarningsReport,
  totalOf,
  yearsIn,
} from './earningsByYear';
import type { Experience } from '../../types';

const TODAY = '2026-11-01';

const role = (over: Partial<Experience>): Experience =>
  ({
    id: 1,
    employment_type: 'full_time',
    company: 'Google',
    title: 'Software Engineer',
    ...over,
  }) as Experience;

const salarySnapshot = { kind: 'salary' as const, base: 0, bonus: 0, equity: 0, total: 0 };

const build = (
  experiences: Experience[],
  offers: Record<number, Record<string, unknown>> = {},
  snapshots: Record<number, { kind: 'salary' | 'hourly'; total: number }> = {}
) =>
  buildEarningsByYear(
    experiences,
    (exp) => offers[exp.id as number],
    (exp) => (snapshots[exp.id as number] as never) ?? (salarySnapshot as never),
    TODAY
  );

describe('buildEarningsByYear', () => {
  it('splits one role across every year it ran', () => {
    const groups = build([role({ id: 1, start_date: '2025-03-01', is_current: true })], {
      1: { base_salary: 336000, bonus: 0, equity: 0 },
    });
    expect(groups.map((group) => group.year)).toEqual([2026, 2025]);
    // 2025 ran Mar–Dec, 2026 only to 1 Nov, so neither is a full year.
    expect(groups[1].total).toBeCloseTo((336000 * 306) / 365, 0);
    expect(groups[0].total).toBeCloseTo((336000 * 305) / 365, 0);
  });

  it('lists each role separately within a year and totals them', () => {
    const groups = build(
      [
        role({ id: 1, company: 'Google', start_date: '2024-01-01', end_date: '2026-03-31' }),
        role({ id: 2, company: 'Netflix', start_date: '2026-04-01', is_current: true }),
      ],
      {
        1: { base_salary: 165000, bonus: 0, equity: 0 },
        2: { base_salary: 336000, bonus: 0, equity: 0 },
      }
    );
    const thisYear = groups.find((group) => group.year === 2026)!;
    expect(thisYear.roles.map((row) => row.company)).toEqual(['Netflix', 'Google']);
    expect(thisYear.total).toBeCloseTo(
      thisYear.roles.reduce((sum, row) => sum + row.amount, 0),
      6
    );
  });

  it('never counts a year beyond today', () => {
    const groups = build([role({ id: 1, start_date: '2020-01-01', is_current: true })], {
      1: { base_salary: 336000, bonus: 0, equity: 0 },
    });
    expect(Math.max(...groups.map((group) => group.year))).toBe(2026);
    expect(groups[0].total).toBeLessThan(336000);
  });

  it('prices a year that contained a raise above the pre-raise rate alone', () => {
    const groups = build([role({ id: 1, start_date: '2020-01-01', is_current: true })], {
      1: {
        base_salary: 165000,
        bonus: 0,
        equity: 0,
        raise_history: [
          {
            id: 'r',
            date: '2026-07-01',
            type: 'merit',
            base_before: 165000,
            base_after: 336000,
            bonus_before: 0,
            bonus_after: 0,
            equity_before: 0,
            equity_after: 0,
          },
        ],
      },
    });
    const raisedYear = groups.find((group) => group.year === 2026)!;
    const flatYear = groups.find((group) => group.year === 2025)!;
    expect(flatYear.total).toBeCloseTo(165000, 0);
    // Part of 2026 was paid at the higher rate, but only 257 of 365 days were worked.
    expect(raisedYear.total).toBeGreaterThan((165000 * 257) / 365);
  });

  it('puts a summer internship entirely in the year it ran', () => {
    const groups = build(
      [
        role({
          id: 1,
          company: 'Stripe',
          title: 'Software Engineer Intern',
          employment_type: 'internship',
          start_date: '2023-06-05',
          end_date: '2023-08-25',
        }),
      ],
      {},
      // 480 hours at $87.50; a summer never crosses a New Year, so it cannot be split.
      { 1: { kind: 'hourly', total: 42000 } }
    );
    expect(groups.map((group) => group.year)).toEqual([2023]);
    expect(groups[0].total).toBeCloseTo(42000, 6);
  });

  it('splits an hourly stint that does cross a New Year by weekdays worked', () => {
    const groups = build(
      [
        role({
          id: 1,
          company: 'Airbnb',
          employment_type: 'internship',
          start_date: '2022-11-01',
          end_date: '2023-02-28',
        }),
      ],
      {},
      // Not a summer, so it is a contract stint rather than one of the two canonical internships.
      { 1: { kind: 'hourly', total: 23702.4 } }
    );
    const total = groups.reduce((sum, group) => sum + group.total, 0);
    // Each year is rounded before it is added, so the split can sit a dollar off the raw stint.
    expect(total).toBe(23703);
    expect(groups.map((group) => group.year).sort()).toEqual([2022, 2023]);
  });

  it('skips a role with no pay recorded', () => {
    expect(build([role({ id: 1, start_date: '2025-01-01', is_current: true })])).toEqual([]);
  });
});

describe('buildComponentBreakdown', () => {
  const groups = () =>
    build(
      [
        role({ id: 1, company: 'Google', start_date: '2025-01-01', is_current: true }),
        role({ id: 2, company: 'Netflix', start_date: '2025-01-01', end_date: '2026-06-30' }),
      ],
      {
        1: { base_salary: 165000, bonus: 24750, equity: 50000 },
        // Netflix pays all cash, so it should appear under base and nowhere else.
        2: { base_salary: 336000, bonus: 0, equity: 0 },
      }
    );

  it('splits into base, bonus and equity, each listing the roles inside it', () => {
    const parts = buildComponentBreakdown(groups(), 'all');
    expect(parts.map((part) => part.key)).toEqual(['base', 'bonus', 'equity']);
    // Ordered by amount, and Netflix's all-cash base is the larger of the two.
    expect(parts[0].roles.map((r) => r.company)).toEqual(['Netflix', 'Google']);
    // Netflix is all cash, so it must not appear under bonus.
    expect(parts[1].roles.map((r) => r.company)).toEqual(['Google']);
  });

  it('merges a role across years rather than listing it once per year', () => {
    const base = buildComponentBreakdown(groups(), 'all')[0];
    expect(base.roles.filter((r) => r.company === 'Google')).toHaveLength(1);
  });

  it('narrows to a single year when one is chosen', () => {
    const all = buildComponentBreakdown(groups(), 'all')[0].total;
    const one = buildComponentBreakdown(groups(), 2026)[0].total;
    expect(one).toBeLessThan(all);
    expect(one).toBeGreaterThan(0);
  });

  it('drops a role from a year it did not run in', () => {
    const parts = buildComponentBreakdown(groups(), 2026);
    // Netflix ended in June 2026 so it still counts; a year before either started is empty.
    expect(buildComponentBreakdown(groups(), 2024)[0].roles).toEqual([]);
    expect(parts[0].roles.length).toBeGreaterThan(0);
  });

  it('totals each part from its own roles', () => {
    for (const part of buildComponentBreakdown(groups(), 'all')) {
      expect(part.total).toBeCloseTo(
        part.roles.reduce((sum, role) => sum + role.value, 0),
        6
      );
    }
  });
});

describe('totalOf and yearsIn', () => {
  it('reports every year covered and the sum across them', () => {
    const groups = build([role({ id: 1, start_date: '2024-01-01', is_current: true })], {
      1: { base_salary: 336000, bonus: 0, equity: 0 },
    });
    expect(yearsIn(groups)).toEqual([2026, 2025, 2024]);
    expect(totalOf(groups)).toBeCloseTo(
      groups.reduce((sum, group) => sum + group.total, 0),
      6
    );
  });
});

describe('roles that produce no figure are reported, not dropped', () => {
  const report = (
    experiences: Experience[],
    offers: Record<number, Record<string, unknown>> = {},
    snapshots: Record<number, { kind: 'salary' | 'hourly'; total: number }> = {}
  ) =>
    buildEarningsReport(
      experiences,
      (exp) => offers[exp.id as number],
      (exp) => (snapshots[exp.id as number] as never) ?? (salarySnapshot as never),
      TODAY
    );

  it('uses the role own pay when the linked offer has none', () => {
    const withOffer = report(
      [
        {
          ...role({ id: 1, start_date: '2025-01-01', is_current: true }),
          base_salary: 336000,
        } as Experience,
      ],
      // An offer exists but carries no figures, which used to zero the role out.
      { 1: { base_salary: null, bonus: null, equity: null } }
    );
    expect(withOffer.groups.length).toBeGreaterThan(0);
    expect(withOffer.skipped).toEqual([]);
  });

  it('names a role it could not price, with the reason', () => {
    const result = report([role({ id: 1, company: 'Netflix', start_date: '2025-01-01' })]);
    expect(result.groups).toEqual([]);
    expect(result.skipped).toEqual([
      { company: 'Netflix', roleTitle: 'Software Engineer', reason: 'no pay recorded' },
    ]);
  });
});

describe('the numbers on screen reconcile', () => {
  // Figures chosen to produce fractions, which is where independent rounding used to disagree.
  const groups = () =>
    build(
      [
        role({ id: 1, company: 'Google', start_date: '2024-03-07', is_current: true }),
        role({ id: 2, company: 'Netflix', start_date: '2024-08-19', end_date: '2026-04-11' }),
      ],
      {
        1: { base_salary: 165000, bonus: 24750, equity: 50000 },
        2: { base_salary: 336000, bonus: 0, equity: 777 },
      }
    );

  it('gives every figure as whole dollars', () => {
    for (const group of groups()) {
      expect(Number.isInteger(group.total)).toBe(true);
      for (const row of group.roles) {
        expect(Number.isInteger(row.amount)).toBe(true);
        expect(Number.isInteger(row.byComponent.base)).toBe(true);
      }
    }
  });

  it('sums each part exactly from the roles listed under it', () => {
    for (const scope of ['all', 2026, 2025, 2024] as const) {
      for (const part of buildComponentBreakdown(groups(), scope)) {
        expect(part.total).toBe(part.roles.reduce((sum, role) => sum + role.value, 0));
      }
    }
  });

  it('sums the year total exactly from its three parts', () => {
    for (const group of groups()) {
      const parts = buildComponentBreakdown(groups(), group.year);
      expect(parts.reduce((sum, part) => sum + part.total, 0)).toBe(group.total);
    }
  });

  it('sums the all-time total exactly from the years', () => {
    const all = buildComponentBreakdown(groups(), 'all');
    expect(all.reduce((sum, part) => sum + part.total, 0)).toBe(totalOf(groups()));
  });
});

describe('the ledger replaces the estimate when it is there', () => {
  const ledgerSnapshot = {
    kind: 'salary' as const,
    base: 0,
    bonus: 0,
    equity: 0,
    total: 0,
    ledgerYears: [
      {
        year: 2026,
        total: 239750,
        byComponent: { base: 165000, bonus: 24750, equity: 50000 },
        paychecks: 20,
      },
      {
        year: 2025,
        total: 336000,
        byComponent: { base: 165000, bonus: 24750, equity: 50000 },
        paychecks: 26,
      },
    ],
  };

  it('reports the ledger figures rather than rate times days', () => {
    const groups = buildEarningsByYear(
      [role({ id: 1, start_date: '2025-01-01', is_current: true })],
      () => ({ base_salary: 336000, bonus: 0, equity: 0 }),
      () => ledgerSnapshot as never,
      TODAY
    );
    expect(groups.map((group) => group.total)).toEqual([239750, 336000]);
    // The offer says $999,999 a year; the ledger says what was actually paid, and wins.
    expect(groups[0].roles[0].byComponent).toEqual({ base: 165000, bonus: 24750, equity: 50000 });
  });

  it('still totals each part exactly from the roles under it', () => {
    const groups = buildEarningsByYear(
      [role({ id: 1, start_date: '2025-01-01', is_current: true })],
      () => undefined,
      () => ledgerSnapshot as never,
      TODAY
    );
    for (const part of buildComponentBreakdown(groups, 'all')) {
      expect(part.total).toBe(part.roles.reduce((sum, r) => sum + r.value, 0));
    }
  });
});
