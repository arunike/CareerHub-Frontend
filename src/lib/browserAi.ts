import { getApplications, getEvents } from '../api';
import type { JDMatchResult, NegotiationAdvice } from '../api/career';
import type { OfferLike as Offer, ApplicationLike } from '../pages/OfferComparison/calculations';
import type { Event, Experience } from '../types';
import type { CareerApplication } from '../types/application';
import { requestChatCompletion, requestJsonCompletion } from './llmClient';

type AnalyticsContext = 'availability' | 'job-hunt';

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

interface AnalyticsSourceData {
  applications: CareerApplication[];
  events: Event[];
}

const COVER_LETTER_SYSTEM_PROMPT = `You are an expert career coach and professional writer.
Write a compelling, personalized cover letter body for the job application described by the user.

Structure (4 paragraphs):
1. Hook — a specific reason this company or role excites you; never open with "I am writing to express my interest" or similar cliches
2. Most relevant experience and how it directly maps to the role requirements
3. A concrete achievement or project that demonstrates measurable impact
4. Call to action — express genuine enthusiasm and invite the next step

Additional rules:
- Mirror the language and terminology from the job description where it feels natural
- Professional, confident, and concise — cut filler phrases
- Do NOT include placeholders like [Your Name] or [Date] — body paragraphs only
- Respond ONLY with the cover letter body text. No JSON, no headers, no extra formatting.`;

const JD_MATCH_SYSTEM_PROMPT = `
You are an expert technical recruiter, ATS evaluator, and resume tailoring coach.

Your task is to evaluate the Candidate's Professional Experience against the Job Description using evidence-based reasoning.

Important evaluation rules:
1. Do NOT simply keyword-match. Evaluate actual scope, ownership, seniority, trajectory, domain relevance, and technical depth.
2. Do NOT invent companies, projects, tools, metrics, responsibilities, seniority, or business context not supported by the provided candidate experience.
3. Distinguish between:
   - "directly_supported": explicitly stated in the resume or experience text
   - "reasonably_supported": strongly implied by the experience text
   - "not_supported": not present and should not be used in resume rewrites
4. Only list a missing skill as a gap if it is clearly important in the Job Description and not evidenced in the candidate experience.
5. Do not over-penalize missing exact technologies if the candidate shows adjacent transferable experience.
6. Do not make negative assumptions from missing information. Phrase evidence gaps as resume positioning issues, not as proof the candidate lacks the skill.
7. If employment dates overlap, mention it only as a resume clarity issue, not as an integrity concern.
8. Tailored bullet rewrites must be truthful and must preserve the original project, tool stack, scope, and metrics. You may reframe wording, but you may not add unsupported tools, domains, or outcomes.
9. The final score label must strictly follow the scoring rubric.

Scoring rubric:
90-100: Strong match — would shortlist immediately
70-89: Good fit with minor gaps
50-69: Partial match — significant gaps exist
<50: Poor match

Scoring guidance:
- Prioritize evidence of similar work over exact keyword overlap.
- Seniority should be assessed based on ownership, ambiguity, system complexity, cross-functional impact, and production responsibility.
- A candidate can score highly even with missing exact tools if they have strong adjacent experience and clear learning trajectory.
- Penalize unsupported or unclear resume positioning less than true experience gaps.

Respond ONLY with a valid JSON object using exactly this structure:
{
  "score": <integer 0-100>,
  "score_label": "<Strong match | Good fit with minor gaps | Partial match | Poor match>",
  "summary": "<2-3 sentences on overall fit, seniority alignment, and biggest risk>",
  "matched_skills": [
    {
      "skill": "<matched skill or requirement>",
      "support_level": "<directly_supported | reasonably_supported>",
      "evidence": "<exact phrase or bullet from candidate experience>"
    }
  ],
  "missing_skills": [
    {
      "skill": "<critical JD skill or requirement not evidenced>",
      "severity": "<high | medium | low>",
      "reason": "<why this matters for the JD>",
      "resume_evidence_status": "<not mentioned | weakly implied | unclear>"
    }
  ],
  "recommendations": [
    "<actionable resume tip grounded in the candidate's actual experience>"
  ],
  "resume_gaps": [
    {
      "gap": "<specific resume evidence gap or weak positioning>",
      "why_it_matters": "<why this affects JD alignment>",
      "fix": "<how to clarify without inventing experience>"
    }
  ],
  "keyword_suggestions": [
    {
      "keyword": "<JD keyword or phrase>",
      "support_level": "<directly_supported | reasonably_supported>",
      "where_to_use": "<role/project/bullet where it can truthfully appear>"
    }
  ],
  "tailored_bullets": [
    {
      "experience": "<role/company this bullet belongs to, or null>",
      "original": "<existing bullet or sentence being improved, or null if creating from existing context>",
      "revised": "<truthful resume bullet rewritten to align with the JD>",
      "support_level": "<directly_supported | reasonably_supported>",
      "reason": "<why this rewrite improves alignment>",
      "risk_note": "<mention any wording that should be verified before use, or null>"
    }
  ],
  "best_experiences": [
    {
      "title": "<candidate role title>",
      "company": "<candidate company>",
      "relevance": "<why this experience maps to the JD>",
      "matched_requirements": [
        {
          "requirement": "<JD requirement>",
          "support_level": "<directly_supported | reasonably_supported>",
          "evidence": "<exact phrase from candidate experience>"
        }
      ]
    }
  ],
  "overall_risk_assessment": {
    "seniority_risk": "<low | medium | high>",
    "domain_risk": "<low | medium | high>",
    "technical_stack_risk": "<low | medium | high>",
    "resume_positioning_risk": "<low | medium | high>"
  }
}`;

