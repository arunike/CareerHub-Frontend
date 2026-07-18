import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Button } from 'antd';
import Modal from './MobileModal';
import type { Event, EventCategory, Holiday, HolidayTab } from '../types';
import CalendarDetailsPanel from './calendarView/CalendarDetailsPanel';
import CalendarHeader from './calendarView/CalendarHeader';
import CalendarMonthView from './calendarView/CalendarMonthView';
import CalendarRangeView from './calendarView/CalendarRangeView';
import CalendarYearView from './calendarView/CalendarYearView';
import type {
  CalendarFilters,
  CalendarHolidayTarget,
  CalendarViewMode,
  DayData,
} from './calendarView/types';
import { getHeaderLabel, getVisibleRangeDates, shiftAnchorDate } from './calendarView/utils';

interface CalendarViewProps {
  events: Event[];
  customHolidays: Holiday[];
  federalHolidays: Holiday[];
  categories?: EventCategory[];
  holidayTabs?: HolidayTab[];
  addActionHighlight?: 'events' | 'holidays' | 'all';
  loading?: boolean;
  onEventSelect?: (event: Event) => void;
  onHolidaySelect?: (holiday: Holiday) => void;
  onAddEvent?: (day: Date) => void;
  onAddHoliday?: (day: Date, target: CalendarHolidayTarget) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  customHolidays,
  federalHolidays,
  categories = [],
  holidayTabs = [],
  addActionHighlight = 'all',
  loading = false,
  onEventSelect,
  onHolidaySelect,
  onAddEvent,
  onAddHoliday,
}) => {
  const today = new Date();
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [anchorDate, setAnchorDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [pendingAddDate, setPendingAddDate] = useState<Date | null>(null);
  const [filters, setFilters] = useState<CalendarFilters>({
    eventCategoryIds: new Set(['uncategorized']),
    customHolidayTabs: new Set(['default']),
    federal: true,
  });

  const hasUncategorizedEvents = events.some((event) => !event.category);

  useEffect(() => {
    setFilters((currentFilters) => {
      const nextEventCategoryIds = new Set<number | 'uncategorized'>();
      categories.forEach((category) => {
        if (currentFilters.eventCategoryIds.has(category.id)) {
          nextEventCategoryIds.add(category.id);
        }
      });

      if (currentFilters.eventCategoryIds.has('uncategorized')) {
        nextEventCategoryIds.add('uncategorized');
      }

      categories.forEach((category) => {
        if (!currentFilters.eventCategoryIds.has(category.id)) {
          nextEventCategoryIds.add(category.id);
        }
      });

      const nextCustomHolidayTabs = new Set<string | 'default'>();
      if (currentFilters.customHolidayTabs.has('default')) {
        nextCustomHolidayTabs.add('default');
      }
      holidayTabs.forEach((tab) => {
        if (currentFilters.customHolidayTabs.has(tab.id)) {
          nextCustomHolidayTabs.add(tab.id);
        }
      });
      holidayTabs.forEach((tab) => {
        if (!currentFilters.customHolidayTabs.has(tab.id)) {
          nextCustomHolidayTabs.add(tab.id);
        }
      });

      return {
        eventCategoryIds: nextEventCategoryIds,
        customHolidayTabs: nextCustomHolidayTabs,
        federal: currentFilters.federal,
      };
    });
  }, [categories, holidayTabs]);

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
  const holidayTabsById = holidayTabs.reduce<Record<string, HolidayTab>>((acc, tab) => {
    acc[tab.id] = tab;
    return acc;
  }, {});

  customHolidays.forEach((holiday) => {
    const key = holiday.is_recurring ? holiday.date.substring(5) : holiday.date;
    const target = holiday.is_recurring ? recurringCustomHolidays : datedCustomHolidays;
    const holidayTab = holiday.tab ? holidayTabsById[holiday.tab] : undefined;
    const displayHoliday = {
      ...holiday,
      tab_color: holidayTab?.color,
      tab_name: holidayTab?.name,
    };

    if (!target[key]) {
      target[key] = [];
    }
    target[key].push(displayHoliday);
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
    const dayEvents = eventsByDate[dayKey] ?? [];
    const dayCustomHolidays = [
      ...(datedCustomHolidays[dayKey] ?? []),
      ...(recurringCustomHolidays[monthDayKey] ?? []),
    ];

    return {
      events: dayEvents.filter((event) =>
        filters.eventCategoryIds.has(event.category ?? 'uncategorized')
      ),
      customHolidays: dayCustomHolidays.filter((holiday) =>
        filters.customHolidayTabs.has(holiday.tab || 'default')
      ),
      federalHolidays: filters.federal ? (federalHolidaysByDate[dayKey] ?? []) : [],
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

  const toggleEventCategory = (categoryId: number | 'uncategorized') => {
    setFilters((currentFilters) => {
      const nextIds = new Set(currentFilters.eventCategoryIds);
      if (nextIds.has(categoryId)) {
        nextIds.delete(categoryId);
      } else {
        nextIds.add(categoryId);
      }
      return { ...currentFilters, eventCategoryIds: nextIds };
    });
  };

  const toggleCustomHolidayTab = (tabId: string | 'default') => {
    setFilters((currentFilters) => {
      const nextIds = new Set(currentFilters.customHolidayTabs);
      if (nextIds.has(tabId)) {
        nextIds.delete(tabId);
      } else {
        nextIds.add(tabId);
      }
      return { ...currentFilters, customHolidayTabs: nextIds };
    });
  };

  const handleDateDoubleClick = (day: Date) => {
    if (loading || (!onAddEvent && !onAddHoliday)) return;
    setSelectedDate(day);
    setAnchorDate(day);
    setPendingAddDate(day);
  };

  const handleViewMore = (day: Date) => {
    setSelectedDate(day);
    setAnchorDate(day);
  };

  const handleAddEvent = () => {
    if (!pendingAddDate || loading) return;
    onAddEvent?.(pendingAddDate);
    setPendingAddDate(null);
  };

  const handleAddHoliday = (target: CalendarHolidayTarget) => {
    if (!pendingAddDate || loading) return;
    onAddHoliday?.(pendingAddDate, target);
    setPendingAddDate(null);
  };

  const selectedDayData = getDayData(selectedDate);
  const visibleRangeDates = getVisibleRangeDates(viewMode, anchorDate);
  const canAddFromCalendar = !!onAddEvent || !!onAddHoliday;
  const shouldHighlightEventAdd = addActionHighlight === 'events' || addActionHighlight === 'all';
  const shouldHighlightHolidayAdd =
    addActionHighlight === 'holidays' || addActionHighlight === 'all';

  return (
    <div className="animate-in fade-in duration-500">
      <CalendarHeader
        headerLabel={getHeaderLabel(viewMode, anchorDate)}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onShiftRange={shiftRange}
        onGoToToday={goToToday}
        categories={categories}
        holidayTabs={holidayTabs}
        filters={filters}
        hasUncategorizedEvents={hasUncategorizedEvents}
        loading={loading}
        onToggleEventCategory={toggleEventCategory}
        onToggleCustomHolidayTab={toggleCustomHolidayTab}
        onToggleFederal={() =>
          setFilters((currentFilters) => ({
            ...currentFilters,
            federal: !currentFilters.federal,
          }))
        }
      />

      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-[1px]">
            <div className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm">
              Loading calendar data...
            </div>
          </div>
        )}

        <div className={loading ? 'pointer-events-none opacity-60' : undefined}>
          {viewMode === 'month' && (
            <CalendarMonthView
              anchorDate={anchorDate}
              today={today}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onDateDoubleClick={canAddFromCalendar ? handleDateDoubleClick : undefined}
              onViewMore={handleViewMore}
              onEventSelect={onEventSelect}
              onHolidaySelect={onHolidaySelect}
              getDayData={getDayData}
            />
          )}
          {(viewMode === 'day' || viewMode === 'threeDay' || viewMode === 'week') && (
            <CalendarRangeView
              dates={visibleRangeDates}
              today={today}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onDateDoubleClick={canAddFromCalendar ? handleDateDoubleClick : undefined}
              onEventSelect={onEventSelect}
              onHolidaySelect={onHolidaySelect}
              getDayData={getDayData}
            />
          )}
          {viewMode === 'year' && (
            <CalendarYearView
              anchorDate={anchorDate}
              today={today}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onDateDoubleClick={canAddFromCalendar ? handleDateDoubleClick : undefined}
              getDayData={getDayData}
            />
          )}
        </div>
      </div>

      <CalendarDetailsPanel
        selectedDate={selectedDate}
        dayData={selectedDayData}
        onEventSelect={onEventSelect}
        onHolidaySelect={onHolidaySelect}
      />

      <Modal
        title={`Add to ${pendingAddDate ? format(pendingAddDate, 'MMMM d, yyyy') : 'calendar'}`}
        open={!!pendingAddDate}
        onCancel={() => setPendingAddDate(null)}
        footer={null}
        destroyOnHidden
      >
        <div className="grid gap-2">
          {onAddEvent && (
            <Button
              type={shouldHighlightEventAdd ? 'primary' : 'default'}
              onClick={handleAddEvent}
              disabled={loading}
              block
            >
              Add Event
            </Button>
          )}
          {onAddHoliday && (
            <>
              <Button
                type={shouldHighlightHolidayAdd ? 'primary' : 'default'}
                onClick={() => handleAddHoliday({ tab: null, label: 'My Holiday' })}
                block
              >
                Add My Holiday
              </Button>
              {holidayTabs.map((tab) => (
                <Button
                  key={tab.id}
                  type={shouldHighlightHolidayAdd ? 'primary' : 'default'}
                  onClick={() => handleAddHoliday({ tab: tab.id, label: tab.name })}
                  block
                >
                  Add {tab.name}
                </Button>
              ))}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CalendarView;
