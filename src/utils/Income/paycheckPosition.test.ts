import { describe, expect, it } from 'vitest';
import { scheduledPosition } from './paycheckPosition';

// Starting 1 Jul on a biweekly year: the calendar's periods 14-26 are the only ones it pays.
const midYearStart = Array.from({ length: 13 }, (_, index) => ({ periodIndex: index + 14 }));

describe('scheduledPosition', () => {
  it('counts a mid-year cheque against the ones this role pays, not the calendar year', () => {
    expect(scheduledPosition(midYearStart, 14)).toEqual({ position: 1, total: 13 });
    expect(scheduledPosition(midYearStart, 26)).toEqual({ position: 13, total: 13 });
  });

  it('leaves a whole year reading exactly as it did', () => {
    const wholeYear = Array.from({ length: 26 }, (_, index) => ({ periodIndex: index + 1 }));
    expect(scheduledPosition(wholeYear, 14)).toEqual({ position: 14, total: 26 });
  });

  it('ignores off-cycle payments, which are not part of the run', () => {
    const withBonus = [
      { periodIndex: 14 },
      { periodIndex: 1000, isOffCycle: true },
      { periodIndex: 15 },
    ];
    expect(scheduledPosition(withBonus, 15)).toEqual({ position: 2, total: 2 });
  });

  it('reports nothing found as position zero rather than guessing', () => {
    expect(scheduledPosition(midYearStart, 99)).toEqual({ position: 0, total: 13 });
  });
});
