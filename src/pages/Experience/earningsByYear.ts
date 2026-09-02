import dayjs from 'dayjs';
import {
  countWeekdaysInclusive,
  storedPackageOf,
  type ExperienceCompensationSnapshot,
} from './compensation';
import { earningsForYear, employmentWindow, yearsCovered } from '../Income/raiseSchedule';
import { shadesFor } from './PayChart';
import type { RaiseEntry } from '../../types';
import type { Experience } from '../../types';
import type { LedgerYear } from '../Income/useLedgerEarnings';

export interface RoleYearEarnings {
  key: string;
  year: number;
  company: string;
  roleTitle: string;
  amount: number;
  byComponent: { base: number; bonus: number; equity: number };
}

export interface YearGroup {
  year: number;
  total: number;
  roles: RoleYearEarnings[];
}

export interface EarningsReport {
  groups: YearGroup[];
  // Roles that produced no figure, so a missing name in the chart has a stated reason.
  skipped: { company: string; roleTitle: string; reason: string }[];
}

interface OfferLike {
  base_salary?: number | string | null;
  bonus?: number | string | null;
  equity?: number | string | null;
  raise_history?: RaiseEntry[] | null;
}

type Package = { base: number; bonus: number; equity: number };

const rounded = (parts: Package): Package => ({
  base: Math.round(parts.base),
  bonus: Math.round(parts.bonus),
  equity: Math.round(parts.equity),
});

const whole = (parts: Package) => {
  const r = rounded(parts);
  return r.base + r.bonus + r.equity;
};

// The ledger already knows this role's yearly pay; nothing needs estimating from rates and dates.
const ledgerRows = (exp: Experience, years: LedgerYear[]): RoleYearEarnings[] =>
  years
    .filter((year) => year.total > 0)
    .map((year) => ({
      key: `${exp.id}-${year.year}`,
      year: year.year,
      company: exp.company || 'Role',
      roleTitle: exp.title || '',
      amount: year.total,
      byComponent: year.byComponent,
    }));

const salaryRows = (
  exp: Experience,
  offer: OfferLike | undefined,
  todayIso: string
): RoleYearEarnings[] => {
  const stored = storedPackageOf(exp, offer);
  if (stored.base + stored.bonus + stored.equity <= 0) return [];

  const raises = offer?.raise_history ?? [];
  const finish = exp.is_current ? todayIso : (exp.end_date ?? todayIso);
  return yearsCovered(exp.start_date ?? null, finish, todayIso).flatMap((year) => {
    const window = employmentWindow(
      year,
      exp.start_date,
      exp.is_current ? null : exp.end_date,
      todayIso
    );
    const earned = earningsForYear(raises, stored, window, year);
    if (!earned || earned.total <= 0) return [];
    return [
      {
        key: `${exp.id}-${year}`,
        year,
        company: exp.company || 'Role',
        roleTitle: exp.title || '',
        amount: whole(earned.byComponent),
        byComponent: rounded(earned.byComponent),
      },
    ];
  });
};

// An hourly stint reports one total, so it is spread over its years by weekdays worked in each.
const hourlyRows = (
  exp: Experience,
  snapshot: Extract<ExperienceCompensationSnapshot, { kind: 'hourly' }>,
  todayIso: string
): RoleYearEarnings[] => {
  const start = exp.start_date ?? null;
  const finish = exp.is_current ? todayIso : (exp.end_date ?? todayIso);
  if (!start || snapshot.total <= 0) return [];

  const years = yearsCovered(start, finish, todayIso);
  const spans = years.map((year) => {
    const from = dayjs(start > `${year}-01-01` ? start : `${year}-01-01`);
    const to = dayjs(finish < `${year}-12-31` ? finish : `${year}-12-31`);
    return { year, weekdays: to.isBefore(from) ? 0 : countWeekdaysInclusive(from, to) };
  });
  const totalWeekdays = spans.reduce((sum, span) => sum + span.weekdays, 0);
  if (totalWeekdays <= 0) return [];

  return spans
    .filter((span) => span.weekdays > 0)
    .map((span) => ({
      key: `${exp.id}-${span.year}`,
      year: span.year,
      company: exp.company || 'Role',
      roleTitle: exp.title || '',
      // Hourly pay has no bonus or equity split, so it all sits under base.
      amount: Math.round((snapshot.total * span.weekdays) / totalWeekdays),
      byComponent: {
        base: Math.round((snapshot.total * span.weekdays) / totalWeekdays),
        bonus: 0,
        equity: 0,
      },
    }));
};

