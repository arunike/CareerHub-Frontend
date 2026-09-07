import { describe, expect, it } from 'vitest';
import { benefitsBreakdown, benefitsScoreFrom, scoreBenefitsWithBreakdown } from './benefitsScore';
import { CATEGORY_KEYS, DEFAULT_WEIGHTS, normalizeScoreWeights } from './decisionScoring';

const offer = (over: Record<string, unknown> = {}) => ({
  base_salary: 165000,
  benefits_value: 0,
  benefit_items: [],
  forty_one_k_match_percent: 100,
  forty_one_k_max_match: 6,
  hsa_employer_contribution: 1000,
  health_premium_monthly: 200,
  ...over,
});

describe('benefitsBreakdown', () => {
  it('values the match as a percentage of a percentage of base', () => {
    // 100% match on the first 6% of $165,000 is $9,900.
    expect(benefitsBreakdown(offer()).retirementMatch).toBeCloseTo(9900);
  });

  it('takes the premiums you pay off the employer contributions', () => {
    const parts = benefitsBreakdown(offer());
    expect(parts.premiums).toBeGreaterThan(0);
    expect(parts.net).toBeCloseTo(parts.retirementMatch + parts.hsa + parts.perks - parts.premiums);
  });

  it('taxes a perk before counting it, the way Financial does', () => {
    const withPerk = benefitsBreakdown(offer({ benefits_value: 10000 }), 40);
    const untaxed = benefitsBreakdown(offer({ benefits_value: 10000 }), 0);
    expect(withPerk.perks).toBeCloseTo(6000);
    expect(untaxed.perks).toBeCloseTo(10000);
  });

  it('reports a negative net when the premiums outweigh everything', () => {
    const parts = benefitsBreakdown(
      offer({ forty_one_k_match_percent: 0, hsa_employer_contribution: 0 })
    );
    expect(parts.net).toBeLessThan(0);
  });
});

describe('benefitsScoreFrom', () => {
  it('is neutral where the employer gives back exactly the premiums', () => {
    expect(benefitsScoreFrom(0)).toBe(50);
  });

  it('reaches full marks at the reference package and stops there', () => {
    expect(benefitsScoreFrom(20000)).toBe(100);
    expect(benefitsScoreFrom(60000)).toBe(100);
  });

  it('does not go below zero on an expensive plan with no match', () => {
    expect(benefitsScoreFrom(-90000)).toBe(0);
  });

  it('rises with the value of the package', () => {
    expect(benefitsScoreFrom(10000)).toBeGreaterThan(benefitsScoreFrom(5000));
  });
});

describe('scoreBenefitsWithBreakdown', () => {
  it('explains itself without leaving the reader to guess the maths', () => {
    const result = scoreBenefitsWithBreakdown(offer());
    expect(result.calculationLines.some((line) => line.includes('401(k) match'))).toBe(true);
    expect(result.calculationLines.some((line) => line.includes('Net benefits value'))).toBe(true);
    expect(result.calculationLines.some((line) => line.includes('Worst case'))).toBe(true);
  });
});

describe('score weights with the new category', () => {
  it('includes Benefits and still totals 100', () => {
    expect(CATEGORY_KEYS).toContain('benefits');
    expect(Object.values(DEFAULT_WEIGHTS).reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it('rescales weights saved before Benefits existed rather than totalling 110', () => {
    const legacy = { financial: 44, workLife: 19, growth: 15, location: 10, brand: 6, team: 6 };
    const next = normalizeScoreWeights(legacy);
    expect(Object.values(next).reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(next.benefits).toBeGreaterThan(0);
  });

  it('leaves a set of weights that already totals 100 alone', () => {
    expect(normalizeScoreWeights(DEFAULT_WEIGHTS)).toEqual(DEFAULT_WEIGHTS);
  });
});
