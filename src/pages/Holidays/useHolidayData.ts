import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  getCategories,
  getEvents,
  getFederalHolidays,
  getHolidays,
  getUserSettings,
} from '../../api';
import type { Event, EventCategory, Holiday, HolidayTab, UserSettings } from '../../types';
import { getAvailableYears, getCurrentYear } from '../../utils/yearFilter';
import { getBrowserTimeZone, normalizeTimeZone } from '../../lib/timezones';
import { projectHolidaysForYear } from './holidayYearProjection';

export const useHolidayData = ({
  selectedYear,
  activeTab,
  sortBy,
  sortOrder,
  messageApi,
}: {
  selectedYear: number | 'all';
  activeTab: string;
  sortBy: 'date' | 'name';
  sortOrder: 'asc' | 'desc';
  messageApi: MessageInstance;
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [federalHolidays, setFederalHolidays] = useState<Holiday[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const requestedYear = selectedYear === 'all' ? undefined : selectedYear;
      const [customResp, federalResp, settingsResp, eventsResp, categoriesResp] = await Promise.all(
        [
          getHolidays(),
          getFederalHolidays(requestedYear),
          getUserSettings(),
          getEvents(),
          getCategories(),
        ]
      );
      setHolidays(customResp.data.filter((holiday: Holiday) => holiday.holiday_type !== 'federal'));
      setFederalHolidays(federalResp.data);
      setUserSettings(settingsResp.data);
      setEvents(eventsResp.data);
      setCategories(categoriesResp.data);
    } catch (error) {
      setLoadError(true);
      messageApi.error('Failed to load time off');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [messageApi, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const customTabs = React.useMemo<HolidayTab[]>(
    () => userSettings?.holiday_tabs || [],
    [userSettings?.holiday_tabs]
  );
  const defaultEventDuration = Number(userSettings?.default_event_duration) || 60;
  const userTimezone = normalizeTimeZone(userSettings?.primary_timezone || getBrowserTimeZone());

  const holidaysForSelectedYear = React.useMemo(
    () => projectHolidaysForYear(holidays, selectedYear),
    [holidays, selectedYear]
  );

  const activeTabHolidays = React.useMemo(() => {
    if (activeTab === 'custom') {
      return holidaysForSelectedYear.filter(
        (h) => !h.tab || !customTabs.some((t) => t.id === h.tab)
      );
    }
    if (activeTab === 'federal') return [];
    return holidaysForSelectedYear.filter((h) => h.tab === activeTab);
  }, [holidaysForSelectedYear, activeTab, customTabs]);

  const sortedHolidays = [...activeTabHolidays].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = dayjs(a.date).diff(dayjs(b.date));
    } else {
      comparison = (a.description || '').localeCompare(b.description || '');
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const groupedHolidays = React.useMemo(() => {
    const groups: any[] = [];
    const groupMap = new Map();

    sortedHolidays.forEach((item) => {
      if (item.group_id) {
        if (!groupMap.has(item.group_id)) {
          const newGroup = {
            isGroup: true,
            id: item.group_id,
            group_id: item.group_id,
            items: [],
            date: item.date,
            description: item.description,
            is_recurring: item.is_recurring,
            is_locked: false,
          };
          groupMap.set(item.group_id, newGroup);
          groups.push(newGroup);
        }
        groupMap.get(item.group_id).items.push(item);
      } else {
        groups.push({ isGroup: false, ...item });
      }
    });

    groups.forEach((g) => {
      if (g.isGroup) {
        g.is_locked = g.items.every((i: any) => i.is_locked);
      }
    });

    return groups;
  }, [sortedHolidays]);

  const availableYears = Array.from(
    new Set([...getAvailableYears(holidays, 'date'), getCurrentYear() + 1])
  ).sort((a, b) => b - a);
  const hasLoadedData =
    holidays.length > 0 ||
    federalHolidays.length > 0 ||
    events.length > 0 ||
    categories.length > 0 ||
    userSettings !== null;

  return {
    events,
    setEvents,
    categories,
    setCategories,
    holidays,
    setHolidays,
    federalHolidays,
    userSettings,
    loading,
    loadError,
    fetchData,
    customTabs,
    defaultEventDuration,
    userTimezone,
    holidaysForSelectedYear,
    activeTabHolidays,
    sortedHolidays,
    groupedHolidays,
    availableYears,
    hasLoadedData,
  };
};
