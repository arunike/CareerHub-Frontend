import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';

export type Granularity = 'day' | 'week' | 'month';

// Monday, like the rest of the app's calendars.
const WEEK = { weekStartsOn: 1 } as const;

export const FINER_GRANULARITY: Record<Granularity, Granularity | null> = {
  month: 'week',
  week: 'day',
  day: null,
};

export const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
};

export const CUSTOM_RANGE = 'custom';
export const CUSTOM_RANGE_LABEL = 'Custom range';

// Counted in the unit on screen: "Last 12 weeks" is 12 bars.
export const RANGE_OPTIONS: Record<Granularity, Array<{ value: string; label: string }>> = {
  day: [
    { value: '14', label: 'Last 14 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '60', label: 'Last 60 days' },
    { value: '90', label: 'Last 90 days' },
    { value: 'all', label: 'All time' },
  ],
  week: [
    { value: '8', label: 'Last 8 weeks' },
    { value: '12', label: 'Last 12 weeks' },
    { value: '26', label: 'Last 26 weeks' },
    { value: '52', label: 'Last 52 weeks' },
    { value: 'all', label: 'All time' },
  ],
  month: [
    { value: '6', label: 'Last 6 months' },
    { value: '12', label: 'Last 12 months' },
    { value: '24', label: 'Last 24 months' },
    { value: 'all', label: 'All time' },
  ],
};

export const DEFAULT_RANGE: Record<Granularity, string> = {
  day: '30',
  week: '12',
  month: '12',
};

const MAX_BUCKETS: Record<Granularity, number> = { day: 366, week: 260, month: 120 };

const bucketStart = (granularity: Granularity, date: Date) =>
  granularity === 'day'
    ? startOfDay(date)
    : granularity === 'week'
      ? startOfWeek(date, WEEK)
      : startOfMonth(date);

const bucketEnd = (granularity: Granularity, date: Date) =>
  granularity === 'day'
    ? endOfDay(date)
    : granularity === 'week'
      ? endOfWeek(date, WEEK)
      : endOfMonth(date);

const stepBack = (granularity: Granularity, date: Date, amount: number) =>
  granularity === 'day'
    ? subDays(date, amount)
    : granularity === 'week'
      ? subWeeks(date, amount)
      : subMonths(date, amount);

const bucketsBetween = (granularity: Granularity, from: Date, to: Date) =>
  granularity === 'day'
    ? differenceInCalendarDays(to, from)
    : granularity === 'week'
      ? differenceInCalendarWeeks(to, from, WEEK)
      : differenceInCalendarMonths(to, from);

const eachBucketStart = (granularity: Granularity, interval: { start: Date; end: Date }) =>
  granularity === 'day'
    ? eachDayOfInterval(interval)
    : granularity === 'week'
      ? eachWeekOfInterval(interval, WEEK)
      : eachMonthOfInterval(interval);

export interface ActivityBucket {
  // Bucket start as yyyy-MM-dd; recharts keys off it.
  key: string;
  label: string;
  fullLabel: string;
  count: number;
  start: Date;
  end: Date;
  drillable: boolean;
  // A week can straddle the drilled month, so the bar covers only the part inside it.
  partial: boolean;
}

export interface ActivitySeries {
  buckets: ActivityBucket[];
  granularity: Granularity;
  windowStart: Date;
  windowEnd: Date;
  total: number;
  capped: boolean;
}

export interface ActivityPoint {
  date: Date;
  count: number;
}

export interface SeriesBounds {
  // null means the year filter is on All years.
  start: Date | null;
  end: Date;
}

const clampEnd = (value: Date, limit: Date) => (value.getTime() > limit.getTime() ? limit : value);

export const buildActivitySeries = ({
  points,
  granularity,
  range,
  bounds,
  window,
}: {
  points: ActivityPoint[];
  granularity: Granularity;
  range: string;
  bounds: SeriesBounds;
  window?: { start: Date; end: Date };
}): ActivitySeries => {
  let firstStart: Date;
  let lastStart: Date;
  let capped = false;

  if (window) {
    firstStart = bucketStart(granularity, window.start);
    lastStart = bucketStart(granularity, clampEnd(window.end, bounds.end));
    const span = bucketsBetween(granularity, firstStart, lastStart) + 1;
    if (span > MAX_BUCKETS[granularity]) {
      firstStart = stepBack(granularity, lastStart, MAX_BUCKETS[granularity] - 1);
      capped = true;
    }
  } else {
    lastStart = bucketStart(granularity, bounds.end);
    let count = Number(range);
    if (range === 'all' || !Number.isFinite(count) || count < 1) {
      const earliest = points.length
        ? new Date(Math.min(...points.map((point) => point.date.getTime())))
        : bounds.end;
      const from = bounds.start && bounds.start > earliest ? bounds.start : earliest;
      const needed = bucketsBetween(granularity, bucketStart(granularity, from), lastStart) + 1;
      count = Math.max(1, Math.min(MAX_BUCKETS[granularity], needed));
      capped = needed > MAX_BUCKETS[granularity];
    }
    firstStart = stepBack(granularity, lastStart, count - 1);
    // Never pad a past year with buckets from outside it.
    const lowerBound = bounds.start ? bucketStart(granularity, bounds.start) : null;
    if (lowerBound && firstStart < lowerBound) firstStart = lowerBound;
  }

  if (lastStart < firstStart) lastStart = firstStart;

  let countStart = firstStart;
  if (bounds.start && bounds.start > countStart) countStart = bounds.start;
  if (window && window.start > countStart) countStart = window.start;
  let countEnd = clampEnd(bucketEnd(granularity, lastStart), bounds.end);
  if (window) countEnd = clampEnd(countEnd, window.end);

  const counts = new Map<string, number>();
  points.forEach(({ date, count }) => {
    if (date < countStart || date > countEnd) return;
    const key = format(bucketStart(granularity, date), 'yyyy-MM-dd');
    counts.set(key, (counts.get(key) ?? 0) + count);
  });

  const starts = eachBucketStart(granularity, { start: firstStart, end: lastStart });
  const spansYears = starts.length > 0 && starts[0].getFullYear() !== lastStart.getFullYear();
  const finer = FINER_GRANULARITY[granularity];

  const buckets: ActivityBucket[] = starts.map((start) => {
    const end = bucketEnd(granularity, start);
    const key = format(start, 'yyyy-MM-dd');
    const count = counts.get(key) ?? 0;
    // Labelled by the part inside the month; the tooltip carries the true period.
    const labelStart = start < countStart ? countStart : start;
    return {
      key,
      label:
        granularity === 'month'
          ? format(labelStart, spansYears ? 'MMM yy' : 'MMM')
          : format(labelStart, 'MMM d'),
      fullLabel:
        granularity === 'day'
          ? format(start, 'EEE, MMM d, yyyy')
          : granularity === 'week'
            ? `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
            : format(start, 'MMMM yyyy'),
      count,
      start,
      end,
      drillable: finer !== null && count > 0,
      partial: start < countStart || end > countEnd,
    };
  });

  return {
    buckets,
    granularity,
    windowStart: countStart,
    windowEnd: countEnd,
    total: buckets.reduce((sum, bucket) => sum + bucket.count, 0),
    capped,
  };
};

export const formatWindow = (start: Date, end: Date) => {
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${format(start, sameYear ? 'MMM d' : 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
};
