import type { RaiseEntry } from '../../types';

export interface SalaryStep {
  effectiveFrom: string;
  annualSalary: number;
}

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const usable = (entry: RaiseEntry) => Boolean(entry?.date) && num(entry.base_after) > 0;

// A raise is a step change in pay: it applies from its effective date and holds until the next.
export const buildSalarySteps = (raises: RaiseEntry[], fallbackSalary: number): SalaryStep[] => {
  const sorted = raises.filter(usable).sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [];

  // Before the first raise the pay is whatever it was raised from, not today's figure.
  const opening = num(sorted[0].base_before) || fallbackSalary;
  const steps: SalaryStep[] = [{ effectiveFrom: '', annualSalary: opening }];
  for (const raise of sorted) {
    steps.push({ effectiveFrom: raise.date, annualSalary: num(raise.base_after) });
  }
  return steps;
};

// The pay in force on a date: the last step that had taken effect by then.
export const salaryOn = (steps: SalaryStep[], isoDate: string | null, fallback: number) => {
  if (steps.length === 0 || !isoDate) return fallback;
  let current = fallback;
  for (const step of steps) {
    if (step.effectiveFrom === '' || step.effectiveFrom <= isoDate) current = step.annualSalary;
    else break;
  }
  return current;
};

// Per-period gross for a year of pay dates, so a mid-year raise shows up from the next paycheck.
export const salaryByPeriod = (
  periods: Array<{ periodIndex: number; payDate: string | null }>,
  raises: RaiseEntry[],
  fallbackSalary: number,
  periodsPerYear: number
): Record<number, number> => {
  const steps = buildSalarySteps(raises, fallbackSalary);
  if (steps.length === 0 || periodsPerYear <= 0) return {};

  const byPeriod: Record<number, number> = {};
  for (const period of periods) {
    const annual = salaryOn(steps, period.payDate, fallbackSalary);
    if (annual !== fallbackSalary) byPeriod[period.periodIndex] = annual / periodsPerYear;
  }
  return byPeriod;
};

export type RaiseField = 'base' | 'bonus' | 'equity';

export interface Package {
  base: number;
  bonus: number;
  equity: number;
}

const AFTER = { base: 'base_after', bonus: 'bonus_after', equity: 'equity_after' } as const;
const BEFORE = { base: 'base_before', bonus: 'bonus_before', equity: 'equity_before' } as const;

const dated = (raises: RaiseEntry[]) =>
  raises.filter((entry) => Boolean(entry?.date)).sort((a, b) => a.date.localeCompare(b.date));

// A raise writes only to raise_history, so the role's own figures stay at whatever they were.
export const currentPackage = (raises: RaiseEntry[], stored: Package): Package => {
  const latest = dated(raises).at(-1);
  if (!latest) return stored;
  return {
    base: num(latest[AFTER.base]) || stored.base,
    bonus: num(latest[AFTER.bonus]),
    equity: num(latest[AFTER.equity]),
  };
};

export const stepsForField = (
  raises: RaiseEntry[],
  field: RaiseField,
  fallback: number
): SalaryStep[] => {
  const sorted = dated(raises);
  if (sorted.length === 0) return [];
  const opening = num(sorted[0][BEFORE[field]]) || fallback;
  const steps: SalaryStep[] = [{ effectiveFrom: '', annualSalary: opening }];
  for (const raise of sorted) {
    steps.push({ effectiveFrom: raise.date, annualSalary: num(raise[AFTER[field]]) });
  }
  return steps;
};

const epochDay = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86400000);

export interface YearWindow {
  start: string;
  end: string;
  // True when the window stops at today because the role is still running.
  endsToday: boolean;
  wholeYear: boolean;
}

// The stretch of one year you actually held the role: pay before you joined or after you left is not yours.
export const employmentWindow = (
  year: number,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  todayIso: string
): YearWindow | null => {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const start = startDate && startDate > yearStart ? startDate : yearStart;
  // A role you are still in has not been paid past today, so the year is not finished.
  const openEnd = todayIso < yearEnd ? todayIso : yearEnd;
  const end = endDate ? (endDate < yearEnd ? endDate : yearEnd) : openEnd;
  if (end < start) return null;
  return {
    start,
    end,
    endsToday: !endDate && end === todayIso,
    wholeYear: start === yearStart && end === yearEnd,
  };
};

const FIELDS: RaiseField[] = ['base', 'bonus', 'equity'];

// Every calendar year a stint touched, so one spanning New Year appears under both.
export const yearsCovered = (start: string | null, end: string, todayIso: string) => {
  const from = Number((start ?? end).slice(0, 4));
  const to = Number((end > todayIso ? todayIso : end).slice(0, 4));
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return [];
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
};

export interface EarningSegment {
  from: string;
  to: string;
  days: number;
  annualRate: number;
  amount: number;
}

export interface YearEarnings {
  year: number;
  window: YearWindow;
  segments: EarningSegment[];
  byComponent: Package;
  total: number;
  daysInYear: number;
  daysWorked: number;
  openingRate: number;
  currentRate: number;
}

const isoOf = (day: number) => new Date(day * 86400000).toISOString().slice(0, 10);

const daysInYear = (year: number) => epochDay(`${year}-12-31`) - epochDay(`${year}-01-01`) + 1;

const componentsOn = (raises: RaiseEntry[], stored: Package, isoDate: string): Package => {
  const current = currentPackage(raises, stored);
  const on = {} as Package;
  for (const field of FIELDS) {
    on[field] = salaryOn(stepsForField(raises, field, current[field]), isoDate, current[field]);
  }
  return on;
};

// The year split into stretches at one rate each, so the arithmetic can be shown rather than asserted.
export const earningsForYear = (
  raises: RaiseEntry[],
  stored: Package,
  window: YearWindow | null,
  year: number
): YearEarnings | null => {
  if (!window) return null;
  const first = epochDay(window.start);
  const last = epochDay(window.end);
  if (last < first) return null;

  // A boundary per raise that lands inside the window; the window's own start always opens one.
  const cuts = [first];
  for (const entry of dated(raises)) {
    const day = epochDay(entry.date);
    if (day > first && day <= last && !cuts.includes(day)) cuts.push(day);
  }
  cuts.sort((a, b) => a - b);

  const total = daysInYear(year);
  const byComponent: Package = { base: 0, bonus: 0, equity: 0 };
  const segments: EarningSegment[] = cuts.map((cut, index) => {
    const end = index + 1 < cuts.length ? cuts[index + 1] - 1 : last;
    const days = end - cut + 1;
    const parts = componentsOn(raises, stored, isoOf(cut));
    for (const field of FIELDS) byComponent[field] += (parts[field] * days) / total;
    const annualRate = parts.base + parts.bonus + parts.equity;
    return {
      from: isoOf(cut),
      to: isoOf(end),
      days,
      annualRate,
      amount: (annualRate * days) / total,
    };
  });

  return {
    year,
    window,
    segments,
    byComponent,
    total: segments.reduce((sum, segment) => sum + segment.amount, 0),
    daysInYear: total,
    daysWorked: last - first + 1,
    openingRate: segments[0]?.annualRate ?? 0,
    currentRate: segments.at(-1)?.annualRate ?? 0,
  };
};

// The one figure for "what this role has paid", rounded per year so every view agrees to the dollar.
export const totalEarned = (years: YearEarnings[]) =>
  years.reduce(
    (sum, year) =>
      sum +
      Math.round(year.byComponent.base) +
      Math.round(year.byComponent.bonus) +
      Math.round(year.byComponent.equity),
    0
  );
