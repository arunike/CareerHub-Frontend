import { describe, expect, it } from 'vitest';
import {
  ONE_TIME_HORIZON_YEARS,
  computeIndependentFinancialScore,
  financialScoreValue,
  bonusYearElapsed,
  forfeitedBonus,
} from './financialScore';

const input = (over: Partial<Parameters<typeof financialScoreValue>[0]> = {}) => ({
  adjustedValue: 300000,
  benefitsPortion: 0,
  afterTaxSignOn: 40000,
  afterTaxRelocation: 0,
  forfeitedBonus: 0,
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

  it('nets the forfeited bonus off the sign-on', () => {
    const withOffset = financialScoreValue(input({ forfeitedBonus: 40000 }));
    expect(withOffset.oneTimeTotal).toBeCloseTo(0);
    expect(withOffset.value).toBeCloseTo(300000 - 40000);
  });

  it('can turn a sign-on into a net loss when the bonus given up is bigger', () => {
    const result = financialScoreValue(input({ forfeitedBonus: 80000 }));
    expect(result.oneTimeTotal).toBeLessThan(0);
    expect(result.value).toBeLessThan(financialScoreValue(input()).value);
  });

  it('takes the benefits slice out as well, without touching the one-time maths', () => {
    const result = financialScoreValue(input({ benefitsPortion: 15000 }));
    expect(result.value).toBeCloseTo(300000 - 15000 - 40000 + 10000);
  });
});

describe('bonusYearElapsed', () => {
  it('is nothing right after the bonus lands', () => {
    // Paid at the end of December, so the first of January has accrued nothing.
    expect(bonusYearElapsed('2027-01-01')).toBeCloseTo(0, 2);
  });

  it('is almost the whole year the day before the next one lands', () => {
    expect(bonusYearElapsed('2026-12-31')).toBeGreaterThan(0.99);
  });

  it('is about half way through the middle of the year', () => {
    expect(bonusYearElapsed('2026-07-01')).toBeCloseTo(0.5, 1);
  });

  it('follows a payout month that is not December', () => {
    // Paid at the end of March, so April has barely accrued and March is nearly a full year.
    expect(bonusYearElapsed('2026-04-01', 3)).toBeCloseTo(0, 2);
    expect(bonusYearElapsed('2026-03-30', 3)).toBeGreaterThan(0.99);
  });

  it('does not throw on an unreadable date', () => {
    expect(bonusYearElapsed('nonsense')).toBe(0);
  });
});

describe('forfeitedBonus', () => {
  it('is the share of the year worked since the last payout', () => {
    expect(forfeitedBonus(24000, '2026-07-01')).toBeCloseTo(12000, -2);
  });

  it('is nothing when you leave just after it is paid, which is the point', () => {
    expect(forfeitedBonus(24000, '2027-01-01')).toBeCloseTo(0, 1);
  });

  it('is nothing without a bonus to lose', () => {
    expect(forfeitedBonus(0, '2026-07-01')).toBe(0);
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
