import type { Experience } from '../../types';
import type { ExperienceCompensationSnapshot } from './compensation';
import { orderExperiencesAsDisplayed } from './experienceUtils';

type SnapshotResolver = (exp: Experience) => ExperienceCompensationSnapshot | null;

export const SALARY_HOURS_PER_YEAR = 2080;

export type PayComponentKey = 'base' | 'bonus' | 'equity' | 'total' | 'hourlyRate';

export interface PayComponentDelta {
  key: PayComponentKey;
  label: string;
  current: number;
  previous: number;
  amount: number;
  percent: number | null;
  kind: 'changed' | 'new' | 'dropped' | 'flat';
  /** Rendered with a $/hr suffix and 2 decimals rather than whole dollars. */
  isRate: boolean;
}

export type ComparisonMode = 'salary' | 'hourly' | 'mixed';

/**
 * A text field shown side by side rather than as a delta. Levels are free text and
 * are not comparable across companies (Adobe "P30" vs TikTok "1-2"), so these are
 * reported as-is with no ranking implied.
 */
export interface RoleAttribute {
  key: 'title' | 'level';
  label: string;
  current: string | null;
  previous: string | null;
  changed: boolean;
}

export interface PayComparison {
  mode: ComparisonMode;
  currentExp: Experience;
  previousExp: Experience;
  attributes: RoleAttribute[];
  components: PayComponentDelta[];
  headline: PayComponentDelta;
  /** Per-side plain-language derivation, only populated for mixed comparisons. */
  notes: { exp: Experience; text: string }[];
}

export interface PayGrowthSummary {
  /** The default pair: the first two comparable roles in list order. */
  defaultComparison: PayComparison | null;
  /** Every role that has usable pay data, in list order. Drives the dropdowns. */
  comparableRoles: Experience[];
}

const COMPONENT_LABELS: Record<PayComponentKey, string> = {
  base: 'Base',
  bonus: 'Bonus',
  equity: 'Equity',
  total: 'Total',
  hourlyRate: 'Hourly rate',
};

const cleanText = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildRoleAttributes = (currentExp: Experience, previousExp: Experience): RoleAttribute[] => {
  const fields: {
    key: RoleAttribute['key'];
    label: string;
    read: (e: Experience) => string | null;
  }[] = [
    { key: 'title', label: 'Title', read: (e) => cleanText(e.title) },
    { key: 'level', label: 'Level', read: (e) => cleanText(e.level) },
  ];

  return fields.map(({ key, label, read }) => {
    const current = read(currentExp);
    const previous = read(previousExp);
    return {
      key,
      label,
      current,
      previous,
      // Both blank is not a change; one blank side is, since something was recorded.
      changed:
        (current ?? '').toLowerCase() !== (previous ?? '').toLowerCase() &&
        !(current === null && previous === null),
    };
  });
};

const buildComponentDelta = (
  key: PayComponentKey,
  current: number,
  previous: number,
  isRate = false
): PayComponentDelta => {
  const amount = current - previous;
  const isFlat = Math.abs(amount) < 0.005;

  let kind: PayComponentDelta['kind'] = 'changed';
  if (isFlat) kind = 'flat';
  else if (previous <= 0) kind = 'new';
  else if (current <= 0) kind = 'dropped';

  return {
    key,
    label: COMPONENT_LABELS[key],
    current,
    previous,
    amount,
    percent: previous > 0 ? (amount / previous) * 100 : null,
    kind,
    isRate,
  };
};

const formatHours = (hours: number) =>
  hours.toLocaleString(undefined, { maximumFractionDigits: 0 });

