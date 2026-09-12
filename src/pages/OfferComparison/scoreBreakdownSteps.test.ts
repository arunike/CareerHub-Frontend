import { describe, expect, it } from 'vitest';
import { stepOneHeading, totalFormula } from './ScoreBreakdown';
import { buildFinancialCalculationLines, buildScoreValueLines, lessTax } from './decisionScoring';

describe('the breakdown only numbers steps it actually has', () => {
  it('drops the "Step 1" prefix when nothing is skipped', () => {
    expect(stepOneHeading(false)).toBe('Weighted points per category');
  });

  it('keeps it when a second step follows', () => {
    expect(stepOneHeading(true)).toBe('Step 1 — Weighted points per category');
  });
});

describe('totalFormula', () => {
  it('shows only the rounding when every category is filled', () => {
    // Dividing by 1 read as a calculation while doing nothing.
    expect(totalFormula(6671, 100, 67)).toBe('66.71 pts rounded = 67');
  });

  it('shows the division when skipped categories stretched the weights', () => {
    expect(totalFormula(6671, 80, 83)).toBe('66.71 pts ÷ 0.8 = 83');
  });

  it('keeps two decimals so the sum matches the line above it', () => {
    expect(totalFormula(6700, 100, 67)).toBe('67.00 pts rounded = 67');
  });
});

describe('the one-time steps are skipped when there is nothing one-time', () => {
  const base = {
    financialValue: 100000,
    benefitsPortion: 10000,
    scoreValue: 90000,
    financialScore: 54,
  };

  it('numbers straight past them rather than leaving a gap', () => {
    const lines = buildScoreValueLines({ ...base, oneTimeRemoved: 0, oneTimeCounted: 0 });
    const steps = lines.filter((line) => line.startsWith('Step '));
    expect(steps).toHaveLength(3);
    expect(steps[2]).toContain('Step 3 - turn that into a score');
    expect(lines.some((line) => line.includes('one-time payment'))).toBe(false);
  });

  it('shows all five steps when there is a sign-on', () => {
    const lines = buildScoreValueLines({ ...base, oneTimeRemoved: 15000, oneTimeCounted: 5000 });
    const steps = lines.filter((line) => line.startsWith('Step '));
    expect(steps).toHaveLength(5);
    expect(steps[2]).toContain('take out the one-time payment at full value');
    expect(steps[4]).toContain('Step 5 - turn that into a score');
  });

  it('still shows them when the only one-time figure is a bonus shortfall', () => {
    // A negative total is not nothing: it lowers the score and has to be visible.
    const lines = buildScoreValueLines({ ...base, oneTimeRemoved: -8000, oneTimeCounted: -2000 });
    expect(lines.filter((line) => line.startsWith('Step '))).toHaveLength(5);
  });
});

describe('lessTax', () => {
  it('shows the operation, so a figure explains itself', () => {
    expect(lessTax(24750, 41, 14603)).toBe('$24,750 - 41% = $14,603');
  });

  it('rounds the rate rather than printing a fraction of a percent', () => {
    expect(lessTax(1000, 32.6, 674)).toBe('$1,000 - 33% = $674');
  });

  it('prints one figure when there is no tax to show', () => {
    // Otherwise a tax-free amount reads as though something had been deducted.
    expect(lessTax(5000, 0, 5000)).toBe('$5,000');
    expect(lessTax(5000, 41, 5000)).toBe('$5,000');
  });

  it('handles a negative pair', () => {
    expect(lessTax(-3000, 41, -1770)).toBe('-$3,000 - 41% = -$1,770');
  });
});

describe('each taxed component gets its own row with its own rate', () => {
  const lines = buildFinancialCalculationLines({
    offer: {
      base_salary: 165000,
      bonus: 24750,
      sign_on: 50000,
      equity: 50000,
      relocation_bonus: 0,
      benefits_value: 14000,
      equity_liquidity: 'LIQUID',
    } as never,
    metrics: {
      usedBaseTaxRate: 33,
      usedBonusTaxRate: 41,
      usedEquityTaxRate: 45,
      costOfLivingIndex: 100,
    } as never,
    financialValue: 120000,
  });

  const row = (label: string) => lines.find((line) => line.startsWith(`${label}:`));

  it('shows the rate that produced each figure', () => {
    expect(row('Base after tax')).toContain('- 33% =');
    expect(row('Bonus after tax')).toContain('- 41% =');
    expect(row('Equity after tax')).toContain('- 45% =');
  });

  it('keeps the sign-on on the bonus rate, which is how W2 lump sums are withheld', () => {
    expect(row('Sign-on after tax')).toContain('$50,000 - 41% =');
  });

  it('leaves out a component that is zero on both sides', () => {
    // A row of $0 - 41% = $0 is noise, not provenance.
    expect(row('Relocation after tax')).toBeUndefined();
  });

  it('leaves out an untaxed contribution that is not offered', () => {
    expect(row('401(k) match')).toBeUndefined();
    expect(row('HSA employer')).toBeUndefined();
  });

  it('marks a match that is offered as untaxed rather than implying a rate', () => {
    const withMatch = buildFinancialCalculationLines({
      offer: {
        base_salary: 165000,
        bonus: 0,
        sign_on: 0,
        equity: 0,
        relocation_bonus: 0,
        benefits_value: 0,
        forty_one_k_match_percent: 50,
        forty_one_k_max_match: 6,
      } as never,
      metrics: { usedBaseTaxRate: 33, costOfLivingIndex: 100 } as never,
      financialValue: 120000,
    });
    expect(withMatch.find((line) => line.startsWith('401(k) match:'))).toContain('(untaxed)');
  });
});
