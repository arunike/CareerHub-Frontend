import { describe, expect, it } from 'vitest';
import {
  amountFromPercent,
  bonusFromPercent,
  bonusPercentOfBase,
  percentFromAmount,
  buildBonusEvents,
  extrasTotal,
  nextYearBonusEstimate,
  offCyclePeriods,
  payoutSharesTotal,
  prorationFactor,
  resolvePerformanceYear,
  totalBonus,
  type BonusPayout,
  BONUS_EXTRA_PRESETS,
  performanceYearOptions,
  prorationDetail,
} from './bonusSchedule';
import { buildPayPeriods } from './paySchedule';

const periods = buildPayPeriods(2026, 26, { firstPayDate: '2026-01-09' });

const payout = (overrides: Partial<BonusPayout> = {}): BonusPayout => ({
  id: 'p1',
  periodIndex: periods[5].periodIndex,
  payDate: null,
  percent: 100,
  ...overrides,
});

describe('bonusPercentOfBase', () => {
  it('expresses the bonus as a percent of base', () => {
    expect(bonusPercentOfBase(20000, 200000)).toBeCloseTo(10, 6);
  });

  it('avoids dividing by a missing salary', () => {
    expect(bonusPercentOfBase(20000, 0)).toBe(0);
  });

  it('round-trips back to a dollar amount', () => {
    expect(bonusFromPercent(bonusPercentOfBase(24000, 160000), 160000)).toBeCloseTo(24000, 6);
  });
});

describe('buildBonusEvents', () => {
  it('pays the whole bonus in the scheduled period', () => {
    const [event] = buildBonusEvents(20000, [payout()], periods);
    expect(event.kind).toBe('bonus');
    expect(event.amount).toBeCloseTo(20000, 6);
    expect(event.periodIndex).toBe(periods[5].periodIndex);
  });

  it('splits a bonus across several payouts', () => {
    const events = buildBonusEvents(
      20000,
      [
        payout({ id: 'a', periodIndex: periods[2].periodIndex, percent: 25 }),
        payout({ id: 'b', periodIndex: periods[14].periodIndex, percent: 75 }),
      ],
      periods
    );
    expect(events.map((event) => event.amount)).toEqual([5000, 15000]);
  });

  it('drops a payout scheduled outside the paid periods', () => {
    const partYear = buildPayPeriods(2026, 26, {
      firstPayDate: '2026-01-09',
      startDate: '2026-07-01',
    });
    expect(buildBonusEvents(20000, [payout({ periodIndex: 2 })], partYear)).toEqual([]);
  });

  it('ignores zero and negative shares', () => {
    expect(buildBonusEvents(20000, [payout({ percent: 0 })], periods)).toEqual([]);
    expect(buildBonusEvents(20000, [payout({ percent: -10 })], periods)).toEqual([]);
  });

  it('returns nothing without a bonus', () => {
    expect(buildBonusEvents(0, [payout()], periods)).toEqual([]);
  });

  it('labels the payout with its pay date', () => {
    const [event] = buildBonusEvents(1000, [payout()], periods);
    expect(event.label).toContain('Bonus');
  });
});

describe('payoutSharesTotal', () => {
  it('sums the scheduled shares so an incomplete schedule is visible', () => {
    expect(payoutSharesTotal([payout({ percent: 40 }), payout({ id: 'b', percent: 35 })])).toBe(75);
  });

  it('is zero for an empty schedule', () => {
    expect(payoutSharesTotal([])).toBe(0);
  });
});

describe('totalBonus', () => {
  it('is the target when the multiplier is 100 and there are no extras', () => {
    expect(totalBonus(20000, 100, [])).toBe(20000);
  });

  it('scales the target by a company multiplier', () => {
    expect(totalBonus(20000, 115, [])).toBeCloseTo(23000, 6);
  });

  it('adds discretionary extras on top of the multiplied target', () => {
    const extras = [
      { id: 'a', label: 'Company performance', amount: 3000 },
      { id: 'b', label: 'Exceeded expectations', amount: 2000 },
    ];
    expect(totalBonus(20000, 110, extras)).toBeCloseTo(22000 + 5000, 6);
  });

  it('ignores negative extras', () => {
    expect(extrasTotal([{ id: 'a', label: 'x', amount: -500 }])).toBe(0);
  });

  it('never goes negative', () => {
    expect(totalBonus(-100, -50, [])).toBe(0);
  });
});

