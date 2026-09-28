import dayjs from 'dayjs';
import type { Event, RecurrenceRule } from '../../types';

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

export type PaginatedEventsResponse = {
  count: number;
  // Rows across the whole filtered set that are not locked.
  unlocked_count?: number;
  results: Event[];
};

export const isPaginatedEventsResponse = (
  data: Event[] | PaginatedEventsResponse
): data is PaginatedEventsResponse => !Array.isArray(data) && Array.isArray(data.results);

// One shape for the row three pages each used to build by hand, byte for byte.
export const eventPayload = (
  values: EventFormValues,
  recurrenceRule: RecurrenceRule | null
): Partial<Event> => ({
  ...values,
  date: values.date.format('YYYY-MM-DD'),
  // Cleared when the toggle is off, so unticking Multi-day really shortens the event.
  end_date: values.is_multi_day && values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
  // An all-day event still needs times stored, so it spans the whole day.
  start_time: values.is_all_day ? '00:00:00' : values.start_time.format('HH:mm:ss'),
  end_time: values.is_all_day ? '23:59:00' : values.end_time.format('HH:mm:ss'),
  is_all_day: Boolean(values.is_all_day),
  is_recurring: !!recurrenceRule,
  recurrence_rule: recurrenceRule,
  reminder_minutes: 15,
});
