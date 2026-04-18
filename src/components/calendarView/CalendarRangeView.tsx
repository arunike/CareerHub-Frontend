import { format, isSameDay } from 'date-fns';
import clsx from 'clsx';
import { CalendarDayAgendaEntries } from './CalendarDayContent';
import type { GetDayData } from './types';

type Props = {
  dates: Date[];
  today: Date;
  selectedDate: Date;
  onDateSelect: (day: Date) => void;
  getDayData: GetDayData;
};

const CalendarRangeView = ({ dates, today, selectedDate, onDateSelect, getDayData }: Props) => {
  const gridClassName =
    dates.length === 1
      ? 'grid-cols-1'
      : dates.length === 3
        ? 'grid-cols-3 min-w-[900px]'
        : 'grid-cols-7 min-w-[1400px]';

  return (
    <div className="overflow-x-auto">
      <div className={clsx('grid gap-4', gridClassName)}>
        {dates.map((day) => {
          const dayData = getDayData(day);
          const isTodayDate = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);

          return (
            <div
              key={day.toString()}
              className={clsx(
                'overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all',
                isSelected && 'ring-2 ring-blue-500 ring-inset'
              )}
            >
              <button
                type="button"
                onClick={() => onDateSelect(day)}
                className={clsx(
                  'w-full border-b border-gray-100 px-4 py-3 text-left transition-colors',
                  isSelected ? 'bg-blue-50' : 'bg-gray-50/80 hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                      {format(day, 'EEE')}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      {format(day, 'MMMM d, yyyy')}
                    </div>
                  </div>
                  {isTodayDate && (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                      Today
                    </span>
                  )}
                </div>
              </button>

              <div className="min-h-[320px] p-4">
                <CalendarDayAgendaEntries dayData={dayData} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarRangeView;