const SKILL_REFINEMENT_SYSTEM_PROMPT = `You are an expert resume parser and technical recruiter.
Extract the most relevant hard skills from a single experience entry.

Rules:
- Only include skills that are directly supported by the title, company context, description, or existing skill list
- Prefer concise normalized labels such as "React", "Python", "CI/CD", "Machine Learning", "Stakeholder Management"
- Include technical tools, frameworks, platforms, methods, and meaningful domain skills
- Exclude company names, job titles, locations, dates, generic soft skills, and vague words like "experience" or "team"
- Return only the skills with clear supporting evidence

Respond ONLY with valid JSON using exactly this structure:
{
  "skills": ["<skill>", ...]
}`;

const NEGOTIATION_SYSTEM_PROMPT = `You are an expert compensation negotiation coach helping a candidate negotiate a job offer.
Analyze the offer against the candidate's background and current compensation (if provided), then give concrete, actionable negotiation advice prioritized by impact.

Respond ONLY with a valid JSON object using exactly this structure:
{
  "talking_points": ["<specific script line or argument to use, ordered by when to deploy>", ...],
  "leverage_points": ["<strength the candidate can cite>", ...],
  "caution_points": ["<risk or weakness to be aware of>", ...],
  "suggested_ask": {
    "base_salary": <integer or null>,
    "sign_on": <integer or null>,
    "equity": <integer annualized USD value or null>,
    "pto_days": <integer or null>,
    "notes": "<brief rationale and priority order for the ask>"
  }
}`;

