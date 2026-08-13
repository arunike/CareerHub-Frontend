// Commute time and cost are derived from the same office-day count so the two can never
// disagree. That count comes from the RTO policy and the offer's time off, not a flat
// 260 working days — a 2-day hybrid should not be charged a 5-day commute.

export type CommuteMode = 'TRAIN' | 'BUS' | 'CAR' | 'BIKE' | 'WALK' | 'OTHER';
export type CostFrequency = 'DAILY' | 'MONTHLY' | 'YEARLY';

export interface CommuteOption {
  mode: CommuteMode;
  minutes_each_way: number;
  cost_value: number;
  cost_frequency: CostFrequency;
  // Time you can read or work through, so it is not a total write-off.
  is_usable_time?: boolean;
  is_primary?: boolean;
}

export const COMMUTE_MODE_LABELS: Record<CommuteMode, string> = {
  TRAIN: 'Train',
  BUS: 'Bus',
  CAR: 'Car',
  BIKE: 'Bike',
  WALK: 'Walk',
  OTHER: 'Other',
};

export const COMMUTE_MODES = Object.keys(COMMUTE_MODE_LABELS) as CommuteMode[];

const WEEKS_PER_YEAR = 52;
const FULL_TIME_DAYS_PER_YEAR = 260;
// Usable transit time still costs you the trip; half of it is a fair discount.
const USABLE_TIME_DISCOUNT = 0.5;

export interface OfficeDayInputs {
  workMode?: 'REMOTE' | 'HYBRID' | 'ONSITE' | string | null;
  rtoDaysPerWeek?: number | null;
  ptoDays?: number | null;
  holidayDays?: number | null;
}

// Days actually spent travelling to an office in a year.
export const officeDaysPerYear = ({
  workMode,
  rtoDaysPerWeek,
  ptoDays,
  holidayDays,
}: OfficeDayInputs) => {
  if (workMode === 'REMOTE') return 0;
  const raw = Number(rtoDaysPerWeek) || 0;
  // An onsite role with no RTO number recorded still means five days in.
  const daysPerWeek = workMode === 'ONSITE' && raw === 0 ? 5 : raw;
  if (daysPerWeek <= 0) return 0;
  const daysOff = Math.max(0, (Number(ptoDays) || 0) + (Number(holidayDays) || 0));
  // Time off removes office days in proportion to how often you are in.
  const attendance = Math.max(0, 1 - daysOff / FULL_TIME_DAYS_PER_YEAR);
  return daysPerWeek * WEEKS_PER_YEAR * attendance;
};

export const annualCostFor = (option: CommuteOption, officeDays: number) => {
  const value = Number(option.cost_value) || 0;
  if (option.cost_frequency === 'DAILY') return value * officeDays;
  if (option.cost_frequency === 'MONTHLY') return value * 12;
  return value;
};

export const annualHoursFor = (option: CommuteOption, officeDays: number) =>
  ((Number(option.minutes_each_way) || 0) * 2 * officeDays) / 60;

// What the commute actually costs you in time once usable transit time is discounted.
export const effectiveHoursFor = (option: CommuteOption, officeDays: number) => {
  const hours = annualHoursFor(option, officeDays);
  return option.is_usable_time ? hours * (1 - USABLE_TIME_DISCOUNT) : hours;
};

export const primaryCommute = (options?: CommuteOption[] | null) => {
  if (!Array.isArray(options) || options.length === 0) return null;
  return options.find((option) => option.is_primary) ?? options[0];
};

export interface CommuteSummary {
  officeDays: number;
  primary: CommuteOption | null;
  annualHours: number;
  effectiveHours: number;
  annualCost: number;
  // Every mode costed the same way, so alternatives can be compared side by side.
  alternatives: Array<CommuteOption & { annualHours: number; annualCost: number }>;
}

export const summariseCommute = (
  options: CommuteOption[] | null | undefined,
  dayInputs: OfficeDayInputs
): CommuteSummary => {
  const officeDays = officeDaysPerYear(dayInputs);
  const list = Array.isArray(options) ? options : [];
  const primary = primaryCommute(list);
  return {
    officeDays,
    primary,
    annualHours: primary ? annualHoursFor(primary, officeDays) : 0,
    effectiveHours: primary ? effectiveHoursFor(primary, officeDays) : 0,
    annualCost: primary ? annualCostFor(primary, officeDays) : 0,
    alternatives: list.map((option) => ({
      ...option,
      annualHours: annualHoursFor(option, officeDays),
      annualCost: annualCostFor(option, officeDays),
    })),
  };
};

// 0 hours scores 100; a 300 hour year is a write-off. Linear between the two so the
// difference between a 60 and a 120 hour commute still moves the number.
const COMMUTE_HOURS_FLOOR = 300;

export const commuteBurdenScore = (effectiveHours: number) => {
  if (!Number.isFinite(effectiveHours) || effectiveHours <= 0) return 100;
  const ratio = Math.min(1, effectiveHours / COMMUTE_HOURS_FLOOR);
  return Math.round((1 - ratio) * 100);
};

export const formatHours = (hours: number) =>
  `${Math.round(hours).toLocaleString()} hr${Math.round(hours) === 1 ? '' : 's'}/yr`;

// Older rows only stored a single commute cost with no mode or duration. Surface it as
// one entry so the number stays visible and editable instead of vanishing from the form.
export const seedFromLegacyCost = (
  costValue?: number | null,
  costFrequency?: CostFrequency | null
): CommuteOption[] => {
  const value = Number(costValue) || 0;
  if (value <= 0) return [];
  return [
    {
      mode: 'OTHER',
      minutes_each_way: 0,
      cost_value: value,
      cost_frequency: costFrequency || 'MONTHLY',
      is_usable_time: false,
      is_primary: true,
    },
  ];
};

// 95 minutes reads as "1h 35m", so a long commute is legible without mental arithmetic.
export const formatDuration = (minutes: number) => {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  if (total === 0) return '0m';
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (!hours) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
};

// Accepts "90", "1h30", "1h 30m", "1:30", "1.5h" — anything a person would plausibly type
// for a commute — and returns whole minutes. null means "could not read that".
export const parseDuration = (input: string | number | null | undefined): number | null => {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input) : null;
  const text = String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  if (!text) return null;

  // 1:30
  const clock = /^(\d+):([0-5]?\d)$/.exec(text);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

  // 1h, 1.5h, 1h30, 1h30m
  const hoursAndMinutes = /^(\d+(?:\.\d+)?)h(?:(\d+)m?)?$/.exec(text);
  if (hoursAndMinutes) {
    const hours = Number(hoursAndMinutes[1]);
    const minutes = hoursAndMinutes[2] ? Number(hoursAndMinutes[2]) : 0;
    return Math.round(hours * 60 + minutes);
  }

  // 90, 90m, 90min, 90mins
  const minutesOnly = /^(\d+(?:\.\d+)?)(?:m|min|mins|minutes)?$/.exec(text);
  if (minutesOnly) return Math.round(Number(minutesOnly[1]));

  return null;
};
