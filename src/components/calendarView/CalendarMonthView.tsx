import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import clsx from 'clsx';
import { CalendarCompactDayEntries } from './CalendarDayContent';
import type { GetDayData } from './types';
import { WEEKDAY_LABELS } from './types';

type Props = {
  anchorDate: Date;
  today: Date;
  selectedDate: Date;
  onDateSelect: (day: Date) => void;
  getDayData: GetDayData;
};

const CalendarMonthView = ({ anchorDate, today, selectedDate, onDateSelect, getDayData }: Props) => {
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const rows = [];
  let days = [];
  let day = gridStart;

  while (day <= gridEnd) {
    for (let index = 0; index < 7; index++) {
      const cloneDay = day;
      const dayData = getDayData(cloneDay);
      const isTodayDate = isSameDay(cloneDay, today);
      const isSelected = isSameDay(cloneDay, selectedDate);
      const isCurrentMonth = isSameMonth(cloneDay, monthStart);

      days.push(
        <div
          key={cloneDay.toString()}
          className={clsx(
            'relative h-28 md:h-32 border border-gray-100 p-2 transition-all hover:bg-gray-50 flex flex-col gap-1 cursor-pointer',
            !isCurrentMonth && 'bg-gray-50/50 text-gray-400',
            isTodayDate && 'bg-blue-50/30',
            isSelected && 'ring-2 ring-blue-500 ring-inset z-10 rounded-lg'
          )}
          onClick={() => onDateSelect(cloneDay)}
        >
          <div className="flex justify-between items-start">
            <span
              className={clsx(
                'text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full',
                isTodayDate ? 'bg-blue-600 text-white' : 'text-gray-700'
              )}
            >
              {format(cloneDay, 'd')}
            </span>
          </div>

          <CalendarCompactDayEntries dayData={dayData} />
        </div>
      );
      day = addDays(day, 1);
    }

    rows.push(
      <div className="grid grid-cols-7" key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  return (
    <>
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAY_LABELS.map((label) => (
          <div className="text-center font-medium text-gray-400 text-xs py-2" key={label}>
            {label}
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {rows}
      </div>
    </>
  );
};

export default CalendarMonthView;
