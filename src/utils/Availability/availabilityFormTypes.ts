import { differenceInCalendarDays, isSameWeek, parseISO } from 'date-fns';
import dayjs from 'dayjs';

export type EventFormValues = {
  date: dayjs.Dayjs;
  start_time: dayjs.Dayjs;
  end_time: dayjs.Dayjs;
  is_all_day?: boolean;
  is_multi_day?: boolean;
  end_date?: dayjs.Dayjs | null;
  [key: string]: unknown;
};

export type ApiError = { response?: { status?: number; data?: { conflict?: boolean } } };

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
