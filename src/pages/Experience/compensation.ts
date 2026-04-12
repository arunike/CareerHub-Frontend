import dayjs, { type Dayjs } from 'dayjs';
import type { Experience } from '../../types';

interface LinkedOfferCompLike {
  base_salary?: number | string | null;
  bonus?: number | string | null;
  equity?: number | string | null;
}

export interface SalaryCompensationSnapshot {
  kind: 'salary';
  base: number;
  bonus: number;
  equity: number;
  total: number;
}

export interface HourlyCompensationSnapshot {
  kind: 'hourly';
  hourlyRate: number;
  hoursPerDay: number;
  workingDaysPerWeek: number;
  totalHoursWorked: number | null;
  overtimeHours: number;
  overtimeRate: number | null;
  overtimeMultiplier: number;
  effectiveOvertimeRate: number;
  regularPay: number;
  overtimePay: number;
  totalEarningsOverride: number | null;
  autoCalculatedHours: number;
  estimatedHours: number;
  weekdaysWorked: number;
  total: number;
  calculationMode: 'auto' | 'manual_hours' | 'manual_total';
  dateRangeLabel: string;
  isMultiPhase?: boolean;
}

export type ExperienceCompensationSnapshot =
  | SalaryCompensationSnapshot
  | HourlyCompensationSnapshot;

