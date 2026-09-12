export const DAYS_IN_BONUS_YEAR = 365;

const DAY_MS = 86400000;

const dayOf = (value: unknown): number | null => {
  if (typeof value !== 'string' || value.length < 10) return null;
  const time = Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(time) ? null : Math.floor(time / DAY_MS);
};

// A bonus lands at the end of its month, so the year it covers closes on that month's last day.
const payoutDayIn = (year: number, payoutMonth: number) =>
  Math.floor(Date.UTC(year, payoutMonth, 0) / DAY_MS);

export const nextPayoutDayFrom = (day: number, payoutMonth: number) => {
  const year = new Date(day * DAY_MS).getUTCFullYear();
  const thisYear = payoutDayIn(year, payoutMonth);
  return thisYear >= day ? thisYear : payoutDayIn(year + 1, payoutMonth);
};

export interface BonusStint {
  days: number;
  share: number;
}

const stint = (days: number): BonusStint => {
  const bounded = Math.max(0, Math.min(DAYS_IN_BONUS_YEAR, days));
  return { days: bounded, share: bounded / DAYS_IN_BONUS_YEAR };
};

// What staying would have paid at the next payout, pro-rated only for a part-year of service.
export const stayedBonusStint = ({
  joined,
  leaving,
  payoutMonth,
}: {
  joined?: string | null;
  leaving: string;
  payoutMonth: number;
}): BonusStint => {
  const leaveDay = dayOf(leaving);
  if (leaveDay === null) return stint(0);
  const payout = nextPayoutDayFrom(leaveDay, payoutMonth);
  const yearStart = payout - (DAYS_IN_BONUS_YEAR - 1);
  const joinedDay = dayOf(joined);
  const from = joinedDay !== null ? Math.max(yearStart, joinedDay) : yearStart;
  return stint(payout - from + 1);
};

// The part of the new role's bonus year you are actually there for, bounded by a known end date.
export const firstBonusStint = ({
  start,
  end,
  payoutMonth,
}: {
  start: string;
  end?: string | null;
  payoutMonth: number;
}): BonusStint => {
  const startDay = dayOf(start);
  if (startDay === null) return stint(0);
  const payout = nextPayoutDayFrom(startDay, payoutMonth);
  const endDay = dayOf(end);
  const until = endDay !== null ? Math.min(payout, endDay) : payout;
  // Inclusive: starting on the first day of a bonus year earns the whole of it.
  return stint(until - startDay + 1);
};

// Where the dates are read from, so a stint is measured against the position, not against today.
export const positionStartDate = (offer: unknown): string | null => {
  const record = (offer ?? {}) as {
    expected_start_date?: unknown;
    linked_experience?: { start_date?: unknown } | null;
  };
  const expected = record.expected_start_date;
  if (typeof expected === 'string' && expected.length >= 10) return expected.slice(0, 10);
  const started = record.linked_experience?.start_date;
  if (typeof started === 'string' && started.length >= 10) return started.slice(0, 10);
  return null;
};

export const positionEndDate = (offer: unknown): string | null => {
  const ended = ((offer ?? {}) as { linked_experience?: { end_date?: unknown } | null })
    .linked_experience?.end_date;
  return typeof ended === 'string' && ended.length >= 10 ? ended.slice(0, 10) : null;
};
