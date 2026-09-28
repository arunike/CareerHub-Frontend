import { differenceInCalendarDays, isSameWeek, parseISO } from 'date-fns';

// Re-exported, not redefined: one shape for the event form on every page.
export type { ApiError, EventFormValues } from '../Events/eventFormTypes';

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { error?: unknown } } }).response?.data?.error ===
      'string'
  ) {
    return (error as { response: { data: { error: string } } }).response.data.error;
  }
  return fallback;
};

export const canMergeAvailabilityDates = (previousDate: string, nextDate: string) => {
  const previous = parseISO(previousDate);
  const next = parseISO(nextDate);
  const dayGap = differenceInCalendarDays(next, previous);

  return dayGap === 1 && isSameWeek(previous, next, { weekStartsOn: 1 });
};
