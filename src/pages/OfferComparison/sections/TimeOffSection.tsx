type TimeOffSectionProps = {
  ptoDays?: number;
  onPtoDaysChange?: (value: number) => void;
  isUnlimitedPto?: boolean;
  onIsUnlimitedPtoChange?: (value: boolean) => void;
  holidayDays?: number;
  onHolidayDaysChange?: (value: number) => void;
};

const TimeOffSection = ({
  ptoDays,
  onPtoDaysChange,
  isUnlimitedPto = false,
  onIsUnlimitedPtoChange,
  holidayDays,
  onHolidayDaysChange,
}: TimeOffSectionProps) => {
  if (
    !(
      (typeof ptoDays === 'number' && onPtoDaysChange) ||
      (typeof holidayDays === 'number' && onHolidayDaysChange)
    )
  ) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {onIsUnlimitedPtoChange && (
        <div className="md:col-span-2 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
            <input
              type="checkbox"
              checked={isUnlimitedPto}
              onChange={(e) => onIsUnlimitedPtoChange(e.target.checked)}
              className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
            />
            Unlimited PTO
          </label>
          <p className="mt-1 text-xs text-emerald-700/80">
            Use this for offers with flexible or untracked vacation instead of a fixed PTO bank.
          </p>
        </div>
      )}
      {typeof ptoDays === 'number' && onPtoDaysChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PTO Days</label>
          <input
            type="number"
            value={ptoDays}
            onChange={(e) => onPtoDaysChange(Number(e.target.value) || 0)}
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
      {typeof holidayDays === 'number' && onHolidayDaysChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Days</label>
          <input
            type="number"
            value={holidayDays}
            onChange={(e) => onHolidayDaysChange(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      )}
    </div>
  );
};

export default TimeOffSection;
