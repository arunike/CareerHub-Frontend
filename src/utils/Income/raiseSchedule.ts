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

// Payroll acts on the notified date, but a rise announced early cannot be paid before it starts.
export const stepDateOf = (raise: RaiseEntry) => {
  const effective = raise.effective_date;
  return effective && effective > raise.date ? effective : raise.date;
};

// A raise is a step change in pay: it applies from that day and holds until the next one.
export const buildSalarySteps = (raises: RaiseEntry[], fallbackSalary: number): SalaryStep[] => {
  // Two raises notified the same day tie, so the later effective one wins by rule, not by JSON order.
  const sorted = raises.filter(usable).sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    const byEffective = (a.effective_date ?? a.date).localeCompare(b.effective_date ?? b.date);
    return byEffective !== 0 ? byEffective : num(a.base_after) - num(b.base_after);
  });
  if (sorted.length === 0) return [];

  // Before the first raise the pay is whatever it was raised from, not today's figure.
  const opening = num(sorted[0].base_before) || fallbackSalary;
  const steps: SalaryStep[] = [{ effectiveFrom: '', annualSalary: opening }];
  for (const raise of sorted) {
    steps.push({ effectiveFrom: stepDateOf(raise), annualSalary: num(raise.base_after) });
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

const stepsForField = (raises: RaiseEntry[], field: RaiseField, fallback: number): SalaryStep[] => {
  const sorted = dated(raises);
  if (sorted.length === 0) return [];
  const opening = num(sorted[0][BEFORE[field]]) || fallback;
  const steps: SalaryStep[] = [{ effectiveFrom: '', annualSalary: opening }];
  for (const raise of sorted) {
    steps.push({ effectiveFrom: stepDateOf(raise), annualSalary: num(raise[AFTER[field]]) });
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

export interface BackPay {
  raiseId: string;
  effectiveFrom: string;
  paidFrom: string;
  // Whole paychecks that went out at the old rate, which is what payroll reverses and re-pays.
  periods: number;
  perPeriodDifference: number;
  baseBefore: number;
  baseAfter: number;
  annualDifference: number;
  amount: number;
  // True when the pay dates were unavailable and the count came from the period length.
  estimated: boolean;
}

export interface BackPayContext {
  paychecksPerYear: number;
  // Pay dates in the year, so the periods actually paid short can be counted rather than guessed.
  payDates?: string[];
  // Days between a period ending and its paycheck, read off any payslip; 0 means paid same day.
  payLagDays?: number;
}

// Payroll reverses whole paychecks at the old rate and re-pays them, so it is periods × the rise.
export const backPayFor = (raises: RaiseEntry[], context: BackPayContext): BackPay[] => {
  const perYear = Math.max(1, Math.round(context.paychecksPerYear) || 1);
  const periodLength = Math.max(1, Math.round(365 / perYear));
  const lag = Math.max(0, Math.round(context.payLagDays ?? 0));
  const dates = [...(context.payDates ?? [])].filter(Boolean).sort();

  const owed: BackPay[] = [];
  for (const raise of dated(raises)) {
    const effective = raise.effective_date;
    if (!effective || effective >= raise.date) continue;

    // Base only: a bonus settles at payout on the new rate, so prorating it would pay it twice.
    const baseBefore = num(raise.base_before);
    const baseAfter = num(raise.base_after);
    const annualDifference = baseAfter - baseBefore;
    if (annualDifference <= 0) continue;

    const perPeriodDifference = annualDifference / perYear;
    const effectiveDay = epochDay(effective);
    const paidDay = epochDay(raise.date);

    let periods: number;
    let estimated: boolean;
    if (dates.length > 0) {
      // A paycheck is owed when the work it covers began on or after the raise took effect.
      periods = dates.filter((payDate) => {
        const payDay = epochDay(payDate);
        const workStart = payDay - lag - periodLength + 1;
        return workStart >= effectiveDay && payDay < paidDay;
      }).length;
      estimated = false;
    } else {
      periods = Math.floor((paidDay - effectiveDay) / periodLength);
      estimated = true;
    }
    if (periods <= 0) continue;

    owed.push({
      raiseId: raise.id,
      effectiveFrom: effective,
      paidFrom: raise.date,
      periods,
      perPeriodDifference,
      baseBefore,
      baseAfter,
      annualDifference,
      amount: periods * perPeriodDifference,
      estimated,
    });
  }
  return owed;
};

export interface RaiseLedgerInput {
  raises: RaiseEntry[];
  periods: Array<{ periodIndex: number; payDate: string | null }>;
  fallbackSalary: number;
  hasLinkedOffer: boolean;
}

// Why a logged raise changed nothing, so a flat ledger is never left unexplained.
export const raiseLedgerNotice = ({
  raises,
  periods,
  fallbackSalary,
  hasLinkedOffer,
}: RaiseLedgerInput): string | null => {
  if (!hasLinkedOffer) {
    return 'No offer is linked to this role, so its pay comes from the Experience record alone — raises, benefits and employer match are all stored on an offer and cannot reach these paychecks. Link one on the Experience page.';
  }
  if (raises.length === 0) return null;

  const unusable = raises.filter((raise) => !usable(raise));
  if (unusable.length === raises.length) {
    return 'The recorded raise has no date or no new base pay, so there is nothing to apply.';
  }

  const applied = salaryByPeriod(periods, raises, fallbackSalary, 1);
  if (Object.keys(applied).length > 0) return null;

  const dated = raises.filter(usable).sort((a, b) => a.date.localeCompare(b.date));
  const payDates = periods.map((period) => period.payDate).filter(Boolean) as string[];
  const lastPayDate = payDates[payDates.length - 1];
  const firstRaise = dated[0].date;
  if (lastPayDate && firstRaise > lastPayDate) {
    return `The raise is dated ${firstRaise}, after the last paycheck of this year — it will apply from the year that contains it.`;
  }
  return 'The raise lands on the same base pay this role already uses, so no paycheck changes. Check the After figure against the role’s current base.';
};
