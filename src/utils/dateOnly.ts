import dayjs from 'dayjs';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const parseDateOnlyLocal = (value?: string | null): Date | null => {
  if (!value) return null;
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
};

export const dayjsDateOnlyLocal = (value?: string | null) => {
  const parsed = parseDateOnlyLocal(value);
  return parsed ? dayjs(parsed) : null;
};

export const formatDateOnly = (value?: string | null, fallback = '-') => {
  const parsed = dayjsDateOnlyLocal(value);
  return parsed ? parsed.format('MMM D, YYYY') : fallback;
};

export const todayDateOnlyLocal = () => dayjs().format('YYYY-MM-DD');