describe('offCyclePeriods', () => {
  it('creates a period for a bonus paid on its own date', () => {
    const result = offCyclePeriods([payout({ periodIndex: null, payDate: '2026-03-31' })], 2026);
    expect(result).toHaveLength(1);
    expect(result[0].isOffCycle).toBe(true);
    expect(result[0].payDate).toBe('2026-03-31');
  });

  it('ignores payouts that ride with a paycheck', () => {
    expect(offCyclePeriods([payout()], 2026)).toEqual([]);
  });

  it('ignores a date outside the tax year', () => {
    expect(offCyclePeriods([payout({ periodIndex: null, payDate: '2025-03-31' })], 2026)).toEqual(
      []
    );
  });

  it('gives each off-cycle payout its own index', () => {
    const result = offCyclePeriods(
      [
        payout({ id: 'a', periodIndex: null, payDate: '2026-03-31' }),
        payout({ id: 'b', periodIndex: null, payDate: '2026-09-30' }),
      ],
      2026
    );
    expect(new Set(result.map((period) => period.periodIndex)).size).toBe(2);
  });
});

describe('buildBonusEvents with an off-cycle payout', () => {
  it('places the bonus on its own period', () => {
    const offCycle = offCyclePeriods([payout({ periodIndex: null, payDate: '2026-03-31' })], 2026);
    const events = buildBonusEvents(
      20000,
      [payout({ periodIndex: null, payDate: '2026-03-31' })],
      [...periods, ...offCycle]
    );
    expect(events).toHaveLength(1);
    expect(events[0].periodIndex).toBe(offCycle[0].periodIndex);
  });

  it('drops an off-cycle payout whose period was never created', () => {
    expect(
      buildBonusEvents(20000, [payout({ periodIndex: null, payDate: '2026-03-31' })], periods)
    ).toEqual([]);
  });
});

describe('prorationFactor', () => {
  it('is the whole year without employment dates', () => {
    expect(prorationFactor(2026)).toBe(1);
  });

  it('is the whole year for a role that spans it', () => {
    expect(prorationFactor(2026, '2024-01-01', null)).toBe(1);
  });

  it('counts from a mid-year start', () => {
    expect(prorationFactor(2026, '2026-07-01', null)).toBeCloseTo(184 / 365, 6);
  });

  it('counts up to a mid-year end', () => {
    // Jan 1 to Sep 11 is 254 days of 365.
    expect(prorationFactor(2026, null, '2026-09-11')).toBeCloseTo(254 / 365, 6);
  });

  it('handles a role that starts and ends inside the year', () => {
    expect(prorationFactor(2026, '2026-04-01', '2026-06-30')).toBeCloseTo(91 / 365, 6);
  });

  it('is zero for a role that ended before the year', () => {
    expect(prorationFactor(2026, '2020-01-01', '2025-06-30')).toBe(0);
  });

  it('is zero for a role that starts after the year', () => {
    expect(prorationFactor(2026, '2027-02-01', null)).toBe(0);
  });

  it('never exceeds one', () => {
    expect(prorationFactor(2026, '2020-01-01', '2030-01-01')).toBe(1);
  });
});

describe('totalBonus with proration', () => {
  it('scales the target but not the extras', () => {
    const extras = [{ id: 'a', label: 'Spot award', amount: 5000 }];
    expect(totalBonus(20000, 100, extras, 0.5)).toBeCloseTo(10000 + 5000, 6);
  });

  it('applies the multiplier and the proration together', () => {
    expect(totalBonus(20000, 110, [], 0.5)).toBeCloseTo(11000, 6);
  });

  it('is unchanged when proration is off', () => {
    expect(totalBonus(20000, 110, [], 1)).toBeCloseTo(22000, 6);
  });

  it('clamps a nonsensical factor', () => {
    expect(totalBonus(20000, 100, [], 5)).toBeCloseTo(20000, 6);
    expect(totalBonus(20000, 100, [], -1)).toBe(0);
  });
});

