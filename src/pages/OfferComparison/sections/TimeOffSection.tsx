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
}: TimeOffSectionProps) => {
  const showSeparateSickLeave = !isUnlimitedPto || !sickLeaveIncludedInUnlimitedPto;

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
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-3">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <input
              type="checkbox"
              checked={isUnlimitedPto}
              onChange={(e) => onIsUnlimitedPtoChange(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Unlimited PTO
          </label>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Use this for offers with flexible or untracked vacation instead of a fixed PTO bank.
          </p>
          {isUnlimitedPto && onSickLeaveIncludedInUnlimitedPtoChange && (
            <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={!sickLeaveIncludedInUnlimitedPto}
                onChange={(e) => onSickLeaveIncludedInUnlimitedPtoChange(!e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Separate sick leave policy
            </label>
          )}
          {isUnlimitedPto && sickLeaveIncludedInUnlimitedPto && (
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Sick leave is included and is not counted again.
            </p>
          )}
        </div>
      )}
      {typeof ptoDays === 'number' && onPtoDaysChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PTO Days</label>
          <input
            type="number"
            min={0}
            value={ptoDays}
            onChange={(e) => onPtoDaysChange(Math.max(0, Number(e.target.value) || 0))}
            disabled={isUnlimitedPto}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${
              isUnlimitedPto
                ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                : 'border-gray-300'
            }`}
          />
          {isUnlimitedPto && (
            <p className="mt-1 text-xs text-gray-500">Ignored while unlimited PTO is enabled.</p>
          )}
        </div>
      )}
      {showSeparateSickLeave && typeof sickLeaveDays === 'number' && onSickLeaveDaysChange && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Sick Leave Days</label>
          <input
            type="number"
            min={0}
            value={sickLeaveDays}
            onChange={(e) => onSickLeaveDaysChange(Math.max(0, Number(e.target.value) || 0))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">Paid sick days, separate from PTO.</p>
        </div>
      )}
      {typeof holidayDays === 'number' && onHolidayDaysChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Days</label>
          <input
            type="number"
            min={0}
            value={holidayDays}
            onChange={(e) => onHolidayDaysChange(Math.max(0, Number(e.target.value) || 0))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      )}
    </div>
  );
};

export default TimeOffSection;
