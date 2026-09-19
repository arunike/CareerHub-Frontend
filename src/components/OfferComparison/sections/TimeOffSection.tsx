import UnitNumberInput from '../../inputs/UnitNumberInput';
import HelpTooltipTrigger from '../../feedback/HelpTooltipTrigger';
import { DEFAULT_UNLIMITED_PTO_DAYS } from '../../../utils/OfferComparison/decisionScoring';
type TimeOffSectionProps = {
  ptoDays?: number;
  onPtoDaysChange?: (value: number) => void;
  isUnlimitedPto?: boolean;
  onIsUnlimitedPtoChange?: (value: boolean) => void;
  sickLeaveDays?: number;
  onSickLeaveDaysChange?: (value: number) => void;
  sickLeaveIncludedInUnlimitedPto?: boolean;
  onSickLeaveIncludedInUnlimitedPtoChange?: (value: boolean) => void;
  holidayDays?: number;
  onHolidayDaysChange?: (value: number) => void;
  unlimitedPtoPlanningDays?: number;
  onUnlimitedPtoPlanningDaysChange?: (value: number) => void;
};

const TimeOffSection = ({
  ptoDays,
  onPtoDaysChange,
  isUnlimitedPto = false,
  onIsUnlimitedPtoChange,
  sickLeaveDays,
  onSickLeaveDaysChange,
  sickLeaveIncludedInUnlimitedPto = true,
  onSickLeaveIncludedInUnlimitedPtoChange,
  holidayDays,
  onHolidayDaysChange,
  unlimitedPtoPlanningDays,
  onUnlimitedPtoPlanningDaysChange,
}: TimeOffSectionProps) => {
  const showSeparateSickLeave = !isUnlimitedPto || !sickLeaveIncludedInUnlimitedPto;
  const planningMode = isUnlimitedPto && Boolean(onUnlimitedPtoPlanningDaysChange);

  if (
    !(
      (typeof ptoDays === 'number' && onPtoDaysChange) ||
      (typeof sickLeaveDays === 'number' && onSickLeaveDaysChange) ||
      (typeof holidayDays === 'number' && onHolidayDaysChange)
    )
  ) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {onIsUnlimitedPtoChange && (
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 p-4 md:col-span-3">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-ink-50">
            <input
              type="checkbox"
              checked={isUnlimitedPto}
              onChange={(e) => onIsUnlimitedPtoChange(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-white/[0.12] text-blue-600 dark:text-blue-300 focus:ring-blue-500"
            />
            Unlimited PTO
          </label>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-ink-200">
            Use this for offers with flexible or untracked vacation instead of a fixed PTO bank.
          </p>
          {isUnlimitedPto && onSickLeaveIncludedInUnlimitedPtoChange && (
            <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-ink-100">
              <input
                type="checkbox"
                checked={!sickLeaveIncludedInUnlimitedPto}
                onChange={(e) => onSickLeaveIncludedInUnlimitedPtoChange(!e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 dark:border-white/[0.12] text-blue-600 dark:text-blue-300 focus:ring-blue-500"
              />
              Separate sick leave policy
            </label>
          )}
          {isUnlimitedPto && sickLeaveIncludedInUnlimitedPto && (
            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-ink-200">
              Sick leave is included and is not counted again.
            </p>
          )}
        </div>
      )}
      {typeof ptoDays === 'number' && onPtoDaysChange && (
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-ink-100">
              {planningMode ? "PTO Days you'd take" : 'PTO Days'}
            </label>
            {planningMode && (
              <HelpTooltipTrigger
                ariaLabel="How unlimited PTO is scored"
                title="Unlimited is scored on the days you would really book, not on what the policy allows. Put in the number you would actually take."
              />
            )}
          </div>
          <UnitNumberInput
            unit="days"
            min={0}
            max={planningMode ? 60 : undefined}
            value={
              planningMode
                ? (unlimitedPtoPlanningDays ?? DEFAULT_UNLIMITED_PTO_DAYS)
                : ptoDays || null
            }
            placeholder={planningMode ? String(DEFAULT_UNLIMITED_PTO_DAYS) : '0'}
            onChange={(value) =>
              planningMode
                ? onUnlimitedPtoPlanningDaysChange?.(value ?? DEFAULT_UNLIMITED_PTO_DAYS)
                : onPtoDaysChange(value ?? 0)
            }
          />
        </div>
      )}
      {showSeparateSickLeave && typeof sickLeaveDays === 'number' && onSickLeaveDaysChange && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-ink-100">
            Sick Leave Days
          </label>
          <UnitNumberInput
            unit="days"
            min={0}
            value={sickLeaveDays || null}
            placeholder="0"
            onChange={(value) => onSickLeaveDaysChange(value ?? 0)}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-ink-400">
            Paid sick days, separate from PTO.
          </p>
        </div>
      )}
      {typeof holidayDays === 'number' && onHolidayDaysChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1">
            Holiday Days
          </label>
          <UnitNumberInput
            unit="days"
            min={0}
            value={holidayDays || null}
            placeholder="0"
            onChange={(value) => onHolidayDaysChange(value ?? 0)}
          />
        </div>
      )}
    </div>
  );
};

export default TimeOffSection;
