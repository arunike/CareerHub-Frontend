import { useEffect, useMemo, useRef, useState } from 'react';
import { buildHourlyCompensationSnapshot, buildHourlyWorkSummary } from './compensation';
import {
  getHourlyFieldLabel,
  toInputValue,
  numbersMatch,
  toNullableNumber,
  type HourlyInputUpdate,
} from './compensationBreakdownFormat';

export type HourlyBreakdownInputs = {
  total: number;
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
  calculationMode: 'auto' | 'manual_hours' | 'manual_total';
  dateRangeLabel: string;
  totalLabel?: string;
  totalHint?: string;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  onSaveHourlyInputs?: (values: HourlyInputUpdate) => Promise<void>;
  isMultiPhase?: boolean;
  openSchedulePhases?: () => void;
  displayMode?: 'standard' | 'aggregate';
};

export const useHourlyBreakdownState = ({
  total,
  hourlyRate,
  hoursPerDay,
  workingDaysPerWeek,
  totalHoursWorked,
  overtimeHours,
  overtimeRate,
  overtimeMultiplier,
  effectiveOvertimeRate,
  regularPay,
  overtimePay,
  totalEarningsOverride,
  autoCalculatedHours,
  estimatedHours,
  weekdaysWorked,
  calculationMode,
  dateRangeLabel,
  totalLabel,
  totalHint,
  startDate,
  endDate,
  isCurrent,
  onSaveHourlyInputs,
  isMultiPhase,
  displayMode,
}: HourlyBreakdownInputs) => {
  const [activeField, setActiveField] = useState<string | null>(null);
  const [savingInputs, setSavingInputs] = useState(false);
  const [draftHourlyRate, setDraftHourlyRate] = useState(toInputValue(hourlyRate));
  const [draftHoursPerDay, setDraftHoursPerDay] = useState(toInputValue(hoursPerDay));
  const [draftWorkingDaysPerWeek, setDraftWorkingDaysPerWeek] = useState(
    toInputValue(workingDaysPerWeek)
  );
  const [draftTotalHoursWorked, setDraftTotalHoursWorked] = useState(
    toInputValue(totalHoursWorked ?? autoCalculatedHours)
  );
  const [draftOvertimeHours, setDraftOvertimeHours] = useState(toInputValue(overtimeHours || null));
  const [draftOvertimeRate, setDraftOvertimeRate] = useState(toInputValue(overtimeRate));
  const [draftOvertimeMultiplier, setDraftOvertimeMultiplier] = useState(
    toInputValue(overtimeMultiplier || 1.5)
  );
  const [draftTotalEarningsOverride, setDraftTotalEarningsOverride] = useState(
    toInputValue(totalEarningsOverride)
  );
  const canEditHourlyInputs = Boolean(onSaveHourlyInputs);
  const hasAdvancedDefault =
    overtimeHours > 0 ||
    totalEarningsOverride != null ||
    overtimeRate != null ||
    overtimeMultiplier !== 1.5;
  const [showOverrides, setShowOverrides] = useState(hasAdvancedDefault);
  const previousAutoHoursRef = useRef<number | null>(null);
  const isAggregateDisplay = displayMode === 'aggregate';
  const useLiveSnapshot = !isMultiPhase && !isAggregateDisplay;

  useEffect(() => {
    setDraftHourlyRate(toInputValue(hourlyRate));
    setDraftHoursPerDay(toInputValue(hoursPerDay));
    setDraftWorkingDaysPerWeek(toInputValue(workingDaysPerWeek));
    setDraftTotalHoursWorked(toInputValue(totalHoursWorked ?? autoCalculatedHours));
    setDraftOvertimeHours(toInputValue(overtimeHours || null));
    setDraftOvertimeRate(toInputValue(overtimeRate));
    setDraftOvertimeMultiplier(toInputValue(overtimeMultiplier || 1.5));
    setDraftTotalEarningsOverride(toInputValue(totalEarningsOverride));
  }, [
    hourlyRate,
    hoursPerDay,
    workingDaysPerWeek,
    totalHoursWorked,
    overtimeHours,
    overtimeRate,
    overtimeMultiplier,
    autoCalculatedHours,
    totalEarningsOverride,
  ]);

  const liveWorkSummary = useMemo(() => {
    return buildHourlyWorkSummary({
      startDate,
      endDate,
      isCurrent,
      hoursPerDay: draftHoursPerDay,
      workingDaysPerWeek: draftWorkingDaysPerWeek,
    });
  }, [draftHoursPerDay, draftWorkingDaysPerWeek, endDate, isCurrent, startDate]);

  useEffect(() => {
    if (!liveWorkSummary) {
      previousAutoHoursRef.current = null;
      return;
    }

    const nextAutoHours = Number(liveWorkSummary.autoCalculatedHours.toFixed(2));
    const currentHours = toNullableNumber(draftTotalHoursWorked);
    const previousAutoHours = previousAutoHoursRef.current;
    const shouldAutofill =
      currentHours == null ||
      currentHours === 0 ||
      previousAutoHours == null ||
      Math.abs(currentHours - previousAutoHours) < 0.01;

    if (shouldAutofill && Math.abs((currentHours ?? 0) - nextAutoHours) >= 0.01) {
      setDraftTotalHoursWorked(toInputValue(nextAutoHours));
    }

    previousAutoHoursRef.current = nextAutoHours;
  }, [draftTotalHoursWorked, liveWorkSummary]);

  const liveSnapshot = useMemo(() => {
    return buildHourlyCompensationSnapshot({
      startDate,
      endDate,
      isCurrent,
      hourlyRate: draftHourlyRate,
      hoursPerDay: draftHoursPerDay,
      workingDaysPerWeek: draftWorkingDaysPerWeek,
      totalHoursWorked: draftTotalHoursWorked,
      overtimeHours: draftOvertimeHours,
      overtimeRate: draftOvertimeRate,
      overtimeMultiplier: draftOvertimeMultiplier,
      totalEarningsOverride: draftTotalEarningsOverride,
    });
  }, [
    draftHourlyRate,
    draftHoursPerDay,
    draftOvertimeHours,
    draftOvertimeMultiplier,
    draftOvertimeRate,
    draftWorkingDaysPerWeek,
    draftTotalEarningsOverride,
    draftTotalHoursWorked,
    endDate,
    isCurrent,
    startDate,
  ]);

  const displayCalculationMode = useLiveSnapshot
    ? (liveSnapshot?.calculationMode ?? calculationMode)
    : calculationMode;
  const displayHoursPerDay = useLiveSnapshot
    ? (liveSnapshot?.hoursPerDay ?? hoursPerDay)
    : hoursPerDay;
  const displayWorkingDaysPerWeek = useLiveSnapshot
    ? (liveSnapshot?.workingDaysPerWeek ?? workingDaysPerWeek)
    : workingDaysPerWeek;
  const displayEstimatedHours = useLiveSnapshot
    ? (liveSnapshot?.estimatedHours ?? estimatedHours)
    : estimatedHours;
  const displayWeekdaysWorked = useLiveSnapshot
    ? (liveSnapshot?.weekdaysWorked ?? weekdaysWorked)
    : weekdaysWorked;
  const displayDateRangeLabel = useLiveSnapshot
    ? (liveSnapshot?.dateRangeLabel ?? dateRangeLabel)
    : dateRangeLabel;
  const displayHourlyRate = useLiveSnapshot ? (liveSnapshot?.hourlyRate ?? hourlyRate) : hourlyRate;
  const displayRegularPay = useLiveSnapshot ? (liveSnapshot?.regularPay ?? regularPay) : regularPay;

  const displayOvertimeHours = useLiveSnapshot
    ? (liveSnapshot?.overtimeHours ?? overtimeHours)
    : overtimeHours;
  const displayOvertimeRate = useLiveSnapshot
    ? (liveSnapshot?.overtimeRate ?? overtimeRate)
    : overtimeRate;
  const displayOvertimeMultiplier = useLiveSnapshot
    ? (liveSnapshot?.overtimeMultiplier ?? overtimeMultiplier)
    : overtimeMultiplier;
  const displayEffectiveOvertimeRate = useLiveSnapshot
    ? (liveSnapshot?.effectiveOvertimeRate ?? effectiveOvertimeRate)
    : effectiveOvertimeRate;
  const displayOvertimePay = useLiveSnapshot
    ? (liveSnapshot?.overtimePay ?? overtimePay)
    : overtimePay;
  const displayTotal = useLiveSnapshot ? (liveSnapshot?.total ?? total) : total;
  const hasValidDraft = [
    toNullableNumber(draftHourlyRate),
    toNullableNumber(draftHoursPerDay),
    toNullableNumber(draftWorkingDaysPerWeek),
    toNullableNumber(draftTotalHoursWorked),
    toNullableNumber(draftOvertimeHours),
    toNullableNumber(draftOvertimeRate),
    toNullableNumber(draftOvertimeMultiplier),
    toNullableNumber(draftTotalEarningsOverride),
  ].some((value) => value != null);
  const isDirty =
    !numbersMatch(toNullableNumber(draftHourlyRate), hourlyRate) ||
    !numbersMatch(toNullableNumber(draftHoursPerDay), hoursPerDay) ||
    !numbersMatch(toNullableNumber(draftWorkingDaysPerWeek), workingDaysPerWeek) ||
    !numbersMatch(
      toNullableNumber(draftTotalHoursWorked),
      totalHoursWorked ?? autoCalculatedHours
    ) ||
    !numbersMatch(toNullableNumber(draftOvertimeHours), overtimeHours || null) ||
    !numbersMatch(toNullableNumber(draftOvertimeRate), overtimeRate) ||
    !numbersMatch(toNullableNumber(draftOvertimeMultiplier), overtimeMultiplier || 1.5) ||
    !numbersMatch(toNullableNumber(draftTotalEarningsOverride), totalEarningsOverride);

  const resetDraft = () => {
    setDraftHourlyRate(toInputValue(hourlyRate));
    setDraftHoursPerDay(toInputValue(hoursPerDay));
    setDraftWorkingDaysPerWeek(toInputValue(workingDaysPerWeek));
    setDraftTotalHoursWorked(toInputValue(totalHoursWorked ?? autoCalculatedHours));
    setDraftOvertimeHours(toInputValue(overtimeHours || null));
    setDraftOvertimeRate(toInputValue(overtimeRate));
    setDraftOvertimeMultiplier(toInputValue(overtimeMultiplier || 1.5));
    setDraftTotalEarningsOverride(toInputValue(totalEarningsOverride));
    setActiveField(null);
  };

  const handleCancelEditing = () => {
    resetDraft();
  };

  const handleSaveInputs = async () => {
    if (!onSaveHourlyInputs || !hasValidDraft) return;
    try {
      setSavingInputs(true);
      await onSaveHourlyInputs({
        hourly_rate: toNullableNumber(draftHourlyRate),
        hours_per_day: toNullableNumber(draftHoursPerDay),
        working_days_per_week: toNullableNumber(draftWorkingDaysPerWeek),
        total_hours_worked: toNullableNumber(draftTotalHoursWorked),
        overtime_hours: toNullableNumber(draftOvertimeHours),
        overtime_rate: toNullableNumber(draftOvertimeRate),
        overtime_multiplier: toNullableNumber(draftOvertimeMultiplier),
        total_earnings_override: toNullableNumber(draftTotalEarningsOverride),
      });
      setActiveField(null);
    } finally {
      setSavingInputs(false);
    }
  };

  const isManualTotal = displayCalculationMode === 'manual_total';
  const totalHeading =
    totalLabel ??
    (isManualTotal
      ? 'Custom Total Earnings'
      : displayCalculationMode === 'manual_hours'
        ? 'Total Earnings'
        : 'Estimated Total Earnings');
  const totalHeadingHint =
    totalHint ??
    (isManualTotal
      ? 'Using your direct total override for the final internship total.'
      : displayCalculationMode === 'manual_hours'
        ? 'Calculated from your saved hourly rate, total hours, and overtime inputs.'
        : 'Estimated from hourly rate, role dates, and your internship work schedule.');
  const dateRangeHint = isCurrent
    ? 'Current roles are calculated through today'
    : 'Using the saved role start and end dates';
  const activeFieldLabel = getHourlyFieldLabel(activeField);
  const canRevealAdvancedOptions = canEditHourlyInputs || hasAdvancedDefault;
  const advancedOptionsCta = canEditHourlyInputs
    ? 'Edit Advanced Pay Options (Overtime & Totals)'
    : 'Show Advanced Pay Options';

  return {
    activeField,
    setActiveField,
    savingInputs,
    draftHourlyRate,
    setDraftHourlyRate,
    draftHoursPerDay,
    setDraftHoursPerDay,
    draftWorkingDaysPerWeek,
    setDraftWorkingDaysPerWeek,
    draftTotalHoursWorked,
    setDraftTotalHoursWorked,
    draftOvertimeHours,
    setDraftOvertimeHours,
    draftOvertimeRate,
    setDraftOvertimeRate,
    draftOvertimeMultiplier,
    setDraftOvertimeMultiplier,
    draftTotalEarningsOverride,
    setDraftTotalEarningsOverride,
    canEditHourlyInputs,
    showOverrides,
    setShowOverrides,
    isAggregateDisplay,
    liveWorkSummary,
    displayCalculationMode,
    displayHoursPerDay,
    displayWorkingDaysPerWeek,
    displayEstimatedHours,
    displayWeekdaysWorked,
    displayDateRangeLabel,
    displayHourlyRate,
    displayRegularPay,
    displayOvertimeHours,
    displayOvertimeRate,
    displayOvertimeMultiplier,
    displayEffectiveOvertimeRate,
    displayOvertimePay,
    displayTotal,
    hasValidDraft,
    isDirty,
    handleCancelEditing,
    handleSaveInputs,
    isManualTotal,
    totalHeading,
    totalHeadingHint,
    dateRangeHint,
    activeFieldLabel,
    canRevealAdvancedOptions,
    advancedOptionsCta,
  };
};
