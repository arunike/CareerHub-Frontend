import type { PromotionReviewResult } from './browserAi';

export const PROMOTION_REVIEW_UNSAFE_PATTERNS = [
  /\bpublic\s+(data|benchmark|comp|compensation|salary)\b/i,
  /\b(glassdoor|levels\.fyi|salary\.com|market\s+comp|compensation\s+benchmark)\b/i,
  /\b(formal\s+)?promotion\s+cycles?\b/i,
  /\bpromotion\s+timelines?\s+at\b/i,
  /\b(company|promotion)\s+policy\b/i,
  /\btenure-locked\b/i,
  /\byears?-at-level\b/i,
  /\btypically\s+requires\s+\d+\+?\s+years?\b/i,
  /\brequires\s+\$[\d,.]+[kKmM]?\+?\b/i,
  /\b\$[\d,.]+[kKmM]?\+?\s+(total\s+comp|compensation|salary|base)\b/i,
  /\bmanager\s+(will|would|has\s+already|already)\s+(support|approve|socialized|decided)\b/i,
  /\bsame\s+manager\s+since\s+(start|the\s+start)\b/i,
];

export const PROMOTION_REVIEW_GENERIC_FALLBACK =
  'Use manager calibration to validate this against your actual promotion expectations.';

export const isUnsafePromotionText = (value: string) =>
  PROMOTION_REVIEW_UNSAFE_PATTERNS.some((pattern) => pattern.test(value));

export const sanitizePromotionText = (
  value: string | undefined,
  fallback = PROMOTION_REVIEW_GENERIC_FALLBACK
) => {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  if (!isUnsafePromotionText(trimmed)) return trimmed;

  const safeSentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !isUnsafePromotionText(sentence));

  return safeSentences.join(' ') || fallback;
};

export const sanitizePromotionList = (items?: string[], fallback?: string[]) => {
  const sanitized = (items || []).map((item) => sanitizePromotionText(item, '')).filter(Boolean);
  return sanitized.length ? sanitized : fallback || [];
};

export const sanitizePromotionReviewResult = (
  result: PromotionReviewResult
): PromotionReviewResult => ({
  ...result,
  readiness_verdict: {
    ...result.readiness_verdict,
    summary: sanitizePromotionText(result.readiness_verdict.summary),
  },
  promotion_prediction: result.promotion_prediction
    ? {
        ...result.promotion_prediction,
        likely_timeline: sanitizePromotionText(
          result.promotion_prediction.likely_timeline,
          'Calibrate timing with your manager.'
        ),
        earliest_reasonable_timeline: sanitizePromotionText(
          result.promotion_prediction.earliest_reasonable_timeline,
          'Possible after evidence gaps are addressed.'
        ),
        latest_likely_timeline: sanitizePromotionText(
          result.promotion_prediction.latest_likely_timeline,
          'Later if leadership or scope evidence remains thin.'
        ),
        rationale: sanitizePromotionText(result.promotion_prediction.rationale),
        assumptions: sanitizePromotionList(result.promotion_prediction.assumptions, [
          'Assumptions are general and should be calibrated with your manager.',
        ]),
        chance_blockers: sanitizePromotionList(result.promotion_prediction.chance_blockers),
        chance_improvers: sanitizePromotionList(result.promotion_prediction.chance_improvers),
      }
    : result.promotion_prediction,
  readiness_dashboard: result.readiness_dashboard
    ? {
        ...result.readiness_dashboard,
        confidence_explanation: sanitizePromotionText(
          result.readiness_dashboard.confidence_explanation
        ),
        evidence_checklist: result.readiness_dashboard.evidence_checklist.map((item) => ({
          ...item,
          note: sanitizePromotionText(item.note, 'Calibrate this evidence with your manager.'),
        })),
        top_odds_improvers: sanitizePromotionList(result.readiness_dashboard.top_odds_improvers),
      }
    : result.readiness_dashboard,
  evidence_summary: result.evidence_summary
    ? {
        ...result.evidence_summary,
        role_snapshot: sanitizePromotionList(result.evidence_summary.role_snapshot),
        strongest_evidence: sanitizePromotionList(result.evidence_summary.strongest_evidence),
        missing_context: sanitizePromotionList(result.evidence_summary.missing_context),
        data_quality_note: sanitizePromotionText(result.evidence_summary.data_quality_note),
      }
    : result.evidence_summary,
  manager_conversation: result.manager_conversation
    ? {
        ...result.manager_conversation,
        recommendation: sanitizePromotionText(result.manager_conversation.recommendation),
        talking_points: sanitizePromotionList(result.manager_conversation.talking_points),
        questions_to_ask: sanitizePromotionList(result.manager_conversation.questions_to_ask),
        avoid_saying: sanitizePromotionList(result.manager_conversation.avoid_saying),
        draft_message: sanitizePromotionText(result.manager_conversation.draft_message),
      }
    : result.manager_conversation,
  growth_plan: result.growth_plan
    ? {
        next_30_days: sanitizePromotionList(result.growth_plan.next_30_days),
        next_60_days: sanitizePromotionList(result.growth_plan.next_60_days),
        next_90_days: sanitizePromotionList(result.growth_plan.next_90_days),
      }
    : result.growth_plan,
  general_calibration: result.general_calibration
    ? {
        disclaimer: sanitizePromotionText(
          result.general_calibration.disclaimer,
          'These are general promotion heuristics, not company policy.'
        ),
        heuristics: sanitizePromotionList(result.general_calibration.heuristics),
        questions_to_validate: sanitizePromotionList(
          result.general_calibration.questions_to_validate
        ),
      }
    : result.general_calibration,
});
