import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  Typography,
  Space,
  Form,
  Input,
  Select,
  message,
  Card,
  Tooltip,
  Button,
  Grid,
  Pagination,
} from 'antd';
import Modal from '../../components/MobileModal';
import {
  LinkOutlined,
  PlusOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';
import type { Event, EventCategory, RecurrenceRule } from '../../types';
import {
  getEvents,
  getEventFeed,
  getHolidays,
  getFederalHolidays,
  deleteEvent,
  deleteHoliday,
  createEvent,
  createHoliday,
  updateEvent,
  updateHoliday,
  importData,
  getCategories,
  setRecurrence,
  createCategory,
  updateRecurringSeries,
  deleteRecurringSeries,
  deleteRecurringInstance,
  getUserSettings,
  exportEvents,
} from '../../api';
import type { Holiday, HolidayTab } from '../../types';
import RecurrenceModal from '../../components/RecurrenceModal';
import PageActionToolbar from '../../components/PageActionToolbar';
import { PageState } from '../../components/PageState';
import BulkActionHeader from '../../components/BulkActionHeader';
import CalendarView from '../../components/CalendarView';
import type { CalendarHolidayTarget } from '../../components/calendarView/types';
import CalendarHolidayModal from '../../components/calendarView/CalendarHolidayModal';
import type { CalendarHolidayFormValues } from '../../components/calendarView/CalendarHolidayModal';
import { confirmEventDeletion } from '../../components/calendarView/confirmCalendarDeletion';
import SegmentedToggle from '../../components/SegmentedToggle';
import EventsFilterBar from './components/EventsFilterBar';
import EventsGrid from './components/EventsGrid';
import EventEditorModal from './components/EventEditorModal';
import EventViewModal from './components/EventViewModal';
import { getCurrentYear } from '../../utils/yearFilter';
import { usePersistedState } from '../../hooks/usePersistedState';
import { TIMEZONE_OPTIONS, getBrowserTimeZone, normalizeTimeZone } from '../../lib/timezones';
import { useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  confirmEventMove,
  confirmHolidayMove,
} from '../../components/calendarView/confirmCalendarMove';
import type { CalendarDragItem } from '../../components/calendarView/CalendarDayContent';
import { buildEventMovePatch } from '../../components/calendarView/utils';
import LinkInterviewsModal from './components/LinkInterviewsModal';
import {
  askOverrideOverwrite,
  askSpanEditScope,
  isSpanEvent,
  type SpanEditScope,
} from '../../components/calendarView/confirmSpanEdit';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezonePlugin);

const { Text } = Typography;

type EventFormValues = {
  date: dayjs.Dayjs;
  start_time: dayjs.Dayjs;
  end_time: dayjs.Dayjs;
  is_all_day?: boolean;
  is_multi_day?: boolean;
  end_date?: dayjs.Dayjs | null;
  [key: string]: unknown;
};

type ApiError = { response?: { status?: number; data?: { conflict?: boolean } } };
type PaginatedEventsResponse = {
  count: number;
  // Rows across the whole filtered set that are not locked.
  unlocked_count?: number;
  results: Event[];
};

const isPaginatedEventsResponse = (
  data: Event[] | PaginatedEventsResponse
): data is PaginatedEventsResponse => !Array.isArray(data) && Array.isArray(data.results);

