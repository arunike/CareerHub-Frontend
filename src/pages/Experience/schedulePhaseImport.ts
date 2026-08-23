import dayjs, { type Dayjs } from 'dayjs';
import type { SchedulePhase } from '../../types';

export type PhaseImportDefaults = {
  hourlyRate?: number | null;
  hoursPerDay?: number | null;
  workingDaysPerWeek?: number | null;
  overtimeRate?: number | null;
  overtimeMultiplier?: number | null;
};

type ImportedDayEntry = {
  date: Dayjs;
  hours: number;
  overtimeHours: number;
};

type ImportedWeekSummary = {
  label: string;
  weekNumber: number | null;
  entries: ImportedDayEntry[];
  startDate: Dayjs;
  endDate: Dayjs;
  totalHours: number;
  totalOvertimeHours: number;
  workingDaysPerWeek: number;
  positiveHourEntries: number;
  positiveHoursTotal: number;
  isUniformHours: boolean;
  mergeKey: string;
};

export function nanoid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function emptyPhase(defaults: PhaseImportDefaults = {}): Omit<SchedulePhase, 'id'> {
  return {
    name: 'Phase 1',
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: null,
    is_current: false,
    hourly_rate: defaults.hourlyRate ?? 20,
    hours_per_day: defaults.hoursPerDay ?? 8,
    working_days_per_week: defaults.workingDaysPerWeek ?? 5,
    total_hours_worked: null,
    overtime_hours: null,
    overtime_rate: defaults.overtimeRate ?? null,
    overtime_multiplier: defaults.overtimeMultiplier ?? 1.5,
    total_earnings_override: null,
  };
}

const roundTo = (value: number, digits = 2) => Number(value.toFixed(digits));

