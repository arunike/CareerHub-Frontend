import dayjs from 'dayjs';
import type { Event } from '../../types';

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
