import { parseDateOnlyLocal } from './dateOnly';

export type DateSelector<T> = keyof T | ((item: T) => string | null | undefined);

const resolveYear = <T extends Record<string, any>>(
  item: T,
  dateField: DateSelector<T>
): number | null => {
  const dateValue =
    typeof dateField === 'function' ? dateField(item) : (item[dateField] as string | undefined);
  if (!dateValue) return null;
  const year = parseDateOnlyLocal(dateValue)?.getFullYear();
  return year != null && !isNaN(year) ? year : null;
};

export const getAvailableYears = <T extends Record<string, any>>(
  items: T[],
  dateField: DateSelector<T>
): number[] => {
  const years = items
    .map((item) => resolveYear(item, dateField))
    .filter((year): year is number => year !== null);

  return [...new Set(years)].sort((a, b) => b - a);
};

export const filterByYear = <T extends Record<string, any>>(
  items: T[],
  year: number | 'all',
  dateField: DateSelector<T>
): T[] => {
  if (year === 'all') return items;
  return items.filter((item) => resolveYear(item, dateField) === year);
};

export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};
