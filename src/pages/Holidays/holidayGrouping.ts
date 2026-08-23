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

export const createHolidayGroupId = () =>
  crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

export const getInclusiveHolidayDates = (start: dayjs.Dayjs, end: dayjs.Dayjs) => {
  const dates: dayjs.Dayjs[] = [];
  let current = start.startOf('day');

  while (current.isBefore(end, 'day') || current.isSame(end, 'day')) {
    dates.push(current);
    current = current.add(1, 'day');
  }

  return dates;
};
