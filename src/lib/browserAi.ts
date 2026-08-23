import type { JDMatchResult, NegotiationAdvice } from '../api/career';
import type { OfferLike as Offer, ApplicationLike } from '../pages/OfferComparison/calculations';
import type { Experience } from '../types';
import type { CareerApplication } from '../types/application';
import { requestChatCompletion, requestJsonCompletion } from './llmClient';
import {
  ANALYTICS_SYSTEM_PROMPT,
  COVER_LETTER_SYSTEM_PROMPT,
  JD_MATCH_SYSTEM_PROMPT,
  NEGOTIATION_SYSTEM_PROMPT,
  PROMOTION_CLARIFICATION_SYSTEM_PROMPT,
  PROMOTION_REVIEW_FOLLOW_UP_SYSTEM_PROMPT,
  PROMOTION_REVIEW_SYSTEM_PROMPT,
  SKILL_REFINEMENT_SYSTEM_PROMPT,
} from './aiPrompts';
import { sanitizePromotionReviewResult, sanitizePromotionText } from './promotionSanitizer';
import {
  buildPromotionExperienceContext,
  buildResumeContext,
  formatApplicationLocation,
  formatOptionalPromotionContext,
  formatTimeOff,
  normalizeSkillList,
  toNumber,
} from './aiContextFormatting';
import { buildAnalyticsSummary, processAnalyticsQueryDeterministically } from './analyticsQuery';
import type { AnalyticsSourceData } from './analyticsQuery';

export type AnalyticsContext = 'availability' | 'job-hunt';

export interface AnalyticsWidgetResult {
  type: 'metric' | 'chart';
  value?: number | string;
  unit?: string;
  data?: Array<{ name: string; value: number }>;
  chartType?: 'bar' | 'pie';
}

export interface PromotionReviewContext {
  currentLevel?: string;
  targetTitle?: string;
  recentWork?: string;
  majorProjects?: string;
  measurableImpact?: string;
  leadershipExamples?: string;
  crossFunctionalWork?: string;
  managerFeedback?: string;
  concerns?: string;
  promotionTimeline?: string;
  companyRubric?: string;
  clarificationAnswers?: string;
}

export interface PromotionClarifyingQuestion {
  id: string;
  question: string;
  why: string;
}

export interface PromotionReviewChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface PromotionReviewResult {
  readiness_verdict: {
    label: 'Not yet' | 'Building case' | 'Ready to start conversation' | 'Strong case' | string;
    confidence: 'low' | 'medium' | 'high' | string;
    summary: string;
  };
  promotion_prediction?: {
    probability_percent: number;
    chance_label: 'low' | 'moderate' | 'good' | 'strong' | string;
    likely_timeline: string;
    earliest_reasonable_timeline: string;
    latest_likely_timeline: string;
    confidence: 'low' | 'medium' | 'high' | string;
    rationale: string;
    assumptions: string[];
    chance_blockers: string[];
    chance_improvers: string[];
  };
  readiness_dashboard?: {
    packet_readiness_score: number;
    packet_readiness_label: 'weak' | 'building' | 'ready soon' | 'ready' | string;
    manager_conversation_readiness:
      | 'not ready'
      | 'calibration ready'
      | 'promotion ask ready'
      | 'packet review ready'
      | string;
    confidence_explanation: string;
    evidence_checklist: Array<{
      item: string;
      status: 'missing' | 'partial' | 'strong' | string;
      note: string;
    }>;
    top_odds_improvers: string[];
  };
  evidence_summary?: {
    role_snapshot: string[];
    strongest_evidence: string[];
    missing_context: string[];
    data_quality_note: string;
  };
  dimension_scores?: Array<{
    dimension: string;
    rating: 'weak' | 'developing' | 'solid' | 'strong' | string;
    confidence: 'low' | 'medium' | 'high' | string;
    supporting_evidence: string[];
    missing_evidence: string[];
    how_to_strengthen: string;
  }>;
  manager_conversation?: {
    recommendation: string;
    talking_points: string[];
    questions_to_ask: string[];
    avoid_saying: string[];
    draft_message: string;
  };
  risk_assessment?: {
    raising_now_risk: 'low' | 'medium' | 'high' | string;
    risks: string[];
    mitigations: string[];
  };
  growth_plan?: {
    next_30_days: string[];
    next_60_days: string[];
    next_90_days: string[];
  };
  general_calibration?: {
    disclaimer: string;
    heuristics: string[];
    questions_to_validate: string[];
  };
  promo_packet_outline: Array<{
    section: string;
    content_guidance: string;
    evidence_needed: string[];
  }>;
  suggested_experience_updates: Array<{
    field: string;
    suggestion: string;
    reason: string;
  }>;
  company_rubric_alignment: {
    rubric_provided: boolean;
    notes: string[];
  };
}