const toNumber = (value: unknown, fallback = 0): number => {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getDateBounds = (
  startDate?: string | null,
  endDate?: string | null,
  isCurrent?: boolean,
) => {
  const start = startDate ? dayjs(startDate) : null;
  const end = isCurrent ? dayjs() : (endDate ? dayjs(endDate) : null);
  if (!start || !end || !start.isValid() || !end.isValid() || end.isBefore(start, 'day')) {
    return null;
  }
  return { start: start.startOf('day'), end: end.startOf('day') };
};

export const countWeekdaysInclusive = (start: Dayjs, end: Dayjs): number => {
  let cursor = start.startOf('day');
  const last = end.startOf('day');
  let weekdays = 0;

  while (cursor.isBefore(last) || cursor.isSame(last, 'day')) {
    const day = cursor.day();
    if (day !== 0 && day !== 6) weekdays += 1;
    cursor = cursor.add(1, 'day');
  }

  return weekdays;
};

export interface HourlyWorkSummary {
  hoursPerDay: number;
  workingDaysPerWeek: number;
  weekdaysWorked: number;
  autoCalculatedHours: number;
  dateRangeLabel: string;
}

export const buildHourlyWorkSummary = ({
  startDate,
  endDate,
  isCurrent,
  hoursPerDay,
  workingDaysPerWeek,
}: {
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  hoursPerDay?: number | string | null;
  workingDaysPerWeek?: number | string | null;
}): HourlyWorkSummary | null => {
  const hours = toNumber(hoursPerDay, 8);
  const workdays = Math.max(0, Math.min(5, toNumber(workingDaysPerWeek, 5)));
  const bounds = getDateBounds(startDate, endDate, isCurrent);

  if (!bounds) return null;

  const weekdaysWorked = countWeekdaysInclusive(bounds.start, bounds.end);
  const fullWorkWeeks = Math.floor(weekdaysWorked / 5);
  const remainingWeekdays = weekdaysWorked % 5;
  const estimatedDaysWorked = (fullWorkWeeks * workdays) + Math.min(remainingWeekdays, workdays);
  const autoCalculatedHours = estimatedDaysWorked * hours;

  return {
    hoursPerDay: hours,
    workingDaysPerWeek: workdays,
    weekdaysWorked,
    autoCalculatedHours,
    dateRangeLabel: `${bounds.start.format('MMM D, YYYY')} - ${bounds.end.format('MMM D, YYYY')}`,
  };
};

export const buildHourlyCompensationSnapshot = ({
  startDate,
  endDate,
  isCurrent,
  hourlyRate,
  hoursPerDay,
  workingDaysPerWeek,
  totalHoursWorked,
  overtimeHours,
  overtimeRate,
  overtimeMultiplier,
  totalEarningsOverride,
}: {
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  hourlyRate?: number | string | null;
  hoursPerDay?: number | string | null;
  workingDaysPerWeek?: number | string | null;
  totalHoursWorked?: number | string | null;
  overtimeHours?: number | string | null;
  overtimeRate?: number | string | null;
  overtimeMultiplier?: number | string | null;
  totalEarningsOverride?: number | string | null;
}): HourlyCompensationSnapshot | null => {
  const rate = toNumber(hourlyRate);
  const hours = toNumber(hoursPerDay, 8);
  const workdays = Math.max(0, Math.min(5, toNumber(workingDaysPerWeek, 5)));
  const manualHoursRaw = totalHoursWorked == null || totalHoursWorked === '' ? null : toNumber(totalHoursWorked);
  const overtimeHoursRaw = Math.max(0, toNumber(overtimeHours));
  const overtimeRateRaw = overtimeRate == null || overtimeRate === '' ? null : toNumber(overtimeRate);
  const overtimeMultiplierRaw = Math.max(0, toNumber(overtimeMultiplier, 1.5));
  const totalOverrideValue = totalEarningsOverride == null || totalEarningsOverride === '' ? null : toNumber(totalEarningsOverride);
  const totalOverrideRaw = totalOverrideValue != null && totalOverrideValue > 0 ? totalOverrideValue : null;
  const workSummary = buildHourlyWorkSummary({
    startDate,
    endDate,
    isCurrent,
    hoursPerDay,
    workingDaysPerWeek,
  });
  const autoHours = workSummary?.autoCalculatedHours ?? 0;
  const hasManualHours = manualHoursRaw != null && Math.abs(manualHoursRaw - autoHours) > 0.01;
  const normalizedManualHours = hasManualHours ? manualHoursRaw : null;
  const estimatedHours = normalizedManualHours ?? autoHours;
  const effectiveOvertimeRate = overtimeRateRaw != null && overtimeRateRaw > 0
    ? overtimeRateRaw
    : Math.max(0, rate * overtimeMultiplierRaw);
  const regularPay = rate * estimatedHours;
  const overtimePay = overtimeHoursRaw * effectiveOvertimeRate;

  if (totalOverrideRaw == null && rate <= 0) return null;
  if (totalOverrideRaw == null && !workSummary && normalizedManualHours == null && overtimeHoursRaw <= 0) return null;
  if (totalOverrideRaw == null && estimatedHours <= 0 && overtimeHoursRaw <= 0) return null;

  return {
    kind: 'hourly',
    hourlyRate: rate,
    hoursPerDay: hours,
    workingDaysPerWeek: workdays,
    totalHoursWorked: normalizedManualHours,
    overtimeHours: overtimeHoursRaw,
    overtimeRate: overtimeRateRaw,
    overtimeMultiplier: overtimeMultiplierRaw,
    effectiveOvertimeRate,
    regularPay,
    overtimePay,
    totalEarningsOverride: totalOverrideRaw,
    autoCalculatedHours: autoHours,
    estimatedHours,
    weekdaysWorked: workSummary?.weekdaysWorked ?? 0,
    total: totalOverrideRaw ?? (regularPay + overtimePay),
    calculationMode: totalOverrideRaw != null
      ? 'manual_total'
      : normalizedManualHours != null
        ? 'manual_hours'
        : 'auto',
    dateRangeLabel: workSummary?.dateRangeLabel ?? (normalizedManualHours != null ? 'Manual total hours' : 'Custom total override'),
  };
};

export const getExperienceCompensationSnapshot = (
  exp: Experience,
  linkedOffer?: LinkedOfferCompLike,
): ExperienceCompensationSnapshot | null => {
  if (exp.employment_type === 'internship') {
    if (exp.schedule_phases && exp.schedule_phases.length > 0) {
      const activePhases = exp.schedule_phases;
      const phaseSnapshots = activePhases.map(phase => buildHourlyCompensationSnapshot({
        startDate: phase.start_date,
        endDate: phase.end_date,
        isCurrent: phase.is_current,
        hourlyRate: phase.hourly_rate,
        hoursPerDay: phase.hours_per_day,
        workingDaysPerWeek: phase.working_days_per_week,
        totalHoursWorked: phase.total_hours_worked,
        overtimeHours: phase.overtime_hours,
        overtimeRate: phase.overtime_rate,
        overtimeMultiplier: phase.overtime_multiplier,
        totalEarningsOverride: phase.total_earnings_override,
      })).filter(Boolean) as HourlyCompensationSnapshot[];

      if (phaseSnapshots.length > 0) {
        const aggregatedRegularPay = phaseSnapshots.reduce((sum, s) => sum + s.regularPay, 0);
        const aggregatedEstimatedHours = phaseSnapshots.reduce((sum, s) => sum + s.estimatedHours, 0);
        const aggregatedOvertimeHours = phaseSnapshots.reduce((sum, s) => sum + s.overtimeHours, 0);
        const aggregatedOvertimePay = phaseSnapshots.reduce((sum, s) => sum + s.overtimePay, 0);
        const aggregatedTotal = phaseSnapshots.reduce((sum, s) => sum + s.total, 0);
        const aggregatedManualTotalHours = phaseSnapshots.some(s => s.totalHoursWorked != null)
          ? phaseSnapshots.reduce((sum, s) => sum + (s.totalHoursWorked ?? 0), 0)
          : null;
        const blendedRate = aggregatedEstimatedHours > 0 ? aggregatedRegularPay / aggregatedEstimatedHours : (exp.hourly_rate ?? 0);
        const effectiveAggregatedOvertimeRate = aggregatedOvertimeHours > 0
          ? aggregatedOvertimePay / aggregatedOvertimeHours
          : (exp.overtime_rate ?? (blendedRate * (exp.overtime_multiplier ?? 1.5)));
        
        return {
          kind: 'hourly',
          hourlyRate: blendedRate,
          hoursPerDay: phaseSnapshots.reduce((sum, s) => sum + s.hoursPerDay, 0) / phaseSnapshots.length,
          workingDaysPerWeek: phaseSnapshots.reduce((sum, s) => sum + s.workingDaysPerWeek, 0) / phaseSnapshots.length,
          totalHoursWorked: aggregatedManualTotalHours,
          overtimeHours: aggregatedOvertimeHours,
          overtimeRate: aggregatedOvertimeHours > 0 ? effectiveAggregatedOvertimeRate : (exp.overtime_rate ?? null),
          overtimeMultiplier: exp.overtime_multiplier ?? 1.5,
          effectiveOvertimeRate: effectiveAggregatedOvertimeRate,
          regularPay: aggregatedRegularPay,
          overtimePay: aggregatedOvertimePay,
          totalEarningsOverride: null,
          autoCalculatedHours: phaseSnapshots.reduce((sum, s) => sum + s.autoCalculatedHours, 0),
          estimatedHours: aggregatedEstimatedHours,
          weekdaysWorked: phaseSnapshots.reduce((sum, s) => sum + s.weekdaysWorked, 0),
          total: aggregatedTotal,
          calculationMode: 'auto',
          dateRangeLabel: `Aggregated ${phaseSnapshots.length} phases`,
          isMultiPhase: true,
        };
      }
    }

    return buildHourlyCompensationSnapshot({
      startDate: exp.start_date,
      endDate: exp.end_date,
      isCurrent: exp.is_current,
      hourlyRate: exp.hourly_rate,
      hoursPerDay: exp.hours_per_day,
      workingDaysPerWeek: exp.working_days_per_week,
      totalHoursWorked: exp.total_hours_worked,
      overtimeHours: exp.overtime_hours,
      overtimeRate: exp.overtime_rate,
      overtimeMultiplier: exp.overtime_multiplier,
      totalEarningsOverride: exp.total_earnings_override,
    });
  }

  const base = linkedOffer ? toNumber(linkedOffer.base_salary) : toNumber(exp.base_salary);
  const bonus = linkedOffer ? toNumber(linkedOffer.bonus) : toNumber(exp.bonus);
  const equity = linkedOffer ? toNumber(linkedOffer.equity) : toNumber(exp.equity);
  const hasCompData = [
    linkedOffer?.base_salary,
    linkedOffer?.bonus,
    linkedOffer?.equity,
    exp.base_salary,
    exp.bonus,
    exp.equity,
  ].some(value => value != null);

  return hasCompData
    ? {
        kind: 'salary',
        base,
        bonus,
        equity,
        total: base + bonus + equity,
      }
    : null;
};
