export interface PayPeriod {
  // 1-based position within the tax year. Off-cycle payments are numbered above the
  // regular run so their indexes cannot collide.
  periodIndex: number;
  payDate: string;
  // A payment on its own date, carrying no regular salary.
  isOffCycle?: boolean;
  // True when the scheduled date was moved by hand.
  isAdjustedDate?: boolean;
}

export const OFF_CYCLE_BASE = 1000;

// Off-cycle payments are interleaved by date so year-to-date totals stay in order.
export const mergePeriods = (regular: PayPeriod[], offCycle: PayPeriod[]): PayPeriod[] =>
  [...regular, ...offCycle].sort((a, b) => a.payDate.localeCompare(b.payDate));

export const dayNumber = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;

export const inclusiveDayCount = (from: Date, to: Date) =>
  Math.max(0, dayNumber(to) - dayNumber(from) + 1);

export const toIsoDate = (date: Date) => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export const parseIsoDate = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const lastDayOfMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

// The first Friday is the usual biweekly anchor when nothing else is known.
export const defaultFirstPayDate = (taxYear: number, paychecksPerYear: number) => {
  if (paychecksPerYear === 24) return toIsoDate(new Date(taxYear, 0, 15));
  if (paychecksPerYear === 12) return toIsoDate(new Date(taxYear, 0, lastDayOfMonth(taxYear, 0)));

  const january = new Date(taxYear, 0, 1);
  const daysUntilFriday = (5 - january.getDay() + 7) % 7;
  return toIsoDate(new Date(taxYear, 0, 1 + daysUntilFriday));
};

const semiMonthlyDates = (taxYear: number) => {
  const dates: Date[] = [];
  for (let month = 0; month < 12; month += 1) {
    dates.push(new Date(taxYear, month, 15));
    dates.push(new Date(taxYear, month, lastDayOfMonth(taxYear, month)));
  }
  return dates;
};

const monthlyDates = (taxYear: number, anchor: Date) => {
  const dayOfMonth = anchor.getDate();
  return Array.from({ length: 12 }, (_, month) => {
    const day = Math.min(dayOfMonth, lastDayOfMonth(taxYear, month));
    return new Date(taxYear, month, day);
  });
};

// Biweekly and weekly schedules step from the anchor, which is why the anchor has to be
// adjustable: two employers on the same cadence rarely pay on the same day.
const steppedDates = (taxYear: number, anchor: Date, stepDays: number) => {
  const dates: Date[] = [];
  const cursor = new Date(anchor);

  while (cursor.getFullYear() > taxYear) cursor.setDate(cursor.getDate() - stepDays);
  while (cursor.getFullYear() < taxYear) cursor.setDate(cursor.getDate() + stepDays);

  while (cursor.getFullYear() === taxYear) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + stepDays);
  }
  return dates;
};

export const buildPayDates = (
  taxYear: number,
  paychecksPerYear: number,
  firstPayDate?: string | null
): Date[] => {
  const anchor =
    parseIsoDate(firstPayDate) ?? parseIsoDate(defaultFirstPayDate(taxYear, paychecksPerYear));
  if (!anchor) return [];

  if (paychecksPerYear === 24) return semiMonthlyDates(taxYear);
  if (paychecksPerYear === 12) return monthlyDates(taxYear, anchor);
  if (paychecksPerYear === 52) return steppedDates(taxYear, anchor, 7);
  if (paychecksPerYear === 26 || paychecksPerYear === 27) return steppedDates(taxYear, anchor, 14);

  // Anything unusual is spread evenly so the page still works.
  const spacing = Math.floor(365 / Math.max(1, paychecksPerYear));
  return Array.from({ length: paychecksPerYear }, (_, index) => {
    const date = new Date(taxYear, 0, 1);
    date.setDate(date.getDate() + index * spacing);
    return date;
  });
};

// A role that starts or ends mid-year is only paid for the periods it covers.
export const buildPayPeriods = (
  taxYear: number,
  paychecksPerYear: number,
  options: {
    firstPayDate?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  } = {}
): PayPeriod[] => {
  const start = parseIsoDate(options.startDate);
  const end = parseIsoDate(options.endDate);

  return buildPayDates(taxYear, paychecksPerYear, options.firstPayDate)
    .map((date, index) => ({ periodIndex: index + 1, payDate: toIsoDate(date), date }))
    .filter(({ date }) => {
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    })
    .map(({ periodIndex, payDate }) => ({ periodIndex, payDate }));
};

// An adjusted date can move a paycheck past its neighbour, so the run is re-sorted to
// keep year-to-date totals in date order.
export const applyPayDateOverrides = (
  periods: PayPeriod[],
  overrides: Array<{ periodIndex: number; payDate?: string | null }>
): PayPeriod[] => {
  const byPeriod = new Map(
    overrides
      .filter((override) => Boolean(override.payDate))
      .map((override) => [override.periodIndex, override.payDate as string])
  );
  if (byPeriod.size === 0) return periods;

  return periods
    .map((period) => {
      const payDate = byPeriod.get(period.periodIndex);
      return payDate ? { ...period, payDate, isAdjustedDate: true } : period;
    })
    .sort((a, b) => a.payDate.localeCompare(b.payDate));
};

export const formatPayDate = (iso: string) => {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatPayDateShort = (iso: string) => {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
