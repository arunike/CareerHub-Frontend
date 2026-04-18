import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { Tooltip } from 'antd';
import clsx from 'clsx';
import { CalendarDayTooltipContent } from './CalendarDayContent';
import type { GetDayData } from './types';
import { MINI_WEEKDAY_LABELS } from './types';

type Props = {
  anchorDate: Date;
  today: Date;
  selectedDate: Date;
  onDateSelect: (day: Date) => void;
  getDayData: GetDayData;
};

const CalendarYearView = ({ anchorDate, today, selectedDate, onDateSelect, getDayData }: Props) => {
  const startOfAnchorYear = new Date(anchorDate.getFullYear(), 0, 1);
  const months = Array.from({ length: 12 }, (_, index) => addMonths(startOfAnchorYear, index));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
      {months.map((monthDate) => {
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthStart);
        const gridStart = startOfWeek(monthStart);
        const gridEnd = endOfWeek(monthEnd);
        const dayCells = [];
        let day = gridStart;

        while (day <= gridEnd) {
          const cloneDay = day;
          const dayData = getDayData(cloneDay);
          const isTodayDate = isSameDay(cloneDay, today);
          const isSelected = isSameDay(cloneDay, selectedDate);
          const isCurrentMonth = isSameMonth(cloneDay, monthStart);

          dayCells.push(
            <Tooltip
              key={cloneDay.toString()}
              title={<CalendarDayTooltipContent day={cloneDay} dayData={dayData} />}
              mouseEnterDelay={0}
            >
              <button
                type="button"
                onClick={() => onDateSelect(cloneDay)}
                className={clsx(
                  'aspect-square bg-white px-1 py-1 text-center transition-colors flex flex-col items-center justify-center gap-1',
                  !isCurrentMonth && 'bg-gray-50 text-gray-300',
                  isTodayDate && 'bg-blue-50',
                  isSelected && 'ring-2 ring-blue-500 ring-inset z-10'
                )}
              >
                <span
                  className={clsx(
                    'text-xs leading-none',
                    isTodayDate ? 'font-semibold text-blue-700' : 'text-gray-700',
                    !isCurrentMonth && 'text-gray-300'
                  )}
                >
                  {format(cloneDay, 'd')}
                </span>
                <div className="flex min-h-[6px] items-center justify-center gap-1">
                  {dayData.events.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                  {dayData.customHolidays.length > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  )}
                  {dayData.federalHolidays.length > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  )}
                </div>
              </button>
            </Tooltip>
          );
          day = addDays(day, 1);
        }

        return (
          <div
            key={monthDate.toString()}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="border-b border-gray-100 px-4 py-3">
              <h3 className="font-semibold text-gray-900">{format(monthDate, 'MMMM')}</h3>
            </div>

            <div className="grid grid-cols-7 gap-1 px-3 pt-3 pb-2">
              {MINI_WEEKDAY_LABELS.map((label, index) => (
                <div
                  key={`${label}-${index}`}
                  className="text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-gray-100 p-px">{dayCells}</div>
          </div>
        );
      })}
    </div>
  );
};

export default CalendarYearView;
