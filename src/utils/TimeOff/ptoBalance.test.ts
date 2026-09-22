import { describe, expect, it } from 'vitest';
import {
  coverageOfYear,
  daysOffInWindow,
  isWorkday,
  ptoBalance,
  tenureDays,
  yearsOfService,
} from './ptoBalance';
import type { PtoPolicy } from './ptoBalance';

const policy = (over: Partial<PtoPolicy> = {}): PtoPolicy => ({
  ptoDays: 20,
  isUnlimited: false,
  unlimitedPlanningDays: 25,
  rolloverMaxDays: 5,
  accrualDaysPerYear: 0,
  accrualMaxDays: 0,
  hoursPerDay: 8,
  paychecksPerYear: 26,
  ...over,
});

const wholeYear = { startDate: '2025-07-01', endDate: null };
const day = (date: string, days = 1) => ({ date, days, kind: 'PTO' });

describe('coverageOfYear', () => {
  it('gives a full year to a role that ran all of it', () => {
    expect(coverageOfYear(wholeYear, 2026)).toBe(1);
  });

  it('clips the year a role started in', () => {
    expect(coverageOfYear({ startDate: '2026-07-01', endDate: null }, 2026)).toBeCloseTo(
      184 / 365,
      4
    );
  });

  it('gives nothing for a year the role had already ended', () => {
    expect(coverageOfYear({ startDate: '2025-07-01', endDate: '2025-11-01' }, 2026)).toBe(0);
  });
});

describe('ptoBalance', () => {
  it('counts days taken against the allowance', () => {
    // No rollover, so this isolates the year's own arithmetic from anything carried in.
    const result = ptoBalance({
      policy: policy({ rolloverMaxDays: 0 }),
      window: wholeYear,
      year: 2026,
      entries: [day('2026-07-01'), day('2026-07-02', 0.5)],
    });
    expect(result).toMatchObject({ entitled: 20, taken: 1.5, remaining: 18.5, prorated: false });
  });

  it('prorates the allowance in the year the job started', () => {
    const result = ptoBalance({
      policy: policy(),
      window: { startDate: '2026-07-01', endDate: null },
      year: 2026,
      entries: [],
    });
    expect(result.entitled).toBe(10);
    expect(result.prorated).toBe(true);
  });

  it('carries unused days forward, capped at the rollover limit', () => {
    const result = ptoBalance({
      policy: policy({ rolloverMaxDays: 5 }),
      window: wholeYear,
      year: 2026,
      entries: [day('2025-08-01')],
    });
    // 2025 was itself prorated from 1 July, so the cap is what binds, not the unused figure.
    expect(result.rolledOver).toBe(5);
    expect(result.remaining).toBe(25);
  });

  it('carries nothing when the policy allows no rollover', () => {
    expect(
      ptoBalance({
        policy: policy({ rolloverMaxDays: 0 }),
        window: wholeYear,
        year: 2026,
        entries: [],
      }).rolledOver
    ).toBe(0);
  });

  it('never carries more than was actually left unused', () => {
    const result = ptoBalance({
      policy: policy({ ptoDays: 20, rolloverMaxDays: 15 }),
      window: { startDate: '2020-01-01', endDate: null },
      year: 2026,
      entries: [day('2025-03-01'), day('2025-03-02'), day('2025-03-03')],
    });
    expect(result.rolledOver).toBe(15);
  });

  it('measures an unlimited policy against what you said it is worth', () => {
    const result = ptoBalance({
      policy: policy({ isUnlimited: true, unlimitedPlanningDays: 25 }),
      window: wholeYear,
      year: 2026,
      entries: [day('2026-07-01')],
    });
    expect(result).toMatchObject({ entitled: 25, taken: 1, remaining: 24, unlimited: true });
  });

  it('carries nothing under an unlimited policy, since there is no balance to bank', () => {
    expect(
      ptoBalance({
        policy: policy({ isUnlimited: true }),
        window: wholeYear,
        year: 2026,
        entries: [],
      }).rolledOver
    ).toBe(0);
  });

  it('goes negative rather than clamping, so overspending an unlimited budget is visible', () => {
    const result = ptoBalance({
      policy: policy({ isUnlimited: true, unlimitedPlanningDays: 2 }),
      window: wholeYear,
      year: 2026,
      entries: [day('2026-07-01'), day('2026-07-02'), day('2026-07-03')],
    });
    expect(result.remaining).toBe(-1);
  });

  it('ignores sick days, which have their own allowance', () => {
    const result = ptoBalance({
      policy: policy(),
      window: wholeYear,
      year: 2026,
      entries: [{ date: '2026-07-01', days: 1, kind: 'SICK' }],
    });
    expect(result.taken).toBe(0);
  });
});

