import dayjs from 'dayjs';
import type { EmploymentType } from '../../types';

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
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  pink: 'bg-pink-50 text-pink-700 border-pink-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  gray: 'bg-gray-50 text-gray-700 border-gray-200',
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
