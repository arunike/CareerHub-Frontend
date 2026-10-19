// The ignore list is keyed by either the name or the date, so both forms go when a day is observed.
export const ignoreListAfter = (
  list: string[],
  name: string,
  date: string,
  observed: boolean
): string[] => {
  if (observed) return list.filter((entry) => entry !== name && entry !== date);
  return list.includes(name) || list.includes(date) ? list : [...list, name];
};

// A tab id is a [a-z0-9_] slug, so the colon keeps this out of the user's own tab namespace.
export const OBSERVED_TAB_VALUE = 'observed:holiday';

export const OBSERVED_TAB_LABEL = 'Observed Holiday';

// Which tab the control should show: an observed day is in that tab by its type, not by `tab`.
export const tabFieldValue = (holiday?: { holiday_type?: string; tab?: string | null } | null) =>
  holiday?.holiday_type === 'observed' || holiday?.holiday_type === 'observed_native'
    ? OBSERVED_TAB_VALUE
    : holiday?.tab || '';

// The tab control is the one place a day's kind can change, so it writes both fields together.
export const holidayTabPatch = (
  tab: string | null | undefined,
  currentType?: 'custom' | 'observed' | 'observed_native'
): { tab: string | null; holiday_type?: 'custom' | 'observed' } => {
  if (tab === OBSERVED_TAB_VALUE) return { tab: null, holiday_type: 'observed' };
  // An absent tab means the caller has no tab control, so the day keeps the kind it already has.
  if (tab === undefined) {
    return currentType === 'observed' ? { tab: null, holiday_type: 'observed' } : { tab: null };
  }
  return { tab: tab || null, holiday_type: 'custom' };
};

// A computed holiday has no row behind it, so its name and dates are facts rather than fields.
export const holidayKindOf = (holiday?: { holiday_type?: string } | null) => {
  if (holiday?.holiday_type === 'observed_native') return 'native' as const;
  if (holiday?.holiday_type === 'observed') return 'observed' as const;
  return 'custom' as const;
};

// Observed days are managed under Advanced Options, so without it the editor is a read-only view.
export const isHolidayViewOnly = (
  holiday: { holiday_type?: string } | null | undefined,
  allowObservedTab: boolean
) => {
  const kind = holidayKindOf(holiday);
  return kind === 'native' || (kind !== 'custom' && !allowObservedTab);
};