export const buildEarningsReport = (
  experiences: Experience[],
  getOffer: (exp: Experience) => OfferLike | undefined,
  getSnapshot: (exp: Experience) => ExperienceCompensationSnapshot | null,
  todayIso: string
): EarningsReport => {
  const rows: RoleYearEarnings[] = [];
  const skipped: EarningsReport['skipped'] = [];
  const skip = (exp: Experience, reason: string) =>
    skipped.push({ company: exp.company || 'Role', roleTitle: exp.title || '', reason });

  for (const exp of experiences) {
    const snapshot = getSnapshot(exp);
    const before = rows.length;
    if (snapshot?.kind === 'hourly') {
      rows.push(...hourlyRows(exp, snapshot, todayIso));
    } else if (snapshot?.kind === 'salary') {
      rows.push(
        ...(snapshot.ledgerYears?.length
          ? ledgerRows(exp, snapshot.ledgerYears)
          : salaryRows(exp, getOffer(exp), todayIso))
      );
    } else {
      skip(exp, 'no pay recorded');
      continue;
    }
    if (rows.length === before) {
      skip(exp, exp.start_date ? 'no pay recorded' : 'no start date');
    }
  }

  const byYear = new Map<number, RoleYearEarnings[]>();
  for (const row of rows) {
    const existing = byYear.get(row.year);
    if (existing) existing.push(row);
    else byYear.set(row.year, [row]);
  }

  const groups = [...byYear.entries()]
    .map(([year, roles]) => ({
      year,
      total: roles.reduce((sum, role) => sum + role.amount, 0),
      roles: [...roles].sort((a, b) => b.amount - a.amount),
    }))
    .sort((a, b) => b.year - a.year);

  return { groups, skipped };
};

export const buildEarningsByYear = (
  experiences: Experience[],
  getOffer: (exp: Experience) => OfferLike | undefined,
  getSnapshot: (exp: Experience) => ExperienceCompensationSnapshot | null,
  todayIso: string
): YearGroup[] => buildEarningsReport(experiences, getOffer, getSnapshot, todayIso).groups;

export interface ComponentRole {
  key: string;
  company: string;
  roleTitle: string;
  value: number;
  // A shade of the part's colour, so the list and the chart name the same slice.
  color: string;
}

export interface ComponentGroup {
  key: 'base' | 'bonus' | 'equity';
  label: string;
  color: string;
  total: number;
  roles: ComponentRole[];
}

const COMPONENTS = [
  { key: 'base' as const, label: 'Base Salary', color: '#2563eb' },
  { key: 'bonus' as const, label: 'Bonus', color: '#10b981' },
  { key: 'equity' as const, label: 'Equity / RSU', color: '#60a5fa' },
];

export const yearsIn = (groups: YearGroup[]) => groups.map((group) => group.year);

export const totalOf = (groups: YearGroup[]) => groups.reduce((sum, group) => sum + group.total, 0);

// Pay split into its three parts, each showing which roles contributed to it.
export const buildComponentBreakdown = (
  groups: YearGroup[],
  year: number | 'all'
): ComponentGroup[] => {
  const scoped = year === 'all' ? groups : groups.filter((group) => group.year === year);

  return COMPONENTS.map((component) => {
    // Across all years the same job is one row, not one row per year.
    const byRole = new Map<string, ComponentRole>();
    for (const group of scoped) {
      for (const row of group.roles) {
        const value = row.byComponent[component.key];
        if (value <= 0) continue;
        const key = `${row.company}|${row.roleTitle}`;
        const existing = byRole.get(key);
        if (existing) existing.value += value;
        else
          byRole.set(key, {
            key,
            company: row.company,
            roleTitle: row.roleTitle,
            value,
            color: component.color,
          });
      }
    }
    const sorted = [...byRole.values()].sort((a, b) => b.value - a.value);
    const shades = shadesFor(component.color, sorted.length);
    const roles = sorted.map((role, index) => ({ ...role, color: shades[index] }));
    return {
      ...component,
      total: roles.reduce((sum, role) => sum + role.value, 0),
      roles,
    };
  });
};
