import type { OfferLike as Offer, ApplicationLike } from '../pages/OfferComparison/calculations';
import type { Experience } from '../types';
import type { CareerApplication } from '../types/application';
import type { PromotionReviewContext } from './browserAi';

export const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseRecordDate = (value: string | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const normalizeSkillList = (skills: unknown): string[] => {
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

export const formatOptionalPromotionContext = (context: PromotionReviewContext = {}) => {
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

export const formatTeamHistory = (experience: Experience) => {
  if (!experience.team_history?.length) return 'No team history saved.';
  return experience.team_history
    .map((team) => {
      const range = `${team.start_date || 'Unknown'} to ${team.is_current ? 'Present' : team.end_date || 'Unknown'}`;
      return `${team.name || 'Unnamed team'} (${range})${team.manager ? ` | Manager: ${team.manager}` : ''}${team.norms ? ` | Norms: ${team.norms}` : ''}`;
    })
    .join('\n');
};

export const formatSchedulePhases = (experience: Experience) => {
  if (!experience.schedule_phases?.length) return 'No schedule phases saved.';
  return experience.schedule_phases
    .map(
      (phase) =>
        `${phase.name || 'Phase'} (${phase.start_date || 'Unknown'} to ${phase.is_current ? 'Present' : phase.end_date || 'Unknown'})`
    )
    .join('\n');
};

export const buildPromotionExperienceContext = (experience: Experience) => {
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

export const buildResumeContext = (experiences: Experience[]) => {
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

export const formatApplicationLocation = (
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

export const formatTimeOff = (offer: Offer) => {
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
