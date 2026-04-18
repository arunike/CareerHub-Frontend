import React, { useState } from 'react';
import { format } from 'date-fns';
import type { Event, Holiday } from '../types';
import CalendarDetailsPanel from './calendarView/CalendarDetailsPanel';
import CalendarHeader from './calendarView/CalendarHeader';
import CalendarMonthView from './calendarView/CalendarMonthView';
import CalendarRangeView from './calendarView/CalendarRangeView';
import CalendarYearView from './calendarView/CalendarYearView';
import type { CalendarViewMode, DayData } from './calendarView/types';
import { getHeaderLabel, getVisibleRangeDates, shiftAnchorDate } from './calendarView/utils';

interface CalendarViewProps {
  events: Event[];
  customHolidays: Holiday[];
  federalHolidays: Holiday[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, customHolidays, federalHolidays }) => {
  const today = new Date();
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [anchorDate, setAnchorDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);

  const eventsByDate: Record<string, Event[]> = {};
  events.forEach((event) => {
    if (!eventsByDate[event.date]) {
      eventsByDate[event.date] = [];
    }
    eventsByDate[event.date].push(event);
  });

  Object.values(eventsByDate).forEach((items) => {
    items.sort((a, b) => a.start_time.localeCompare(b.start_time));
  });

  const datedCustomHolidays: Record<string, Holiday[]> = {};
  const recurringCustomHolidays: Record<string, Holiday[]> = {};

  customHolidays.forEach((holiday) => {
    const key = holiday.is_recurring ? holiday.date.substring(5) : holiday.date;
    const target = holiday.is_recurring ? recurringCustomHolidays : datedCustomHolidays;

    if (!target[key]) {
      target[key] = [];
    }
    target[key].push(holiday);
  });

  const federalHolidaysByDate: Record<string, Holiday[]> = {};
  federalHolidays.forEach((holiday) => {
    if (!federalHolidaysByDate[holiday.date]) {
      federalHolidaysByDate[holiday.date] = [];
    }
    federalHolidaysByDate[holiday.date].push(holiday);
  });

  const getDayData = (day: Date): DayData => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const monthDayKey = format(day, 'MM-dd');

    return {
      events: eventsByDate[dayKey] ?? [],
      customHolidays: [
        ...(datedCustomHolidays[dayKey] ?? []),
        ...(recurringCustomHolidays[monthDayKey] ?? []),
      ],
      federalHolidays: federalHolidaysByDate[dayKey] ?? [],
    };
  };

  const handleDateSelect = (day: Date) => {
    setSelectedDate(day);
    setAnchorDate(day);
  };

  const handleViewModeChange = (nextViewMode: CalendarViewMode) => {
    setViewMode(nextViewMode);
    setAnchorDate(selectedDate);
  };

  const shiftRange = (direction: 'prev' | 'next') => {
    const nextDate = shiftAnchorDate(viewMode, anchorDate, direction);
    setAnchorDate(nextDate);
    setSelectedDate(nextDate);
  };

  const goToToday = () => {
    setAnchorDate(today);
    setSelectedDate(today);
  };

  const selectedDayData = getDayData(selectedDate);
  const visibleRangeDates = getVisibleRangeDates(viewMode, anchorDate);

  return (
    <div className="animate-in fade-in duration-500">
      <CalendarHeader
        headerLabel={getHeaderLabel(viewMode, anchorDate)}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onShiftRange={shiftRange}
        onGoToToday={goToToday}
      />

      {viewMode === 'month' && (
        <CalendarMonthView
          anchorDate={anchorDate}
          today={today}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          getDayData={getDayData}
        />
      )}
      {(viewMode === 'day' || viewMode === 'threeDay' || viewMode === 'week') && (
        <CalendarRangeView
          dates={visibleRangeDates}
          today={today}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          getDayData={getDayData}
        />
      )}
      {viewMode === 'year' && (
        <CalendarYearView
          anchorDate={anchorDate}
          today={today}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          getDayData={getDayData}
        />
      )}

      <CalendarDetailsPanel selectedDate={selectedDate} dayData={selectedDayData} />
    </div>
  );
};

export default CalendarView;
