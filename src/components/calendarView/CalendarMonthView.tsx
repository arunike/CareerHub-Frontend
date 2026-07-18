import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import clsx from 'clsx';
import { CalendarCompactDayEntries, CalendarMobileDaySummary } from './CalendarDayContent';
import type { Event, Holiday } from '../../types';
import type { GetDayData } from './types';
import { WEEKDAY_LABELS } from './types';

type Props = {
  anchorDate: Date;
  today: Date;
  selectedDate: Date;
  onDateSelect: (day: Date) => void;
  onDateDoubleClick?: (day: Date) => void;
  onViewMore?: (day: Date) => void;
  onEventSelect?: (event: Event) => void;
  onHolidaySelect?: (holiday: Holiday) => void;
  getDayData: GetDayData;
};

const CalendarMonthView = ({
  anchorDate,
  today,
  selectedDate,
  onDateSelect,
  onDateDoubleClick,
  onViewMore,
  onEventSelect,
  onHolidaySelect,
  getDayData,
}: Props) => {
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
            'relative flex h-18 cursor-pointer flex-col gap-1 border border-gray-100 p-1 transition-all hover:bg-gray-50 sm:h-28 sm:p-2 md:h-32',
            !isCurrentMonth && 'bg-gray-50/50 text-gray-400',
            isTodayDate && 'bg-blue-50/30',
            isSelected && 'ring-2 ring-blue-500 ring-inset z-10 rounded-lg'
          )}
          onClick={() => onDateSelect(cloneDay)}
          onDoubleClick={() => onDateDoubleClick?.(cloneDay)}
        >
          <div className="flex justify-between items-start">
            <button
              type="button"
              aria-label={format(cloneDay, 'MMMM d, yyyy')}
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                onDateSelect(cloneDay);
              }}
              className={clsx(
                'flex h-11 w-11 items-center justify-center rounded-full text-xs font-medium transition-colors hover:bg-slate-100 sm:h-7 sm:w-7 sm:text-sm',
                isTodayDate ? 'bg-blue-600 text-white' : 'text-gray-700'
              )}
            >
              {format(cloneDay, 'd')}
            </button>
          </div>

          <CalendarMobileDaySummary dayData={dayData} />
          <div className="hidden min-h-0 flex-1 sm:flex">
            <CalendarCompactDayEntries
              dayData={dayData}
              onEventSelect={onEventSelect}
              onHolidaySelect={onHolidaySelect}
              onViewMore={() => onViewMore?.(cloneDay)}
            />
          </div>
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
