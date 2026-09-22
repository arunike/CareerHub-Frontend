export interface PtoPolicy {
  ptoDays: number;
  isUnlimited: boolean;
  unlimitedPlanningDays: number;
  rolloverMaxDays: number;
  // Extra days per completed year of service; 0 leaves the allowance flat.
  accrualDaysPerYear: number;
  accrualMaxDays: number;
  hoursPerDay: number;
  paychecksPerYear: number;
}

export interface RoleWindow {
  startDate: string | null;
  endDate: string | null;
}

export interface TimeOffEntryLike {
  date: string;
  days: number | string;
  kind?: string | null;
}

export interface PtoBalance {
  entitled: number;
  // What tenure added on top of the headline allowance, before proration.
  accrued: number;
  rolledOver: number;
  taken: number;
  remaining: number;
  // True when the role did not cover the whole year, which is why the allowance is not the headline one.
  prorated: boolean;
  unlimited: boolean;
}

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Payroll tracks half days, so every figure here lands on one.
const toHalfDay = (value: number) => Math.round(value * 2) / 2;

const dayOf = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86400000;

const daysInYear = (year: number) => dayOf(`${year + 1}-01-01`) - dayOf(`${year}-01-01`);

// The share of the year this role actually covered: a job started in July earns half the allowance.
export const coverageOfYear = (window: RoleWindow, year: number) => {
  const yearStart = dayOf(`${year}-01-01`);
  const yearEnd = dayOf(`${year}-12-31`);
  const start = window.startDate ? dayOf(window.startDate) : yearStart;
  const end = window.endDate ? dayOf(window.endDate) : yearEnd;
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  const from = Math.max(start, yearStart);
  const to = Math.min(end, yearEnd);
  if (to < from) return 0;
  return (to - from + 1) / daysInYear(year);
};

const takenIn = (entries: TimeOffEntryLike[], year: number) =>
  entries
    .filter((entry) => (entry.kind ?? 'PTO') === 'PTO' && entry.date.slice(0, 4) === String(year))
    .reduce((total, entry) => total + num(entry.days), 0);

// Anniversaries reached during the year: start in Jan 2025 and by 2026 you have worked a year.
export const yearsOfService = (window: RoleWindow, year: number) => {
  if (!window.startDate) return 0;
  return Math.max(0, year - Number(window.startDate.slice(0, 4)));
};

// Tenure days are granted whole, then the year's coverage prorates the total.
export const tenureDays = (policy: PtoPolicy, window: RoleWindow, year: number) => {
  if (policy.isUnlimited || num(policy.accrualDaysPerYear) <= 0) return 0;
  const earned = num(policy.accrualDaysPerYear) * yearsOfService(window, year);
  const cap = num(policy.accrualMaxDays);
  return cap > 0 ? Math.min(cap, earned) : earned;
};

const entitledIn = (policy: PtoPolicy, window: RoleWindow, year: number) => {
  const headline = policy.isUnlimited ? policy.unlimitedPlanningDays : policy.ptoDays;
  return toHalfDay(
    (num(headline) + tenureDays(policy, window, year)) * coverageOfYear(window, year)
  );
};

export const ptoBalance = ({
  policy,
  window,
  year,
  entries,
}: {
  policy: PtoPolicy;
  window: RoleWindow;
  year: number;
  entries: TimeOffEntryLike[];
}): PtoBalance => {
  const entitled = entitledIn(policy, window, year);
  const taken = toHalfDay(takenIn(entries, year));
  // Carried days come from the year just gone and never carry twice; unlimited has nothing to carry.
  const unusedLastYear = Math.max(
    0,
    entitledIn(policy, window, year - 1) - takenIn(entries, year - 1)
  );
  const rolledOver = policy.isUnlimited
    ? 0
    : toHalfDay(Math.min(num(policy.rolloverMaxDays), unusedLastYear));

  return {
    entitled,
    accrued: tenureDays(policy, window, year),
    rolledOver,
    taken,
    remaining: toHalfDay(entitled + rolledOver - taken),
    prorated: coverageOfYear(window, year) < 1,
    unlimited: policy.isUnlimited,
  };
};

export interface DayOff {
  date: string;
  tab?: string | null;
  // An explicit charge to one or more roles; empty falls back to whichever role was running then.
  pto_experience_ids?: number[] | null;
  // Off for a day that is marked on the calendar but was not actually taken as leave.
  counts_as_pto?: boolean;
}

// Saturday and Sunday cost no leave, so a trip spanning a weekend does not spend those days.
export const isWorkday = (iso: string) => {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6;
};

// A day falls to whichever role you held that day, so changing jobs splits the year by itself.
export const daysOffInWindow = (
  days: DayOff[],
  window: RoleWindow,
  year: number,
  roleId?: number | null
) => {
  const from = window.startDate ?? `${year}-01-01`;
  const to = window.endDate ?? `${year}-12-31`;
  const dates = days
    .filter((day) => !day.tab && day.date.slice(0, 4) === String(year))
    .filter((day) => day.counts_as_pto !== false)
    .filter((day) => isWorkday(day.date))
    .filter((day) => {
      // An explicit link wins outright, so a day charged elsewhere never lands here by its date.
      const linked = day.pto_experience_ids ?? [];
      if (linked.length > 0) return roleId != null && linked.includes(roleId);
      return day.date >= from && day.date <= to;
    })
    // Two entries can share a date; one day away from work is one day.
    .map((day) => day.date);
  return [...new Set(dates)];
};
