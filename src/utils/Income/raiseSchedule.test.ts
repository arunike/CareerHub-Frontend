import { describe, expect, it } from 'vitest';
import {
  backPayFor,
  buildSalarySteps,
  currentPackage,
  earningsForYear,
  employmentWindow,
  salaryByPeriod,
  salaryOn,
} from './raiseSchedule';
import type { RaiseEntry } from '../../types';

const raise = (over: Partial<RaiseEntry>): RaiseEntry => ({
  id: over.id ?? 'r1',
  date: over.date ?? '2026-07-01',
  type: 'merit',
  base_before: over.base_before ?? 165000,
  base_after: over.base_after ?? 181500,
  bonus_before: 0,
  bonus_after: 0,
  equity_before: 0,
  equity_after: 0,
});

describe('buildSalarySteps', () => {
  it('opens at what the first raise was raised from, not at the current pay', () => {
    const steps = buildSalarySteps([raise({ base_before: 165000, base_after: 181500 })], 181500);
    expect(steps[0]).toMatchObject({ effectiveFrom: '', annualSalary: 165000 });
    expect(steps[1]).toMatchObject({ effectiveFrom: '2026-07-01', annualSalary: 181500 });
  });

  it('orders raises by date however they were entered', () => {
    const steps = buildSalarySteps(
      [
        raise({ id: 'b', date: '2026-07-01', base_before: 165000, base_after: 181500 }),
        raise({ id: 'a', date: '2025-07-01', base_before: 165000, base_after: 165000 }),
      ],
      181500
    );
    expect(steps.map((step) => step.annualSalary)).toEqual([165000, 165000, 181500]);
  });

  it('ignores an entry with no date or no resulting pay', () => {
    expect(buildSalarySteps([raise({ date: '' })], 165000)).toEqual([]);
    expect(buildSalarySteps([raise({ base_after: 0 })], 165000)).toEqual([]);
  });
});

describe('salaryOn', () => {
  const steps = buildSalarySteps([raise({ base_before: 165000, base_after: 181500 })], 181500);

  it('pays the old rate up to the day before the raise', () => {
    expect(salaryOn(steps, '2026-06-30', 181500)).toBe(165000);
  });

  it('pays the new rate from the effective date onward', () => {
    expect(salaryOn(steps, '2026-07-01', 181500)).toBe(181500);
    expect(salaryOn(steps, '2026-12-31', 181500)).toBe(181500);
  });

  it('falls back when there are no raises or no date', () => {
    expect(salaryOn([], '2026-07-01', 181500)).toBe(181500);
    expect(salaryOn(steps, null, 181500)).toBe(181500);
  });
});

describe('salaryByPeriod', () => {
  const periods = [
    { periodIndex: 1, payDate: '2026-06-15' },
    { periodIndex: 2, payDate: '2026-06-30' },
    { periodIndex: 3, payDate: '2026-07-15' },
    { periodIndex: 4, payDate: '2026-07-31' },
  ];

  it('switches the paycheck the raise takes effect and holds it after', () => {
    const byPeriod = salaryByPeriod(
      periods,
      [raise({ base_before: 165000, base_after: 181500 })],
      181500,
      24
    );
    // Pre-raise paychecks drop to the old rate; post-raise ones sit at the fallback already.
    expect(byPeriod[1]).toBeCloseTo(165000 / 24, 6);
    expect(byPeriod[2]).toBeCloseTo(165000 / 24, 6);
    expect(byPeriod[3]).toBeUndefined();
    expect(byPeriod[4]).toBeUndefined();
  });

  it('handles two raises in one year', () => {
    const raises = [
      raise({ id: 'a', date: '2026-07-01', base_before: 165000, base_after: 181500 }),
      raise({ id: 'b', date: '2026-07-20', base_before: 181500, base_after: 336000 }),
    ];
    const byPeriod = salaryByPeriod(periods, raises, 336000, 24);
    expect(byPeriod[1]).toBeCloseTo(165000 / 24, 6);
    expect(byPeriod[3]).toBeCloseTo(181500 / 24, 6);
    expect(byPeriod[4]).toBeUndefined();
  });

  it('leaves every period alone when there are no raises', () => {
    expect(salaryByPeriod(periods, [], 181500, 24)).toEqual({});
  });
});

