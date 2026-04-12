import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Modal } from 'antd';
import { DollarCircleOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { buildHourlyCompensationSnapshot, buildHourlyWorkSummary, type ExperienceCompensationSnapshot } from './compensation';

type HourlyInputUpdate = {
  hourly_rate: number | null;
  hours_per_day: number | null;
  working_days_per_week: number | null;
  total_hours_worked: number | null;
  overtime_hours: number | null;
  overtime_rate: number | null;
  overtime_multiplier: number | null;
  total_earnings_override: number | null;
};

type Props = ExperienceCompensationSnapshot & {
  open: boolean;
  onClose: () => void;
  companyName?: string;
  roleTitle?: string;
  titleText?: string;
  contextLabel?: string;
  totalLabel?: string;
  totalHint?: string;
  onEdit?: () => void;
  editLabel?: string;
  hourlyStartDate?: string | null;
  hourlyEndDate?: string | null;
  hourlyIsCurrent?: boolean;
  onSaveHourlyInputs?: (values: HourlyInputUpdate) => Promise<void>;
  openSchedulePhases?: () => void;
  hourlyDisplayMode?: 'standard' | 'aggregate';
};

const SEGMENTS = [
  { key: 'base', label: 'Base Salary', color: '#2563eb' },
  { key: 'bonus', label: 'Bonus', color: '#10b981' },
  { key: 'equity', label: 'Equity / RSU', color: '#8b5cf6' },
] as const;

const fmtMoney = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const fmtNumber = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const toNullableNumber = (value: string | number | null | undefined): number | null => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toInputValue = (value: number | null | undefined) => (value == null ? '' : String(value));

const normalizeEditableNumber = (value: string | number | null | undefined) => {
  const parsed = toNullableNumber(value);
  if (parsed == null) return null;
  return Number(parsed.toFixed(2));
};

const numbersMatch = (a: string | number | null | undefined, b: string | number | null | undefined) => {
  if (a == null && b == null) return true;
  return normalizeEditableNumber(a) === normalizeEditableNumber(b);
};

const getHourlyFieldLabel = (field: string | null) => {
  switch (field) {
    case 'hourly_rate':
      return 'hourly rate';
    case 'hours_per_day':
      return 'hours per day';
    case 'working_days_per_week':
      return 'working days per week';
    case 'total_hours_worked':
      return 'total hours worked';
    case 'overtime_hours':
      return 'overtime hours';
    case 'overtime_rate':
      return 'overtime rate';
    case 'overtime_multiplier':
      return 'OT multiplier';
    case 'total_earnings_override':
      return 'direct total override';
    default:
      return null;
  }
};

const CompensationBreakdownModal: React.FC<Props> = ({
  open,
  onClose,
  companyName,
  roleTitle,
  titleText,
  contextLabel,
  totalLabel,
  totalHint,
  onEdit,
  editLabel,
  hourlyStartDate,
  hourlyEndDate,
  hourlyIsCurrent,
  onSaveHourlyInputs,
  openSchedulePhases,
  hourlyDisplayMode,
  ...snapshot
}) => {
  const resolvedContextLabel = contextLabel ?? [roleTitle, companyName].filter(Boolean).join(' @ ');

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={860}
      footer={null}
      title={
        <div className="flex items-center gap-2">
          <DollarCircleOutlined className="text-emerald-500" />
          <span>
            {titleText ?? (snapshot.kind === 'hourly' ? 'Internship Earnings Breakdown' : 'Pay Structure Breakdown')}
            {resolvedContextLabel && (
              <span className="ml-2 font-normal text-gray-500">
                {resolvedContextLabel}
              </span>
            )}
          </span>
        </div>
      }
    >
      {snapshot.kind === 'salary' ? (
        <SalaryBreakdown
          total={snapshot.total}
          base={snapshot.base}
          bonus={snapshot.bonus}
          equity={snapshot.equity}
          totalLabel={totalLabel}
          totalHint={totalHint}
          onEdit={onEdit}
          editLabel={editLabel}
        />
      ) : (
        <HourlyBreakdown
          total={snapshot.total}
          hourlyRate={snapshot.hourlyRate}
          hoursPerDay={snapshot.hoursPerDay}
          workingDaysPerWeek={snapshot.workingDaysPerWeek}
          totalHoursWorked={snapshot.totalHoursWorked}
          overtimeHours={snapshot.overtimeHours}
          overtimeRate={snapshot.overtimeRate}
          overtimeMultiplier={snapshot.overtimeMultiplier}
          effectiveOvertimeRate={snapshot.effectiveOvertimeRate}
          regularPay={snapshot.regularPay}
          overtimePay={snapshot.overtimePay}
          totalEarningsOverride={snapshot.totalEarningsOverride}
          autoCalculatedHours={snapshot.autoCalculatedHours}
          estimatedHours={snapshot.estimatedHours}
          weekdaysWorked={snapshot.weekdaysWorked}
          calculationMode={snapshot.calculationMode}
          dateRangeLabel={snapshot.dateRangeLabel}
          totalLabel={totalLabel}
          totalHint={totalHint}
          startDate={hourlyStartDate}
          endDate={hourlyEndDate}
          isCurrent={hourlyIsCurrent}
          onSaveHourlyInputs={onSaveHourlyInputs}
          isMultiPhase={snapshot.isMultiPhase}
          openSchedulePhases={openSchedulePhases}
          displayMode={hourlyDisplayMode}
        />
      )}
    </Modal>
  );
};

