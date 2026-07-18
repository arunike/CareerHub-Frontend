import { format, isSameDay } from 'date-fns';
import clsx from 'clsx';
import { CalendarDayAgendaEntries } from './CalendarDayContent';
import type { Event, Holiday } from '../../types';
import type { GetDayData } from './types';

type Props = {
  dates: Date[];
  today: Date;
  selectedDate: Date;
  onDateSelect: (day: Date) => void;
  onDateDoubleClick?: (day: Date) => void;
  onEventSelect?: (event: Event) => void;
  onHolidaySelect?: (holiday: Holiday) => void;
  getDayData: GetDayData;
};

const CalendarRangeView = ({
  dates,
  today,
  selectedDate,
  onDateSelect,
  onDateDoubleClick,
  onEventSelect,
  onHolidaySelect,
  getDayData,
}: Props) => {
  const gridClassName =
    dates.length === 1
      ? 'grid-cols-1'
      : dates.length === 3
        ? 'grid-flow-col auto-cols-[minmax(280px,85vw)] md:min-w-[900px] md:grid-flow-row md:auto-cols-auto md:grid-cols-3'
        : 'grid-flow-col auto-cols-[minmax(280px,85vw)] md:min-w-[1400px] md:grid-flow-row md:auto-cols-auto md:grid-cols-7';

  return (
    <div className="-mx-4 snap-x snap-mandatory overflow-x-auto px-4 pb-2 md:mx-0 md:snap-none md:px-0 md:pb-0">
      <div className={clsx('grid gap-4', gridClassName)}>
        {dates.map((day) => {
          const dayData = getDayData(day);
          const isTodayDate = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);

          return (
            <div
              key={day.toString()}
              className={clsx(
                'enterprise-section snap-start overflow-hidden transition-all',
                isSelected && 'ring-2 ring-blue-500 ring-inset'
              )}
            >
              <button
                type="button"
                onClick={() => onDateSelect(day)}
                onDoubleClick={() => onDateDoubleClick?.(day)}
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
                <CalendarDayAgendaEntries
                  dayData={dayData}
                  onEventSelect={onEventSelect}
                  onHolidaySelect={onHolidaySelect}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarRangeView;
