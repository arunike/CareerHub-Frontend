import type { CriterionOutcomeRow, DecisionOutcomeInsightsData } from '../../types/career';

export type {
  CriterionOutcomeRow,
  DecisionCriterion,
  DecisionOutcomeInsightsData,
  RealisedConcern,
} from '../../types/career';

export const concernHitRate = (data: DecisionOutcomeInsightsData) =>
  data.concerns_resolved === 0
    ? null
    : Math.round((data.concerns_became_real.length / data.concerns_resolved) * 1000) / 10;

// A criterion is only "wrong" when the look-backs disagreed with the call more often than not.
export const wrongAssumptions = (data: DecisionOutcomeInsightsData) =>
  data.criteria
    .filter((row) => !row.below_minimum_sample && row.worse * 2 > row.judged_count)
    .sort((a, b) => b.worse / b.judged_count - a.worse / a.judged_count);

export const reliableCriteria = (data: DecisionOutcomeInsightsData) =>
  data.criteria
    .filter((row) => !row.below_minimum_sample && row.worse === 0 && row.judged_count > 0)
    .sort((a, b) => b.judged_count - a.judged_count);

// What has actually driven the calls, whether or not it has been graded yet.
export const mostUsedCriteria = (data: DecisionOutcomeInsightsData) =>
  data.criteria.filter((row) => row.chosen_count > 0).slice(0, 5);

export const criterionShare = (
  row: CriterionOutcomeRow,
  verdict: 'better' | 'as_expected' | 'worse'
) => (row.judged_count === 0 ? 0 : Math.round((row[verdict] / row.judged_count) * 1000) / 10);

export interface Pattern {
  id: string;
  tone: 'good' | 'bad' | 'neutral';
  text: string;
}

// Only claims the evidence carries; every sentence names the counts it rests on.
export const decisionPatterns = (data: DecisionOutcomeInsightsData): Pattern[] => {
  if (data.reviewed_count < data.minimum_decisions_for_pattern) return [];
  const patterns: Pattern[] = [];

  for (const row of wrongAssumptions(data)) {
    patterns.push({
      id: `worse-${row.key}`,
      tone: 'bad',
      text: `${row.label} came in worse than you expected on ${row.worse} of ${row.judged_count} decisions.`,
    });
  }

  for (const row of reliableCriteria(data)) {
    patterns.push({
      id: `held-${row.key}`,
      tone: 'good',
      text: `${row.label} has never disappointed you — ${row.judged_count} of ${row.judged_count} decisions matched or beat what you expected.`,
    });
  }

  const hitRate = concernHitRate(data);
  if (hitRate !== null && data.concerns_resolved >= data.minimum_decisions_for_pattern) {
    patterns.push({
      id: 'concern-hit-rate',
      tone: hitRate >= 50 ? 'bad' : 'good',
      text:
        hitRate >= 50
          ? `${hitRate}% of the worries you wrote down came true, so they are worth negotiating on rather than accepting.`
          : `Only ${hitRate}% of the worries you wrote down came true, so they may be costing you offers you would have been happy in.`,
    });
  }

  return patterns;
};
