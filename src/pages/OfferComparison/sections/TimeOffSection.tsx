type TimeOffSectionProps = {
  ptoDays?: number;
  onPtoDaysChange?: (value: number) => void;
  holidayDays?: number;
  onHolidayDaysChange?: (value: number) => void;
};

const TimeOffSection = ({ ptoDays, onPtoDaysChange, holidayDays, onHolidayDaysChange }: TimeOffSectionProps) => {
  if (!((typeof ptoDays === 'number' && onPtoDaysChange) || (typeof holidayDays === 'number' && onHolidayDaysChange))) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {typeof ptoDays === 'number' && onPtoDaysChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PTO Days</label>
          <input
            type="number"
            value={ptoDays}
            onChange={(e) => onPtoDaysChange(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
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