describe('resolvePerformanceYear', () => {
  it('defaults to the year before the money arrives', () => {
    expect(resolvePerformanceYear(null, 2026)).toBe(2025);
    expect(resolvePerformanceYear(undefined, 2026)).toBe(2025);
  });

  it('honours an explicit performance year', () => {
    expect(resolvePerformanceYear(2026, 2026)).toBe(2026);
    expect(resolvePerformanceYear(2024, 2026)).toBe(2024);
  });
});

describe('proration against the performance year', () => {
  it('measures the year the bonus was earned, not the year it is paid', () => {
    const earned = prorationFactor(2025, '2025-07-01', null);
    const paid = prorationFactor(2026, '2025-07-01', null);
    expect(earned).toBeCloseTo(184 / 365, 6);
    expect(paid).toBe(1);
    expect(earned).toBeLessThan(paid);
  });

  it('is zero when the role did not exist during the performance year', () => {
    expect(prorationFactor(2025, '2026-01-05', null)).toBe(0);
  });

  it('is a full year for a role that spanned the performance year', () => {
    expect(prorationFactor(2025, '2024-03-01', null)).toBe(1);
  });
});

describe('payout amount and percent stay in step', () => {
  it('derives the amount from the share', () => {
    expect(amountFromPercent(25, 20000)).toBeCloseTo(5000, 6);
  });

  it('derives the share from the amount', () => {
    expect(percentFromAmount(5000, 20000)).toBeCloseTo(25, 6);
  });

  it('round-trips without drifting', () => {
    const total = 23456.78;
    const percent = percentFromAmount(7777.77, total);
    expect(amountFromPercent(percent, total)).toBeCloseTo(7777.77, 6);
  });

  it('is zero when there is no bonus to divide', () => {
    expect(percentFromAmount(5000, 0)).toBe(0);
    expect(amountFromPercent(25, 0)).toBe(0);
  });

  it('treats a negative entry as nothing', () => {
    expect(percentFromAmount(-100, 20000)).toBe(0);
    expect(amountFromPercent(-10, 20000)).toBe(0);
  });

  it('keeps the share stable when the total changes', () => {
    const percent = percentFromAmount(5000, 20000);
    // A later multiplier bump raises the dollars while the share holds.
    expect(amountFromPercent(percent, 30000)).toBeCloseTo(7500, 6);
  });
});

describe('nextYearBonusEstimate', () => {
  const TARGET = 24000;

  it('prorates what a part year is on course to pay out next year', () => {
    const estimate = nextYearBonusEstimate(2026, TARGET, '2026-08-01', null);
    expect(estimate).not.toBeNull();
    expect(estimate?.paidInYear).toBe(2027);
    expect(estimate?.earnedInYear).toBe(2026);
    // Aug 1 to Dec 31 is 153 of 365 days.
    expect(estimate?.proration).toBeCloseTo(153 / 365, 6);
    expect(estimate?.amount).toBeCloseTo(TARGET * (153 / 365), 6);
  });

  it('pays the full target for a full year', () => {
    const estimate = nextYearBonusEstimate(2026, TARGET, '2020-03-01', null);
    expect(estimate?.proration).toBe(1);
    expect(estimate?.amount).toBeCloseTo(TARGET, 6);
  });

  it('says nothing when the role ends before the year does', () => {
    expect(nextYearBonusEstimate(2026, TARGET, '2020-03-01', '2026-09-30')).toBeNull();
  });

  it('still counts a role that runs to the last day of the year', () => {
    const estimate = nextYearBonusEstimate(2026, TARGET, '2020-03-01', '2026-12-31');
    expect(estimate?.proration).toBe(1);
    expect(estimate?.amount).toBeCloseTo(TARGET, 6);
  });

  it('says nothing for a role that ended in an earlier year', () => {
    expect(nextYearBonusEstimate(2026, TARGET, '2020-03-01', '2025-12-31')).toBeNull();
  });

  it('says nothing when there is no target bonus', () => {
    expect(nextYearBonusEstimate(2026, 0, '2020-03-01', null)).toBeNull();
  });

  it('says nothing when the role has not started by the end of the year', () => {
    expect(nextYearBonusEstimate(2026, TARGET, '2027-02-01', null)).toBeNull();
  });

  it('is the target for the year being earned, not the year it arrives', () => {
    // A role starting mid-2026 earns a part-year bonus for 2026, then a full one for 2027.
    const earnedIn2026 = nextYearBonusEstimate(2026, TARGET, '2026-07-01', null);
    const earnedIn2027 = nextYearBonusEstimate(2027, TARGET, '2026-07-01', null);
    expect(earnedIn2026?.amount).toBeLessThan(TARGET);
    expect(earnedIn2027?.amount).toBeCloseTo(TARGET, 6);
  });
});

