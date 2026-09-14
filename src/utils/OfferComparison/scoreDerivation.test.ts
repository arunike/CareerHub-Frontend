import { describe, expect, it } from 'vitest';
import { buildScoreValueLines } from './decisionScoring';
import { computeIndependentFinancialScore, financialScoreValue } from './financialScore';

// A made-up package chosen for round arithmetic, so every step is checkable by eye.
describe('financial score derivation', () => {
  const parts = financialScoreValue({
    adjustedValue: 120000,
    benefitsPortion: 12000,
    afterTaxSignOn: 30000,
    afterTaxRelocation: 0,
    bonusNetOnMove: 18000,
    colIndex: 125,
  });

  const money = (value: number) =>
    value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  it('lands on the value the card shows, give or take a rounded cent', () => {
    expect(parts.value).toBeCloseTo(86400, -1);
  });

  it('each step accounts for the gap, with nothing unexplained', () => {
    const afterBenefits = 120000 - 12000;
    const afterOneTimeOut = afterBenefits - (parts.oneTimeRemoved + parts.oneTimeCounted);
    expect(Math.round(afterOneTimeOut + parts.oneTimeCounted)).toBe(Math.round(parts.value));
  });

  it('prints the score from the value it actually scored, not the adjusted value', () => {
    const score = computeIndependentFinancialScore(parts.value);
    const lines = buildScoreValueLines({
      financialValue: 120000,
      benefitsPortion: 12000,
      oneTimeRemoved: parts.oneTimeRemoved,
      oneTimeCounted: parts.oneTimeCounted,
      scoreValue: parts.value,
      financialScore: score,
    });
    const scoreLine = lines.find((line) => line.startsWith('Step 5')) ?? '';
    expect(scoreLine).toContain(money(parts.value));
    expect(scoreLine).not.toContain('$120,000');
    expect(scoreLine).toContain('scores 52');
    // The reader should not have to read a logarithm to know whether 43 is good.
    expect(lines.some((line) => line.startsWith('For scale:'))).toBe(true);
    expect(lines.some((line) => line.includes('$300,000 = 100'))).toBe(true);
  });

  it('walks from the adjusted value to the scored value in four steps', () => {
    const lines = buildScoreValueLines({
      financialValue: 120000,
      benefitsPortion: 12000,
      oneTimeRemoved: parts.oneTimeRemoved,
      oneTimeCounted: parts.oneTimeCounted,
      scoreValue: parts.value,
      financialScore: 52,
    });
    expect(lines[0]).toContain('$120,000');
    expect(lines[1]).toContain('$108,000');
    expect(lines[3]).toContain(money(parts.value));
  });
});
