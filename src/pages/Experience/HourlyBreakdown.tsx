import { Button } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { fmtMoney, fmtNumber } from './compensationBreakdownFormat';
import type { HourlyInputUpdate } from './compensationBreakdownFormat';
import { InlineNumberInput } from './breakdownRows';
import { useHourlyBreakdownState } from './useHourlyBreakdownState';
import HourlyRoleDetail from './HourlyRoleDetail';

export const HourlyBreakdown = ({
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
  const state = useHourlyBreakdownState({
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
  });
  const {
    activeField,
    setActiveField,
    savingInputs,
    draftTotalEarningsOverride,
    setDraftTotalEarningsOverride,
    isAggregateDisplay,
    displayCalculationMode,
    displayEstimatedHours,
    displayHourlyRate,
    displayRegularPay,
    displayOvertimeHours,
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
    activeFieldLabel,
  } = state;

  return (
    <div className="mt-2 space-y-4">
      <div className={isAggregateDisplay ? 'grid gap-5' : 'grid gap-5 md:grid-cols-[320px,1fr]'}>
        <div
          className={`rounded-2xl border p-5 ${
            isManualTotal
              ? 'border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-50'
              : 'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-blue-50'
          }`}
        >
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
                    unit="$"
                    step={0.01}
                    placeholder="Custom total"
                    autoFocus
                  />
                  <div className="mt-1 text-[11px] font-semibold text-blue-600 uppercase tracking-widest">
                    Editing Total Override
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-3 mb-1">
                  <div className="text-3xl font-bold text-gray-900">{fmtMoney(displayTotal)}</div>
                  {onSaveHourlyInputs && (
                    <button
                      type="button"
                      onClick={() => setActiveField('total_earnings_override')}
                      className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 sm:min-h-9"
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
            <div
              className={`mt-4 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                isManualTotal
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : displayCalculationMode === 'manual_hours'
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
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
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                Calculation
              </div>
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
          {!isManualTotal &&
            displayTotal > 0 &&
            (() => {
              const chartData = [
                { name: 'Regular Pay', value: displayRegularPay, color: '#2563eb' },
                ...(displayOvertimePay > 0
                  ? [{ name: 'Overtime Pay', value: displayOvertimePay, color: '#f59e0b' }]
                  : []),
              ];
              return (
                <div className="mt-5 h-52">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={240}
                    minHeight={208}
                    initialDimension={{ width: 240, height: 208 }}
                  >
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
                        {chartData.map((entry) => (
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
                {
                  label: 'Overtime Pay',
                  value: displayOvertimePay,
                  color: '#f59e0b',
                  show: displayOvertimePay > 0,
                },
              ]
                .filter((s) => s.show)
                .map((segment) => {
                  const pct = displayTotal > 0 ? (segment.value / displayTotal) * 100 : 0;
                  return (
                    <div
                      key={segment.label}
                      className="rounded-xl border border-gray-100 bg-white/90 px-3 py-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: segment.color }}
                          />
                          {segment.label}
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {fmtMoney(segment.value)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: segment.color }}
                        />
                      </div>
                      <div className="mt-1 text-[10px] text-gray-400">
                        {pct.toFixed(1)}% of total
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {!isAggregateDisplay && (
          <HourlyRoleDetail
            state={state}
            autoCalculatedHours={autoCalculatedHours}
            isMultiPhase={isMultiPhase}
            onSaveHourlyInputs={onSaveHourlyInputs}
            openSchedulePhases={openSchedulePhases}
          />
        )}
      </div>
    </div>
  );
};
