// Food on an office day is money either way: a meal the office provides is money you keep, and
// one it does not is money you spend. A single "free food perk value" could only express the
// first half, so an offer with no canteen looked identical to one where you never eat out.
//
// Each meal carries its own amount because they are not interchangeable — a $6 breakfast and a
// $20 dinner should not average into one figure — and its own provided/you-pay state, so the
// same list expresses both the saving and the cost.

import { officeDaysPerYear, type OfficeDayInputs } from './commute';

export type MealKey = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS';

export const MEAL_LABELS: Record<MealKey, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACKS: 'Snacks',
};

export const MEALS = Object.keys(MEAL_LABELS) as MealKey[];

// Rough starting points, shown as editable values rather than applied invisibly.
export const DEFAULT_MEAL_VALUES: Record<MealKey, number> = {
  BREAKFAST: 8,
  LUNCH: 15,
  DINNER: 20,
  SNACKS: 5,
};

export interface MealEntry {
  meal: MealKey;
  /** What that meal costs you if you buy it. */
  value: number;
  /** True when the office provides it, so you keep the money instead of spending it. */
  provided: boolean;
}

const isMealKey = (value: unknown): value is MealKey =>
  typeof value === 'string' && (MEALS as string[]).includes(value);

/** Accepts the current shape and the earlier one — a plain list of meal keys plus a single
 *  shared per-meal value — so rows saved before per-meal amounts keep working. */
export const normalizeMealEntries = (raw: unknown, legacyValuePerMeal = 0): MealEntry[] => {
  if (!Array.isArray(raw)) return [];
  const byMeal = new Map<MealKey, MealEntry>();
  raw.forEach((item) => {
    if (isMealKey(item)) {
      // Old shape: every listed meal was provided, all at one shared value.
      byMeal.set(item, { meal: item, value: Number(legacyValuePerMeal) || 0, provided: true });
      return;
    }
    if (!item || typeof item !== 'object') return;
    const record = item as Record<string, unknown>;
    if (!isMealKey(record.meal)) return;
    byMeal.set(record.meal, {
      meal: record.meal,
      value: Number(record.value) || 0,
      // Absent means provided, matching the old shape's meaning.
      provided: record.provided !== false,
    });
  });
  // Fixed order, so the rows do not shuffle as they are edited.
  return MEALS.filter((meal) => byMeal.has(meal)).map((meal) => byMeal.get(meal)!);
};

export interface FreeFoodBreakdown {
  entries: MealEntry[];
  officeDays: number;
  /** Annual value of the meals the office provides. */
  savedAnnual: number;
  /** Annual spend on the meals it does not. */
  outOfPocketAnnual: number;
  /** Saved minus spent: positive when the office feeds you, negative when it does not. */
  netAnnual: number;
}

export const freeFoodBreakdown = ({
  meals,
  officeDays,
  legacyValuePerMeal = 0,
}: {
  meals: unknown;
  officeDays: number;
  legacyValuePerMeal?: number;
}): FreeFoodBreakdown | null => {
  const entries = normalizeMealEntries(meals, legacyValuePerMeal).filter(
    (entry) => entry.value > 0
  );
  // No priced meals or no office days means there is nothing to weigh either way.
  if (entries.length === 0 || officeDays <= 0) return null;

  const perDay = (provided: boolean) =>
    entries.filter((entry) => entry.provided === provided).reduce((sum, e) => sum + e.value, 0);

  const savedAnnual = perDay(true) * officeDays;
  const outOfPocketAnnual = perDay(false) * officeDays;
  return {
    entries,
    officeDays,
    savedAnnual,
    outOfPocketAnnual,
    netAnnual: savedAnnual - outOfPocketAnnual,
  };
};

/** The food line for an offer's value: positive when meals are provided, negative when you
 *  pay for them yourself. Falls back to the legacy flat perk when no meals are recorded. */
export const annualFreeFoodValue = ({
  meals,
  officeDays,
  legacyValuePerMeal = 0,
  legacyAnnualValue = 0,
}: {
  meals: unknown;
  officeDays: number;
  legacyValuePerMeal?: number;
  legacyAnnualValue?: number;
}) => freeFoodBreakdown({ meals, officeDays, legacyValuePerMeal })?.netAnnual ?? legacyAnnualValue;

/** Office days for the food estimate, from the same RTO and time-off inputs the commute uses,
 *  so the two can never disagree about how often you are in. */
export const foodOfficeDays = (inputs: OfficeDayInputs) => officeDaysPerYear(inputs);
