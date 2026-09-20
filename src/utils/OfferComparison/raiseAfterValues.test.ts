import { describe, expect, it } from 'vitest';
import {
  annualFromHourly,
  changeBetween,
  formatPercentChange,
  hourlyFromAnnual,
} from './raiseAfterValues';
import { bonusAtSameRate } from '../bonusPercent';

describe('annualFromHourly', () => {
  it('annualises at the same 2080 hours the Experience pay growth uses', () => {
    expect(annualFromHourly(50)).toBe(104000);
  });

  it('round-trips an annual figure through the hourly rate', () => {
    expect(annualFromHourly(hourlyFromAnnual(165000))).toBe(165000);
  });

  it('treats a negative rate as nothing rather than owing money', () => {
    expect(annualFromHourly(-10)).toBe(0);
    expect(hourlyFromAnnual(0)).toBe(0);
  });
});

describe('bonusAtSameRate', () => {
  it('carries the bonus up at the share of base it already had', () => {
    // Google's 15% target: 165000/24750 held against a 10% merit rise.
    expect(bonusAtSameRate(165000, 24750, 181500)).toBe(27225);
  });

  it('leaves the bonus alone when there is no base to take a share of', () => {
    expect(bonusAtSameRate(0, 24750, 181500)).toBe(24750);
  });

  it('leaves a zero bonus at zero rather than inventing one', () => {
    expect(bonusAtSameRate(165000, 0, 181500)).toBe(0);
  });

  it('follows a cut down as well as a rise up', () => {
    expect(bonusAtSameRate(165000, 24750, 150000)).toBe(22500);
  });
});

describe('changeBetween', () => {
  it('reports the amount and the percent of a rise', () => {
    expect(changeBetween(165000, 181500)).toEqual({ amount: 16500, percent: 10 });
  });

  it('signs a cut negative on both', () => {
    const change = changeBetween(165000, 148500);
    expect(change.amount).toBe(-16500);
    expect(change.percent).toBeCloseTo(-10, 10);
  });

  it('has no percent when there was nothing before, which is not 0%', () => {
    expect(changeBetween(0, 50000)).toEqual({ amount: 50000, percent: null });
  });

  it('reports no change as zero, not as nothing', () => {
    expect(changeBetween(165000, 165000)).toEqual({ amount: 0, percent: 0 });
  });
});

describe('formatPercentChange', () => {
  it('signs a rise, a cut and a hold', () => {
    expect(formatPercentChange(10)).toBe('+10.0%');
    expect(formatPercentChange(-10)).toBe('−10.0%');
    expect(formatPercentChange(0)).toBe('0.0%');
  });
});
