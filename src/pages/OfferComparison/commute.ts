export type CommuteMode = 'TRAIN' | 'BUS' | 'CAR' | 'BIKE' | 'WALK' | 'OTHER';
export type CostFrequency = 'DAILY' | 'MONTHLY' | 'YEARLY';
export type CostMode = 'FIXED' | 'FUEL';
export type DistanceBasis = 'ONE_WAY' | 'ROUND_TRIP';

export interface CommuteOption {
  mode: CommuteMode;
  minutes_each_way: number;
  cost_value: number;
  cost_frequency: CostFrequency;
  // Absent on rows saved before fuel costing existed, which are all FIXED by definition.
  cost_mode?: CostMode;
  // Distance is kept separate from minutes: the same 15 minutes is 5 miles in traffic or 15
  // on a motorway, so deriving one from the other would need a speed nobody has entered.
  miles_each_way?: number;
  // Absent on rows saved before this existed, which were all read as one way.
  distance_basis?: DistanceBasis;
  mpg?: number | null;
  gas_price_per_gallon?: number | null;
  parking_tolls_per_day?: number;
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

export const DEFAULT_MPG = 28;
export const DEFAULT_GAS_PRICE = 4;

export interface DrivingDefaults {
  mpg: number;
  gasPricePerGallon: number;
}

export const resolveDrivingDefaults = (
  defaults?: Partial<DrivingDefaults> | null
): DrivingDefaults => ({
  mpg: Number(defaults?.mpg) || DEFAULT_MPG,
  gasPricePerGallon: Number(defaults?.gasPricePerGallon) || DEFAULT_GAS_PRICE,
});

export const effectiveFuelInputs = (
  option: CommuteOption,
  defaults?: Partial<DrivingDefaults> | null
) => {
  const shared = resolveDrivingDefaults(defaults);
  const mpgOverride = Number(option.mpg) || 0;
  const priceOverride = Number(option.gas_price_per_gallon) || 0;
  return {
    mpg: mpgOverride > 0 ? mpgOverride : shared.mpg,
    gasPricePerGallon: priceOverride > 0 ? priceOverride : shared.gasPricePerGallon,
    mpgOverridden: mpgOverride > 0,
    priceOverridden: priceOverride > 0,
    shared,
  };
};

// Driving is the only mode where distance and pump price beat a flat figure; a transit pass
// is already a number you know.
export const supportsFuelCosting = (mode: CommuteMode) => mode === 'CAR' || mode === 'OTHER';

const WEEKS_PER_YEAR = 52;
const FULL_TIME_DAYS_PER_YEAR = 260;

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

export const isRoundTrip = (option: CommuteOption) => option.distance_basis === 'ROUND_TRIP';

// Miles per office day: doubled only when the figure describes one direction.
export const dailyMilesFor = (option: CommuteOption) => {
  const entered = Number(option.miles_each_way) || 0;
  return isRoundTrip(option) ? entered : entered * 2;
};

export const annualMilesFor = (option: CommuteOption, officeDays: number) =>
  dailyMilesFor(option) * officeDays;

export const isFuelCosted = (option: CommuteOption) => option.cost_mode === 'FUEL';

/** The figures an offer keeps for itself, if any. Reported per offer rather than per row: an
 *  offer with three commute rows is still one decision about whose numbers to trust. */
export interface FuelOverrides {
  mpg: number | null;
  gasPricePerGallon: number | null;
}

export const fuelOverridesIn = (
  options: CommuteOption[] | null | undefined
): FuelOverrides | null => {
  const list = Array.isArray(options) ? options : [];
  // The first row that overrides each figure wins the display; clearing clears them all, so
  // there is never a second, hidden override left behind on another row.
  const mpg = list.map((option) => Number(option.mpg)).find((value) => value > 0) ?? null;
  const gasPricePerGallon =
    list.map((option) => Number(option.gas_price_per_gallon)).find((value) => value > 0) ?? null;
  if (mpg === null && gasPricePerGallon === null) return null;
  return { mpg, gasPricePerGallon };
};

// Hands every row back to the shared figures.
export const clearFuelOverrides = (options: CommuteOption[] | null | undefined): CommuteOption[] =>
  (Array.isArray(options) ? options : []).map((option) => ({
    ...option,
    mpg: null,
    gas_price_per_gallon: null,
  }));

export interface FuelBreakdown {
  annualMiles: number;
  gallons: number;
  fuelCost: number;
  parkingCost: number;
  annualCost: number;
  costPerMile: number;
}

export const fuelBreakdownFor = (
  option: CommuteOption,
  officeDays: number,
  defaults?: Partial<DrivingDefaults> | null
): FuelBreakdown | null => {
  const miles = annualMilesFor(option, officeDays);
  const { mpg, gasPricePerGallon: price } = effectiveFuelInputs(option, defaults);
  // Without an efficiency figure there is nothing to divide by, so this reports no estimate
  // rather than dividing by zero and rendering Infinity.
  if (miles <= 0 || mpg <= 0 || price <= 0) return null;
  const gallons = miles / mpg;
  const fuelCost = gallons * price;
  const parkingCost = (Number(option.parking_tolls_per_day) || 0) * officeDays;
  const annualCost = fuelCost + parkingCost;
  return {
    annualMiles: miles,
    gallons,
    fuelCost,
    parkingCost,
    annualCost,
    costPerMile: annualCost / miles,
  };
};

export const annualCostFor = (
  option: CommuteOption,
  officeDays: number,
  defaults?: Partial<DrivingDefaults> | null
) => {
  if (isFuelCosted(option)) {
    return fuelBreakdownFor(option, officeDays, defaults)?.annualCost ?? 0;
  }
  const value = Number(option.cost_value) || 0;
  if (option.cost_frequency === 'DAILY') return value * officeDays;
  if (option.cost_frequency === 'MONTHLY') return value * 12;
  return value;
};

export const annualHoursFor = (option: CommuteOption, officeDays: number) =>
  ((Number(option.minutes_each_way) || 0) * 2 * officeDays) / 60;

export const primaryCommute = (options?: CommuteOption[] | null) => {
  if (!Array.isArray(options) || options.length === 0) return null;
  return options.find((option) => option.is_primary) ?? options[0];
};

export interface CommuteSummary {
  officeDays: number;
  primary: CommuteOption | null;
  annualHours: number;
  annualCost: number;
  // Every mode costed the same way, so alternatives can be compared side by side.
  alternatives: Array<CommuteOption & { annualHours: number; annualCost: number }>;
}

export const summariseCommute = (
  options: CommuteOption[] | null | undefined,
  dayInputs: OfficeDayInputs,
  defaults?: Partial<DrivingDefaults> | null
): CommuteSummary => {
  const officeDays = officeDaysPerYear(dayInputs);
  // A remote offer has no commute to report. Rows saved before the mode changed are kept in
  // the record but excluded here, so a remote offer never shows a 0 hr / $0 commute line.
  const list = dayInputs.workMode === 'REMOTE' ? [] : Array.isArray(options) ? options : [];
  const primary = primaryCommute(list);
  return {
    officeDays,
    primary,
    annualHours: primary ? annualHoursFor(primary, officeDays) : 0,
    annualCost: primary ? annualCostFor(primary, officeDays, defaults) : 0,
    alternatives: list.map((option) => ({
      ...option,
      annualHours: annualHoursFor(option, officeDays),
      annualCost: annualCostFor(option, officeDays, defaults),
    })),
  };
};

// 0 hours scores 100; a 300 hour year is a write-off. Linear between the two so the
// difference between a 60 and a 120 hour commute still moves the number.
const COMMUTE_HOURS_FLOOR = 300;

export const commuteBurdenScore = (annualHours: number) => {
  if (!Number.isFinite(annualHours) || annualHours <= 0) return 100;
  const ratio = Math.min(1, annualHours / COMMUTE_HOURS_FLOOR);
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
