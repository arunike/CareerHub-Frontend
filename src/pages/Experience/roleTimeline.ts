import dayjs, { type Dayjs } from 'dayjs';

export interface RoleDateLabel {
  // "Sep 14, 2026 – Present"
  range: string;
  // "1 yr 8 mos (616 days)", "starts in 28 days", or ''.
  detail: string;
  // A role dated in the future has earned nothing yet, which is not the same as having no dates.
  notStarted: boolean;
}

const plural = (value: number, unit: string) => `${value} ${unit}${value === 1 ? '' : 's'}`;

export const humanizeDaySpan = (totalDays: number, { withTotal = false } = {}): string => {
  const days = Math.max(0, Math.round(totalDays));
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const parts: string[] = [];
  if (years > 0) parts.push(plural(years, 'yr').replace('yrs', 'yrs'));
  if (months > 0) parts.push(`${months} mo${months === 1 ? '' : 's'}`);
  const base = parts.length > 0 ? parts.join(' ') : plural(days, 'day');
  return withTotal && parts.length > 0 ? `${base} (${plural(days, 'day')})` : base;
};

const exactSpan = (start: Dayjs, end: Dayjs) => {
  const years = end.diff(start, 'year');
  const afterYears = start.add(years, 'year');
  const months = end.diff(afterYears, 'month');
  const afterMonths = afterYears.add(months, 'month');
  const days = end.diff(afterMonths, 'day');
  const totalDays = end.diff(start, 'day');
  const parts: string[] = [];
  if (years > 0) parts.push(plural(years, 'yr'));
  if (months > 0) parts.push(`${months} mo${months === 1 ? '' : 's'}`);
  if (days > 0 || parts.length === 0) parts.push(plural(days, 'day'));
  const base = parts.join(' ');
  return years > 0 || months > 0 ? `${base} (${plural(totalDays, 'day')})` : base;
};

export const roleDateLabel = ({
  startDate,
  endDate,
  isCurrent,
  fallbackEndDate,
  format = 'MMM D, YYYY',
  now,
  precision = 'exact',
}: {
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  isCurrent?: boolean;
  // The next role's start, when a past role has no end date.
  fallbackEndDate?: Dayjs | null;
  format?: string;
  // Injected for tests; defaults to today.
  now?: Dayjs;
  // 'exact' spells out days; 'rounded' stops at years and months.
  precision?: 'exact' | 'rounded';
}): RoleDateLabel => {
  const today = now ?? dayjs();
  const start = startDate;
  const end = isCurrent ? today : (endDate ?? fallbackEndDate ?? null);

  const range = `${start ? start.format(format) : 'Unknown'} – ${
    isCurrent ? 'Present' : end ? end.format(format) : 'Unknown'
  }`;

  if (!start) return { range, detail: '', notStarted: false };

  if (start.isAfter(today, 'day')) {
    const untilStart = start.diff(today, 'day');
    return { range, detail: `starts in ${plural(untilStart, 'day')}`, notStarted: true };
  }

  if (!end || end.isBefore(start, 'day')) return { range, detail: '', notStarted: false };

  const totalDays = end.diff(start, 'day');
  return {
    notStarted: false,
    range,
    detail:
      precision === 'rounded'
        ? humanizeDaySpan(totalDays, { withTotal: true })
        : exactSpan(start, end),
  };
};

export interface GroupSpan {
  start: Dayjs | null;
  end: Dayjs | null;
  isCurrent: boolean;
}

export const groupSpan = (
  rows: Array<{ start_date?: string | null; end_date?: string | null; is_current?: boolean }>,
  parse: (value: string | null | undefined) => Dayjs | null
): GroupSpan => {
  let start: Dayjs | null = null;
  let end: Dayjs | null = null;
  let isCurrent = false;
  rows.forEach((row) => {
    const rowStart = parse(row.start_date);
    if (rowStart && (!start || rowStart.isBefore(start))) start = rowStart;
    if (row.is_current) {
      isCurrent = true;
      return;
    }
    const rowEnd = parse(row.end_date);
    if (rowEnd && (!end || rowEnd.isAfter(end))) end = rowEnd;
  });
  return { start, end, isCurrent };
};

// A month between jobs is a notice period, not a gap.
const GAP_FLOOR_DAYS = 32;

export const gapLabelBetween = (newer: GroupSpan, older: GroupSpan): string | null => {
  if (!newer.start) return null;
  // A custom or pinned order means the space between cards is not a real gap.
  if (older.start && newer.start.isBefore(older.start)) return null;
  // A company you are still at cannot precede anything.
  const olderEnd = older.isCurrent ? null : older.end;
  if (!olderEnd) return null;
  const days = newer.start.diff(olderEnd, 'day');
  if (days < 0) return 'overlapping';
  if (days < GAP_FLOOR_DAYS) return null;
  return `${humanizeDaySpan(days)} gap`;
};