describe('BONUS_EXTRA_PRESETS', () => {
  it('names each award once, so the dropdown cannot show a duplicate', () => {
    expect(new Set(BONUS_EXTRA_PRESETS).size).toBe(BONUS_EXTRA_PRESETS.length);
  });

  it('holds the one-off awards that used to sit under allowances', () => {
    expect(BONUS_EXTRA_PRESETS).toContain('Referral bonus');
    expect(BONUS_EXTRA_PRESETS).toContain('Spot bonus');
  });

  it('carries labels only, since every award is taxed as supplemental wages', () => {
    for (const preset of BONUS_EXTRA_PRESETS) expect(typeof preset).toBe('string');
  });
});

describe('performanceYearOptions', () => {
  it('offers only the years a role that started mid-2025 covers', () => {
    expect(performanceYearOptions(2026, '2025-06-01', null)).toEqual([2025, 2026]);
  });

  it('offers only this year for a role that started this year', () => {
    expect(performanceYearOptions(2026, '2026-02-01', null)).toEqual([2026]);
  });

  it('stops at the year a role ended', () => {
    expect(performanceYearOptions(2026, '2024-01-01', '2025-08-31')).toEqual([2024, 2025]);
  });

  it('looks no further back than two years for a long-held role', () => {
    expect(performanceYearOptions(2026, '2015-01-01', null)).toEqual([2024, 2025, 2026]);
  });

  it('falls back to the modelled year when the role sits entirely after it', () => {
    expect(performanceYearOptions(2026, '2030-01-01', null)).toEqual([2026]);
  });
});

describe('resolvePerformanceYear against the years a role covers', () => {
  it('keeps the year before, which is where a bonus is usually earned', () => {
    expect(resolvePerformanceYear(null, 2026, [2025, 2026])).toBe(2025);
  });

  it('moves to a year the role existed rather than prorating the target to nothing', () => {
    // A role that began in 2026 earned nothing in 2025, and the old default said 2025.
    expect(resolvePerformanceYear(null, 2026, [2026])).toBe(2026);
  });

  it('drops a stored year the role no longer covers', () => {
    expect(resolvePerformanceYear(2024, 2026, [2025, 2026])).toBe(2025);
  });

  it('honours a stored year the role does cover', () => {
    expect(resolvePerformanceYear(2026, 2026, [2025, 2026])).toBe(2026);
  });
});

describe('prorationDetail', () => {
  it('reports the days behind the factor, so the copy can show its working', () => {
    const detail = prorationDetail(2025, '2025-07-01', null);
    expect(detail.daysInYear).toBe(365);
    expect(detail.daysHeld).toBe(184);
    expect(detail.factor).toBeCloseTo(184 / 365, 10);
  });

  it('counts a leap year as 366 days', () => {
    expect(prorationDetail(2028, null, null).daysInYear).toBe(366);
  });

  it('is a full year for a role held throughout', () => {
    const detail = prorationDetail(2025, '2020-01-01', null);
    expect(detail.factor).toBe(1);
    expect(detail.daysHeld).toBe(365);
  });

  it('is nothing, with no days, when the role was not held that year', () => {
    expect(prorationDetail(2025, '2026-01-01', null)).toEqual({
      factor: 0,
      daysHeld: 0,
      daysInYear: 365,
    });
  });
});