const PROMOTION_REVIEW_SYSTEM_PROMPT = `You are an evidence-based promotion coach.
Evaluate promotion readiness using only the saved CareerHub evidence and optional user context. Be candid, practical, and concise.

Rules:
1. Do not invent private company-specific policy, public benchmarks, Glassdoor trends, leveling data, tenure norms, or dollar thresholds. If rubric is not provided, use general promotion expectations only and label them as general assumptions.
2. Missing information is an evidence gap, not proof the user lacks skill.
3. Prioritize direct answers: readiness, probability, timing, blockers, and next actions.
4. Do not claim specific promotion cycles, years-at-level requirements, manager decisions, peer reviews, or project facts unless provided in the input.
5. In the growth plan, avoid invented project examples. Use phrases like "choose one actual initiative from your work" when the exact initiative is not provided.
6. Keep every string short: usually under 160 characters. Do not quote long user input verbatim; synthesize it.
7. Use only the number of array items shown in the JSON template. Do not add extra items.
8. Return only valid JSON. No markdown fences. No text outside JSON.

Respond with exactly this JSON structure and no extra keys:
{
  "readiness_verdict": {
    "label": "<Not yet | Building case | Ready to start conversation | Strong case>",
    "confidence": "<low | medium | high>",
    "summary": "<2 short sentences>"
  },
  "promotion_prediction": {
    "probability_percent": <integer 0-100>,
    "chance_label": "<low | moderate | good | strong>",
    "likely_timeline": "<short timing>",
    "earliest_reasonable_timeline": "<short timing>",
    "latest_likely_timeline": "<short timing>",
    "confidence": "<low | medium | high>",
    "rationale": "<2 short sentences>",
    "assumptions": ["<general assumption, not company-specific and not tenure-specific>", "<general assumption, not company-specific and not cycle-specific>"],
    "chance_blockers": ["<short blocker>", "<short blocker>"],
    "chance_improvers": ["<short action>", "<short action>"]
  },
  "readiness_dashboard": {
    "packet_readiness_score": <integer 0-100>,
    "packet_readiness_label": "<weak | building | ready soon | ready>",
    "manager_conversation_readiness": "<not ready | calibration ready | promotion ask ready | packet review ready>",
    "confidence_explanation": "<1 short sentence>",
    "evidence_checklist": [
      {"item": "Impact metrics", "status": "<missing | partial | strong>", "note": "<short note>"},
      {"item": "Scope and ownership", "status": "<missing | partial | strong>", "note": "<short note>"},
      {"item": "Leadership and influence", "status": "<missing | partial | strong>", "note": "<short note>"}
    ],
    "top_odds_improvers": ["<short action>", "<short action>"]
  },
  "evidence_summary": {
    "role_snapshot": ["<short fact>", "<short fact>"],
    "strongest_evidence": ["<short evidence>", "<short evidence>"],
    "missing_context": ["<short gap>", "<short gap>"],
    "data_quality_note": "<1 short sentence>"
  },
  "manager_conversation": {
    "recommendation": "<1 short sentence>",
    "talking_points": ["<short talking point>", "<short talking point>"],
    "questions_to_ask": ["<short question>", "<short question>"],
    "avoid_saying": ["<short framing to avoid>"],
    "draft_message": "<short Slack/email draft>"
  },
  "growth_plan": {
    "next_30_days": ["<specific evidence action using only known work>", "<specific manager alignment action>"],
    "next_60_days": ["<specific scope or impact action; if unsure, say choose one actual initiative from your work>", "<specific metric action using only known metrics or asking user to define one>"],
    "next_90_days": ["<specific promo packet action>", "<specific calibration action without inventing reviewers>"]
  },
  "general_calibration": {
    "disclaimer": "These are general promotion heuristics, not company policy.",
    "heuristics": ["<general promotion heuristic, not company-specific>", "<general promotion heuristic, not company-specific>"],
    "questions_to_validate": ["<manager question to validate timing, scope, or process>", "<manager question to validate level expectations>"]
  }
}`;

const PROMOTION_CLARIFICATION_SYSTEM_PROMPT = `You are a promotion evidence interviewer.
Ask targeted clarifying questions before a promotion review so the final evaluation can avoid guessing.

Rules:
1. Ask only about missing evidence that would materially improve promotion evaluation quality.
2. Prioritize leadership, scope, cross-functional influence, manager signal, and concrete examples.
3. Do not ask for compensation, public benchmarks, private company policy, or personal sensitive data.
4. Keep questions concise and answerable from memory.
5. Return only valid JSON. No markdown fences. No text outside JSON.

Respond with exactly this JSON structure:
{
  "questions": [
    {"id": "q1", "question": "<concise question>", "why": "<why this improves the review>"},
    {"id": "q2", "question": "<concise question>", "why": "<why this improves the review>"},
    {"id": "q3", "question": "<concise question>", "why": "<why this improves the review>"}
  ]
}`;

const PROMOTION_REVIEW_FOLLOW_UP_SYSTEM_PROMPT = `You are a promotion coach answering follow-up questions about one saved promotion review.

Rules:
1. Use only the saved review, user-provided context, and chat history.
2. Do not invent private company policy, public benchmarks, compensation data, tenure rules, promotion-cycle facts, or manager decisions.
3. If the user asks for company-specific process, turn it into manager-calibration questions.
4. Be concrete, concise, and action-oriented.
5. If the user asks how to improve the case, focus on evidence the user can gather or wording they can use.
6. Format for scanning: short paragraphs, brief markdown headings, bullets for actions, blockquotes for suggested wording, and compact tables only when comparison is useful.`;

const ANALYTICS_SYSTEM_PROMPT = `You are an analytics assistant for a job search tracker app.
Answer the user's query using ONLY the database summary provided. Do not make up data.

Respond ONLY with a valid JSON object in exactly one of these two formats:
Single metric: {"type": "metric", "value": <number>, "unit": "<short label>"}
Chart data: {"type": "chart", "data": [{"name": "<label>", "value": <number>}], "chartType": "bar" or "pie"}

If the query cannot be answered from the summary, respond with:
{"error": "Cannot answer this query from available data"}`;

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseRecordDate = (value: string | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeSkillList = (skills: unknown): string[] => {
  if (!Array.isArray(skills)) return [];

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const skill of skills) {
    if (typeof skill !== 'string') continue;
    const trimmed = skill.replace(/\s+/g, ' ').trim();
    if (!trimmed || trimmed.length > 50) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);

    if (normalized.length >= 20) break;
  }

  return normalized;
};

