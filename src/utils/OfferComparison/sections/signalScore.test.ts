import { describe, expect, it } from 'vitest';
import { scoreFromStars, signalTierLabel, starsFromScore } from './signalScore';

describe('signalTierLabel', () => {
  it('names the tier alongside the number', () => {
    expect(signalTierLabel(1)).toBe('1 - Weak');
    expect(signalTierLabel(3)).toBe('3 - Solid');
    expect(signalTierLabel(5)).toBe('5 - Excellent');
  });

  it('says not scored rather than implying a zero', () => {
    expect(signalTierLabel(null)).toBe('Not scored');
    expect(signalTierLabel(undefined)).toBe('Not scored');
    expect(signalTierLabel(0)).toBe('Not scored');
  });

  it('ignores a value outside the scale', () => {
    expect(signalTierLabel(9)).toBe('Not scored');
    expect(signalTierLabel(-2)).toBe('Not scored');
  });
});

describe('the stars and the stored score round-trip', () => {
  it('keeps a real score', () => {
    expect(scoreFromStars(4)).toBe(4);
    expect(starsFromScore(4)).toBe(4);
  });

  it('clearing the stars blanks the signal instead of scoring zero', () => {
    // A zero would be scored as the worst possible; blank is skipped entirely.
    expect(scoreFromStars(0)).toBeNull();
    expect(starsFromScore(null)).toBe(0);
    expect(starsFromScore(undefined)).toBe(0);
  });

  it('rounds a half star, since the scale is whole numbers', () => {
    expect(scoreFromStars(3.5)).toBe(4);
  });
});
