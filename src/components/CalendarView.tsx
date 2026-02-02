import React, { useState } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import type { Event, Holiday } from '../types';
import clsx from 'clsx';

interface CalendarViewProps {
  events: Event[];
  customHolidays: Holiday[];
  federalHolidays: Holiday[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, customHolidays, federalHolidays }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const onDateClick = (day: Date) => setSelectedDate(day);

  const header = () => {
    return (
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex space-x-1">
            <button
              onClick={prevMonth}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs md:text-sm">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Event</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span>My Holiday</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
            <span>Federal</span>
          </div>
        </div>
      </div>
    );
  };

  const days = () => {
    const dateFormat = 'EEE';
    const startDate = startOfWeek(currentMonth);
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="text-center font-medium text-gray-400 text-xs py-2" key={i}>
          {format(addDays(startDate, i), dateFormat)}
        </div>
      );
    }
    return <div className="grid grid-cols-7 mb-2">{days}</div>;
  };

  const cells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const dateFormat = 'd';
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;

        // Check for data on this day
        const dayEvents = events.filter((e) => e.date === format(cloneDay, 'yyyy-MM-dd'));

        // Check Holidays (Normal + Recurring)
        const dayCustomHolidays = customHolidays.filter((h) => {
          if (h.is_recurring) {
            return h.date.substring(5) === format(cloneDay, 'MM-dd');
          }
          return h.date === format(cloneDay, 'yyyy-MM-dd');
        });

        const dayFederalHolidays = federalHolidays.filter(
          (h) => h.date === format(cloneDay, 'yyyy-MM-dd')
        );

        const isToday = isSameDay(day, new Date());
        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <div
            className={clsx(
              'relative h-24 md:h-32 border border-gray-100 p-2 transition-all hover:bg-gray-50 flex flex-col gap-1 cursor-pointer',
              !isCurrentMonth && 'bg-gray-50/50 text-gray-400',
              isToday && 'bg-indigo-50/30',
              isSelected && 'ring-2 ring-indigo-500 ring-inset z-10 rounded-lg'
            )}
            key={day.toString()}
            onClick={() => onDateClick(cloneDay)}
          >
            <div className="flex justify-between items-start">
              <span
                className={clsx(
                  'text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full',
                  isToday ? 'bg-indigo-600 text-white' : 'text-gray-700'
                )}
              >
                {formattedDate}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar text-xs mt-1">
              {/* Federal */}
              {dayFederalHolidays.map((h, idx) => (
                <div
                  key={`fed-${idx}`}
                  className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded truncate"
                  title={h.description}
                >
                  Lock: {h.description}
                </div>
              ))}

              {/* Custom */}
              {dayCustomHolidays.map((h, idx) => (
                <div
                  key={`cust-${idx}`}
                  className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded truncate"
                  title={h.description}
                >
                  ★ {h.description}
                </div>
              ))}

              {/* Events */}
              {dayEvents.map((e) => (
                <div
                  key={e.id}
                  className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded truncate"
                  title={`${e.name} (${e.start_time})`}
                >
                  {e.start_time.substring(0, 5)} {e.name}
                </div>
              ))}
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {rows}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-500">
      {header()}
      {days()}
      {cells()}

      {/* Selected Day Detail (Mobile friendly mainly, or sidebar) */}
      <div className="mt-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          Details for {format(selectedDate, 'MMMM d, yyyy')}
        </h3>
        <div className="space-y-2">
          {(() => {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const dateMonthDay = format(selectedDate, 'MM-dd');

            const dEvents = events.filter((e) => e.date === dateStr);
            const dCustom = customHolidays.filter((h) =>
              h.is_recurring ? h.date.substring(5) === dateMonthDay : h.date === dateStr
            );
            const dFed = federalHolidays.filter((h) => h.date === dateStr);

            if (!dEvents.length && !dCustom.length && !dFed.length) {
              return (
                <div className="text-gray-400 text-sm italic">No events or holidays scheduled.</div>
              );
            }

            return (
              <>
                {dFed.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100"
                  >
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    <span className="font-medium">Federal Holiday:</span> {h.description}
                  </div>
                ))}
                {dCustom.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg border border-green-100"
                  >
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="font-medium">My Holiday:</span> {h.description}{' '}
                    {h.is_recurring && '(Yearly)'}
                  </div>
                ))}
                {dEvents.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="font-mono text-blue-600 bg-blue-100 px-1 rounded">
                      {e.start_time.substring(0, 5)} - {e.end_time.substring(0, 5)}
                    </span>
                    <span className="font-medium">{e.name}</span>
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
