import { describe, expect, it } from 'vitest';
import {
  applyPayDateOverrides,
  buildPayDates,
  buildPayPeriods,
  defaultFirstPayDate,
  parseIsoDate,
  toIsoDate,
} from './paySchedule';

describe('buildPayDates', () => {
  it('steps biweekly from the anchor date', () => {
    const dates = buildPayDates(2026, 26, '2026-01-09');
    expect(toIsoDate(dates[0])).toBe('2026-01-09');
    expect(toIsoDate(dates[1])).toBe('2026-01-23');
    expect(dates.length).toBeGreaterThanOrEqual(26);
  });

  it('honours a different biweekly anchor', () => {
    const dates = buildPayDates(2026, 26, '2026-01-02');
    expect(toIsoDate(dates[0])).toBe('2026-01-02');
    expect(toIsoDate(dates[1])).toBe('2026-01-16');
  });

  it('walks an anchor from a prior year forward into the tax year', () => {
    const dates = buildPayDates(2026, 26, '2024-01-05');
    expect(dates[0].getFullYear()).toBe(2026);
  });

  it('pays semi-monthly on the 15th and the last day', () => {
    const dates = buildPayDates(2026, 24);
    expect(toIsoDate(dates[0])).toBe('2026-01-15');
    expect(toIsoDate(dates[1])).toBe('2026-01-31');
    expect(dates).toHaveLength(24);
  });

  it('pays monthly on the anchor day, clamped to short months', () => {
    const dates = buildPayDates(2026, 12, '2026-01-31');
    expect(toIsoDate(dates[1])).toBe('2026-02-28');
    expect(dates).toHaveLength(12);
  });

  it('pays weekly when there are 52 periods', () => {
    expect(buildPayDates(2026, 52, '2026-01-02').length).toBeGreaterThanOrEqual(52);
  });
});

describe('buildPayPeriods', () => {
  it('drops paychecks before the start date', () => {
    const periods = buildPayPeriods(2026, 26, {
      firstPayDate: '2026-01-09',
      startDate: '2026-07-01',
    });
    expect(periods.length).toBeGreaterThan(0);
    expect(parseIsoDate(periods[0].payDate)!.getTime()).toBeGreaterThanOrEqual(
      parseIsoDate('2026-07-01')!.getTime()
    );
  });

  it('keeps the cheque that pays for the last days worked, prorated', () => {
    // Leaving on 11 Sep, the 18 Sep cheque still covers 5-11 Sep: seven of its fourteen days.
    const periods = buildPayPeriods(2026, 26, {
      firstPayDate: '2026-01-09',
      endDate: '2026-09-11',
    });
    expect(periods.at(-1)!.payDate).toBe('2026-09-18');
    expect(periods.at(-1)!.coverage).toBeCloseTo(7 / 14, 6);
    expect(periods.at(-2)!.payDate).toBe('2026-09-04');
    expect(periods.at(-2)!.coverage).toBeUndefined();
  });

  it('drops a cheque whose whole period falls after the end date', () => {
    const periods = buildPayPeriods(2026, 26, {
      firstPayDate: '2026-01-09',
      endDate: '2026-09-04',
    });
    expect(periods.at(-1)!.payDate).toBe('2026-09-04');
  });

  it('leaves the opening cheque whole, so a year-spanning role keeps its December days', () => {
    const periods = buildPayPeriods(2026, 26, {
      firstPayDate: '2026-01-09',
      startDate: '2026-07-01',
    });
    expect(periods[0].payDate).toBe('2026-07-10');
    expect(periods[0].coverage).toBeUndefined();
  });

  it('keeps the original period numbering so a part year is not renumbered', () => {
    const full = buildPayPeriods(2026, 26, { firstPayDate: '2026-01-09' });
    const partial = buildPayPeriods(2026, 26, {
      firstPayDate: '2026-01-09',
      startDate: '2026-07-01',
    });
    expect(partial[0].periodIndex).toBeGreaterThan(1);
    expect(full.some((period) => period.periodIndex === partial[0].periodIndex)).toBe(true);
  });

  it('returns nothing when the role ended before the year began', () => {
    expect(buildPayPeriods(2026, 26, { endDate: '2025-06-01' })).toEqual([]);
  });

  it('covers the whole year when there are no employment bounds', () => {
    expect(buildPayPeriods(2026, 24).length).toBe(24);
  });
});

describe('defaultFirstPayDate', () => {
  it('anchors biweekly pay on the first Friday', () => {
    expect(defaultFirstPayDate(2026, 26)).toBe('2026-01-02');
  });

  it('anchors semi-monthly pay on the 15th', () => {
    expect(defaultFirstPayDate(2026, 24)).toBe('2026-01-15');
  });
});

describe('applyPayDateOverrides', () => {
  const periods = buildPayPeriods(2026, 26, { firstPayDate: '2026-01-09' });

  it('leaves the run alone without overrides', () => {
    expect(applyPayDateOverrides(periods, [])).toBe(periods);
    expect(applyPayDateOverrides(periods, [{ periodIndex: 3, payDate: null }])).toBe(periods);
  });

  it('moves a payday earlier, e.g. off a federal holiday', () => {
    const moved = applyPayDateOverrides(periods, [{ periodIndex: 3, payDate: '2026-02-05' }]);
    const period = moved.find((candidate) => candidate.periodIndex === 3)!;
    expect(period.payDate).toBe('2026-02-05');
    expect(period.isAdjustedDate).toBe(true);
  });

  it('keeps the run in date order after a move', () => {
    const moved = applyPayDateOverrides(periods, [{ periodIndex: 2, payDate: '2026-12-30' }]);
    const dates = moved.map((period) => period.payDate);
    expect([...dates].sort((a, b) => a.localeCompare(b))).toEqual(dates);
  });

  it('leaves untouched periods unflagged', () => {
    const moved = applyPayDateOverrides(periods, [{ periodIndex: 3, payDate: '2026-02-05' }]);
    expect(moved.find((candidate) => candidate.periodIndex === 4)!.isAdjustedDate).toBeUndefined();
  });

  it('keeps the period numbering', () => {
    const moved = applyPayDateOverrides(periods, [{ periodIndex: 3, payDate: '2026-02-05' }]);
    expect(moved.map((period) => period.periodIndex).sort((a, b) => a - b)).toEqual(
      periods.map((period) => period.periodIndex).sort((a, b) => a - b)
    );
  });
});
