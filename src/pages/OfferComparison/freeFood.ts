import { officeDaysPerYear, type OfficeDayInputs } from './commute';

export type MealKey = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS';

export const MEAL_LABELS: Record<MealKey, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACKS: 'Snacks',
};

export const MEALS = Object.keys(MEAL_LABELS) as MealKey[];

// Starting points; always shown as editable values.
export const DEFAULT_MEAL_VALUES: Record<MealKey, number> = {
  BREAKFAST: 8,
  LUNCH: 15,
  DINNER: 20,
  SNACKS: 5,
};

export interface MealEntry {
  meal: MealKey;
  value: number;
  provided: boolean;
}

const isMealKey = (value: unknown): value is MealKey =>
  typeof value === 'string' && (MEALS as string[]).includes(value);

// Also accepts the earlier shape: a list of meal keys at one shared value.
export const normalizeMealEntries = (raw: unknown, legacyValuePerMeal = 0): MealEntry[] => {
  if (!Array.isArray(raw)) return [];
  const byMeal = new Map<MealKey, MealEntry>();
  raw.forEach((item) => {
    if (isMealKey(item)) {
      // Old shape: every listed meal was provided, at one shared value.
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
  return MEALS.filter((meal) => byMeal.has(meal)).map((meal) => byMeal.get(meal)!);
};

export interface FreeFoodBreakdown {
  entries: MealEntry[];
  officeDays: number;
  savedAnnual: number;
  outOfPocketAnnual: number;
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

export const foodOfficeDays = (inputs: OfficeDayInputs) => officeDaysPerYear(inputs);
