import dayjs from 'dayjs';
import type { Experience } from '../../types';
import { parseExperienceDate } from './experienceUtils';
import { humanizeDaySpan } from './roleTimeline';

export const mergedDays = (intervals: [number, number][]): number => {
  if (intervals.length === 0) return 0;
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let curStart = sorted[0][0];
  let curEnd = sorted[0][1];
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i];
    if (s <= curEnd) {
      curEnd = Math.max(curEnd, e);
    } else {
      total += curEnd - curStart;
      curStart = s;
      curEnd = e;
    }
  }
  total += curEnd - curStart;
  return total;
};

export const fmtDays = (totalDays: number, showDaysCount = false): string =>
  humanizeDaySpan(totalDays, { withTotal: showDaysCount });

const spanOf = (exp: Experience): [number, number] | null => {
  const start = parseExperienceDate(exp.start_date);
  const end = exp.is_current ? dayjs() : parseExperienceDate(exp.end_date);
  return start && end ? [start.valueOf(), end.valueOf()] : null;
};

// Overlapping roles count once, so two jobs held at the same time are not double-counted.
export const totalCareerDuration = (experiences: Experience[]): string => {
  if (experiences.length === 0) return '0 yrs';
  const intervals = experiences.map(spanOf).filter((s): s is [number, number] => s !== null);
  return fmtDays(Math.round(mergedDays(intervals) / 86400000), true);
};

export const companyCount = (experiences: Experience[]) =>
  new Set(experiences.map((e) => e.company)).size;

export const durationByEmploymentType = (experiences: Experience[]): Record<string, number> => {
  const byType: Record<string, [number, number][]> = {};
  for (const exp of experiences) {
    const span = spanOf(exp);
    if (!span) continue;
    const type = exp.employment_type || 'full_time';
    (byType[type] ??= []).push(span);
  }
  return Object.fromEntries(
    Object.entries(byType).map(([type, intervals]) => [
      type,
      Math.round(mergedDays(intervals) / 86400000),
    ])
  );
};

// A company counts once, under the type of the most recent role held there.
export const companiesByEmploymentType = (experiences: Experience[]): Record<string, number> => {
  const seen = new Map<string, string>();
  for (const exp of [...experiences].sort((a, b) =>
    (b.start_date ?? '').localeCompare(a.start_date ?? '')
  )) {
    const key = exp.company.toLowerCase();
    if (!seen.has(key)) seen.set(key, exp.employment_type || 'full_time');
  }
  const result: Record<string, number> = {};
  for (const type of seen.values()) result[type] = (result[type] || 0) + 1;
  return result;
};

export const skillFrequency = (experiences: Experience[]): Record<string, number> =>
  experiences
    .flatMap((exp) => exp.skills || [])
    .reduce<Record<string, number>>((counts, skill) => {
      counts[skill] = (counts[skill] || 0) + 1;
      return counts;
    }, {});

export const topSkillsByFrequency = (counts: Record<string, number>, limit = 12): string[] =>
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([skill]) => skill);
