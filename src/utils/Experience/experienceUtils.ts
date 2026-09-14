import dayjs from 'dayjs';
import type { EmploymentType, Experience } from '../../types';

export const sortExperiencesForDisplay = (experiences: Experience[]): Experience[] =>
  [...experiences].sort((a, b) => {
    const aPinned = a.is_pinned ? 1 : 0;
    const bPinned = b.is_pinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;

    const aPos = a.position !== null && a.position !== undefined ? a.position : Infinity;
    const bPos = b.position !== null && b.position !== undefined ? b.position : Infinity;
    if (aPos !== bPos) return aPos - bPos;

    const aStart = a.start_date ? dayjs(a.start_date).valueOf() : 0;
    const bStart = b.start_date ? dayjs(b.start_date).valueOf() : 0;
    if (aStart !== bStart) return bStart - aStart;

    const aCreated = a.created_at ? dayjs(a.created_at).valueOf() : (a.id ?? 0);
    const bCreated = b.created_at ? dayjs(b.created_at).valueOf() : (b.id ?? 0);
    return bCreated - aCreated;
  });

export const groupExperiencesByCompany = (sorted: Experience[]): Experience[][] => {
  const seen = new Set<number>();
  const groups: Experience[][] = [];

  for (let i = 0; i < sorted.length; i++) {
    const exp = sorted[i];
    if (seen.has(exp.id!)) continue;

    const company = exp.company.toLowerCase();
    const group: Experience[] = [exp];
    seen.add(exp.id!);

    for (let j = i + 1; j < sorted.length; j++) {
      const other = sorted[j];
      if (!seen.has(other.id!) && other.company.toLowerCase() === company) {
        group.push(other);
        seen.add(other.id!);
      }
    }

    groups.push(group);
  }

  return groups;
};

export const orderExperiencesAsDisplayed = (experiences: Experience[]): Experience[] =>
  groupExperiencesByCompany(sortExperiencesForDisplay(experiences)).flat();

export const toNullableNumber = (value: number | string | null | undefined): number | null => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const roundCompNumber = (value: number | null | undefined) => {
  if (value == null) return null;
  return Number(value.toFixed(2));
};

export const parseExperienceDate = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  const normalized = /^\d{4}-\d{2}-\d{2}/.test(trimmed) ? trimmed.slice(0, 10) : trimmed;
  const parsed = dayjs(normalized);
  return parsed.isValid() ? parsed : null;
};

export const nearlyEqual = (
  a: number | null | undefined,
  b: number | null | undefined,
  epsilon = 0.01
) => {
  if (a == null || b == null) return false;
  return Math.abs(a - b) < epsilon;
};

export const DEFAULT_EMP_TYPES: EmploymentType[] = [
  { value: 'full_time', label: 'Full-time', color: 'blue' },
  { value: 'part_time', label: 'Part-time', color: 'teal' },
  { value: 'internship', label: 'Internship', color: 'amber' },
  { value: 'contract', label: 'Contract', color: 'purple' },
  { value: 'freelance', label: 'Freelance', color: 'orange' },
];

export const BADGE_CLASSES: Record<string, string> = {
  blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/25',
  teal: 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/25',
  amber:
    'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/25',
  purple:
    'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/25',
  orange:
    'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/25',
  green:
    'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/25',
  red: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/25',
  pink: 'bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-500/25',
  sky: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/25',
  gray: 'bg-gray-50 dark:bg-ink-900 text-gray-700 dark:text-ink-100 border-gray-200 dark:border-white/[0.08]',
};

export const DOT_CLASSES: Record<string, string> = {
  blue: 'bg-blue-400',
  teal: 'bg-teal-400',
  amber: 'bg-amber-400',
  purple: 'bg-purple-400',
  orange: 'bg-orange-400',
  green: 'bg-green-400',
  red: 'bg-red-400',
  pink: 'bg-pink-400',
  sky: 'bg-sky-400',
  gray: 'bg-gray-400',
};

export const getAvatarStyle = (name: string) => {
  const gradients = [
    'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
    'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
    'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
    'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
  ];
  let hash = 0;
  const safeName = name || '';
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return {
    backgroundImage: gradients[Math.abs(hash) % gradients.length],
    color: '#fff',
    border: 'none',
  };
};