const formatOptionalPromotionContext = (context: PromotionReviewContext = {}) => {
  const labels: Array<[keyof PromotionReviewContext, string]> = [
    ['currentLevel', 'Current title / level'],
    ['targetTitle', 'Target title / level'],
    ['recentWork', 'Recent work not yet saved'],
    ['majorProjects', 'Major projects'],
    ['measurableImpact', 'Measurable impact'],
    ['leadershipExamples', 'Leadership examples'],
    ['crossFunctionalWork', 'Cross-functional work'],
    ['managerFeedback', 'Manager feedback'],
    ['concerns', 'Concerns or weak spots'],
    ['promotionTimeline', 'Promotion timeline'],
    ['companyRubric', 'Company rubric or promo notes'],
    ['clarificationAnswers', 'Clarifying question answers'],
  ];

  const lines = labels
    .map(([key, label]) => {
      const value = context[key]?.trim();
      return value ? `${label}:\n${value}` : '';
    })
    .filter(Boolean);

  return lines.length
    ? lines.join('\n\n')
    : 'No optional context provided. Base the review on saved CareerHub experience data and clearly identify evidence gaps.';
};

const formatTeamHistory = (experience: Experience) => {
  if (!experience.team_history?.length) return 'No team history saved.';
  return experience.team_history
    .map((team) => {
      const range = `${team.start_date || 'Unknown'} to ${team.is_current ? 'Present' : team.end_date || 'Unknown'}`;
      return `${team.name || 'Unnamed team'} (${range})${team.manager ? ` | Manager: ${team.manager}` : ''}${team.norms ? ` | Norms: ${team.norms}` : ''}`;
    })
    .join('\n');
};

const formatSchedulePhases = (experience: Experience) => {
  if (!experience.schedule_phases?.length) return 'No schedule phases saved.';
  return experience.schedule_phases
    .map(
      (phase) =>
        `${phase.name || 'Phase'} (${phase.start_date || 'Unknown'} to ${phase.is_current ? 'Present' : phase.end_date || 'Unknown'})`
    )
    .join('\n');
};

const PROMOTION_REVIEW_UNSAFE_PATTERNS = [
  /\bpublic\s+(data|benchmark|comp|compensation|salary)\b/i,
  /\b(glassdoor|levels\.fyi|salary\.com|market\s+comp|compensation\s+benchmark)\b/i,
  /\bTikTok'?s?\s+(formal\s+)?(promotion\s+)?cycles?\b/i,
  /\bpromotion\s+timelines?\s+at\s+TikTok\b/i,
  /\b(company|promotion)\s+policy\b/i,
  /\btenure-locked\b/i,
  /\byears?-at-level\b/i,
  /\btypically\s+requires\s+\d+\+?\s+years?\b/i,
  /\brequires\s+\$[\d,.]+[kKmM]?\+?\b/i,
  /\b\$[\d,.]+[kKmM]?\+?\s+(total\s+comp|compensation|salary|base)\b/i,
  /\bmanager\s+(will|would|has\s+already|already)\s+(support|approve|socialized|decided)\b/i,
  /\bsame\s+manager\s+since\s+(start|the\s+start)\b/i,
];

const PROMOTION_REVIEW_GENERIC_FALLBACK =
  'Use manager calibration to validate this against your actual promotion expectations.';

const isUnsafePromotionText = (value: string) =>
  PROMOTION_REVIEW_UNSAFE_PATTERNS.some((pattern) => pattern.test(value));