const parseNumberToken = (value: string): number | null => {
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseWeekNumber = (label: string): number | null => {
  const match = label.match(/Week\s+(\d+)/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const getInitialImportYear = ({
  rawText,
  expStartDate,
  expEndDate,
}: {
  rawText: string;
  expStartDate?: string | null;
  expEndDate?: string | null;
}) => {
  if (expStartDate && dayjs(expStartDate).isValid()) {
    return dayjs(expStartDate).year();
  }

  if (expEndDate && dayjs(expEndDate).isValid()) {
    const end = dayjs(expEndDate);
    const firstDateMatch = rawText.match(/\b(\d{1,2})\/(\d{1,2})\b/);
    if (firstDateMatch) {
      const firstMonth = Number(firstDateMatch[1]);
      return firstMonth > end.month() + 1 ? end.year() - 1 : end.year();
    }
    return end.year();
  }

  return dayjs().year();
};

const resolveImportedDate = (token: string, currentYear: number, previousDate: Dayjs | null) => {
  const [monthText, dayText] = token.split('/');
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    throw new Error(`Couldn't understand the date "${token}".`);
  }

  let year = currentYear;
  let candidate = dayjs(new Date(year, month - 1, day)).startOf('day');

  if (previousDate && candidate.isBefore(previousDate, 'day')) {
    year += 1;
    candidate = dayjs(new Date(year, month - 1, day)).startOf('day');
  }

  return { date: candidate, year };
};

const summarizeImportedWeek = (label: string, entries: ImportedDayEntry[]): ImportedWeekSummary => {
  const sortedEntries = [...entries].sort((a, b) => a.date.valueOf() - b.date.valueOf());
  const positiveHours = sortedEntries.map((entry) => entry.hours).filter((hours) => hours > 0.01);
  const positiveHoursTotal = roundTo(positiveHours.reduce((sum, hours) => sum + hours, 0));
  const hasZeroHourEntry = sortedEntries.some((entry) => entry.hours <= 0.01);
  const baselineHours = positiveHours[0] ?? null;
  const isUniformHours =
    baselineHours != null &&
    !hasZeroHourEntry &&
    positiveHours.every((hours) => Math.abs(hours - baselineHours) < 0.05);
  const workingDaysPerWeek =
    sortedEntries.filter((entry) => entry.hours > 0 || entry.overtimeHours > 0).length ||
    sortedEntries.length;
  const weekNumber = parseWeekNumber(label);

  return {
    label,
    weekNumber,
    entries: sortedEntries,
    startDate: sortedEntries[0].date,
    endDate: sortedEntries[sortedEntries.length - 1].date,
    totalHours: roundTo(sortedEntries.reduce((sum, entry) => sum + entry.hours, 0)),
    totalOvertimeHours: roundTo(sortedEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0)),
    workingDaysPerWeek,
    positiveHourEntries: positiveHours.length,
    positiveHoursTotal,
    isUniformHours,
    mergeKey: isUniformHours
      ? `uniform:${roundTo(baselineHours, 2)}:${workingDaysPerWeek}`
      : `irregular:${label}`,
  };
};

const parseImportedWeeks = ({
  rawText,
  expStartDate,
  expEndDate,
}: {
  rawText: string;
  expStartDate?: string | null;
  expEndDate?: string | null;
}) => {
  const normalized = rawText.replace(/\r/g, '');
  const lines = normalized.split('\n');
  const parsedWeeks: ImportedWeekSummary[] = [];
  let currentWeekLabel = 'Imported Week 1';
  let currentEntries: ImportedDayEntry[] = [];
  let currentYear = getInitialImportYear({ rawText: normalized, expStartDate, expEndDate });
  let previousDate: Dayjs | null = null;

  const flushCurrentWeek = () => {
    if (currentEntries.length === 0) return;
    parsedWeeks.push(summarizeImportedWeek(currentWeekLabel, currentEntries));
    currentEntries = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const weekHeading = trimmed.match(/^(Week\s+\d+)/i);
    if (weekHeading) {
      flushCurrentWeek();
      currentWeekLabel = weekHeading[1].replace(/\s+/g, ' ');
      continue;
    }

    const tokens = trimmed.split(/\s+/);
    if (!/^\d{1,2}\/\d{1,2}$/.test(tokens[0] ?? '')) continue;

    const hours = parseNumberToken(tokens[1] ?? '');
    const overtimeHours = parseNumberToken(tokens[2] ?? '');
    if (hours == null || overtimeHours == null) continue;

    const resolved = resolveImportedDate(tokens[0], currentYear, previousDate);
    currentYear = resolved.year;
    previousDate = resolved.date;
    currentEntries.push({
      date: resolved.date,
      hours: roundTo(hours),
      overtimeHours: roundTo(overtimeHours),
    });
  }

  flushCurrentWeek();

  if (parsedWeeks.length === 0) {
    throw new Error(
      'No schedule rows were found. Paste lines with Date, Hours, and Overtime Hours.'
    );
  }

  return parsedWeeks;
};

const formatImportedWeekRange = (weeks: ImportedWeekSummary[]) => {
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  if (first.weekNumber != null && last.weekNumber != null) {
    return first.weekNumber === last.weekNumber
      ? `Week ${first.weekNumber}`
      : `Weeks ${first.weekNumber}-${last.weekNumber}`;
  }
  return first.label === last.label ? first.label : `${first.label} - ${last.label}`;
};

export const buildImportedPhases = ({
  rawText,
  expStartDate,
  expEndDate,
  defaults,
}: {
  rawText: string;
  expStartDate?: string | null;
  expEndDate?: string | null;
  defaults: PhaseImportDefaults;
}) => {
  const importedWeeks = parseImportedWeeks({ rawText, expStartDate, expEndDate });
  const groupedWeeks: ImportedWeekSummary[][] = [];

  for (const week of importedWeeks) {
    const currentGroup = groupedWeeks[groupedWeeks.length - 1];
    if (!currentGroup) {
      groupedWeeks.push([week]);
      continue;
    }

    const previousWeek = currentGroup[currentGroup.length - 1];
    const gapDays = week.startDate.diff(previousWeek.endDate, 'day');
    const canMerge = previousWeek.mergeKey === week.mergeKey && gapDays <= 7;

    if (canMerge) {
      currentGroup.push(week);
    } else {
      groupedWeeks.push([week]);
    }
  }

  const parsedEndDate =
    expEndDate && dayjs(expEndDate).isValid() ? dayjs(expEndDate).startOf('day') : null;
  const parsedStartDate =
    expStartDate && dayjs(expStartDate).isValid() ? dayjs(expStartDate).startOf('day') : null;

  return {
    phases: groupedWeeks.map((weeks, index) => {
      const nextGroup = groupedWeeks[index + 1];
      const firstWeek = weeks[0];
      const lastWeek = weeks[weeks.length - 1];
      const totalHoursWorked = roundTo(weeks.reduce((sum, week) => sum + week.totalHours, 0));
      const totalOvertimeHours = roundTo(
        weeks.reduce((sum, week) => sum + week.totalOvertimeHours, 0)
      );
      const positiveHoursTotal = weeks.reduce((sum, week) => sum + week.positiveHoursTotal, 0);
      const positiveHourEntries = weeks.reduce((sum, week) => sum + week.positiveHourEntries, 0);
      const startDate =
        index === 0 &&
        parsedStartDate &&
        parsedStartDate.isBefore(firstWeek.startDate, 'day') &&
        firstWeek.startDate.diff(parsedStartDate, 'day') <= 7
          ? parsedStartDate
          : firstWeek.startDate;
      const endDate = nextGroup
        ? nextGroup[0].startDate.subtract(1, 'day')
        : parsedEndDate &&
            parsedEndDate.isAfter(lastWeek.endDate, 'day') &&
            parsedEndDate.diff(lastWeek.endDate, 'day') <= 7
          ? parsedEndDate
          : lastWeek.endDate;

      return {
        id: nanoid(),
        name: `Phase ${index + 1} (${formatImportedWeekRange(weeks)})`,
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        is_current: false,
        hourly_rate: defaults.hourlyRate ?? null,
        hours_per_day:
          positiveHourEntries > 0
            ? roundTo(positiveHoursTotal / positiveHourEntries)
            : (defaults.hoursPerDay ?? 8),
        working_days_per_week: firstWeek.workingDaysPerWeek || defaults.workingDaysPerWeek || 5,
        total_hours_worked: totalHoursWorked,
        overtime_hours: totalOvertimeHours > 0 ? totalOvertimeHours : null,
        overtime_rate: defaults.overtimeRate ?? null,
        overtime_multiplier: defaults.overtimeMultiplier ?? 1.5,
        total_earnings_override: null,
      } satisfies SchedulePhase;
    }),
    importedWeekCount: importedWeeks.length,
  };
};