describe('currentPackage', () => {
  const stored = { base: 165000, bonus: 24750, equity: 50000 };

  it('returns the stored figures when nothing was ever logged', () => {
    expect(currentPackage([], stored)).toEqual(stored);
  });

  it('prefers the latest raise, because a raise never writes back to the role', () => {
    const raises = [
      raise({ id: 'a', date: '2026-01-01', base_after: 181500 }),
      raise({ id: 'b', date: '2026-10-01', base_after: 165000 }),
    ];
    expect(currentPackage(raises, stored).base).toBe(165000);
  });
});

describe('employmentWindow', () => {
  it('is the whole year for a role held right through it', () => {
    const w = employmentWindow(2025, '2020-01-01', null, '2026-10-01')!;
    expect(w).toMatchObject({ start: '2025-01-01', end: '2025-12-31', wholeYear: true });
  });

  it('opens on the start date for a role joined mid-year', () => {
    expect(employmentWindow(2026, '2026-03-01', null, '2026-12-31')!.start).toBe('2026-03-01');
  });

  it('closes on the leaving date, not the end of the year', () => {
    const w = employmentWindow(2026, '2020-01-01', '2026-10-15', '2026-12-31')!;
    expect(w).toMatchObject({ end: '2026-10-15', endsToday: false });
  });

  it('stops at today for a role still running, since the rest of the year is unearned', () => {
    const w = employmentWindow(2026, '2020-01-01', null, '2026-10-01')!;
    expect(w).toMatchObject({ end: '2026-10-01', endsToday: true, wholeYear: false });
  });

  it('is null for a year the role did not overlap', () => {
    expect(employmentWindow(2026, '2027-01-01', null, '2026-10-01')).toBeNull();
  });
});

describe('a role joined mid-year, raised late, viewed before year end', () => {
  it('opens the window on the joining date, not 1 January', () => {
    const w = employmentWindow(2026, '2026-02-01', null, '2026-11-01')!;
    expect(w.start).toBe('2026-02-01');
    expect(w.end).toBe('2026-11-01');
  });
});

describe('earningsForYear', () => {
  const stored = { base: 165000, bonus: 24750, equity: 50000 };
  const oldRate = 165000 + 24750 + 50000;
  const newRate = 181500 + 27225 + 50000;
  const raises = [
    {
      id: 'r1',
      date: '2026-10-01',
      type: 'promotion' as const,
      base_before: 165000,
      base_after: 181500,
      bonus_before: 24750,
      bonus_after: 27225,
      equity_before: 50000,
      equity_after: 50000,
    },
  ];

  const window = employmentWindow(2026, '2026-02-01', null, '2026-11-01')!;

  it('splits the window into one stretch per rate', () => {
    const result = earningsForYear(raises, stored, window, 2026)!;
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toMatchObject({ from: '2026-02-01', to: '2026-09-30', days: 242 });
    expect(result.segments[1]).toMatchObject({ from: '2026-10-01', to: '2026-11-01', days: 32 });
  });

  it('prices each stretch at its own rate, pro-rated over the year', () => {
    const result = earningsForYear(raises, stored, window, 2026)!;
    expect(result.segments[0].annualRate).toBeCloseTo(oldRate, 2);
    expect(result.segments[1].annualRate).toBeCloseTo(newRate, 2);
    expect(result.segments[0].amount).toBeCloseTo((oldRate * 242) / 365, 2);
    expect(result.segments[1].amount).toBeCloseTo((newRate * 32) / 365, 2);
  });

  it('totals to money earned, well under a full year at either rate', () => {
    const result = earningsForYear(raises, stored, window, 2026)!;
    expect(result.total).toBeCloseTo((oldRate * 242 + newRate * 32) / 365, 2);
    expect(result.total).toBeLessThan(oldRate);
    expect(result.daysWorked).toBe(274);
    expect(result.daysInYear).toBe(365);
  });

  it('is a single stretch when no raise falls inside the window', () => {
    const result = earningsForYear([], stored, window, 2026)!;
    expect(result.segments).toHaveLength(1);
    expect(result.total).toBeCloseTo((oldRate * 274) / 365, 2);
  });

  it('counts a leap year as 366 days', () => {
    const leap = employmentWindow(2028, '2020-01-01', null, '2028-12-31')!;
    expect(earningsForYear([], stored, leap, 2028)!.daysInYear).toBe(366);
  });

  it('is a full year of pay when the role ran the whole year', () => {
    const whole = employmentWindow(2025, '2020-01-01', null, '2026-11-01')!;
    expect(earningsForYear([], stored, whole, 2025)!.total).toBeCloseTo(oldRate, 2);
  });
});

