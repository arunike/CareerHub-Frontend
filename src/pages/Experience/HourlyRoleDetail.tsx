import { Button } from 'antd';
import { fmtMoney, fmtNumber } from './compensationBreakdownFormat';
import { EditableMetricRow, InlineNumberInput, MetricRow, MetricSection } from './breakdownRows';

import type { useHourlyBreakdownState } from './useHourlyBreakdownState';
import type { HourlyInputUpdate } from './compensationBreakdownFormat';

type Props = {
  state: ReturnType<typeof useHourlyBreakdownState>;
  autoCalculatedHours: number;
  isMultiPhase?: boolean;
  onSaveHourlyInputs?: (values: HourlyInputUpdate) => Promise<void>;
  openSchedulePhases?: () => void;
};

const HourlyRoleDetail = ({
  state,
  autoCalculatedHours,
  isMultiPhase,
  onSaveHourlyInputs,
  openSchedulePhases,
}: Props) => {
  const {
    activeField,
    advancedOptionsCta,
    canRevealAdvancedOptions,
    dateRangeHint,
    displayCalculationMode,
    displayDateRangeLabel,
    displayEffectiveOvertimeRate,
    displayEstimatedHours,
    displayHourlyRate,
    displayHoursPerDay,
    displayOvertimeHours,
    displayOvertimeMultiplier,
    displayOvertimePay,
    displayOvertimeRate,
    displayWeekdaysWorked,
    displayWorkingDaysPerWeek,
    draftHourlyRate,
    draftHoursPerDay,
    draftOvertimeHours,
    draftOvertimeMultiplier,
    draftOvertimeRate,
    draftTotalHoursWorked,
    draftWorkingDaysPerWeek,
    liveWorkSummary,
    setActiveField,
    setDraftHourlyRate,
    setDraftHoursPerDay,
    setDraftOvertimeHours,
    setDraftOvertimeMultiplier,
    setDraftOvertimeRate,
    setDraftTotalHoursWorked,
    setDraftWorkingDaysPerWeek,
    setShowOverrides,
    showOverrides,
  } = state;

  return (
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
                <div className="text-sm font-semibold text-emerald-900">
                  Need a multi-phase schedule?
                </div>
                <div className="mt-1 text-sm text-emerald-700 leading-relaxed">
                  Split this internship into phases when your dates, pay rate, or weekly schedule
                  changed over time.
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
                unit="$/hr"
                step={0.01}
                autoFocus
              />
            </EditableMetricRow>

            <MetricRow label="Date Range" value={displayDateRangeLabel} hint={dateRangeHint} />

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
                unit="hrs"
                step={0.25}
                autoFocus
              />
            </EditableMetricRow>

            <EditableMetricRow
              label="Working Days per Week"
              value={`${fmtNumber(displayWorkingDaysPerWeek)} days`}
              editing={activeField === 'working_days_per_week'}
              onActivate={
                onSaveHourlyInputs ? () => setActiveField('working_days_per_week') : undefined
              }
            >
              <InlineNumberInput
                value={draftWorkingDaysPerWeek}
                onChange={setDraftWorkingDaysPerWeek}
                unit="days"
                step={0.5}
                autoFocus
              />
            </EditableMetricRow>

            <EditableMetricRow
              label="Total Hours Worked"
              value={`${fmtNumber(displayEstimatedHours)} hrs`}
              hint={
                displayCalculationMode === 'manual_hours'
                  ? `Manual override saved. Auto-fill: ${fmtNumber(liveWorkSummary?.autoCalculatedHours ?? autoCalculatedHours)} hrs.`
                  : `Auto-filled. Overridable.`
              }
              editing={activeField === 'total_hours_worked'}
              onActivate={
                onSaveHourlyInputs ? () => setActiveField('total_hours_worked') : undefined
              }
            >
              <InlineNumberInput
                value={draftTotalHoursWorked}
                onChange={setDraftTotalHoursWorked}
                unit="hrs"
                step={0.25}
                autoFocus
              />
            </EditableMetricRow>
          </MetricSection>
        </>
      )}

      {!showOverrides ? (
        canRevealAdvancedOptions ? (
          <Button
            type="dashed"
            block
            className="h-10 text-gray-400 hover:text-gray-600 border-gray-200"
            onClick={() => setShowOverrides(true)}
          >
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
              unit="hrs"
              step={0.25}
              autoFocus
            />
          </EditableMetricRow>

          <EditableMetricRow
            label="Overtime Rate"
            value={`${fmtMoney(displayOvertimeRate ?? displayEffectiveOvertimeRate)}/hr`}
            hint={
              displayOvertimeRate != null
                ? `Custom OT rate saved. Overtime pay: ${fmtMoney(displayOvertimePay)}`
                : `Blank uses ${fmtNumber(displayOvertimeMultiplier)}x base rate. Overtime pay: ${fmtMoney(displayOvertimePay)}`
            }
            editing={activeField === 'overtime_rate'}
            onActivate={onSaveHourlyInputs ? () => setActiveField('overtime_rate') : undefined}
          >
            <InlineNumberInput
              value={draftOvertimeRate}
              onChange={setDraftOvertimeRate}
              unit="$/hr"
              step={0.01}
              placeholder="Optional custom OT rate"
              autoFocus
            />
          </EditableMetricRow>

          <EditableMetricRow
            label="OT Multiplier"
            value={`${fmtNumber(displayOvertimeMultiplier)}x`}
            editing={activeField === 'overtime_multiplier'}
            onActivate={
              onSaveHourlyInputs ? () => setActiveField('overtime_multiplier') : undefined
            }
          >
            <InlineNumberInput
              value={draftOvertimeMultiplier}
              onChange={setDraftOvertimeMultiplier}
              unit="×"
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
  );
};

export default HourlyRoleDetail;
