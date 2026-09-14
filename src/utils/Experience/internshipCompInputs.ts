import type { Experience } from '../../types';
import { buildHourlyCompensationSnapshot } from './compensation';
import { nearlyEqual, roundCompNumber, toNullableNumber } from './experienceUtils';

export interface InternshipCompInputs {
  hourly_rate: number | null;
  hours_per_day: number | null;
  working_days_per_week: number | null;
  total_hours_worked: number | null;
  overtime_hours: number | null;
  overtime_rate: number | null;
  overtime_multiplier: number | null;
  total_earnings_override: number | null;
}

// Null means the schedule decides; a figure means the schedule is wrong for this row.
export const normalizeInternshipCompInputs = (
  updates: InternshipCompInputs,
  role: Pick<Experience, 'start_date' | 'end_date' | 'is_current'>
): Partial<Experience> => {
  const hourlyRate = roundCompNumber(toNullableNumber(updates.hourly_rate));
  const hoursPerDay = roundCompNumber(toNullableNumber(updates.hours_per_day));
  const workingDaysPerWeek = roundCompNumber(toNullableNumber(updates.working_days_per_week));
  const rawTotalHoursWorked = roundCompNumber(toNullableNumber(updates.total_hours_worked));
  const overtimeHours =
    roundCompNumber(Math.max(0, toNullableNumber(updates.overtime_hours) ?? 0)) || null;

  const overtimeRate = (() => {
    const value = roundCompNumber(toNullableNumber(updates.overtime_rate));
    return value != null && value > 0 ? value : null;
  })();
  // 1.5× is the default, so storing it would be indistinguishable from not answering.
  const overtimeMultiplier = (() => {
    const value = roundCompNumber(toNullableNumber(updates.overtime_multiplier));
    return value != null && value > 0 && !nearlyEqual(value, 1.5) ? value : null;
  })();
  const rawTotalEarningsOverride = roundCompNumber(
    toNullableNumber(updates.total_earnings_override)
  );

  const schedule = {
    startDate: role.start_date,
    endDate: role.end_date,
    isCurrent: role.is_current,
    hourlyRate,
    hoursPerDay,
    workingDaysPerWeek,
    overtimeRate,
    overtimeMultiplier,
    totalEarningsOverride: null,
  };

  const autoSnapshot = buildHourlyCompensationSnapshot({
    ...schedule,
    totalHoursWorked: null,
    overtimeHours: null,
  });
  const totalHoursWorked =
    rawTotalHoursWorked != null &&
    autoSnapshot &&
    nearlyEqual(rawTotalHoursWorked, autoSnapshot.autoCalculatedHours)
      ? null
      : rawTotalHoursWorked;

  const calculatedTotal =
    buildHourlyCompensationSnapshot({ ...schedule, totalHoursWorked, overtimeHours })?.total ??
    null;
  const totalEarningsOverride =
    rawTotalEarningsOverride != null &&
    calculatedTotal != null &&
    nearlyEqual(rawTotalEarningsOverride, calculatedTotal)
      ? null
      : rawTotalEarningsOverride;

  return {
    hourly_rate: hourlyRate,
    hours_per_day: hoursPerDay,
    working_days_per_week: workingDaysPerWeek,
    total_hours_worked: totalHoursWorked,
    overtime_hours: overtimeHours,
    overtime_rate: overtimeRate,
    overtime_multiplier: overtimeMultiplier,
    total_earnings_override: totalEarningsOverride,
  };
};