describe('earningsForYear components', () => {
  it('splits the total into parts that add back up to it', () => {
    const stored = { base: 165000, bonus: 24750, equity: 50000 };
    const window = employmentWindow(2026, '2026-02-01', null, '2026-11-01')!;
    const result = earningsForYear([], stored, window, 2026)!;
    const { base, bonus, equity } = result.byComponent;
    expect(base + bonus + equity).toBeCloseTo(result.total, 6);
    expect(base).toBeCloseTo((165000 * 274) / 365, 2);
  });
});

describe('backPayFor', () => {
  const retro = (over: Partial<RaiseEntry> = {}): RaiseEntry => ({
    id: 'r1',
    date: '2026-10-01',
    effective_date: '2026-07-01',
    type: 'merit',
    base_before: 165000,
    base_after: 181500,
    bonus_before: 0,
    bonus_after: 0,
    equity_before: 0,
    equity_after: 0,
    ...over,
  });

  it('owes the whole paychecks that went out at the old rate', () => {
    // 1 Jul to 1 Oct is six fortnightly paychecks short at $16,500 a year over 26 periods.
    const [owed] = backPayFor([retro()], { paychecksPerYear: 26 });
    expect(owed.annualDifference).toBe(16500);
    expect(owed.periods).toBe(6);
    expect(owed.perPeriodDifference).toBeCloseTo(16500 / 26, 6);
    expect(owed.amount).toBeCloseTo((16500 / 26) * 6, 2);
    expect(owed.estimated).toBe(true);
  });

  it('owes nothing when payroll paid it from the effective date', () => {
    expect(backPayFor([retro({ effective_date: '2026-10-01' })], { paychecksPerYear: 26 })).toEqual(
      []
    );
    expect(backPayFor([retro({ effective_date: null })], { paychecksPerYear: 26 })).toEqual([]);
    expect(backPayFor([retro({ effective_date: undefined })], { paychecksPerYear: 26 })).toEqual(
      []
    );
  });

  it('ignores an effective date later than the first payment', () => {
    expect(backPayFor([retro({ effective_date: '2026-10-01' })], { paychecksPerYear: 26 })).toEqual(
      []
    );
  });

  it('owes nothing when only the bonus moved', () => {
    expect(
      backPayFor([retro({ base_after: 165000, bonus_before: 24750, bonus_after: 27225 })], {
        paychecksPerYear: 26,
      })
    ).toEqual([]);
  });

  it('owes nothing on a pay cut', () => {
    expect(backPayFor([retro({ base_after: 100000 })], { paychecksPerYear: 26 })).toEqual([]);
  });

  it('handles two late raises independently', () => {
    const owed = backPayFor(
      [
        retro({ id: 'a', date: '2025-03-01', effective_date: '2025-01-01' }),
        retro({ id: 'b', date: '2026-10-01', effective_date: '2026-07-01' }),
      ],
      { paychecksPerYear: 26 }
    );
    expect(owed.map((entry) => entry.raiseId)).toEqual(['a', 'b']);
    expect(owed[0].periods).toBe(4);
  });
});