export const generateCoverLetterWithBrowserAI = async ({
  application,
  jdText,
  experiences,
}: {
  application: CareerApplication;
  jdText: string;
  experiences: Experience[];
}) => {
  const jdSection = jdText.trim()
    ? `JOB DESCRIPTION:\n${jdText.trim()}`
    : 'No job description provided — tailor the letter based on the role title and company.';

  return requestChatCompletion({
    temperature: 0.7,
    messages: [
      { role: 'system', content: COVER_LETTER_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `COMPANY: ${application.company_details?.name || 'Unknown Company'}
ROLE: ${application.role_title}
LOCATION: ${formatApplicationLocation(application)}
${jdSection}

---
${buildResumeContext(experiences)}`,
      },
    ],
  });
};

export const matchJobDescriptionWithBrowserAI = async ({
  jdText,
  experiences,
}: {
  jdText: string;
  experiences: Experience[];
}) => {
  return requestJsonCompletion<JDMatchResult>({
    temperature: 0.2,
    messages: [
      { role: 'system', content: JD_MATCH_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Evaluate only based on the provided Candidate Experience and Job Description.
If a skill, tool, domain, metric, or responsibility is not explicitly present, do not assume it.
For tailored bullets, preserve factual accuracy over keyword optimization.
The textual score_label must strictly follow the scoring rubric for the numeric score.

JOB DESCRIPTION:
${jdText.trim()}

---
${buildResumeContext(experiences)}`,
      },
    ],
  });
};

export const refineExperienceSkillsWithBrowserAI = async ({
  experience,
}: {
  experience: Pick<Experience, 'title' | 'company' | 'description' | 'skills' | 'employment_type'>;
}) => {
  const result = await requestJsonCompletion<{ skills?: unknown }>({
    temperature: 0.1,
    messages: [
      { role: 'system', content: SKILL_REFINEMENT_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `EXPERIENCE ENTRY:
Title: ${experience.title || 'Unknown'}
Company: ${experience.company || 'Unknown'}
Employment Type: ${experience.employment_type || 'Unknown'}
Existing Skills: ${(experience.skills || []).join(', ') || 'None'}

Description:
${experience.description?.trim() || 'No description provided.'}`,
      },
    ],
  });

  return normalizeSkillList(result.skills);
};

export const buildPromotionReviewMessages = ({
  experience,
  context,
}: {
  experience: Experience;
  context?: PromotionReviewContext;
}) => [
  { role: 'system' as const, content: PROMOTION_REVIEW_SYSTEM_PROMPT },
  {
    role: 'user' as const,
    content: `Generate a promotion readiness review for this current job.
If the saved experience is thin, make that a visible evidence-quality finding instead of filling in missing facts.
If a company rubric is not provided, use general promotion expectations only. Do not use public benchmarks, compensation data, company policy claims, or tenure rules.
Put useful non-company-specific calibration context only in general_calibration. Phrase it as general heuristics and manager questions, not as facts about the company.
The target title / level and timeline are the user's prediction target. Use them heavily in the probability and timing estimate.

${buildPromotionExperienceContext(experience)}

OPTIONAL USER CONTEXT:
${formatOptionalPromotionContext(context)}`,
  },
];

export const generatePromotionClarifyingQuestions = async ({
  experience,
  context,
}: {
  experience: Experience;
  context?: PromotionReviewContext;
}) => {
  const result = await requestJsonCompletion<{ questions?: PromotionClarifyingQuestion[] }>({
    temperature: 0.2,
    messages: [
      { role: 'system', content: PROMOTION_CLARIFICATION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Review the saved role and user-provided promotion context.
Ask the 3 most useful follow-up questions before generating a final promotion readiness review.
If the context is already strong, still ask questions that would improve evidence specificity.

${buildPromotionExperienceContext(experience)}

OPTIONAL USER CONTEXT:
${formatOptionalPromotionContext(context)}`,
      },
    ],
  });

  return (result.questions || [])
    .filter((question) => question?.question?.trim())
    .slice(0, 5)
    .map((question, index) => ({
      id: question.id?.trim() || `q${index + 1}`,
      question: question.question.trim(),
      why: question.why?.trim() || 'This helps calibrate the promotion evidence.',
    }));
};