const formatMoney = (value: number, decimals = 0) =>
  `$${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

/**
 * A salary role has no stored hourly rate, so it gets one from a standard work year.
 * Hourly roles use the rate the compensation breakdown already shows, so the two
 * screens never disagree.
 */
const comparableHourlyRate = (snapshot: ExperienceCompensationSnapshot): number =>
  snapshot.kind === 'salary' ? snapshot.total / SALARY_HOURS_PER_YEAR : snapshot.hourlyRate;

/** Explains the one derived number, and flags that an hourly total is not annual. */
const mixedNote = (snapshot: ExperienceCompensationSnapshot): string => {
  if (snapshot.kind === 'salary') {
    return `${formatMoney(snapshot.total)}/yr ÷ ${formatHours(SALARY_HOURS_PER_YEAR)} hrs = ${formatMoney(comparableHourlyRate(snapshot), 2)}/hr`;
  }
  return `${formatMoney(snapshot.total, 2)} earned over ${snapshot.dateRangeLabel} — not a full year`;
};

/**
 * Builds the right set of rows for whichever two roles the user picked:
 *  - salary vs salary → base, bonus, equity, total
 *  - hourly vs hourly → hourly rate
 *  - salary vs hourly → total + hourly rate, taken straight from each role's
 *    compensation snapshot so the numbers match the earnings breakdowns, with a
 *    per-side note covering the one derived figure and the duration mismatch
 */
export const buildPayComparison = (
  currentExp: Experience,
  previousExp: Experience,
  getSnapshot: SnapshotResolver
): PayComparison | null => {
  const current = getSnapshot(currentExp);
  const previous = getSnapshot(previousExp);
  if (!current || !previous) return null;

  const attributes = buildRoleAttributes(currentExp, previousExp);

  if (current.kind === 'salary' && previous.kind === 'salary') {
    const total = buildComponentDelta('total', current.total, previous.total);
    return {
      mode: 'salary',
      currentExp,
      previousExp,
      attributes,
      components: [
        buildComponentDelta('base', current.base, previous.base),
        buildComponentDelta('bonus', current.bonus, previous.bonus),
        buildComponentDelta('equity', current.equity, previous.equity),
        total,
      ],
      headline: total,
      notes: [],
    };
  }

  if (current.kind === 'hourly' && previous.kind === 'hourly') {
    const rate = buildComponentDelta('hourlyRate', current.hourlyRate, previous.hourlyRate, true);
    return {
      mode: 'hourly',
      currentExp,
      previousExp,
      attributes,
      components: [rate],
      headline: rate,
      notes: [],
    };
  }

  // Mixed: bonus and equity have no hourly counterpart, so compare the two figures
  // both shapes do have — the recorded total and an hourly rate.
  const total = buildComponentDelta('total', current.total, previous.total);
  const rate = buildComponentDelta(
    'hourlyRate',
    comparableHourlyRate(current),
    comparableHourlyRate(previous),
    true
  );

  return {
    mode: 'mixed',
    currentExp,
    previousExp,
    attributes,
    components: [total, rate],
    headline: total,
    notes: [
      { exp: currentExp, text: mixedNote(current) },
      { exp: previousExp, text: mixedNote(previous) },
    ],
  };
};

export const buildPayGrowthSummary = (
  experiences: Experience[],
  getSnapshot: SnapshotResolver
): PayGrowthSummary => {
  // List order, so the default pair is the top two roles the user actually sees.
  const comparableRoles = orderExperiencesAsDisplayed(experiences).filter(
    (exp) => getSnapshot(exp) !== null
  );

  const defaultComparison =
    comparableRoles.length >= 2
      ? buildPayComparison(comparableRoles[0], comparableRoles[1], getSnapshot)
      : null;

  return { defaultComparison, comparableRoles };
};

export const formatDeltaPercent = (delta: PayComponentDelta): string => {
  if (delta.kind === 'flat') return 'No change';
  if (delta.kind === 'new') return 'New';
  if (delta.kind === 'dropped') return 'Dropped';
  if (delta.percent === null) return '—';
  return `${delta.percent > 0 ? '+' : ''}${delta.percent.toFixed(1)}%`;
};

export const formatDeltaAmount = (delta: PayComponentDelta): string => {
  const decimals = delta.isRate ? 2 : 0;
  const sign = delta.amount > 0 ? '+' : delta.amount < 0 ? '−' : '';
  return `${sign}${formatMoney(Math.abs(delta.amount), decimals)}${delta.isRate ? '/hr' : ''}`;
};

export const formatPayValue = (delta: PayComponentDelta, side: 'current' | 'previous'): string => {
  const value = side === 'current' ? delta.current : delta.previous;
  return `${formatMoney(value, delta.isRate ? 2 : 0)}${delta.isRate ? '/hr' : ''}`;
};

export const describeRole = (exp: Experience): string => `${exp.title} · ${exp.company}`;
