import { describe, expect, it } from 'vitest';
import {
  ONE_TIME_HORIZON_YEARS,
  computeIndependentFinancialScore,
  financialScoreValue,
  bonusClockDate,
} from './financialScore';

const input = (over: Partial<Parameters<typeof financialScoreValue>[0]> = {}) => ({
  adjustedValue: 300000,
  benefitsPortion: 0,
  afterTaxSignOn: 40000,
  afterTaxRelocation: 0,
  bonusNetOnMove: 0,
  colIndex: 100,
  ...over,
});

describe('financialScoreValue', () => {
  it('counts a sign-on at a quarter, not in full', () => {
    const result = financialScoreValue(input());
    expect(result.value).toBeCloseTo(300000 - 40000 + 10000);
    expect(result.oneTimeCounted).toBeCloseTo(40000 / ONE_TIME_HORIZON_YEARS);
  });

  it('leaves an offer with no one-time money untouched', () => {
    expect(financialScoreValue(input({ afterTaxSignOn: 0 })).value).toBeCloseTo(300000);
  });

  it('ranks recurring pay above the same money paid once', () => {
    const recurring = financialScoreValue(input({ adjustedValue: 340000, afterTaxSignOn: 0 }));
    const oneOff = financialScoreValue(input({ adjustedValue: 340000, afterTaxSignOn: 40000 }));
    expect(recurring.value).toBeGreaterThan(oneOff.value);
  });

  it('scales one-time money by cost of living the same way the total is', () => {
    const cheap = financialScoreValue(input({ colIndex: 50 }));
    const dear = financialScoreValue(input({ colIndex: 150 }));
    expect(cheap.oneTimeCounted).toBeGreaterThan(dear.oneTimeCounted);
  });

  it('nets the bonus effect off the sign-on', () => {
    const withOffset = financialScoreValue(input({ bonusNetOnMove: 40000 }));
    expect(withOffset.oneTimeTotal).toBeCloseTo(0);
    expect(withOffset.value).toBeCloseTo(300000 - 40000);
  });

  it('can turn a sign-on into a net loss when the bonus effect is bigger', () => {
    const result = financialScoreValue(input({ bonusNetOnMove: 80000 }));
    expect(result.oneTimeTotal).toBeLessThan(0);
    expect(result.value).toBeLessThan(financialScoreValue(input()).value);
  });

  it('takes the benefits slice out as well, without touching the one-time maths', () => {
    const result = financialScoreValue(input({ benefitsPortion: 15000 }));
    expect(result.value).toBeCloseTo(300000 - 15000 - 40000 + 10000);
  });
});

describe('computeIndependentFinancialScore', () => {
  it('still rewards a bigger number and refuses a negative one', () => {
    expect(computeIndependentFinancialScore(400000)).toBeGreaterThan(
      computeIndependentFinancialScore(300000)
    );
    expect(computeIndependentFinancialScore(-5)).toBe(0);
  });
});

describe('bonusClockDate', () => {
  it('prefers the start date you recorded on the offer', () => {
    expect(bonusClockDate({ expected_start_date: '2027-01-01' }, '2026-09-11')).toBe('2027-01-01');
  });

  it('falls back to the day you actually started', () => {
    expect(bonusClockDate({ linked_experience: { start_date: '2026-03-02' } }, '2026-09-11')).toBe(
      '2026-03-02'
    );
  });

  it('uses today only when the offer says nothing about starting', () => {
    expect(bonusClockDate({}, '2026-09-11')).toBe('2026-09-11');
    expect(bonusClockDate({ expected_start_date: null }, '2026-09-11')).toBe('2026-09-11');
  });

  it('reads a timestamp down to its date', () => {
    expect(bonusClockDate({ expected_start_date: '2027-01-01T09:00:00Z' }, '2026-09-11')).toBe(
      '2027-01-01'
    );
  });
});

describe('a net bonus loss lowers the score', () => {
  it('subtracts it, rather than only shrinking the sign-on on paper', () => {
    const without = financialScoreValue(input({ bonusNetOnMove: 0 }));
    const withLoss = financialScoreValue(input({ bonusNetOnMove: 20000 }));
    expect(withLoss.value).toBeLessThan(without.value);
    // A quarter of it lands this year, matching how a sign-on is amortised.
    expect(without.value - withLoss.value).toBeCloseTo(20000 / ONE_TIME_HORIZON_YEARS, 5);
  });

  it('raises the value when the new first bonus is the bigger of the two', () => {
    const gain = financialScoreValue(input({ bonusNetOnMove: -8000 }));
    expect(gain.value).toBeGreaterThan(financialScoreValue(input({ bonusNetOnMove: 0 })).value);
  });

  it('still subtracts when there is no sign-on to net it against', () => {
    const result = financialScoreValue(input({ afterTaxSignOn: 0, bonusNetOnMove: 20000 }));
    expect(result.oneTimeTotal).toBeCloseTo(-20000);
    expect(result.value).toBeLessThan(financialScoreValue(input({ afterTaxSignOn: 0 })).value);
  });
});
