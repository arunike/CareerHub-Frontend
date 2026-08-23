import dayjs from 'dayjs';
import type { EmploymentType, Experience } from '../../types';
import { roleDateLabel, type RoleDateLabel } from './roleTimeline';
import { fmtDays } from './experienceSummaries';
import { BADGE_CLASSES, DOT_CLASSES, parseExperienceDate } from './experienceUtils';

export const formatDuration = (exp: Experience): RoleDateLabel =>
  roleDateLabel({
    startDate: parseExperienceDate(exp.start_date),
    endDate: parseExperienceDate(exp.end_date),
    isCurrent: exp.is_current,
  });

export const formatRoleDateRange = (
  exp: Experience,
  overrideEndDate?: string | null
): RoleDateLabel =>
  roleDateLabel({
    startDate: parseExperienceDate(exp.start_date),
    endDate: parseExperienceDate(exp.end_date),
    fallbackEndDate: parseExperienceDate(overrideEndDate ?? null),
    isCurrent: exp.is_current,
    format: 'MMM YYYY',
    precision: 'rounded',
  });

export const getTypeDisplay = (value: string, empTypes: EmploymentType[]) => {
  const type = empTypes.find((candidate) => candidate.value === value);
  return {
    label: type?.label ?? value,
    dot: DOT_CLASSES[type?.color ?? 'gray'] ?? 'bg-gray-400',
    badge: BADGE_CLASSES[type?.color ?? 'gray'] ?? 'bg-gray-50 text-gray-700 border-gray-200',
  };
};

export const getLatestTeam = (exp: Experience) => {
  const teams = exp.team_history || [];
  if (teams.length === 0) return undefined;
  const current = teams.find((team) => team.is_current);
  if (current) return current;
  return [...teams].sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''))[0];
};

export const getGroupTenure = (group: Experience[]): string => {
  const oldest = group[group.length - 1];
  const newest = group[0];
  const start = parseExperienceDate(oldest.start_date);
  const end = newest.is_current ? dayjs() : parseExperienceDate(newest.end_date);
  if (!start || !end) return '';
  return fmtDays(end.diff(start, 'day'), true);
};
