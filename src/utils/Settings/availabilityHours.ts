import dayjs from 'dayjs';
import type { UserSettings } from '../../types';

export type AvailabilityTimeRange = UserSettings['work_time_ranges'][number];

export const WORK_DAY_OPTIONS = [
  { val: 0, label: 'Mon' },
  { val: 1, label: 'Tue' },
  { val: 2, label: 'Wed' },
  { val: 3, label: 'Thu' },
  { val: 4, label: 'Fri' },
  { val: 5, label: 'Sat' },
  { val: 6, label: 'Sun' },
];

// Consecutive days collapse into a range, so "Mon–Thu, Sat" instead of five chips.
export const summarizeSelectedDays = (days: number[]) => {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 0) return 'No days selected';
  const runs: number[][] = [];
  sorted.forEach((day) => {
    const current = runs[runs.length - 1];
    if (current && day === current[current.length - 1] + 1) current.push(day);
    else runs.push([day]);
  });
  return runs
    .map((run) => {
      const first = WORK_DAY_OPTIONS.find((option) => option.val === run[0])?.label;
      const last = WORK_DAY_OPTIONS.find((option) => option.val === run[run.length - 1])?.label;
      if (!first) return '';
      return run.length === 1 || !last ? first : `${first}–${last}`;
    })
    .filter(Boolean)
    .join(', ');
};

export const formatAvailabilityTime = (value: string | undefined, fallback: string) => {
  const parsed = dayjs(value || fallback, 'HH:mm:ss', true);
  return parsed.isValid() ? parsed.format('h:mm A') : value || fallback;
};
