import { useCallback, useEffect, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import type dayjs from 'dayjs';
import {
  getCategories,
  getEventFeed,
  getEvents,
  getFederalHolidays,
  getHolidays,
  getUserSettings,
} from '../../api';
import type { Event, EventCategory, Holiday, HolidayTab } from '../../types';
import { normalizeTimeZone } from '../../lib/timezones';
import { isPaginatedEventsResponse } from './eventFormTypes';
import type { PaginatedEventsResponse } from './eventFormTypes';

export const useEventsData = ({
  currentPage,
  pageSize,
  categoryFilter,
  dateRange,
  sortBy,
  sortOrder,
  selectedYear,
  setCurrentPage,
  setUserTimezone,
  messageApi,
}: {
  currentPage: number;
  pageSize: number;
  categoryFilter: number | 'ALL';
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;
  sortBy: 'date' | 'duration';
  sortOrder: 'asc' | 'desc';
  selectedYear: number | 'all';
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setUserTimezone: (updater: (current: string) => string) => void;
  messageApi: MessageInstance;
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<Event[]>([]);
  const [customHolidays, setCustomHolidays] = useState<Holiday[]>([]);
  const [federalHolidays, setFederalHolidays] = useState<Holiday[]>([]);
  const [holidayTabs, setHolidayTabs] = useState<HolidayTab[]>([]);
  const [defaultHolidayColor, setDefaultHolidayColor] = useState<string | undefined>();
  const [federalHolidayColor, setFederalHolidayColor] = useState<string | undefined>();
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsUnlocked, setEventsUnlocked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarLoadError, setCalendarLoadError] = useState(false);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [defaultDuration, setDefaultDuration] = useState(60);
  const [defaultCategory, setDefaultCategory] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const [eventsResp, settingsResp] = await Promise.all([
        getEventFeed({
          page: currentPage,
          page_size: pageSize,
          year: selectedYear,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          start_date: dateRange?.[0]?.format('YYYY-MM-DD'),
          end_date: dateRange?.[1]?.format('YYYY-MM-DD'),
          sort_by: sortBy,
          sort_order: sortOrder,
        }),
        getUserSettings(),
      ]);

      if (settingsResp.data) {
        setDefaultDuration(Number(settingsResp.data.default_event_duration) || 60);
        setDefaultCategory(settingsResp.data.default_event_category ?? null);
        setHolidayTabs(settingsResp.data.holiday_tabs || []);
        setDefaultHolidayColor(settingsResp.data.default_holiday_color);
        setFederalHolidayColor(settingsResp.data.federal_holiday_color);
        if (settingsResp.data.primary_timezone) {
          setUserTimezone((current) =>
            normalizeTimeZone(current || settingsResp.data.primary_timezone)
          );
        }
      }

      const data = eventsResp.data as Event[] | PaginatedEventsResponse;
      if (isPaginatedEventsResponse(data)) {
        setEvents(data.results);
        setEventsTotal(data.count);
        // Counted server-side across every page; the current page cannot answer it.
        setEventsUnlocked(data.unlocked_count ?? data.count);
      } else {
        setEvents(data);
        setEventsTotal(data.length);
        setEventsUnlocked(data.filter((item) => !item.is_locked).length);
      }
    } catch (error) {
      setLoadError(true);
      messageApi.error('Failed to load events');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [
    categoryFilter,
    currentPage,
    dateRange,
    messageApi,
    pageSize,
    selectedYear,
    setUserTimezone,
    sortBy,
    sortOrder,
  ]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await getCategories();
      setCategories(res.data);
    } catch (error) {
      messageApi.error('Failed to load categories');
      console.error(error);
    }
  }, [messageApi]);

  const fetchCalendarData = useCallback(async () => {
    try {
      setCalendarLoading(true);
      setCalendarLoadError(false);
      const [eventsResp, holidaysResp, fedResp, settingsResp] = await Promise.all([
        getEvents(),
        getHolidays(),
        getFederalHolidays(),
        getUserSettings(),
      ]);
      setCalendarEvents(eventsResp.data);
      setCustomHolidays(holidaysResp.data);
      setFederalHolidays(fedResp.data);
      setHolidayTabs(settingsResp.data.holiday_tabs || []);
      setDefaultHolidayColor(settingsResp.data.default_holiday_color);
    } catch (error) {
      setCalendarLoadError(true);
      messageApi.error('Failed to load calendar data');
      console.error(error);
    } finally {
      setCalendarLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchCategories();
    fetchCalendarData();
  }, [fetchCalendarData, fetchCategories]);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, dateRange, sortBy, sortOrder, selectedYear, setCurrentPage]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(eventsTotal / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [currentPage, eventsTotal, pageSize, setCurrentPage]);
  return {
    events,
    setEvents,
    calendarEvents,
    setCalendarEvents,
    customHolidays,
    federalHolidays,
    holidayTabs,
    defaultHolidayColor,
    federalHolidayColor,
    eventsTotal,
    eventsUnlocked,
    loading,
    loadError,
    calendarLoading,
    calendarLoadError,
    categories,
    setCategories,
    defaultDuration,
    defaultCategory,
    fetchData,
    fetchCategories,
    fetchCalendarData,
  };
};
