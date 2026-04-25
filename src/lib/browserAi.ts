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

const JD_MATCH_SYSTEM_PROMPT = `You are an expert technical recruiter and ATS system.
Holistically evaluate the Candidate's Professional Experience against the Job Description.
Do NOT just keyword-match; assess whether the candidate's actual trajectory, achievements, and seniority level align with the role.

Scoring rubric:
90-100: Strong match — would shortlist immediately
70-89: Good fit with minor gaps
50-69: Partial match — significant gaps exist
<50: Poor match

Respond ONLY with a valid JSON object using exactly this structure:
{
  "score": <integer 0-100>,
  "summary": "<2-3 sentences on overall fit and whether the candidate's seniority matches the role>",
  "matched_skills": ["<strength or matched area>", ...],
  "missing_skills": ["<critical gap>", ...],
  "recommendations": ["<actionable resume tip>", ...]
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
      if (experience.base_salary != null) compBits.push(`Base salary: $${Number(experience.base_salary).toLocaleString()}`);
      if (experience.bonus != null) compBits.push(`Bonus: $${Number(experience.bonus).toLocaleString()}`);
      if (experience.equity != null) compBits.push(`Equity: $${Number(experience.equity).toLocaleString()}`);
      if (experience.hourly_rate != null) compBits.push(`Hourly rate: $${Number(experience.hourly_rate).toLocaleString()}/hr`);
      if (compBits.length) lines.push(compBits.join(' | '));
    }
    lines.push('-'.repeat(40));
  }
  return lines.join('\n');
};

const formatApplicationLocation = (
  application: Pick<CareerApplication, 'location' | 'office_location'> | Pick<ApplicationLike, 'location' | 'office_location'>,
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
  if (offer.is_unlimited_pto) return `Unlimited PTO | Holidays: ${holidayDays} days`;
  return `PTO: ${offer.pto_days} days | Holidays: ${holidayDays} days`;
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
        content: `JOB DESCRIPTION:
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

  const targetCompany = application?.company_name || offer.application_details?.company || 'Unknown Company';
  const targetRole = application?.role_title || offer.application_details?.role_title || 'Unknown Role';

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
  return Math.max(0, (endHour * 60 + endMinute) - (startHour * 60 + startMinute));
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
      offers_count: applications.filter((application) => ['OFFER', 'ACCEPTED'].includes(application.status)).length,
      active_count: applications.filter((application) => !['REJECTED', 'GHOSTED', 'ACCEPTED'].includes(application.status)).length,
    },
    events: {
      total: events.length,
      by_category: byCategory,
      average_duration_minutes:
        events.length > 0
          ? Math.round(events.reduce((sum, event) => sum + computeEventDurationMinutes(event), 0) / events.length)
          : 0,
    },
  };
};

export const loadAnalyticsSourceData = async (): Promise<AnalyticsSourceData> => {
  const [applicationsResponse, eventsResponse] = await Promise.all([getApplications(), getEvents()]);
  return {
    applications: applicationsResponse.data as CareerApplication[],
    events: eventsResponse.data as Event[],
  };
};

const normalizeAnalyticsContext = (queryLower: string, context: AnalyticsContext): AnalyticsContext => {
  if (/(application|app|offer|interview)/.test(queryLower)) return 'job-hunt';
  if (/(event|meeting)/.test(queryLower)) return 'availability';
  return context;
};

const processAnalyticsQueryDeterministically = (
  query: string,
  context: AnalyticsContext,
  sourceData: AnalyticsSourceData,
): AnalyticsWidgetResult | null => {
  const queryLower = query.trim().toLowerCase();
  const normalizedContext = normalizeAnalyticsContext(queryLower, context);
  const { start, end } = getDateRangeFromQuery(queryLower);

  if (normalizedContext === 'availability') {
    const filteredEvents = sourceData.events.filter((event) => isWithinDateRange(event.date, start, end));

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
      const value = filteredApplications.filter((application) =>
        !['REJECTED', 'GHOSTED', 'ACCEPTED'].includes(application.status)
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
  sourceData: AnalyticsSourceData,
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
