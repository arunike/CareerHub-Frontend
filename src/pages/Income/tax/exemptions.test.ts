import { describe, expect, it } from 'vitest';
import { annualLiability, exemptionAmount, exemptionsClaimed } from './liability';
import { federalTable } from './data';

const Y2017 = federalTable(2017);
const Y2026 = federalTable(2026);

describe('exemptionsClaimed', () => {
  it('counts one for a single filer', () => {
    expect(exemptionsClaimed('SINGLE')).toBe(1);
    expect(exemptionsClaimed('HEAD_OF_HOUSEHOLD')).toBe(1);
    expect(exemptionsClaimed('MARRIED_FILING_SEPARATELY')).toBe(1);
  });

  it('counts two for a joint filer', () => {
    expect(exemptionsClaimed('MARRIED_FILING_JOINTLY')).toBe(2);
  });

  it('adds one per dependent', () => {
    expect(exemptionsClaimed('SINGLE', 2)).toBe(3);
    expect(exemptionsClaimed('MARRIED_FILING_JOINTLY', 3)).toBe(5);
  });

  it('ignores a negative or fractional count', () => {
    expect(exemptionsClaimed('SINGLE', -4)).toBe(1);
    expect(exemptionsClaimed('SINGLE', 1.9)).toBe(2);
  });
});

describe('exemptionAmount', () => {
  it('is zero from 2018, when the exemption was repealed', () => {
    expect(exemptionAmount(100000, Y2026, 'SINGLE', 3)).toBe(0);
  });

  it('is the per-person amount times the count in 2017', () => {
    expect(exemptionAmount(100000, Y2017, 'SINGLE')).toBe(4050);
    expect(exemptionAmount(100000, Y2017, 'MARRIED_FILING_JOINTLY', 2)).toBe(4050 * 4);
  });

  it('is unreduced below the phase-out threshold', () => {
    expect(exemptionAmount(261500, Y2017, 'SINGLE')).toBe(4050);
  });

  it('phases out above the threshold', () => {
    // One $2,500 step over $261,500 cuts the exemption by 2%.
    expect(exemptionAmount(262000, Y2017, 'SINGLE')).toBeCloseTo(4050 * 0.98, 6);
  });

  it('counts a partial step as a whole one, as the rule requires', () => {
    expect(exemptionAmount(261501, Y2017, 'SINGLE')).toBeCloseTo(4050 * 0.98, 6);
  });

  it('reaches zero once fully phased out', () => {
    // 50 steps of 2% removes all of it.
    expect(exemptionAmount(261500 + 50 * 2500, Y2017, 'SINGLE')).toBe(0);
  });

  it('never goes negative past full phase-out', () => {
    expect(exemptionAmount(2000000, Y2017, 'SINGLE')).toBe(0);
  });

  it('uses the joint threshold for a joint filer', () => {
    expect(exemptionAmount(300000, Y2017, 'MARRIED_FILING_JOINTLY')).toBe(4050 * 2);
    expect(exemptionAmount(320000, Y2017, 'MARRIED_FILING_JOINTLY')).toBeLessThan(4050 * 2);
  });
});

describe('annualLiability with exemptions', () => {
  // 2017 single on $80,000: 80,000 − 6,350 standard − 4,050 exemption = 69,600 taxable.
  it('matches a hand-computed 2017 single filer', () => {
    const expected = 9325 * 0.1 + (37950 - 9325) * 0.15 + (69600 - 37950) * 0.25;
    expect(annualLiability(80000, Y2017, 'SINGLE')).toBeCloseTo(expected, 6);
  });

  it('taxes less when dependents are claimed, pre-2018', () => {
    const without = annualLiability(80000, Y2017, 'SINGLE');
    const withTwo = annualLiability(80000, Y2017, 'SINGLE', 2);
    expect(withTwo).toBeLessThan(without);
  });

  it('ignores dependents from 2018 onward', () => {
    expect(annualLiability(80000, Y2026, 'SINGLE', 3)).toBe(
      annualLiability(80000, Y2026, 'SINGLE')
    );
  });

  it('would have overstated 2017 tax without the exemption', () => {
    // The old behaviour: standard deduction only.
    const withExemption = annualLiability(80000, Y2017, 'SINGLE');
    const withoutExemption = annualLiability(80000, { ...Y2017, personalExemption: 0 }, 'SINGLE');
    expect(withoutExemption - withExemption).toBeCloseTo(4050 * 0.25, 6);
  });
});
