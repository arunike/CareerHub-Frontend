import { describe, expect, it } from 'vitest';
import {
  CATEGORY_KEYS,
  DEFAULT_WEIGHTS,
  normalizeScoreWeights,
  scoreTrajectory,
} from './decisionScoring';
import type { ApplicationLike as Application } from './calculations';

const app = (over: Partial<Application> = {}) => over as Application;

describe('scoreTrajectory', () => {
  it('averages the two ratings that used to carry a weight each', () => {
    const result = scoreTrajectory(app({ growth_score: 4, team_score: 3 }));
    expect(result.score).toBe(70);
    expect(result.isScored).toBe(true);
    expect(result.detail).toBe('4/5 growth · 3/5 team');
  });

  it('lets one rating carry the category when the other is missing', () => {
    const growthOnly = scoreTrajectory(app({ growth_score: 5 }));
    expect(growthOnly.score).toBe(100);
    expect(growthOnly.detail).toContain('team not rated');

    const teamOnly = scoreTrajectory(app({ team_score: 2 }));
    expect(teamOnly.score).toBe(40);
    expect(teamOnly.detail).toContain('growth not rated');
  });

  it('is skipped entirely when neither is rated', () => {
    const result = scoreTrajectory(app());
    expect(result.isScored).toBe(false);
    expect(result.score).toBe(0);
  });

  it('shows the average it used rather than making the reader work it out', () => {
    const lines = scoreTrajectory(app({ growth_score: 4, team_score: 3 })).calculationLines;
    expect(lines.some((line) => line.includes('(4 + 3) / 2 = 3.5'))).toBe(true);
    expect(lines.some((line) => line.includes('3.5 x 20 = 70'))).toBe(true);
  });
});

describe('trajectory weights', () => {
  it('replaces Growth and Team with one category, still totalling 100', () => {
    expect(CATEGORY_KEYS).toContain('trajectory');
    expect(CATEGORY_KEYS).not.toContain('growth');
    expect(CATEGORY_KEYS).not.toContain('team');
    expect(Object.values(DEFAULT_WEIGHTS).reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it('adds the old two weights together rather than throwing them away', () => {
    const saved = {
      financial: 34,
      benefits: 10,
      workLife: 19,
      growth: 15,
      location: 10,
      brand: 6,
      team: 6,
    };
    expect(normalizeScoreWeights(saved).trajectory).toBe(21);
  });

  it('keeps a deliberately lopsided split from before the merge', () => {
    const saved = {
      financial: 30,
      benefits: 10,
      workLife: 10,
      growth: 30,
      location: 10,
      brand: 5,
      team: 5,
    };
    const next = normalizeScoreWeights(saved);
    expect(next.trajectory).toBe(35);
    expect(Object.values(next).reduce((sum, value) => sum + value, 0)).toBe(100);
  });
});
