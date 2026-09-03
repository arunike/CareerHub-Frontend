import type { RaiseReason, RaiseType } from '../../types';

export interface ReviewCycle {
  // The first day the new rate applies, not the day the review closed.
  month: number;
  day: number;
  label: string;
  hint: string;
}

// Only the types on a fixed cycle; guessing one elsewhere invents back pay nobody was owed.
export const REVIEW_CYCLES = {
  merit: {
    month: 7,
    day: 1,
    label: 'Mid-year review',
    hint: 'Reviews close 30 Jun, so the new rate runs from 1 Jul',
  },
} satisfies Partial<Record<RaiseReason, ReviewCycle>>;

export const cycleFor = (type: RaiseType): ReviewCycle | null =>
  REVIEW_CYCLES[type as keyof typeof REVIEW_CYCLES] ?? null;

const pad = (value: number) => String(value).padStart(2, '0');

// Same year only: last year's cycle backdates twelve months, which is a dispute, not late payroll.
export const defaultEffectiveDate = (
  type: RaiseType,
  paidOn: string | undefined
): string | null => {
  const cycle = cycleFor(type);
  if (!cycle || !paidOn) return null;
  const candidate = `${paidOn.slice(0, 4)}-${pad(cycle.month)}-${pad(cycle.day)}`;
  return candidate < paidOn ? candidate : null;
};

export interface CycleInputs {
  type: RaiseType;
  date: string;
}

// What the switch fills in; no cycle means the pay date, which owes nothing until you move it.
export const suggestEffectiveDate = ({ type, date }: CycleInputs): string =>
  defaultEffectiveDate(type, date) ?? date;

// Re-suggests over our own fill only; once you pick an effective date, the form may not move it.
export const nextEffectiveDate = (
  current: string | null | undefined,
  previous: CycleInputs,
  next: CycleInputs
): string | null => {
  if (current == null) return null;
  return current === suggestEffectiveDate(previous) ? suggestEffectiveDate(next) : current;
};