describe('backPayFor breakdown', () => {
  const owed = backPayFor(
    [
      {
        id: 'r1',
        date: '2026-10-01',
        effective_date: '2026-07-01',
        type: 'merit',
        base_before: 165000,
        base_after: 181500,
        bonus_before: 24750,
        bonus_after: 27225,
        equity_before: 50000,
        equity_after: 50000,
      },
    ],
    { paychecksPerYear: 26 }
  )[0];

  it('reports the base rates it worked from', () => {
    expect(owed.baseBefore).toBe(165000);
    expect(owed.baseAfter).toBe(181500);
    expect(owed.annualDifference).toBe(16500);
  });

  it('leaves the bonus out, since it is settled at payout on the new rate', () => {
    // The raise also lifts the bonus by 2475, and that may not be prorated into back pay.
    expect(owed.annualDifference).not.toBe(16500 + 2475);
    expect(owed.amount).toBeCloseTo((16500 / 26) * owed.periods, 6);
  });

  it('is unaffected by the length of the year, unlike a day proration', () => {
    const leap = backPayFor(
      [
        {
          id: 'r2',
          date: '2028-03-01',
          effective_date: '2028-01-01',
          type: 'merit',
          base_before: 100000,
          base_after: 110000,
          bonus_before: 0,
          bonus_after: 0,
          equity_before: 50000,
          equity_after: 50000,
        },
      ],
      { paychecksPerYear: 26 }
    )[0];
    expect(leap.perPeriodDifference).toBeCloseTo(10000 / 26, 6);
    expect(leap.amount).toBeCloseTo((10000 / 26) * leap.periods, 6);
  });
});

describe('backPayFor against a known pay calendar', () => {
  const RISE = 16500;
  const PER_PERIOD = RISE / 26;
  // Fortnightly, paid a week after each period ends.
  const PAY_DATES = [
    '2026-07-01',
    '2026-07-15',
    '2026-07-29',
    '2026-08-12',
    '2026-08-26',
    '2026-09-09',
    '2026-09-23',
  ];
  const raise = {
    id: 'r1',
    date: '2026-10-01',
    effective_date: '2026-07-01',
    type: 'merit',
    base_before: 165000,
    base_after: 165000 + RISE,
    bonus_before: 0,
    bonus_after: 0,
    equity_before: 0,
    equity_after: 0,
  } as unknown as Parameters<typeof backPayFor>[0][number];

  it('counts only the paychecks whose work began on or after the effective date', () => {
    const [owed] = backPayFor([raise], {
      paychecksPerYear: 26,
      payDates: PAY_DATES,
      payLagDays: 7,
    });
    // The paycheck on 15 Jul covers work from 25 Jun, which began before the raise.
    expect(owed.periods).toBe(5);
    expect(owed.amount).toBeCloseTo(PER_PERIOD * 5, 2);
    expect(owed.estimated).toBe(false);
  });

  it('counts one more when payroll has no lag, since the periods shift later', () => {
    const [owed] = backPayFor([raise], { paychecksPerYear: 26, payDates: PAY_DATES });
    expect(owed.periods).toBe(6);
  });

  it('excludes the paycheck that settled the raise and anything after it', () => {
    const [owed] = backPayFor([raise], {
      paychecksPerYear: 26,
      payDates: PAY_DATES,
      payLagDays: 7,
    });
    expect(owed.periods).toBeLessThan(PAY_DATES.length);
    expect(owed.paidFrom).toBe('2026-10-01');
  });

  it('falls back to the period length when no pay dates are known, and says so', () => {
    const [owed] = backPayFor([raise], { paychecksPerYear: 26 });
    expect(owed.estimated).toBe(true);
    expect(owed.periods).toBe(Math.floor(92 / 14));
  });

  it('owes nothing when every paycheck already carried the new rate', () => {
    expect(
      backPayFor([raise], {
        paychecksPerYear: 26,
        payDates: ['2026-07-01'],
        payLagDays: 7,
      })
    ).toEqual([]);
  });
});