const SalaryBreakdown = ({
  total,
  base,
  bonus,
  equity,
  totalLabel,
  totalHint,
  onEdit,
  editLabel,
}: {
  total: number;
  base: number;
  bonus: number;
  equity: number;
  totalLabel?: string;
  totalHint?: string;
  onEdit?: () => void;
  editLabel?: string;
}) => {
  const breakdown = { base, bonus, equity };
  const chartData = SEGMENTS
    .map(segment => ({
      ...segment,
      value: breakdown[segment.key],
    }))
    .filter(segment => segment.value > 0);

  return (
    <div className="mt-2 space-y-4">
      {onEdit && (
        <EditNotice
          title="These pay inputs are editable"
          hint="Update base, bonus, or equity on this role anytime. The breakdown will refresh from your saved values."
          actionLabel={editLabel ?? 'Edit role'}
          onEdit={onEdit}
        />
      )}

      <div className="grid gap-5 md:grid-cols-[320px,1fr]">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
            {totalLabel ?? 'Total Annual Earnings'}
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{fmtMoney(total)}</div>
          <div className="mt-1 text-sm text-gray-500">{totalHint ?? 'Base salary + bonus + equity, annualized'}</div>

          <div className="mt-5 h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={240}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={3}
                    stroke="#ffffff"
                    strokeWidth={3}
                  >
                    {chartData.map(segment => (
                      <Cell key={segment.key} fill={segment.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) => fmtMoney(Number(value ?? 0))}
                    contentStyle={{
                      borderRadius: 14,
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-2xl border border-dashed border-gray-200 bg-white/80 flex items-center justify-center text-sm text-gray-400">
                No compensation data yet
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {SEGMENTS.map(segment => {
            const value = breakdown[segment.key];
            const pct = total > 0 ? (value / total) * 100 : 0;

            return (
              <div key={segment.key} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="text-sm font-semibold text-gray-800">{segment.label}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {value > 0 ? `${pct.toFixed(1)}% of total compensation` : 'Not included'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{fmtMoney(value)}</div>
                  </div>
                </div>
                <div className="mt-3 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: value > 0 ? `${Math.max(pct, 4)}%` : '0%',
                      backgroundColor: segment.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const HourlyBreakdown = ({
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
  openSchedulePhases,
  displayMode,
}: {
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
}) => {
  const [activeField, setActiveField] = useState<string | null>(null);
  const [savingInputs, setSavingInputs] = useState(false);
  const [draftHourlyRate, setDraftHourlyRate] = useState(toInputValue(hourlyRate));
  const [draftHoursPerDay, setDraftHoursPerDay] = useState(toInputValue(hoursPerDay));
  const [draftWorkingDaysPerWeek, setDraftWorkingDaysPerWeek] = useState(toInputValue(workingDaysPerWeek));
  const [draftTotalHoursWorked, setDraftTotalHoursWorked] = useState(toInputValue(totalHoursWorked ?? autoCalculatedHours));
  const [draftOvertimeHours, setDraftOvertimeHours] = useState(toInputValue(overtimeHours || null));
  const [draftOvertimeRate, setDraftOvertimeRate] = useState(toInputValue(overtimeRate));
  const [draftOvertimeMultiplier, setDraftOvertimeMultiplier] = useState(toInputValue(overtimeMultiplier || 1.5));
  const [draftTotalEarningsOverride, setDraftTotalEarningsOverride] = useState(toInputValue(totalEarningsOverride));
  const canEditHourlyInputs = Boolean(onSaveHourlyInputs);
  const hasAdvancedDefault = overtimeHours > 0 || totalEarningsOverride != null || overtimeRate != null || overtimeMultiplier !== 1.5;
  const [showOverrides, setShowOverrides] = useState(hasAdvancedDefault);
  const previousAutoHoursRef = useRef<number | null>(null);

  useEffect(() => {
    setDraftHourlyRate(toInputValue(hourlyRate));
    setDraftHoursPerDay(toInputValue(hoursPerDay));
    setDraftWorkingDaysPerWeek(toInputValue(workingDaysPerWeek));
    setDraftTotalHoursWorked(toInputValue(totalHoursWorked ?? autoCalculatedHours));
    setDraftOvertimeHours(toInputValue(overtimeHours || null));
    setDraftOvertimeRate(toInputValue(overtimeRate));
    setDraftOvertimeMultiplier(toInputValue(overtimeMultiplier || 1.5));
    setDraftTotalEarningsOverride(toInputValue(totalEarningsOverride));
  }, [hourlyRate, hoursPerDay, workingDaysPerWeek, totalHoursWorked, overtimeHours, overtimeRate, overtimeMultiplier, autoCalculatedHours, totalEarningsOverride]);

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
    const shouldAutofill = currentHours == null || currentHours === 0 || previousAutoHours == null || Math.abs(currentHours - previousAutoHours) < 0.01;

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
  }, [draftHourlyRate, draftHoursPerDay, draftOvertimeHours, draftOvertimeMultiplier, draftOvertimeRate, draftWorkingDaysPerWeek, draftTotalEarningsOverride, draftTotalHoursWorked, endDate, isCurrent, startDate]);

  const displayCalculationMode = liveSnapshot?.calculationMode ?? calculationMode;
  const displayHoursPerDay = isMultiPhase ? hoursPerDay : (liveSnapshot?.hoursPerDay ?? hoursPerDay);
  const displayWorkingDaysPerWeek = isMultiPhase ? workingDaysPerWeek : (liveSnapshot?.workingDaysPerWeek ?? workingDaysPerWeek);
  const displayEstimatedHours = isMultiPhase ? estimatedHours : (liveSnapshot?.estimatedHours ?? estimatedHours);
  const displayWeekdaysWorked = isMultiPhase ? weekdaysWorked : (liveSnapshot?.weekdaysWorked ?? weekdaysWorked);
  const displayAutoCalculatedHours = isMultiPhase ? autoCalculatedHours : (liveSnapshot?.autoCalculatedHours ?? autoCalculatedHours);
  const displayDateRangeLabel = isMultiPhase ? dateRangeLabel : (liveSnapshot?.dateRangeLabel ?? dateRangeLabel);
  const displayHourlyRate = isMultiPhase ? hourlyRate : (liveSnapshot?.hourlyRate ?? hourlyRate);
  const displayRegularPay = isMultiPhase ? regularPay : (liveSnapshot?.regularPay ?? regularPay);

  // Simplified and corrected live fields:
  const displayOvertimeHours = isMultiPhase ? overtimeHours : (liveSnapshot?.overtimeHours ?? overtimeHours);
  const displayOvertimeRate = isMultiPhase ? overtimeRate : (liveSnapshot?.overtimeRate ?? overtimeRate);
  const displayOvertimeMultiplier = isMultiPhase ? overtimeMultiplier : (liveSnapshot?.overtimeMultiplier ?? overtimeMultiplier);
  const displayEffectiveOvertimeRate = isMultiPhase ? effectiveOvertimeRate : (liveSnapshot?.effectiveOvertimeRate ?? effectiveOvertimeRate);
  const displayOvertimePay = isMultiPhase ? overtimePay : (liveSnapshot?.overtimePay ?? overtimePay);
  const displayTotalOverride = isMultiPhase ? totalEarningsOverride : (liveSnapshot?.totalEarningsOverride ?? totalEarningsOverride);
  const displayTotal = isMultiPhase ? total : (liveSnapshot?.total ?? total);
  const hasValidDraft = [
    toNullableNumber(draftHourlyRate),
    toNullableNumber(draftHoursPerDay),
    toNullableNumber(draftWorkingDaysPerWeek),
    toNullableNumber(draftTotalHoursWorked),
    toNullableNumber(draftOvertimeHours),
    toNullableNumber(draftOvertimeRate),
    toNullableNumber(draftOvertimeMultiplier),
    toNullableNumber(draftTotalEarningsOverride),
  ].some(value => value != null);
  const isDirty = !numbersMatch(toNullableNumber(draftHourlyRate), hourlyRate)
    || !numbersMatch(toNullableNumber(draftHoursPerDay), hoursPerDay)
    || !numbersMatch(toNullableNumber(draftWorkingDaysPerWeek), workingDaysPerWeek)
    || !numbersMatch(toNullableNumber(draftTotalHoursWorked), totalHoursWorked ?? autoCalculatedHours)
    || !numbersMatch(toNullableNumber(draftOvertimeHours), overtimeHours || null)
    || !numbersMatch(toNullableNumber(draftOvertimeRate), overtimeRate)
    || !numbersMatch(toNullableNumber(draftOvertimeMultiplier), overtimeMultiplier || 1.5)
    || !numbersMatch(toNullableNumber(draftTotalEarningsOverride), totalEarningsOverride);

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
  const totalHeading = totalLabel ?? (
    isManualTotal
      ? 'Custom Total Earnings'
      : displayCalculationMode === 'manual_hours'
        ? 'Total Earnings'
        : 'Estimated Total Earnings'
  );
  const totalHeadingHint = totalHint ?? (
    isManualTotal
      ? 'Using your direct total override for the final internship total.'
      : displayCalculationMode === 'manual_hours'
        ? 'Calculated from your saved hourly rate, total hours, and overtime inputs.'
        : 'Estimated from hourly rate, role dates, and your internship work schedule.'
  );
  const dateRangeHint = isCurrent
    ? 'Current roles are calculated through today'
    : 'Using the saved role start and end dates';
  const activeFieldLabel = getHourlyFieldLabel(activeField);
  const canRevealAdvancedOptions = canEditHourlyInputs || hasAdvancedDefault;
  const advancedOptionsCta = canEditHourlyInputs
    ? 'Edit Advanced Pay Options (Overtime & Totals)'
    : 'Show Advanced Pay Options';
  const isAggregateDisplay = displayMode === 'aggregate';

  return (
    <div className="mt-2 space-y-4">
      <div className={isAggregateDisplay ? 'grid gap-5' : 'grid gap-5 md:grid-cols-[320px,1fr]'}>
        <div className={`rounded-2xl border p-5 ${
          isManualTotal
            ? 'border-violet-100 bg-gradient-to-br from-violet-50 via-white to-blue-50'
            : 'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-blue-50'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                {totalHeading}
              </div>
              {activeField === 'total_earnings_override' ? (
                <div className="mt-2 mb-2 max-w-[220px]">
                  <InlineNumberInput
                    value={draftTotalEarningsOverride}
                    onChange={setDraftTotalEarningsOverride}
                    prefix="$"
                    step={0.01}
                    placeholder="Custom total"
                    autoFocus
                  />
                  <div className="mt-1 text-[11px] font-semibold text-blue-600 uppercase tracking-widest">Editing Total Override</div>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-3 mb-1">
                  <div className="text-3xl font-bold text-gray-900">{fmtMoney(displayTotal)}</div>
                  {onSaveHourlyInputs && (
                    <button
                      type="button"
                      onClick={() => setActiveField('total_earnings_override')}
                      className="text-[10px] font-semibold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest bg-white border border-gray-200 hover:border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded-md shadow-sm"
                    >
                      Override
                    </button>
                  )}
                </div>
              )}
              <div className="mt-1 text-sm text-gray-500 leading-relaxed">{totalHeadingHint}</div>
            </div>
            {onSaveHourlyInputs && (
              <div className="flex items-center gap-2">
                <Button size="small" onClick={handleCancelEditing} disabled={!isDirty}>
                  Reset
                </Button>
                <Button
                  size="small"
                  type="primary"
                  onClick={handleSaveInputs}
                  loading={savingInputs}
                  disabled={!isDirty || !hasValidDraft}
                >
                  Save
                </Button>
              </div>
            )}
          </div>

          {!isAggregateDisplay && (
            <div className={`mt-4 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
              isManualTotal
                ? 'border-violet-200 bg-violet-50 text-violet-700'
                : displayCalculationMode === 'manual_hours'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}>
              {isManualTotal
                ? 'Direct total override'
                : displayCalculationMode === 'manual_hours'
                  ? 'Manual hours override'
                  : 'Auto date-based estimate'}
            </div>
          )}

          {onSaveHourlyInputs && (
            <div className="mt-4 text-sm text-gray-500 leading-relaxed">
              {activeFieldLabel
                ? `Editing ${activeFieldLabel}. Save to keep the change, or Reset to go back to the saved value.`
                : 'Click any editable card to update the saved internship inputs inline.'}
            </div>
          )}

          {!isManualTotal && !isAggregateDisplay && (
            <div className="mt-5 rounded-2xl border border-white bg-white/85 px-4 py-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Calculation</div>
              <div className="mt-2 text-xl font-bold text-gray-900">
                {fmtNumber(displayEstimatedHours)} hrs
                <span className="mx-2 text-gray-300">×</span>
                {fmtMoney(displayHourlyRate)}/hr
              </div>
              {displayOvertimeHours > 0 && (
                <div className="mt-2 text-sm font-semibold text-gray-700">
                  + {fmtNumber(displayOvertimeHours)} OT hrs
                  <span className="mx-2 text-gray-300">×</span>
                  {fmtMoney(displayEffectiveOvertimeRate)}/hr
                </div>
              )}
              <div className="mt-2 text-sm text-gray-500">
                {displayCalculationMode === 'manual_hours'
                  ? 'Using the total hours you saved on this role.'
                  : 'Auto-estimated from your role dates, excluding weekends.'}
              </div>
              <div className="mt-4 text-xs font-medium text-gray-500">
                Regular pay {fmtMoney(displayRegularPay)}
                {displayOvertimeHours > 0 ? ` + Overtime pay ${fmtMoney(displayOvertimePay)}` : ''}
              </div>
            </div>
          )}

          {/* Donut chart: Regular vs OT pay */}
          {!isManualTotal && displayTotal > 0 && (() => {
            const chartData = [
              { name: 'Regular Pay', value: displayRegularPay, color: '#2563eb' },
              ...(displayOvertimePay > 0 ? [{ name: 'Overtime Pay', value: displayOvertimePay, color: '#f59e0b' }] : []),
            ];
            return (
              <div className="mt-5 h-52">
                <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={208}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={90}
                      paddingAngle={chartData.length > 1 ? 3 : 0}
                      stroke="#ffffff"
                      strokeWidth={3}
                    >
                      {chartData.map(entry => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value) => fmtMoney(Number(value ?? 0))}
                      contentStyle={{
                        borderRadius: 14,
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            );
          })()}

          {/* Pay breakdown bars */}
          {!isManualTotal && displayTotal > 0 && (
            <div className="mt-4 space-y-2.5">
              {[
                { label: 'Regular Pay', value: displayRegularPay, color: '#2563eb', show: true },
                { label: 'Overtime Pay', value: displayOvertimePay, color: '#f59e0b', show: displayOvertimePay > 0 },
              ].filter(s => s.show).map(segment => {
                const pct = displayTotal > 0 ? (segment.value / displayTotal) * 100 : 0;
                return (
                  <div key={segment.label} className="rounded-xl border border-gray-100 bg-white/90 px-3 py-2.5 shadow-sm">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
                        {segment.label}
                      </div>
                      <span className="text-sm font-bold text-gray-900">{fmtMoney(segment.value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: segment.color }}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-gray-400">{pct.toFixed(1)}% of total</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!isAggregateDisplay && (
          <div className="space-y-3">
            {isMultiPhase ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 mt-4 space-y-3">
                <h3 className="text-sm font-semibold text-emerald-900">Multi-Phase Schedule Active</h3>
                <p className="text-sm text-emerald-700 leading-relaxed">
                  The compensation for this role is being calculated across multiple schedule phases. 
                  Inline editing of hours and rates is disabled to protect your complex schedule tracking.
                </p>
                {openSchedulePhases && (
                  <Button 
                    type="primary" 
                    className="bg-emerald-600 hover:!bg-emerald-500 mt-2" 
                    onClick={openSchedulePhases}
                  >
                    Manage Schedule Phases
                  </Button>
                )}
              </div>
            ) : (
              <>
                {openSchedulePhases && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
                    <div>
                      <div className="text-sm font-semibold text-emerald-900">Need a multi-phase schedule?</div>
                      <div className="mt-1 text-sm text-emerald-700 leading-relaxed">
                        Split this internship into phases when your dates, pay rate, or weekly schedule changed over time.
                      </div>
                    </div>
                    <Button
                      className="border-emerald-200 text-emerald-700 hover:!border-emerald-300 hover:!text-emerald-800"
                      onClick={openSchedulePhases}
                    >
                      Set Up Multi-Phase Schedule
                    </Button>
                  </div>
                )}

                <MetricSection title="Work Inputs">
                  <EditableMetricRow
                    label="Hourly Rate"
                    value={`${fmtMoney(displayHourlyRate)}/hr`}
                    editing={activeField === 'hourly_rate'}
                    onActivate={onSaveHourlyInputs ? () => setActiveField('hourly_rate') : undefined}
                  >
                    <InlineNumberInput
                      value={draftHourlyRate}
                      onChange={setDraftHourlyRate}
                      prefix="$"
                      suffix="/hr"
                      step={0.01}
                      autoFocus
                    />
                  </EditableMetricRow>

                  <MetricRow
                    label="Date Range"
                    value={displayDateRangeLabel}
                    hint={dateRangeHint}
                  />

                  <MetricRow
                    label="Weekdays in Range"
                    value={`${fmtNumber(displayWeekdaysWorked)} days`}
                  />

                  <EditableMetricRow
                    label="Hours per Day"
                    value={`${fmtNumber(displayHoursPerDay)} hrs`}
                    editing={activeField === 'hours_per_day'}
                    onActivate={onSaveHourlyInputs ? () => setActiveField('hours_per_day') : undefined}
                  >
                    <InlineNumberInput
                      value={draftHoursPerDay}
                      onChange={setDraftHoursPerDay}
                      suffix="hrs"
                      step={0.25}
                      autoFocus
                    />
                  </EditableMetricRow>

                  <EditableMetricRow
                    label="Working Days per Week"
                    value={`${fmtNumber(displayWorkingDaysPerWeek)} days`}
                    editing={activeField === 'working_days_per_week'}
                    onActivate={onSaveHourlyInputs ? () => setActiveField('working_days_per_week') : undefined}
                  >
                    <InlineNumberInput
                      value={draftWorkingDaysPerWeek}
                      onChange={setDraftWorkingDaysPerWeek}
                      suffix="days"
                      step={0.5}
                      autoFocus
                    />
                  </EditableMetricRow>

                  <EditableMetricRow
                    label="Total Hours Worked"
                    value={`${fmtNumber(displayEstimatedHours)} hrs`}
                    hint={displayCalculationMode === 'manual_hours'
                      ? `Manual override saved. Auto-fill: ${fmtNumber(liveWorkSummary?.autoCalculatedHours ?? autoCalculatedHours)} hrs.`
                      : `Auto-filled. Overridable.`}
                    editing={activeField === 'total_hours_worked'}
                    onActivate={onSaveHourlyInputs ? () => setActiveField('total_hours_worked') : undefined}
                  >
                    <InlineNumberInput
                      value={draftTotalHoursWorked}
                      onChange={setDraftTotalHoursWorked}
                      suffix="hrs"
                      step={0.25}
                      autoFocus
                    />
                  </EditableMetricRow>
                </MetricSection>
              </>
            )}

            {!showOverrides ? (
              canRevealAdvancedOptions ? (
                <Button type="dashed" block className="h-10 text-gray-400 hover:text-gray-600 border-gray-200" onClick={() => setShowOverrides(true)}>
                  {advancedOptionsCta}
                </Button>
              ) : null
            ) : (
              <MetricSection title="Advanced Pay Options">
                <EditableMetricRow
                  label="Overtime Hours"
                  value={`${fmtNumber(displayOvertimeHours)} hrs`}
                  editing={activeField === 'overtime_hours'}
                  onActivate={onSaveHourlyInputs ? () => setActiveField('overtime_hours') : undefined}
                >
                  <InlineNumberInput
                    value={draftOvertimeHours}
                    onChange={setDraftOvertimeHours}
                    suffix="hrs"
                    step={0.25}
                    autoFocus
                  />
                </EditableMetricRow>

                <EditableMetricRow
                  label="Overtime Rate"
                  value={`${fmtMoney(displayOvertimeRate ?? displayEffectiveOvertimeRate)}/hr`}
                  hint={displayOvertimeRate != null
                    ? `Custom OT rate saved. Overtime pay: ${fmtMoney(displayOvertimePay)}`
                    : `Blank uses ${fmtNumber(displayOvertimeMultiplier)}x base rate. Overtime pay: ${fmtMoney(displayOvertimePay)}`}
                  editing={activeField === 'overtime_rate'}
                  onActivate={onSaveHourlyInputs ? () => setActiveField('overtime_rate') : undefined}
                >
                  <InlineNumberInput
                    value={draftOvertimeRate}
                    onChange={setDraftOvertimeRate}
                    prefix="$"
                    suffix="/hr"
                    step={0.01}
                    placeholder="Optional custom OT rate"
                    autoFocus
                  />
                </EditableMetricRow>

                <EditableMetricRow
                  label="OT Multiplier"
                  value={`${fmtNumber(displayOvertimeMultiplier)}x`}
                  editing={activeField === 'overtime_multiplier'}
                  onActivate={onSaveHourlyInputs ? () => setActiveField('overtime_multiplier') : undefined}
                >
                  <InlineNumberInput
                    value={draftOvertimeMultiplier}
                    onChange={setDraftOvertimeMultiplier}
                    suffix="x"
                    step={0.05}
                    autoFocus
                  />
                </EditableMetricRow>

                <div className="flex justify-end pt-2 pr-1 pb-1">
                  <Button 
                    type="text" 
                    size="small" 
                    className="text-gray-400 hover:text-gray-600 mb-1" 
                    onClick={() => setShowOverrides(false)}
                  >
                    Hide Advanced Options
                  </Button>
                </div>
              </MetricSection>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const EditNotice = ({
  title,
  hint,
  actionLabel,
  onEdit,
}: {
  title: string;
  hint: string;
  actionLabel: string;
  onEdit: () => void;
}) => (
  <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="mt-1 text-sm text-gray-500 leading-relaxed">{hint}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
      >
        {actionLabel}
      </button>
    </div>
  </div>
);

const InlineNumberInput = ({
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  placeholder?: string;
  autoFocus?: boolean;
}) => (
  <Input
    value={value}
    onChange={(event) => onChange(event.target.value)}
    onClick={(event) => event.stopPropagation()}
    onFocus={(event) => event.currentTarget.select()}
    prefix={prefix}
    suffix={suffix}
    type="text"
    inputMode="decimal"
    placeholder={placeholder}
    autoFocus={autoFocus}
    size="large"
  />
);

const MetricSection = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
    <div className="pb-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">{title}</div>
      {hint && <div className="mt-1 text-sm text-gray-500">{hint}</div>}
    </div>
    <div className="divide-y divide-gray-100">{children}</div>
  </div>
);

const EditableMetricRow = ({
  label,
  value,
  hint,
  editing,
  onActivate,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  editing: boolean;
  onActivate?: () => void;
  children: React.ReactNode;
}) => {
  if (!onActivate) {
    return <MetricRow label={label} value={value} hint={hint} />;
  }

  if (editing) {
    return (
      <div className="py-2.5 first:pt-0 last:pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-2 -mx-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">{label}</div>
              <div className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 uppercase tracking-widest">Editing</div>
            </div>
            {hint && <div className="mt-1 text-sm text-gray-500 leading-relaxed">{hint}</div>}
          </div>
          <div className="sm:w-64 mt-2 sm:mt-0">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onActivate}
      className="group w-full py-2.5 text-left transition-colors hover:bg-gray-50/70 outline-none px-2 -mx-2 rounded-lg"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 group-hover:text-gray-600 transition-colors">{label}</div>
          {hint && <div className="mt-0.5 text-[13px] text-gray-400 leading-relaxed">{hint}</div>}
        </div>
        <div className="shrink-0 flex items-center gap-3 text-left sm:text-right mt-1 sm:mt-0">
          <div className="text-[15px] font-bold text-gray-800">{value}</div>
          <div className="text-[10px] font-semibold text-gray-400 group-hover:text-blue-600 transition-colors uppercase tracking-widest bg-gray-50 px-1.5 py-0.5 rounded group-hover:bg-blue-50">Edit</div>
        </div>
      </div>
    </button>
  );
};

const MetricRow = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="py-2.5 px-2 -mx-2 first:pt-0 last:pb-0">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">{label}</div>
        {hint && <div className="mt-0.5 text-[13px] text-gray-400 leading-relaxed">{hint}</div>}
      </div>
      <div className="shrink-0 text-left sm:text-right mt-1 sm:mt-0 items-center flex">
        <div className="text-[15px] font-bold text-gray-700">{value}</div>
      </div>
    </div>
  </div>
);

const SummaryPill = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2">
    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{label}</div>
    <div className="mt-1 text-sm font-bold text-gray-900">{value}</div>
  </div>
);

export default CompensationBreakdownModal;