describe('daysOffInWindow', () => {
  // All weekdays: 1 Jul 2026 is a Wednesday, 2 Jul a Thursday, 2 Nov a Monday.
  const days = [
    { date: '2026-07-01', tab: null },
    { date: '2026-07-02', tab: null },
    { date: '2026-07-02', tab: null },
    { date: '2026-11-02', tab: null },
    { date: '2026-07-03', tab: 'federal' },
  ];

  it('counts one day away from work even when two entries share the date', () => {
    expect(daysOffInWindow(days, { startDate: null, endDate: null }, 2026)).toEqual([
      '2026-07-01',
      '2026-07-02',
      '2026-11-02',
    ]);
  });

  it('leaves days on a holiday tab alone, which are not your time off', () => {
    expect(daysOffInWindow(days, { startDate: null, endDate: null }, 2026)).not.toContain(
      '2026-07-03'
    );
  });

  it('gives the day to the role that was running then, so a job change splits the year', () => {
    const leaver = { startDate: '2025-07-01', endDate: '2026-11-01' };
    const joiner = { startDate: '2026-11-01', endDate: null };
    expect(daysOffInWindow(days, leaver, 2026)).toEqual(['2026-07-01', '2026-07-02']);
    expect(daysOffInWindow(days, joiner, 2026)).toEqual(['2026-11-02']);
  });
});

describe('weekends', () => {
  it('knows a Saturday and a Sunday are not workdays', () => {
    expect(isWorkday('2026-07-04')).toBe(false);
    expect(isWorkday('2026-07-05')).toBe(false);
    expect(isWorkday('2026-07-06')).toBe(true);
  });

  it('spends no leave on a weekend inside a trip', () => {
    // 4 and 5 Jul 2026 are the weekend; only the Friday and the Monday cost a day.
    const trip = ['2026-07-03', '2026-07-04', '2026-07-05', '2026-07-06'].map((date) => ({
      date,
      tab: null,
    }));
    expect(daysOffInWindow(trip, { startDate: null, endDate: null }, 2026)).toEqual([
      '2026-07-03',
      '2026-07-06',
    ]);
  });
});

describe('linking a day to a role', () => {
  const window = { startDate: '2026-01-01', endDate: '2026-12-31' };

  it('never counts a day marked as not taken as leave', () => {
    const days = [{ date: '2026-07-01', tab: null, counts_as_pto: false }];
    expect(daysOffInWindow(days, window, 2026, 7)).toEqual([]);
  });

  it('charges an explicitly linked day to that role only', () => {
    const days = [{ date: '2026-07-01', tab: null, pto_experience_ids: [7] }];
    expect(daysOffInWindow(days, window, 2026, 7)).toEqual(['2026-07-01']);
    expect(daysOffInWindow(days, window, 2026, 8)).toEqual([]);
  });

  it('falls back to the date when no role was chosen', () => {
    const days = [{ date: '2026-07-01', tab: null }];
    expect(daysOffInWindow(days, window, 2026, 8)).toEqual(['2026-07-01']);
  });

  it('charges a day to every role it names, for concurrent jobs', () => {
    const days = [{ date: '2026-07-01', tab: null, pto_experience_ids: [7, 8] }];
    expect(daysOffInWindow(days, window, 2026, 7)).toEqual(['2026-07-01']);
    expect(daysOffInWindow(days, window, 2026, 8)).toEqual(['2026-07-01']);
  });
});

describe('tenure accrual', () => {
  const since2020 = { startDate: '2020-07-01', endDate: null };

  it('counts the anniversary reached during the year, not only before it', () => {
    // Started Jul 2025, so 2026 is the year the first year of service completes.
    expect(yearsOfService({ startDate: '2025-07-01', endDate: null }, 2026)).toBe(1);
    expect(yearsOfService(since2020, 2026)).toBe(6);
  });

  it('gives no service years in the year the role started', () => {
    expect(yearsOfService({ startDate: '2026-01-01', endDate: null }, 2026)).toBe(0);
  });

  it('adds nothing while the policy is switched off', () => {
    expect(tenureDays(policy(), since2020, 2026)).toBe(0);
  });

  it('grants a day per completed year once it is on', () => {
    expect(tenureDays(policy({ accrualDaysPerYear: 1 }), since2020, 2026)).toBe(6);
  });

  it('stops at the ceiling', () => {
    expect(tenureDays(policy({ accrualDaysPerYear: 1, accrualMaxDays: 3 }), since2020, 2026)).toBe(
      3
    );
  });

  it('never accrues under an unlimited policy, which has no allowance to grow', () => {
    expect(tenureDays(policy({ isUnlimited: true, accrualDaysPerYear: 1 }), since2020, 2026)).toBe(
      0
    );
  });

  it('raises the allowance by what tenure earned', () => {
    const grown = ptoBalance({
      policy: policy({ accrualDaysPerYear: 1, accrualMaxDays: 3, rolloverMaxDays: 0 }),
      window: since2020,
      year: 2026,
      entries: [],
    });
    expect(grown).toMatchObject({ entitled: 23, accrued: 3 });
  });
});
