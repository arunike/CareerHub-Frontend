import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { PlusOutlined, LockOutlined, UnlockOutlined, DeleteOutlined } from '@ant-design/icons';
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
  getApplicationOptions,
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
import SegmentedToggle from '../../components/SegmentedToggle';
import EventsFilterBar from './components/EventsFilterBar';
import EventsGrid from './components/EventsGrid';
import EventEditorModal from './components/EventEditorModal';
import EventViewModal from './components/EventViewModal';
import { getCurrentYear } from '../../utils/yearFilter';
import { usePersistedState } from '../../hooks/usePersistedState';
import { TIMEZONE_OPTIONS, getBrowserTimeZone, normalizeTimeZone } from '../../lib/timezones';
import { useLocation, useNavigate } from 'react-router-dom';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezonePlugin);

const { Text } = Typography;

type EventFormValues = {
  date: dayjs.Dayjs;
  start_time: dayjs.Dayjs;
  end_time: dayjs.Dayjs;
  [key: string]: unknown;
};

type ApiError = { response?: { status?: number; data?: { conflict?: boolean } } };
type PaginatedEventsResponse = {
  count: number;
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarLoadError, setCalendarLoadError] = useState(false);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [applications, setApplications] = useState<
    Array<{
      id: number;
      company_details?: { name: string };
      role_title: string;
      [key: string]: unknown;
    }>
  >([]);
  const [hasLoadedApplications, setHasLoadedApplications] = useState(false);

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
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
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
      } else {
        setEvents(data);
        setEventsTotal(data.length);
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

  const ensureApplicationsLoaded = useCallback(async () => {
    if (hasLoadedApplications) return;

    try {
      const res = await getApplicationOptions({ page_size: 100 });
      setApplications(res.data);
      setHasLoadedApplications(true);
    } catch (error) {
      messageApi.error('Failed to load applications');
      console.error(error);
    }
  }, [hasLoadedApplications, messageApi]);

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
    (date?: Date) => {
      setEditingId(null);
      setRecurrenceRule(null);
      setLocationType('virtual');
      setIsFormOpen(true);
      void ensureApplicationsLoaded();
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
    [defaultCategory, defaultDuration, ensureApplicationsLoaded, form, userTimezone]
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

  const handleEdit = (event: Event) => {
    setEditingId(event.id);
    setIsFormOpen(true);
    void ensureApplicationsLoaded();
    setRecurrenceRule(event.recurrence_rule as RecurrenceRule);
    setLocationType(event.location_type);

    form.setFieldsValue({
      name: event.name,
      date: dayjs(event.date),
      start_time: dayjs(event.start_time, 'HH:mm:ss'),
      end_time: dayjs(event.end_time, 'HH:mm:ss'),
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
    } catch (error) {
      messageApi.error('Failed to delete event');
      console.error(error);
    }
  };

  const handleDeleteAction = (event: Event) => {
    if (event.is_virtual && event.parent_event) {
      Modal.confirm({
        title: 'Delete Recurring Event',
        content: 'Delete this occurrence or the entire series?',
        okText: 'Entire Series',
        cancelText: 'Just this occurrence',
        closable: true,
        onOk: () => handleDelete(event, 'series'),
        onCancel: () => {
          handleDelete(event, 'instance');
        },
      });
      return;
    }

    Modal.confirm({
      title: 'Delete event?',
      content: 'Are you sure?',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => handleDelete(event, 'series'),
    });
  };

  const handleDeleteAll = async () => {
    messageApi.info('Delete all not implemented yet');
    setIsDeleteAllOpen(false);
  };

  const onFinish = async (values: EventFormValues) => {
    const payload = {
      ...values,
      date: values.date.format('YYYY-MM-DD'),
      start_time: values.start_time.format('HH:mm:ss'),
      end_time: values.end_time.format('HH:mm:ss'),
      is_recurring: !!recurrenceRule,
      recurrence_rule: recurrenceRule,
      reminder_minutes: 15,
    };

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
        messageApi.success('Holiday updated');
      } else if (pendingCalendarHoliday) {
        await createHoliday({
          date: dayjs(pendingCalendarHoliday.date).format('YYYY-MM-DD'),
          description: values.description?.trim() || pendingCalendarHoliday.target.label,
          is_recurring: !!values.is_recurring,
          tab: values.tab || null,
        });
        messageApi.success('Holiday added');
      }

      setEditingHoliday(null);
      setPendingCalendarHoliday(null);
      fetchCalendarData();
    } catch (error) {
      messageApi.error(editingHoliday ? 'Failed to update holiday' : 'Failed to create holiday');
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

  return (
    <>
      {contextHolder}
      <div className="p-0">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header & Actions */}
          <PageActionToolbar
            title="Events"
            subtitle={`${eventsTotal.toLocaleString()} events`}
            showExtraActionsOnMobile
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
            availableYears={availableYears}
            extraActions={
              <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
                <SegmentedToggle
                  value={contentView}
                  onChange={setContentView}
                  wrapperClassName="rounded-xl border border-gray-200 bg-white p-1 shadow-sm"
                  buttonClassName="px-3 py-2"
                  options={[
                    { value: 'list', label: 'List', activeClassName: 'bg-blue-50 text-blue-700' },
                    {
                      value: 'calendar',
                      label: 'Calendar',
                      activeClassName: 'bg-blue-50 text-blue-700',
                    },
                  ]}
                />
                <Select
                  value={normalizeTimeZone(userTimezone)}
                  onChange={(value) => setUserTimezone(normalizeTimeZone(value))}
                  style={{ width: 260 }}
                  className="toolbar-select max-w-full"
                  size="large"
                  showSearch
                  optionFilterProp="label"
                  options={TIMEZONE_OPTIONS}
                />
              </div>
            }
            onDeleteAll={() => setIsDeleteAllOpen(true)}
            deleteAllDisabled={eventsTotal === 0}
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
                    onEdit={handleEdit}
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
              events={calendarEvents}
              customHolidays={customHolidays}
              federalHolidays={federalHolidays}
              categories={categories}
              holidayTabs={holidayTabs}
              addActionHighlight="events"
              loading={calendarLoading}
              onEventSelect={setViewingEvent}
              onHolidaySelect={handleHolidaySelect}
              onAddEvent={handleAdd}
              onAddHoliday={handleCalendarHolidayAdd}
            />
          )}
        </Space>
      </div>

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
        applications={applications}
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