export const generatePromotionReviewWithBrowserAI = async ({
  experience,
  context,
}: {
  experience: Experience;
  context?: PromotionReviewContext;
}) => {
  const result = await requestJsonCompletion<PromotionReviewResult>({
    temperature: 0.25,
    messages: buildPromotionReviewMessages({ experience, context }),
  });
  return sanitizePromotionReviewResult(result);
};

export const answerPromotionReviewFollowUp = async ({
  review,
  context,
  messages,
  question,
}: {
  review: PromotionReviewResult;
  context?: PromotionReviewContext;
  messages?: PromotionReviewChatMessage[];
  question: string;
}) => {
  const recentMessages = (messages || []).slice(-8);
  const answer = await requestChatCompletion({
    temperature: 0.25,
    messages: [
      { role: 'system', content: PROMOTION_REVIEW_FOLLOW_UP_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `SAVED PROMOTION REVIEW JSON:
${JSON.stringify(review)}

USER-PROVIDED CONTEXT:
${formatOptionalPromotionContext(context)}

RECENT CHAT HISTORY:
${
  recentMessages.length
    ? recentMessages.map((message) => `${message.role}: ${message.content}`).join('\n\n')
    : 'No prior follow-up chat.'
}

USER QUESTION:
${question.trim()}`,
      },
    ],
  });

  return sanitizePromotionText(
    answer,
    'I cannot verify that from the saved review. Use this as a manager-calibration question.'
  );
};

export const generateNegotiationAdviceWithBrowserAI = async ({
  offer,
  application,
  experiences,
  currentOffer,
}: {
  offer: Offer;
  application: ApplicationLike | undefined;
  experiences: Experience[];
  currentOffer?: Offer | null;
}) => {
  const currentSection = currentOffer
    ? `CURRENT / BASELINE COMPENSATION:
Base Salary: $${toNumber(currentOffer.base_salary).toLocaleString()}
Annual Bonus: $${toNumber(currentOffer.bonus).toLocaleString()}
Equity (annualized): $${toNumber(currentOffer.equity).toLocaleString()}
Sign-On: $${toNumber(currentOffer.sign_on).toLocaleString()}
Time Off: ${formatTimeOff(currentOffer)}`
    : 'CURRENT / BASELINE COMPENSATION: Not provided — advise based on the offer alone.';

  const targetCompany =
    application?.company_name || offer.application_details?.company || 'Unknown Company';
  const targetRole =
    application?.role_title || offer.application_details?.role_title || 'Unknown Role';

  return requestJsonCompletion<NegotiationAdvice>({
    temperature: 0.3,
    messages: [
      { role: 'system', content: NEGOTIATION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `TARGET OFFER:
Company: ${targetCompany}
Role: ${targetRole}
Location: ${formatApplicationLocation(application || { location: '', office_location: '' })} | RTO: ${application?.rto_policy || 'Unknown'}
Base Salary: $${toNumber(offer.base_salary).toLocaleString()}
Annual Bonus: $${toNumber(offer.bonus).toLocaleString()}
Equity (annualized value): $${toNumber(offer.equity).toLocaleString()}
Sign-On Bonus: $${toNumber(offer.sign_on).toLocaleString()}
Time Off: ${formatTimeOff(offer)}
Benefits Value: $${toNumber(offer.benefits_value).toLocaleString()}

---
${currentSection}

---
${buildResumeContext(experiences)}`,
      },
    ],
  });
};

export const runAnalyticsWidgetQuery = async (
  query: string,
  context: AnalyticsContext,
  sourceData: AnalyticsSourceData
): Promise<AnalyticsWidgetResult> => {
  const deterministic = processAnalyticsQueryDeterministically(query, context, sourceData);
  if (deterministic) return deterministic;

  const summary = buildAnalyticsSummary(sourceData);
  const result = await requestJsonCompletion<AnalyticsWidgetResult | { error?: string }>({
    temperature: 0.1,
    messages: [
      { role: 'system', content: ANALYTICS_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Query context: ${context} (either 'job-hunt' for application/offer data, or 'availability' for events/calendar data).

DATABASE SUMMARY:
${JSON.stringify(summary, null, 2)}

QUERY: ${query}`,
      },
    ],
  });

  if ('error' in result && result.error) {
    throw new Error(result.error);
  }

  if (!('type' in result)) {
    throw new Error('The provider returned an unsupported analytics response.');
  }

  return {
    ...result,
    chartType: result.type === 'chart' && result.chartType === 'pie' ? 'pie' : 'bar',
  };
};