const sanitizePromotionText = (
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

const sanitizePromotionList = (items?: string[], fallback?: string[]) => {
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

const buildPromotionExperienceContext = (experience: Experience) => {
  const endDate = experience.end_date || (experience.is_current ? 'Present' : 'Unknown');

  return `CURRENT EXPERIENCE:
Title: ${experience.title || 'Unknown'}
Current title / level from saved experience: ${experience.title || 'Unknown'}
Company: ${experience.company || 'Unknown'}
Location: ${experience.location || 'Not specified'}
Dates: ${experience.start_date || 'Unknown'} to ${endDate}
Is current role: ${experience.is_current ? 'Yes' : 'No'}
Employment type: ${experience.employment_type || 'Not specified'}
Promotion marker: ${experience.is_promotion ? 'Yes' : 'No'}
Return offer marker: ${experience.is_return_offer ? 'Yes' : 'No'}
Skills: ${(experience.skills || []).join(', ') || 'None saved'}

Description:
${experience.description?.trim() || 'No description saved.'}

Team history:
${formatTeamHistory(experience)}

Schedule phases:
${formatSchedulePhases(experience)}`;
};

const buildResumeContext = (experiences: Experience[]) => {
  if (!experiences.length) {
    return "CANDIDATE'S PROFESSIONAL EXPERIENCE:\nNo experience entries are currently saved.";
  }

  const sorted = [...experiences].sort((a, b) => {
    const aValue = parseRecordDate(a.start_date || undefined)?.getTime() ?? 0;
    const bValue = parseRecordDate(b.start_date || undefined)?.getTime() ?? 0;
    return bValue - aValue;
  });

  const lines = ["CANDIDATE'S PROFESSIONAL EXPERIENCE:\n"];
  for (const experience of sorted) {
    const start = experience.start_date || 'Unknown';
    const end = experience.end_date || (experience.is_current ? 'Present' : 'Unknown');
    lines.push(`Role: ${experience.title} at ${experience.company} (${start} to ${end})`);
    if (experience.description?.trim()) {
      lines.push(`Description: ${experience.description.trim()}`);
    }
    if (experience.skills?.length) {
      lines.push(`Skills: ${experience.skills.join(', ')}`);
    }
    if (experience.base_salary != null || experience.hourly_rate != null) {
      const compBits = [];
      if (experience.base_salary != null)
        compBits.push(`Base salary: $${Number(experience.base_salary).toLocaleString()}`);
      if (experience.bonus != null)
        compBits.push(`Bonus: $${Number(experience.bonus).toLocaleString()}`);
      if (experience.equity != null)
        compBits.push(`Equity: $${Number(experience.equity).toLocaleString()}`);
      if (experience.hourly_rate != null)
        compBits.push(`Hourly rate: $${Number(experience.hourly_rate).toLocaleString()}/hr`);
      if (compBits.length) lines.push(compBits.join(' | '));
    }
    lines.push('-'.repeat(40));
  }
  return lines.join('\n');
};

const formatApplicationLocation = (
  application:
    | Pick<CareerApplication, 'location' | 'office_location'>
    | Pick<ApplicationLike, 'location' | 'office_location'>
) => {
  const homeLocation = application.location?.trim() || '';
  const officeLocation = application.office_location?.trim() || '';
  if (homeLocation && officeLocation && homeLocation !== officeLocation) {
    return `Home: ${homeLocation} | Office: ${officeLocation}`;
  }
  return officeLocation || homeLocation || 'Not specified';
};

const formatTimeOff = (offer: Offer) => {
  const holidayDays = offer.holiday_days ?? 11;
  const sickLeaveDays = offer.sick_leave_days ?? 0;
  if (offer.is_unlimited_pto) {
    const sickLeave =
      offer.sick_leave_included_in_unlimited_pto !== false
        ? 'Sick leave: included'
        : `Sick leave: ${sickLeaveDays} days`;
    return `Unlimited PTO | ${sickLeave} | Holidays: ${holidayDays} days`;
  }
  return `PTO: ${offer.pto_days} days | Sick leave: ${sickLeaveDays} days | Holidays: ${holidayDays} days`;
};

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

const getDateRangeFromQuery = (query: string) => {
  const now = new Date();

  if (query.includes('this month')) {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: null as Date | null,
    };
  }

  if (query.includes('last 30 days')) {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { start, end: null as Date | null };
  }

  if (query.includes('this week')) {
    const start = new Date(now);
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return { start, end: null as Date | null };
  }

  const yearMatch = query.match(/\bin (\d{4})\b/);
  if (yearMatch?.[1]) {
    const year = Number(yearMatch[1]);
    return {
      start: new Date(year, 0, 1),
      end: new Date(year + 1, 0, 1),
    };
  }

  return { start: null as Date | null, end: null as Date | null };
};

const isWithinDateRange = (value: string | undefined, start: Date | null, end: Date | null) => {
  if (!start && !end) return true;
  const parsed = parseRecordDate(value);
  if (!parsed) return false;
  if (start && parsed < start) return false;
  if (end && parsed >= end) return false;
  return true;
};

const computeEventDurationMinutes = (event: Event) => {
  const [startHour, startMinute] = event.start_time.split(':').map((part) => Number(part));
  const [endHour, endMinute] = event.end_time.split(':').map((part) => Number(part));
  if ([startHour, startMinute, endHour, endMinute].some((part) => Number.isNaN(part))) return 0;
  return Math.max(0, endHour * 60 + endMinute - (startHour * 60 + startMinute));
};

const buildAnalyticsSummary = ({ applications, events }: AnalyticsSourceData) => {
  const byStatus = Object.entries(
    applications.reduce<Record<string, number>>((acc, application) => {
      acc[application.status] = (acc[application.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({ status, count }));

  const byCategory = Object.entries(
    events.reduce<Record<string, number>>((acc, event) => {
      const category = event.category_details?.name || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {})
  ).map(([category, count]) => ({ category, count }));

  return {
    applications: {
      total: applications.length,
      by_status: byStatus,
      offers_count: applications.filter((application) =>
        ['OFFER', 'ACCEPTED'].includes(application.status)
      ).length,
      active_count: applications.filter(
        (application) => !['REJECTED', 'GHOSTED', 'ACCEPTED'].includes(application.status)
      ).length,
    },
    events: {
      total: events.length,
      by_category: byCategory,
      average_duration_minutes:
        events.length > 0
          ? Math.round(
              events.reduce((sum, event) => sum + computeEventDurationMinutes(event), 0) /
                events.length
            )
          : 0,
    },
  };
};

export const loadAnalyticsSourceData = async (): Promise<AnalyticsSourceData> => {
  const [applicationsResponse, eventsResponse] = await Promise.all([
    getApplications(),
    getEvents(),
  ]);
  return {
    applications: applicationsResponse.data as CareerApplication[],
    events: eventsResponse.data as Event[],
  };
};

const normalizeAnalyticsContext = (
  queryLower: string,
  context: AnalyticsContext
): AnalyticsContext => {
  if (/(application|app|offer|interview)/.test(queryLower)) return 'job-hunt';
  if (/(event|meeting)/.test(queryLower)) return 'availability';
  return context;
};

const processAnalyticsQueryDeterministically = (
  query: string,
  context: AnalyticsContext,
  sourceData: AnalyticsSourceData
): AnalyticsWidgetResult | null => {
  const queryLower = query.trim().toLowerCase();
  const normalizedContext = normalizeAnalyticsContext(queryLower, context);
  const { start, end } = getDateRangeFromQuery(queryLower);

  if (normalizedContext === 'availability') {
    const filteredEvents = sourceData.events.filter((event) =>
      isWithinDateRange(event.date, start, end)
    );

    if (/total (events|meetings)/.test(queryLower)) {
      return { type: 'metric', value: filteredEvents.length, unit: 'events' };
    }

    if (/average (duration|length)/.test(queryLower)) {
      const average =
        filteredEvents.length > 0
          ? Math.round(
              filteredEvents.reduce((sum, event) => sum + computeEventDurationMinutes(event), 0) /
                filteredEvents.length
            )
          : 0;
      return { type: 'metric', value: average, unit: 'minutes' };
    }

    if (/(events|meetings) by category/.test(queryLower)) {
      const data = Object.entries(
        filteredEvents.reduce<Record<string, number>>((acc, event) => {
          const category = event.category_details?.name || 'Uncategorized';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }));
      return { type: 'chart', data, chartType: 'pie' };
    }
  }

  if (normalizedContext === 'job-hunt') {
    const filteredApplications = sourceData.applications.filter((application) =>
      isWithinDateRange(application.date_applied || application.created_at, start, end)
    );

    if (/total (applications|apps)/.test(queryLower)) {
      return { type: 'metric', value: filteredApplications.length, unit: 'applications' };
    }

    if (/total (offers|offer)/.test(queryLower)) {
      const value = filteredApplications.filter((application) =>
        ['OFFER', 'ACCEPTED'].includes(application.status)
      ).length;
      return { type: 'metric', value, unit: 'offers' };
    }

    if (/active (applications|apps)/.test(queryLower)) {
      const value = filteredApplications.filter(
        (application) => !['REJECTED', 'GHOSTED', 'ACCEPTED'].includes(application.status)
      ).length;
      return { type: 'metric', value, unit: 'active apps' };
    }

    if (/(applications|apps) by status/.test(queryLower)) {
      const data = Object.entries(
        filteredApplications.reduce<Record<string, number>>((acc, application) => {
          acc[application.status] = (acc[application.status] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }));
      return { type: 'chart', data, chartType: 'bar' };
    }
  }

  return null;
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