const Events = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const [events, setEvents] = useState<Event[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<Event[]>([]);
  const [customHolidays, setCustomHolidays] = useState<Holiday[]>([]);
  const [federalHolidays, setFederalHolidays] = useState<Holiday[]>([]);
  const [holidayTabs, setHolidayTabs] = useState<HolidayTab[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsUnlocked, setEventsUnlocked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarLoadError, setCalendarLoadError] = useState(false);
  const [categories, setCategories] = useState<EventCategory[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [categoryFilter, setCategoryFilter] = useState<number | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'duration'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [userTimezone, setUserTimezone] = usePersistedState<string>(
    'userTimezone',
    getBrowserTimeZone,
    {
      serialize: (value) => value,
      deserialize: (raw) => normalizeTimeZone(raw),
    }
  );
  const [selectedYear, setSelectedYear] = usePersistedState<number | 'all'>(
    'eventsSelectedYear',
    getCurrentYear(),
    {
      serialize: (value) => value.toString(),
      deserialize: (raw) => (raw === 'all' ? 'all' : parseInt(raw)),
    }
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  // How the next save applies to a multi-day span, and which day was clicked.
  const [spanScope, setSpanScope] = useState<{ scope: SpanEditScope; day: string } | null>(null);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [viewingDay, setViewingDay] = useState<string | null>(null);
  const [isLinkInterviewsOpen, setIsLinkInterviewsOpen] = useState(false);
  const [pendingCalendarHoliday, setPendingCalendarHoliday] = useState<{
    date: Date;
    target: CalendarHolidayTarget;
  } | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [locationType, setLocationType] = useState<'in_person' | 'virtual' | 'hybrid'>('virtual');

  const [defaultDuration, setDefaultDuration] = useState(60);
  const [defaultCategory, setDefaultCategory] = useState<number | null>(null);
  const [contentView, setContentView] = usePersistedState<'list' | 'calendar'>(
    'eventsContentView',
    'list',
    {
      serialize: (value) => value,
      deserialize: (raw) => (raw === 'calendar' ? 'calendar' : 'list'),
    }
  );

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
  }, [categoryFilter, dateRange, sortBy, sortOrder, selectedYear]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(eventsTotal / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [currentPage, eventsTotal, pageSize]);

  const filteredEvents = events;
  const paginatedEvents = events;
  const availableYears = useMemo(
    () => (typeof selectedYear === 'number' ? [selectedYear] : []),
    [selectedYear]
  );

  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
  };

  const hasEventFilters = categoryFilter !== 'ALL' || Boolean(dateRange?.[0] || dateRange?.[1]);
  const clearEventFilters = () => {
    setCategoryFilter('ALL');
    setDateRange(null);
    setCurrentPage(1);
  };
  const eventEmptyState = (
    <PageState
      title={
        hasEventFilters
          ? 'No matching events'
          : selectedYear === 'all'
            ? 'No events yet'
            : `No events in ${selectedYear}`
      }
      description={
        hasEventFilters
          ? 'No saved events match the current category and date filters.'
          : selectedYear === 'all'
            ? 'Add an interview, deadline, follow-up, or personal event to keep it on your calendar.'
            : 'Choose another year, show all years, or add an event for this year.'
      }
      actionLabel={
        hasEventFilters ? 'Clear filters' : selectedYear === 'all' ? 'Add event' : 'Show all years'
      }
      onAction={
        hasEventFilters
          ? clearEventFilters
          : selectedYear === 'all'
            ? () => handleAdd()
            : () => handleYearChange('all')
      }
    />
  );
  const listLoadFailed = loadError && events.length === 0;
  const calendarLoadFailed =
    calendarLoadError &&
    calendarEvents.length === 0 &&
    customHolidays.length === 0 &&
    federalHolidays.length === 0;

  const handleAdd = useCallback(
    (dateArg?: Date) => {
      const date = dateArg instanceof Date ? dateArg : undefined;
      setEditingId(null);
      setRecurrenceRule(null);
      setLocationType('virtual');
      setIsFormOpen(true);
      form.resetFields();

      const now = dayjs();
      const roundedMinute = Math.ceil(now.minute() / 5) * 5;
      const start =
        roundedMinute === 60
          ? now.add(1, 'hour').minute(0).second(0)
          : now.minute(roundedMinute).second(0);
      const end = start.add(defaultDuration, 'minute');

      form.setFieldsValue({
        date: date ? dayjs(date) : dayjs(),
        start_time: start,
        end_time: end,
        timezone: normalizeTimeZone(userTimezone),
        category: defaultCategory ?? undefined,
        location_type: 'virtual',
      });
    },
    [defaultCategory, defaultDuration, form, userTimezone]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') !== 'create') return;
    handleAdd();
    navigate('/events', { replace: true });
  }, [handleAdd, location.search, navigate]);

  const handleCalendarHolidayAdd = (date: Date, target: CalendarHolidayTarget) => {
    setEditingHoliday(null);
    setPendingCalendarHoliday({ date, target });
  };

  const handleHolidaySelect = (holiday: Holiday) => {
    setPendingCalendarHoliday(null);
    setEditingHoliday(holiday);
  };

  // A span asks first whether the edit is for the clicked day or the whole run.
  // Deep link from the notification bell: /events?event=<id> opens that event's editor.
  const handledDeepLink = useRef(false);
  useEffect(() => {
    if (handledDeepLink.current || events.length === 0) return;
    const requested = new URLSearchParams(location.search).get('event');
    if (!requested) return;
    const target = events.find((candidate) => String(candidate.id) === requested);
    if (!target) return;
    handledDeepLink.current = true;
    handleEdit(target);
    navigate('/events', { replace: true });
    // handleEdit and navigate are stable for this one-shot deep link; adding them would
    // re-run it on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, location.search]);

  const handleEdit = (event: Event, clickedDay?: string) => {
    if (isSpanEvent(event)) {
      const clicked = clickedDay || event.date;
      askSpanEditScope(event, clicked, (scope) => {
        setSpanScope({ scope, day: clicked });
        openEditForm(event, scope === 'day' ? clicked : event.date);
      });
      return;
    }
    setSpanScope(null);
    openEditForm(event);
  };

  const openEditForm = (event: Event, dayOverride?: string) => {
    setEditingId(event.id);
    setIsFormOpen(true);
    setRecurrenceRule(event.recurrence_rule as RecurrenceRule);
    setLocationType(event.location_type);

    form.setFieldsValue({
      name: event.name,
      date: dayjs(dayOverride || event.date),
      start_time: dayjs(event.start_time, 'HH:mm:ss'),
      end_time: dayjs(event.end_time, 'HH:mm:ss'),
      is_all_day: Boolean(event.is_all_day),
      is_multi_day: Boolean(event.end_date && event.end_date !== event.date),
      end_date: event.end_date ? dayjs(event.end_date) : null,
      timezone: event.timezone,
      category: event.category,
      location_type: event.location_type,
      location: event.location,
      meeting_link: event.meeting_link,
      notes: event.notes,
      application: event.application,
    });
  };

  const handleDuplicate = (event: Event) => {
    setEditingId(null);
    setIsFormOpen(true);
    setRecurrenceRule(event.recurrence_rule as RecurrenceRule);
    setLocationType(event.location_type);

    form.setFieldsValue({
      name: `${event.name} (Copy)`,
      date: dayjs(event.date),
      start_time: dayjs(event.start_time, 'HH:mm:ss'),
      end_time: dayjs(event.end_time, 'HH:mm:ss'),
      is_all_day: Boolean(event.is_all_day),
      is_multi_day: Boolean(event.end_date && event.end_date !== event.date),
      end_date: event.end_date ? dayjs(event.end_date) : null,
      timezone: event.timezone,
      category: event.category,
      location_type: event.location_type,
      location: event.location,
      meeting_link: event.meeting_link,
      notes: event.notes,
      application: event.application,
    });
  };

  const handleDelete = async (event: Event, deleteType: 'instance' | 'series' = 'series') => {
    try {
      if (event.is_virtual && event.parent_event) {
        if (deleteType === 'series') {
          await deleteRecurringSeries(event.parent_event);
        } else {
          await deleteRecurringInstance(event.parent_event, event.date);
        }
      } else {
        await deleteEvent(event.id);
      }
      messageApi.success('Event deleted');
      fetchData();
      fetchCalendarData();
      setViewingEvent(null);
      return true;
    } catch (error) {
      messageApi.error('Failed to delete event');
      console.error(error);
      return false;
    }
  };

  const handleDeleteAction = (event: Event) => confirmEventDeletion(event, handleDelete);

  const handleCalendarHolidayDelete = async (holiday: Holiday) => {
    if (holiday.is_locked || !holiday.id) return false;
    try {
      await deleteHoliday(holiday.id);
      messageApi.success('Time off deleted');
      setEditingHoliday(null);
      await fetchCalendarData();
      return true;
    } catch (error) {
      messageApi.error('Failed to delete time off');
      console.error(error);
      return false;
    }
  };

  const handleDeleteAll = async () => {
    messageApi.info('Delete all not implemented yet');
    setIsDeleteAllOpen(false);
  };

  const onFinish = async (values: EventFormValues) => {
    const payload = {
      ...values,
      date: values.date.format('YYYY-MM-DD'),
      // Cleared when the toggle is off, so unticking Multi-day really shortens the event.
      end_date:
        values.is_multi_day && values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
      // An all-day event still needs times stored, so it spans the whole day.
      start_time: values.is_all_day ? '00:00:00' : values.start_time.format('HH:mm:ss'),
      end_time: values.is_all_day ? '23:59:00' : values.end_time.format('HH:mm:ss'),
      is_all_day: Boolean(values.is_all_day),
      is_recurring: !!recurrenceRule,
      recurrence_rule: recurrenceRule,
      reminder_minutes: 15,
    };

    // "This day only" saves a standalone override attached to the span instead of
    // rewriting the parent, so the rest of the run is untouched.
    if (spanScope?.scope === 'day' && editingId) {
      const parent = events.find((candidate) => candidate.id === editingId);
      const existing = events.find(
        (candidate) =>
          candidate.span_parent === editingId && candidate.override_date === spanScope.day
      );
      const dayPayload = {
        ...payload,
        end_date: null,
        is_recurring: false,
        recurrence_rule: null,
        span_parent: parent?.span_parent ?? editingId,
        override_date: spanScope.day,
      };
      try {
        if (existing) await updateEvent(existing.id, dayPayload);
        else await createEvent(dayPayload);
        messageApi.success(`Updated ${dayjs(spanScope.day).format('MMM D')} only`);
        setIsFormOpen(false);
        setSpanScope(null);
        fetchData();
        fetchCalendarData();
      } catch (error) {
        console.error('Failed to save the day override', error);
        messageApi.error(getApiErrorMessage(error, 'Could not save that day'));
      }
      return;
    }

    // Editing the whole span would wipe any day already edited on its own, so ask first.
    if (spanScope?.scope === 'all' && editingId) {
      const overrides = events.filter((candidate) => candidate.span_parent === editingId);
      if (overrides.length > 0) {
        askOverrideOverwrite(overrides.length, async (discard) => {
          try {
            if (discard) {
              await Promise.all(overrides.map((override) => deleteEvent(override.id)));
            }
            await updateEvent(editingId, payload);
            messageApi.success(discard ? 'Event updated; separate days replaced' : 'Event updated');
            setIsFormOpen(false);
            setSpanScope(null);
            fetchData();
            fetchCalendarData();
          } catch (error) {
            console.error('Failed to update the span', error);
            messageApi.error(getApiErrorMessage(error, 'Could not update the event'));
          }
        });
        return;
      }
      setSpanScope(null);
    }

    try {
      if (editingId) {
        const existing = events.find((e) => e.id === editingId);
        if (existing?.is_virtual && existing.parent_event) {
          Modal.confirm({
            title: 'Update Recurring Series?',
            content:
              'This is an instance of a recurring event. Do you want to update the entire series?',
            onOk: async () => {
              if (existing.parent_event) {
                await updateRecurringSeries(existing.parent_event, payload);
                if (recurrenceRule) await setRecurrence(existing.parent_event, recurrenceRule);
              }
              messageApi.success('Series updated');
              setIsFormOpen(false);
              fetchData();
              fetchCalendarData();
            },
          });
          return;
        }
        await updateEvent(editingId, payload);
        messageApi.success('Event updated');
      } else {
        const res = await createEvent(payload);
        if (recurrenceRule && res.data.id) {
          await setRecurrence(res.data.id, recurrenceRule);
        }
        messageApi.success('Event created');
      }
      setIsFormOpen(false);
      fetchData();
      fetchCalendarData();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if (apiError.response?.status === 400 && apiError.response?.data?.conflict) {
        Modal.confirm({
          title: 'Schedule Conflict',
          content: 'Conflict detected. Force save?',
          onOk: async () => {
            if (editingId) await updateEvent(editingId, payload, { force: true });
            else await createEvent(payload, { force: true });
            setIsFormOpen(false);
            fetchData();
            fetchCalendarData();
          },
        });
      } else {
        messageApi.error('Failed to save event');
      }
    }
  };

  const handleImportUpload = async () => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    try {
      await importData(formData);
      messageApi.success('Import successful');
      setShowImport(false);
      fetchData();
    } catch (error) {
      messageApi.error('Import failed');
      console.error(error);
    }
  };

  const handleCalendarHolidaySubmit = async (values: CalendarHolidayFormValues) => {
    try {
      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, {
          description: values.description?.trim() || editingHoliday.description,
          is_recurring: !!values.is_recurring,
          tab: values.tab || null,
        });
        messageApi.success('Time off updated');
      } else if (pendingCalendarHoliday) {
        await createHoliday({
          date: dayjs(pendingCalendarHoliday.date).format('YYYY-MM-DD'),
          description: values.description?.trim() || pendingCalendarHoliday.target.label,
          is_recurring: !!values.is_recurring,
          tab: values.tab || null,
        });
        messageApi.success('Time off added');
      }

      setEditingHoliday(null);
      setPendingCalendarHoliday(null);
      fetchCalendarData();
    } catch (error) {
      messageApi.error(editingHoliday ? 'Failed to update time off' : 'Failed to create time off');
      console.error(error);
    }
  };

  const handleExportWrapper = async (format: string) => {
    const response = await exportEvents(format);
    return {
      data: response.data,
      headers: response.headers as unknown as Record<string, string>,
    };
  };

  const toggleLock = async (event: Event) => {
    try {
      await updateEvent(event.id, { is_locked: !event.is_locked });
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, is_locked: !e.is_locked } : e))
      );
      messageApi.success(event.is_locked ? 'Event unlocked' : 'Event locked');
      fetchCalendarData();
    } catch (error) {
      messageApi.error('Failed to toggle lock');
      console.error(error);
    }
  };

  const handleSelectChange = (id: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredEvents.map((e) => e.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = () => {
    Modal.confirm({
      title: 'Delete Selected Events',
      content: `Are you sure you want to delete ${selectedIds.length} events?`,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          const realIds = selectedIds.filter((id) => id > 0);
          await Promise.all(realIds.map((id) => deleteEvent(id)));
          messageApi.success(`${realIds.length} events deleted`);
          setSelectedIds([]);
          fetchData();
        } catch {
          messageApi.error('Failed to delete some events');
          fetchData();
        }
      },
    });
  };

  const handleBulkToggleLock = async (lock: boolean) => {
    try {
      const realIds = selectedIds.filter((id) => id > 0);
      await Promise.all(realIds.map((id) => updateEvent(id, { is_locked: lock })));
      messageApi.success(`${realIds.length} events ${lock ? 'locked' : 'unlocked'}`);
      setSelectedIds([]);
      fetchData();
    } catch {
      messageApi.error(`Failed to ${lock ? 'lock' : 'unlock'} some events`);
      fetchData();
    }
  };

  const isAnySelectedLocked = selectedIds.some((id) => {
    const ev = events.find((e) => e.id === id);
    return ev?.is_locked;
  });

  const formatEventTime = (event: Event, userTz: string) => {
    const eventTz = normalizeTimeZone(event.timezone);
    const displayTz = normalizeTimeZone(userTz);
    if (eventTz === displayTz) return null;

    try {
      const startDt = dayjs
        .tz(`${event.date} ${event.start_time}`, 'YYYY-MM-DD HH:mm:ss', eventTz)
        .tz(displayTz);
      const endDt = dayjs
        .tz(`${event.date} ${event.end_time}`, 'YYYY-MM-DD HH:mm:ss', eventTz)
        .tz(displayTz);

      if (!startDt.isValid() || !endDt.isValid()) return null;

      return `(${startDt.format('HH:mm')} - ${endDt.format('HH:mm')} ${displayTz})`;
    } catch {
      return null;
    }
  };

  // Confirmed before saving: a drop is easy to trigger by accident on a dense month grid.
  const handleCalendarItemDrop = (item: CalendarDragItem, day: Date) => {
    const nextDate = dayjs(day).format('YYYY-MM-DD');
    if (item.kind === 'event') {
      if (nextDate === item.event.date) return;
      confirmEventMove(item.event, day, async (event) => {
        try {
          await updateEvent(event.id, buildEventMovePatch(event, day));
          messageApi.success(`Moved "${event.name}" to ${dayjs(day).format('MMM D, YYYY')}`);
          await fetchData();
          await fetchCalendarData();
        } catch (error) {
          console.error('Failed to move event', error);
          messageApi.error(getApiErrorMessage(error, 'Could not move the event'));
        }
      });
      return;
    }
    if (nextDate === item.holiday.date) return;
    confirmHolidayMove(item.holiday, day, async (holiday) => {
      try {
        await updateHoliday(holiday.id, { date: nextDate });
        messageApi.success(
          `Moved "${holiday.description || 'time off'}" to ${dayjs(day).format('MMM D, YYYY')}`
        );
        await fetchData();
        await fetchCalendarData();
      } catch (error) {
        console.error('Failed to move time off', error);
        messageApi.error(getApiErrorMessage(error, 'Could not move the time off'));
      }
    });
  };

  return (
    <>
      {contextHolder}
      <div className="p-0">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header & Actions */}
          <PageActionToolbar
            title="Events"
            subtitle={`${eventsTotal.toLocaleString()} events`}
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
            availableYears={availableYears}
            secondaryActions={
              <Button
                className="toolbar-btn"
                size="large"
                icon={<LinkOutlined />}
                onClick={() => setIsLinkInterviewsOpen(true)}
              >
                Link interviews
              </Button>
            }
            secondaryMenuItems={[
              {
                key: 'link-interviews',
                icon: <LinkOutlined />,
                label: 'Link interviews',
                onClick: () => setIsLinkInterviewsOpen(true),
              },
            ]}
            viewSwitch={
              <SegmentedToggle
                value={contentView}
                onChange={setContentView}
                wrapperClassName="page-toolbar-view-switch rounded-xl border border-gray-200 bg-white p-1"
                buttonClassName="px-3 py-1.5"
                options={[
                  { value: 'list', label: 'List', activeClassName: 'bg-blue-50 text-blue-700' },
                  {
                    value: 'calendar',
                    label: 'Calendar',
                    activeClassName: 'bg-blue-50 text-blue-700',
                  },
                ]}
              />
            }
            extraActions={
              <Select
                aria-label="Display timezone"
                value={normalizeTimeZone(userTimezone)}
                onChange={(value) => setUserTimezone(normalizeTimeZone(value))}
                className="toolbar-select w-full md:w-[260px]"
                size="large"
                showSearch
                optionFilterProp="label"
                options={TIMEZONE_OPTIONS}
              />
            }
            onDeleteAll={() => setIsDeleteAllOpen(true)}
            deleteAllDisabled={eventsUnlocked === 0}
            onExport={handleExportWrapper}
            exportFilename="events"
            onImport={() => setShowImport(true)}
            onPrimaryAction={handleAdd}
            primaryActionLabel="Add Event"
            primaryActionIcon={<PlusOutlined />}
          />

          {contentView === 'list' && listLoadFailed ? (
            <PageState
              tone="error"
              title="Events could not be loaded"
              description="Your saved events were not changed. Check your connection and try again."
              actionLabel="Retry loading events"
              onAction={() => void fetchData()}
            />
          ) : contentView === 'list' ? (
            <>
              <EventsFilterBar
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                sortOrder={sortOrder}
                onSortOrderToggle={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                categories={categories}
              />

              {!loading && paginatedEvents.length === 0 ? (
                eventEmptyState
              ) : (
                <Card
                  className="enterprise-section overflow-hidden"
                  title={
                    <BulkActionHeader
                      selectedCount={selectedIds.length}
                      totalCount={events.length}
                      onSelectAll={handleSelectAll}
                      onCancelSelection={() => setSelectedIds([])}
                      title="All Events"
                      bulkActions={
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => handleBulkToggleLock(true)}
                            icon={<LockOutlined />}
                          >
                            Lock
                          </Button>
                          <Button
                            onClick={() => handleBulkToggleLock(false)}
                            icon={<UnlockOutlined />}
                          >
                            Unlock
                          </Button>
                          <Tooltip
                            title={
                              isAnySelectedLocked
                                ? 'Cannot delete while locked items are selected'
                                : ''
                            }
                          >
                            <Button
                              danger
                              onClick={handleBulkDelete}
                              icon={<DeleteOutlined />}
                              disabled={isAnySelectedLocked}
                            >
                              Delete
                            </Button>
                          </Tooltip>
                        </div>
                      }
                    />
                  }
                >
                  <EventsGrid
                    loading={loading}
                    events={paginatedEvents}
                    userTimezone={userTimezone}
                    onToggleLock={toggleLock}
                    onView={setViewingEvent}
                    onEdit={(event: Event) => handleEdit(event, viewingDay || undefined)}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDeleteAction}
                    formatEventTime={formatEventTime}
                    selectedIds={selectedIds}
                    onSelectChange={handleSelectChange}
                  />

                  {!loading && eventsTotal > pageSize && (
                    <div className="flex justify-end mt-6 pb-4 px-4">
                      <Pagination
                        current={currentPage}
                        pageSize={pageSize}
                        total={eventsTotal}
                        onChange={(page, size) => {
                          setCurrentPage(page);
                          if (size && size !== pageSize) {
                            setPageSize(size);
                            setCurrentPage(1);
                          }
                        }}
                        showSizeChanger
                        pageSizeOptions={['12', '24', '48', '96']}
                        size={isMobile ? 'small' : undefined}
                      />
                    </div>
                  )}
                </Card>
              )}
            </>
          ) : calendarLoadFailed ? (
            <PageState
              tone="error"
              title="Calendar could not be loaded"
              description="Your events and holidays were not changed. Check your connection and try again."
              actionLabel="Retry loading calendar"
              onAction={() => void fetchCalendarData()}
            />
          ) : (
            <CalendarView
              onItemDrop={handleCalendarItemDrop}
              events={calendarEvents}
              customHolidays={customHolidays}
              federalHolidays={federalHolidays}
              categories={categories}
              holidayTabs={holidayTabs}
              addActionHighlight="events"
              loading={calendarLoading}
              onEventSelect={(event, day) => {
                setViewingEvent(event);
                setViewingDay(day ? dayjs(day).format('YYYY-MM-DD') : null);
              }}
              onHolidaySelect={handleHolidaySelect}
              onAddEvent={handleAdd}
              onAddHoliday={handleCalendarHolidayAdd}
            />
          )}
        </Space>
      </div>

      <LinkInterviewsModal
        open={isLinkInterviewsOpen}
        onClose={() => setIsLinkInterviewsOpen(false)}
        onLinked={() => {
          void fetchData();
          void fetchCalendarData();
        }}
      />

      <EventEditorModal
        open={isFormOpen}
        editingId={editingId}
        form={form}
        onCancel={() => setIsFormOpen(false)}
        onFinish={onFinish}
        defaultDuration={defaultDuration}
        categories={categories}
        newCategoryName={newCategoryName}
        onNewCategoryNameChange={setNewCategoryName}
        newCategoryIcon={newCategoryIcon}
        onNewCategoryIconChange={setNewCategoryIcon}
        onCreateCategory={async () => {
          if (!newCategoryName) return;
          await createCategory({
            name: newCategoryName,
            color: '#2563eb',
            icon: newCategoryIcon,
          });
          fetchCategories();
          setNewCategoryName('');
          setNewCategoryIcon('tag');
        }}
        locationType={locationType}
        onLocationTypeChange={setLocationType}
        recurrenceRule={recurrenceRule}
        onOpenRecurrence={() => setShowRecurrenceModal(true)}
        onClearRecurrence={() => setRecurrenceRule(null)}
      />

      {/* Recurrence Component */}
      <RecurrenceModal
        isOpen={showRecurrenceModal}
        onClose={() => setShowRecurrenceModal(false)}
        onSave={(rule) => {
          setRecurrenceRule(rule);
          setShowRecurrenceModal(false);
        }}
        initialRule={recurrenceRule || undefined}
      />

      <EventViewModal
        event={viewingEvent}
        onClose={() => setViewingEvent(null)}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />

      <CalendarHolidayModal
        open={!!pendingCalendarHoliday || !!editingHoliday}
        mode={editingHoliday ? 'edit' : 'add'}
        date={pendingCalendarHoliday?.date}
        target={pendingCalendarHoliday?.target}
        holiday={editingHoliday}
        holidayTabs={holidayTabs}
        onCancel={() => {
          setPendingCalendarHoliday(null);
          setEditingHoliday(null);
        }}
        onSubmit={handleCalendarHolidaySubmit}
        onDelete={handleCalendarHolidayDelete}
      />

      {/* Import Modal */}
      <Modal
        title="Import Data"
        open={showImport}
        onCancel={() => setShowImport(false)}
        onOk={handleImportUpload}
        okText="Upload"
        confirmLoading={loading}
        width={isMobile ? '100%' : undefined}
      >
        <Input
          type="file"
          onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
        />
      </Modal>

      {/* Delete All Modal */}
      <Modal
        title="Delete All Events"
        open={isDeleteAllOpen}
        onCancel={() => setIsDeleteAllOpen(false)}
        onOk={handleDeleteAll}
        okType="danger"
        okText="Delete All"
        width={isMobile ? '100%' : undefined}
      >
        <Text>Are you sure you want to delete all events? This cannot be undone.</Text>
      </Modal>
    </>
  );
};

export default Events;
