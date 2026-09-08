import { describe, expect, it } from 'vitest';
import {
  concernHitRate,
  criterionShare,
  decisionPatterns,
  mostUsedCriteria,
  reliableCriteria,
  wrongAssumptions,
} from './decisionInsights';
import type {
  CriterionOutcomeRow,
  DecisionOutcomeInsightsData,
  RealisedConcern,
} from './decisionInsights';

const criterion = (over: Partial<CriterionOutcomeRow> = {}): CriterionOutcomeRow => ({
  key: 'financial',
  label: 'Financial',
  chosen_count: 4,
  judged_count: 4,
  better: 0,
  as_expected: 4,
  worse: 0,
  below_minimum_sample: false,
  ...over,
});

const concern = (over: Partial<RealisedConcern> = {}): RealisedConcern => ({
  journal_id: 1,
  company_name: 'Google',
  decision: 'ACCEPTED',
  decided_on: '2026-07-01',
  text: 'The on-call rotation is thin',
  ...over,
});

const data = (over: Partial<DecisionOutcomeInsightsData> = {}): DecisionOutcomeInsightsData => ({
  minimum_decisions_for_pattern: 3,
  journal_count: 4,
  reviewed_count: 4,
  concerns_raised: 0,
  concerns_resolved: 0,
  concerns_became_real: [],
  criteria: [],
  ...over,
});

describe('concernHitRate', () => {
  it('is the share of resolved worries that actually happened', () => {
    expect(concernHitRate(data({ concerns_resolved: 4, concerns_became_real: [concern()] }))).toBe(
      25
    );
  });

  it('has nothing to say until a look-back has resolved something', () => {
    expect(concernHitRate(data({ concerns_raised: 3, concerns_resolved: 0 }))).toBeNull();
  });

  it('does not leak floating point noise', () => {
    const three = [concern(), concern({ journal_id: 2 }), concern({ journal_id: 3 })];
    expect(concernHitRate(data({ concerns_resolved: 7, concerns_became_real: three }))).toBe(42.9);
  });
});

describe('wrongAssumptions', () => {
  it('names a criterion that came in worse more often than not', () => {
    const bad = criterion({ key: 'trajectory', label: 'Trajectory', worse: 3, as_expected: 1 });
    expect(wrongAssumptions(data({ criteria: [criterion(), bad] })).map((r) => r.key)).toEqual([
      'trajectory',
    ]);
  });

  it('leaves an exact half alone, which is not "more often than not"', () => {
    const split = criterion({ judged_count: 4, worse: 2, as_expected: 2 });
    expect(wrongAssumptions(data({ criteria: [split] }))).toEqual([]);
  });

  it('will not call a thin sample a wrong assumption', () => {
    const thin = criterion({
      judged_count: 1,
      worse: 1,
      as_expected: 0,
      below_minimum_sample: true,
    });
    expect(wrongAssumptions(data({ criteria: [thin] }))).toEqual([]);
  });

  it('puts the worst offender first', () => {
    const bad = criterion({ key: 'brand', label: 'Brand', judged_count: 4, worse: 3 });
    const worst = criterion({ key: 'location', label: 'Location', judged_count: 4, worse: 4 });
    expect(wrongAssumptions(data({ criteria: [bad, worst] })).map((r) => r.key)).toEqual([
      'location',
      'brand',
    ]);
  });
});

describe('reliableCriteria', () => {
  it('names what has never come in worse', () => {
    expect(reliableCriteria(data({ criteria: [criterion()] })).map((r) => r.key)).toEqual([
      'financial',
    ]);
  });

  it('says nothing about a criterion no look-back has graded', () => {
    const ungraded = criterion({ judged_count: 0, as_expected: 0, below_minimum_sample: true });
    expect(reliableCriteria(data({ criteria: [ungraded] }))).toEqual([]);
  });
});

describe('mostUsedCriteria', () => {
  it('keeps only the ones that actually drove a call', () => {
    const unused = criterion({ key: 'brand', label: 'Brand', chosen_count: 0 });
    expect(mostUsedCriteria(data({ criteria: [criterion(), unused] })).map((r) => r.key)).toEqual([
      'financial',
    ]);
  });

  it('stops at five, since the point is what mattered most', () => {
    const many = Array.from({ length: 7 }, (_, index) =>
      criterion({ key: 'financial', label: `C${index}` })
    );
    expect(mostUsedCriteria(data({ criteria: many }))).toHaveLength(5);
  });
});

describe('criterionShare', () => {
  it('is a percentage of the graded decisions', () => {
    expect(criterionShare(criterion({ judged_count: 4, as_expected: 3 }), 'as_expected')).toBe(75);
  });

  it('is zero rather than NaN when nothing has been graded', () => {
    expect(criterionShare(criterion({ judged_count: 0, as_expected: 0 }), 'as_expected')).toBe(0);
  });
});

describe('decisionPatterns', () => {
  it('stays silent until enough decisions have been looked back on', () => {
    const early = data({ reviewed_count: 2, criteria: [criterion({ worse: 4, as_expected: 0 })] });
    expect(decisionPatterns(early)).toEqual([]);
  });

  it('states the counts a claim rests on rather than asserting it bare', () => {
    const bad = criterion({ key: 'trajectory', label: 'Trajectory', judged_count: 4, worse: 3 });
    const [pattern] = decisionPatterns(data({ criteria: [bad] }));
    expect(pattern.text).toBe('Trajectory came in worse than you expected on 3 of 4 decisions.');
    expect(pattern.tone).toBe('bad');
  });

  it('credits a criterion that has always held up', () => {
    const patterns = decisionPatterns(data({ criteria: [criterion()] }));
    expect(patterns[0].tone).toBe('good');
    expect(patterns[0].text).toContain('never disappointed you');
  });

  it('reads a high concern hit rate as a reason to negotiate', () => {
    const real = [concern(), concern({ journal_id: 2 }), concern({ journal_id: 3 })];
    const patterns = decisionPatterns(data({ concerns_resolved: 4, concerns_became_real: real }));
    expect(patterns.at(-1)?.text).toContain('worth negotiating on');
    expect(patterns.at(-1)?.tone).toBe('bad');
  });

  it('reads a low concern hit rate as worrying too much', () => {
    const patterns = decisionPatterns(
      data({ concerns_resolved: 8, concerns_became_real: [concern()] })
    );
    expect(patterns.at(-1)?.text).toContain('costing you offers');
    expect(patterns.at(-1)?.tone).toBe('good');
  });

  it('will not read a pattern into one or two resolved worries', () => {
    const patterns = decisionPatterns(
      data({ concerns_resolved: 2, concerns_became_real: [concern()] })
    );
    expect(patterns).toEqual([]);
  });
});
