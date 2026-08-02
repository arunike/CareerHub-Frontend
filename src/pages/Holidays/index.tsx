import React, { useState, useEffect } from 'react';
import {
  Tabs,
  List,
  Button,
  Card,
  Typography,
  Tag,
  Space,
  Form,
  Input,
  DatePicker,
  Checkbox,
  message,
  Popconfirm,
  Row,
  Col,
  Select,
  Switch,
  Tooltip,
} from 'antd';
import Modal from '../../components/MobileModal';
import {
  DeleteOutlined,
  LockOutlined,
  PlusOutlined,
  SyncOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  UnlockOutlined,
  EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getHolidays,
  getFederalHolidays,
  getEvents,
  getCategories,
  createCategory,
  createEvent,
  createHoliday,
  deleteEvent,
  deleteHoliday,
  deleteRecurringInstance,
  deleteRecurringSeries,
  setRecurrence,
  updateEvent,
  updateHoliday,
  updateRecurringSeries,
  exportHolidays,
  getApplicationOptions,
  importData,
  getUserSettings,
  updateUserSettings,
} from '../../api';
import type {
  Event,
  EventCategory,
  Holiday,
  RecurrenceRule,
  UserSettings,
  HolidayTab,
} from '../../types';
import type { CalendarHolidayTarget } from '../../components/calendarView/types';
import PageActionToolbar from '../../components/PageActionToolbar';
import BulkActionHeader from '../../components/BulkActionHeader';
import CalendarView from '../../components/CalendarView';
import RecurrenceModal from '../../components/RecurrenceModal';
import SegmentedToggle from '../../components/SegmentedToggle';
import { ListSkeleton } from '../../components/SkeletonLoader';
import RowActions from '../../components/RowActions';
import { getAvailableYears, getCurrentYear } from '../../utils/yearFilter';
import { usePersistedState } from '../../hooks/usePersistedState';
import { getHolidayTabColor } from '../../utils/holidayTabColors';
import { getBrowserTimeZone, normalizeTimeZone } from '../../lib/timezones';
import EventEditorModal from '../Events/components/EventEditorModal';
import EventViewModal from '../Events/components/EventViewModal';
import CalendarHolidayModal from '../../components/calendarView/CalendarHolidayModal';
import type { CalendarHolidayFormValues } from '../../components/calendarView/CalendarHolidayModal';
import type { EventDeleteScope } from '../../components/calendarView/confirmCalendarDeletion';
import { PageState } from '../../components/PageState';
import { useLocation, useNavigate } from 'react-router-dom';
import SelectionCheckbox from '../../components/SelectionCheckbox';
import FederalHolidayCard, {
  groupFederalHolidays,
  type FederalHolidayGroup,
} from './components/FederalHolidayCard';
import { projectHolidaysForYear } from './holidayYearProjection';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';

const { Text } = Typography;
const { RangePicker } = DatePicker;

type EventFormValues = {
  date: dayjs.Dayjs;
  start_time: dayjs.Dayjs;
  end_time: dayjs.Dayjs;
  [key: string]: unknown;
};

type ApiError = { response?: { status?: number; data?: { conflict?: boolean } } };

const createHolidayGroupId = () =>
  crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

const getInclusiveHolidayDates = (start: dayjs.Dayjs, end: dayjs.Dayjs) => {
  const dates: dayjs.Dayjs[] = [];
  let current = start.startOf('day');

  while (current.isBefore(end, 'day') || current.isSame(end, 'day')) {
    dates.push(current);
    current = current.add(1, 'day');
  }

  return dates;
};

const GroupedHolidayItem = ({
  item,
  handleToggleLockGroup,
  handleDeleteGroup,
  toggleLock,
  handleDelete,
  handleEditItem,
  handleDuplicateHoliday,
  selectedIds,
  onSelectChange,
  onSelectGroup,
}: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const startDate = item.items[0].date;
  const endDate = item.items[item.items.length - 1].date;

  const allSelected = item.items.every((i: any) => selectedIds.includes(i.id));
  const someSelected = item.items.some((i: any) => selectedIds.includes(i.id)) && !allSelected;

  const titleText = item.description || 'Time Off Range';
  const startDayjs = dayjs(startDate);
  const endDayjs = dayjs(endDate);
  const formattedRange = `${startDayjs.format('MMM D')} – ${endDayjs.format('MMM D, YYYY')}`;

  return (
    <List.Item key={`group-item-${item.id}`} className="holiday-list-item">
      <div className="group w-full rounded-xl border border-slate-200/80 bg-white px-5 py-3.5 sm:px-6 sm:py-4 shadow-2xs transition-all duration-200 hover:border-red-200 hover:shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <SelectionCheckbox
              selectionLabel={`${titleText} from ${startDayjs.format('MMMM D, YYYY')} to ${endDayjs.format('MMMM D, YYYY')}`}
              checked={allSelected}
              indeterminate={someSelected}
              onChange={() => onSelectGroup(item.items, !allSelected)}
            />

            {/* Calendar Tile for Range */}
            {(() => {
              const isSameMonth =
                startDayjs.isSame(endDayjs, 'month') && startDayjs.isSame(endDayjs, 'year');
              const isSameDay = isSameMonth && startDayjs.isSame(endDayjs, 'day');

              if (isSameDay) {
                return (
                  <div className="flex h-[52px] w-12 shrink-0 flex-col items-center overflow-hidden rounded-xl border border-red-200/80 bg-white shadow-2xs">
                    <div className="flex h-[18px] w-full items-center justify-center bg-gradient-to-r from-red-500 via-rose-500 to-red-600">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-white">
                        {startDayjs.format('MMM')}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                      <span className="text-sm font-extrabold tracking-tight text-slate-800 whitespace-nowrap">
                        {startDayjs.format('DD')}
                      </span>
                    </div>
                  </div>
                );
              }

              if (isSameMonth) {
                return (
                  <div className="flex h-[52px] w-[76px] shrink-0 flex-col items-center overflow-hidden rounded-xl border border-red-200/80 bg-white shadow-2xs">
                    <div className="flex h-[18px] w-full items-center justify-center bg-gradient-to-r from-red-500 via-rose-500 to-red-600">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-white">
                        {startDayjs.format('MMM')}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                      <span className="text-xs font-extrabold tracking-tight text-slate-800 whitespace-nowrap">
                        {startDayjs.format('D')} – {endDayjs.format('D')}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex h-[52px] w-12 shrink-0 flex-col items-center overflow-hidden rounded-xl border border-red-200/80 bg-white shadow-2xs">
                    <div className="flex h-[18px] w-full items-center justify-center bg-gradient-to-r from-red-500 via-rose-500 to-red-600">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-white">
                        {startDayjs.format('MMM')}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                      <span className="text-sm font-extrabold tracking-tight text-slate-800 whitespace-nowrap">
                        {startDayjs.format('DD')}
                      </span>
                    </div>
                  </div>
                  <span className="text-slate-400 font-bold text-xs px-0.5">→</span>
                  <div className="flex h-[52px] w-12 shrink-0 flex-col items-center overflow-hidden rounded-xl border border-red-200/80 bg-white shadow-2xs">
                    <div className="flex h-[18px] w-full items-center justify-center bg-gradient-to-r from-red-500 via-rose-500 to-red-600">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-white">
                        {endDayjs.format('MMM')}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                      <span className="text-sm font-extrabold tracking-tight text-slate-800 whitespace-nowrap">
                        {endDayjs.format('DD')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900 text-base sm:text-lg leading-tight truncate">
                  {titleText}
                </span>
                <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  {item.items.length} Days
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-600">{formattedRange}</span>

                {item.is_recurring && (
                  <Tag
                    color="blue"
                    icon={<SyncOutlined />}
                    className="m-0 rounded border-sky-200 bg-sky-50 text-sky-700 text-xs font-medium px-1.5 py-0"
                  >
                    Yearly
                  </Tag>
                )}

                {item.is_locked && (
                  <Tag
                    color="gold"
                    icon={<LockOutlined />}
                    className="m-0 rounded border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium px-1.5 py-0"
                  >
                    Locked
                  </Tag>
                )}
              </div>
            </div>
          </div>

          <div className="holiday-item-actions flex shrink-0 items-center justify-end gap-2">
            <Button
              type="text"
              size="small"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-medium text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg px-2.5 py-1 flex items-center gap-1"
            >
              {isExpanded ? 'Hide Days ▲' : `View Days (${item.items.length}) ▼`}
            </Button>
            <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 p-0.5">
              <RowActions
                key={`actions-group-${item.id}`}
                size="middle"
                isLocked={item.is_locked}
                onToggleLock={() => handleToggleLockGroup(item)}
                onEdit={() => handleEditItem(item)}
                onDuplicate={() => handleDuplicateHoliday(item)}
                onDelete={() => handleDeleteGroup(item)}
                disableDelete={item.is_locked}
              />
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5">
            <div className="text-xs font-semibold text-slate-500 px-1">Individual Days:</div>
            <div className="space-y-1.5 pl-3 border-l-2 border-indigo-200">
              {item.items.map((subItem: any) => (
                <div
                  key={`sub-${subItem.id}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50/80 px-3 py-2 border border-slate-200/50 hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <SelectionCheckbox
                      selectionLabel={`holiday on ${dayjs(subItem.date).format('MMMM D, YYYY')}`}
                      checked={selectedIds.includes(subItem.id)}
                      onChange={(e) => onSelectChange(subItem.id, e.target.checked)}
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      {dayjs(subItem.date).format('dddd, MMMM D, YYYY')}
                    </span>
                  </div>
                  <RowActions
                    key={`actions-${subItem.id}`}
                    size="small"
                    isLocked={subItem.is_locked}
                    onToggleLock={() => toggleLock(subItem)}
                    onEdit={() => handleEditItem(subItem)}
                    onDuplicate={() => handleDuplicateHoliday(subItem)}
                    onDelete={() => handleDelete(subItem.id)}
                    disableDelete={subItem.is_locked}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </List.Item>
  );
};

const Holidays = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [eventForm] = Form.useForm();

  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [applications, setApplications] = useState<
    Array<{
      id: number;
      company_details?: { name: string };
      role_title: string;
      [key: string]: unknown;
    }>
  >([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [federalHolidays, setFederalHolidays] = useState<Holiday[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [activeTab, setActiveTab] = useState('custom');

  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedYear, setSelectedYear] = usePersistedState<number | 'all'>(
    'holidaysSelectedYear',
    getCurrentYear(),
    {
      serialize: (value) => value.toString(),
      deserialize: (raw) => (raw === 'all' ? 'all' : parseInt(raw)),
    }
  );
  const [contentView, setContentView] = usePersistedState<'list' | 'calendar'>(
    'holidaysContentView',
    'list',
    {
      serialize: (value) => value,
      deserialize: (raw) => (raw === 'calendar' ? 'calendar' : 'list'),
    }
  );

  const [isRangeMode, setIsRangeMode] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const [addFederalModalOpen, setAddFederalModalOpen] = useState(false);
  const [isFederalRangeMode, setIsFederalRangeMode] = useState(false);
  const [federalForm] = Form.useForm();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [pendingCalendarHoliday, setPendingCalendarHoliday] = useState<{
    date: Date;
    target: CalendarHolidayTarget;
  } | null>(null);
  const [editingCalendarHoliday, setEditingCalendarHoliday] = useState<Holiday | null>(null);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [hasLoadedApplications, setHasLoadedApplications] = useState(false);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [locationType, setLocationType] = useState<'in_person' | 'virtual' | 'hybrid'>('virtual');

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') !== 'create') return;
    setActiveTab('custom');
    setContentView('list');
    navigate('/holidays', { replace: true });
    window.setTimeout(() => {
      const createForm = document.getElementById('holiday-create-form');
      createForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      createForm?.querySelector<HTMLInputElement>('.ant-picker input')?.focus();
    }, 120);
  }, [location.search, navigate, setContentView]);

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
      messageApi.error('Failed to load holidays');
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

  const isAnySelectedLocked = React.useMemo(() => {
    return selectedIds.some((id) => {
      const holiday = holidays.find((h) => h.id === id);
      return holiday?.is_locked;
    });
  }, [selectedIds, holidays]);

  const sortedFederalHolidays = [...federalHolidays].sort((a, b) =>
    dayjs(a.date).diff(dayjs(b.date))
  );
  const groupedFederalHolidays = groupFederalHolidays(sortedFederalHolidays);

  const availableYears = Array.from(
    new Set([...getAvailableYears(holidays, 'date'), getCurrentYear() + 1])
  ).sort((a, b) => b - a);
  const hasLoadedData =
    holidays.length > 0 ||
    federalHolidays.length > 0 ||
    events.length > 0 ||
    categories.length > 0 ||
    userSettings !== null;

  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
  };

  const handleAdd = async (values: any) => {
    const description = values.name || 'Custom Holiday';
    const isRecurring = values.is_recurring;
    const tabValue = activeTab === 'custom' ? undefined : activeTab;

    if (isRangeMode && values.dateRange) {
      const [start, end] = values.dateRange;
      if (end.isBefore(start)) {
        messageApi.error('End date must be after start date');
        return;
      }

      const groupId = createHolidayGroupId();
      const promises = getInclusiveHolidayDates(start, end).map((date) =>
        createHoliday({
          date: date.format('YYYY-MM-DD'),
          group_id: groupId,
          description,
          is_recurring: isRecurring,
          tab: tabValue,
        })
      );

      try {
        await Promise.all(promises);
        messageApi.success('Holiday collection added');
        form.resetFields();
        fetchData();
      } catch (e) {
        messageApi.error('Failed to create holiday collection');
        fetchData();
      }
    } else if (values.date) {
      try {
        await createHoliday({
          date: values.date.format('YYYY-MM-DD'),
          description,
          is_recurring: isRecurring,
          tab: tabValue,
        });
        messageApi.success('Holiday added');
        form.resetFields();
        fetchData();
      } catch (error) {
        messageApi.error('Failed to create holiday');
      }
    }
  };

  const closeFederalModal = () => {
    federalForm.resetFields();
    setIsFederalRangeMode(false);
    setAddFederalModalOpen(false);
  };

  const handleAddFederal = async () => {
    try {
      const values = await federalForm.validateFields();
      const description = values.description.trim();
      const isRecurring = values.is_recurring || false;

      if (isFederalRangeMode) {
        const [start, end] = values.dateRange;
        if (end.isBefore(start, 'day')) {
          messageApi.error('End date must be after start date');
          return;
        }

        const groupId = createHolidayGroupId();
        await Promise.all(
          getInclusiveHolidayDates(start, end).map((date) =>
            createHoliday({
              date: date.format('YYYY-MM-DD'),
              group_id: groupId,
              description,
              is_recurring: isRecurring,
              holiday_type: 'federal',
            })
          )
        );
        messageApi.success('Observed holiday range added');
      } else {
        await createHoliday({
          date: values.date.format('YYYY-MM-DD'),
          description,
          is_recurring: isRecurring,
          holiday_type: 'federal',
        });
        messageApi.success('Observed holiday added');
      }

      closeFederalModal();
      fetchData();
    } catch (error) {
      if (error && (error as any).errorFields) {
        return;
      }
      messageApi.error('Failed to create observed holiday');
      fetchData();
    }
  };

  const handleCalendarHolidayAdd = (date: Date, target: CalendarHolidayTarget) => {
    setEditingCalendarHoliday(null);
    setPendingCalendarHoliday({ date, target });
  };

  const handleCalendarHolidaySelect = (holiday: Holiday) => {
    setPendingCalendarHoliday(null);
    setEditingCalendarHoliday(holiday);
  };

  const handleCalendarHolidaySubmit = async (values: CalendarHolidayFormValues) => {
    try {
      if (editingCalendarHoliday) {
        await updateHoliday(editingCalendarHoliday.id, {
          description: values.description?.trim() || editingCalendarHoliday.description,
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

      setPendingCalendarHoliday(null);
      setEditingCalendarHoliday(null);
      fetchData();
    } catch (error) {
      messageApi.error(
        editingCalendarHoliday ? 'Failed to update holiday' : 'Failed to create holiday'
      );
      console.error(error);
    }
  };

  const ensureApplicationsLoaded = async () => {
    if (hasLoadedApplications) return;

    try {
      const response = await getApplicationOptions({ page_size: 100 });
      setApplications(response.data);
      setHasLoadedApplications(true);
    } catch (error) {
      messageApi.error('Failed to load applications');
      console.error(error);
    }
  };

  const handleCalendarEventSelect = (event: Event) => {
    setViewingEvent(event);
  };

  const handleCalendarAddEvent = (date: Date) => {
    const now = dayjs();
    const roundedMinute = Math.ceil(now.minute() / 5) * 5;
    const start =
      roundedMinute === 60
        ? now.add(1, 'hour').minute(0).second(0)
        : now.minute(roundedMinute).second(0);

    setViewingEvent(null);
    setEditingEventId(null);
    setRecurrenceRule(null);
    setLocationType('virtual');
    setIsEventFormOpen(true);
    void ensureApplicationsLoaded();
    eventForm.resetFields();
    eventForm.setFieldsValue({
      date: dayjs(date),
      start_time: start,
      end_time: start.add(defaultEventDuration, 'minute'),
      timezone: userTimezone,
      location_type: 'virtual',
    });
  };

  const handleEventEdit = (event: Event) => {
    setViewingEvent(null);
    setEditingEventId(event.id);
    setIsEventFormOpen(true);
    void ensureApplicationsLoaded();
    setRecurrenceRule((event.recurrence_rule as RecurrenceRule) || null);
    setLocationType(event.location_type || 'virtual');

    eventForm.setFieldsValue({
      name: event.name,
      date: dayjs(event.date),
      start_time: dayjs(event.start_time, 'HH:mm:ss'),
      end_time: dayjs(event.end_time, 'HH:mm:ss'),
      timezone: normalizeTimeZone(event.timezone || userTimezone),
      category: event.category,
      location_type: event.location_type || 'virtual',
      location: event.location,
      meeting_link: event.meeting_link,
      notes: event.notes,
      application: event.application,
    });
  };

  const handleCalendarEventDelete = async (event: Event, scope: EventDeleteScope) => {
    try {
      if (event.is_virtual && event.parent_event) {
        if (scope === 'instance') {
          await deleteRecurringInstance(event.parent_event, event.date);
        } else {
          await deleteRecurringSeries(event.parent_event);
        }
      } else {
        await deleteEvent(event.id);
      }
      messageApi.success('Event deleted');
      setViewingEvent(null);
      await fetchData();
      return true;
    } catch (error) {
      messageApi.error('Failed to delete event');
      console.error(error);
      return false;
    }
  };

  const handleEventFormFinish = async (values: EventFormValues) => {
    const payload = {
      ...values,
      date: values.date.format('YYYY-MM-DD'),
      start_time: values.start_time.format('HH:mm:ss'),
      end_time: values.end_time.format('HH:mm:ss'),
      is_recurring: !!recurrenceRule,
      recurrence_rule: recurrenceRule,
      reminder_minutes: 15,
    };

    const saveEvent = async (force = false) => {
      if (!editingEventId) {
        const response = await createEvent(payload, force ? { force: true } : undefined);
        if (recurrenceRule && response.data.id) {
          await setRecurrence(response.data.id, recurrenceRule);
        }
        return;
      }

      const existing = events.find((event) => event.id === editingEventId);
      if (existing?.is_virtual && existing.parent_event) {
        await updateRecurringSeries(existing.parent_event, payload);
        if (recurrenceRule) await setRecurrence(existing.parent_event, recurrenceRule);
        return;
      }

      await updateEvent(editingEventId, payload, force ? { force: true } : undefined);
    };

    try {
      await saveEvent();
      messageApi.success(editingEventId ? 'Event updated' : 'Event created');
      setIsEventFormOpen(false);
      fetchData();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if (apiError.response?.status === 400 && apiError.response?.data?.conflict) {
        Modal.confirm({
          title: 'Schedule Conflict',
          content: 'Conflict detected. Force save?',
          onOk: async () => {
            await saveEvent(true);
            messageApi.success(editingEventId ? 'Event updated' : 'Event created');
            setIsEventFormOpen(false);
            fetchData();
          },
        });
        return;
      }

      messageApi.error('Failed to save event');
    }
  };

  const handleCreateEventCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      await createCategory({
        name: newCategoryName.trim(),
        color: '#2563eb',
        icon: newCategoryIcon,
      });
      setNewCategoryName('');
      setNewCategoryIcon('tag');
      const response = await getCategories();
      setCategories(response.data);
    } catch (error) {
      messageApi.error('Failed to create category');
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteHoliday(id);
      messageApi.success('Holiday deleted');
      fetchData();
      return true;
    } catch (error) {
      messageApi.error('Failed to delete holiday');
      console.error(error);
      return false;
    }
  };

  const handleDeleteFederalRange = async (group: FederalHolidayGroup) => {
    try {
      await Promise.all(group.items.map((item) => deleteHoliday(item.id)));
      messageApi.success('Observed holiday range deleted');
      fetchData();
    } catch (error) {
      messageApi.error('Failed to delete the complete observed holiday range');
      console.error(error);
      fetchData();
    }
  };

  const handleCalendarHolidayDelete = async (holiday: Holiday) => {
    if (holiday.is_locked || !holiday.id) return false;
    const deleted = await handleDelete(holiday.id);
    if (deleted) setEditingCalendarHoliday(null);
    return deleted;
  };

  const handleDuplicateHoliday = (item: any) => {
    const sampleItem = item.isGroup ? item.items[0] : item;
    setEditingCalendarHoliday(null);
    setPendingCalendarHoliday({
      date: sampleItem.date ? new Date(sampleItem.date) : new Date(),
      target: { tab: sampleItem.tab || null, label: sampleItem.tab_name || 'My Holiday' },
    });
    setEditingCalendarHoliday({
      ...sampleItem,
      id: 0,
      description: sampleItem.description ? `${sampleItem.description} (Copy)` : 'Holiday (Copy)',
    });
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    const sampleItem = item.isGroup ? item.items[0] : item;
    editForm.setFieldsValue({
      description: sampleItem.description,
      is_recurring: sampleItem.is_recurring,
      tab: sampleItem.tab || '',
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();

      let itemsToUpdate: any[] = [];
      if (editingItem.isBulk) {
        itemsToUpdate = editingItem.items;
      } else if (editingItem.isGroup) {
        itemsToUpdate = editingItem.items;
      } else {
        itemsToUpdate = [editingItem];
      }

      await Promise.all(
        itemsToUpdate.map((i: any) => {
          const updatePayload: any = { is_recurring: values.is_recurring };
          if (values.tab !== '__unchanged__') {
            updatePayload.tab = values.tab || null;
          }
          if (values.description !== undefined && values.description !== '') {
            updatePayload.description = values.description;
          } else if (!(editingItem.isBulk && !editingItem.allSameDesc)) {
            updatePayload.description = values.description;
          }
          return updateHoliday(i.id, updatePayload);
        })
      );

      messageApi.success('Holiday updated successfully');
      setEditModalOpen(false);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      if (error && (error as any).errorFields) {
        return;
      }
      messageApi.error('Failed to update holiday');
      console.error(error);
    }
  };

  const toggleLock = async (holiday: Holiday) => {
    try {
      await updateHoliday(holiday.id, { is_locked: !holiday.is_locked });
      setHolidays((prev) =>
        prev.map((h) => (h.id === holiday.id ? { ...h, is_locked: !h.is_locked } : h))
      );
      messageApi.success(holiday.is_locked ? 'Unlocked' : 'Locked');
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

  const handleSelectGroup = (items: any[], checked: boolean) => {
    const itemIds = items.map((i) => i.id);
    setSelectedIds((prev) => {
      if (checked) {
        const newIds = [...prev];
        itemIds.forEach((id) => {
          if (!newIds.includes(id)) newIds.push(id);
        });
        return newIds;
      } else {
        return prev.filter((id) => !itemIds.includes(id));
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = sortedHolidays.map((h) => h.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = () => {
    Modal.confirm({
      title: 'Delete Selected Holidays',
      content: `Are you sure you want to delete ${selectedIds.length} holidays?`,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await Promise.all(selectedIds.map((id) => deleteHoliday(id)));
          messageApi.success(`${selectedIds.length} holidays deleted`);
          setSelectedIds([]);
          fetchData();
        } catch (error) {
          messageApi.error('Failed to delete some holidays');
          fetchData();
        }
      },
    });
  };

  const handleBulkToggleLock = async (lock: boolean) => {
    try {
      await Promise.all(selectedIds.map((id) => updateHoliday(id, { is_locked: lock })));
      messageApi.success(`${selectedIds.length} holidays ${lock ? 'locked' : 'unlocked'}`);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      messageApi.error(`Failed to ${lock ? 'lock' : 'unlock'} some holidays`);
      fetchData();
    }
  };

  const handleBulkEditClick = () => {
    editForm.resetFields();

    const selectedHolidays = selectedIds
      .map((id) => holidays.find((h) => h.id === id))
      .filter(Boolean) as Holiday[];

    if (selectedHolidays.length > 0) {
      const firstDesc = selectedHolidays[0].description;
      const allSameDesc = selectedHolidays.every((h) => h.description === firstDesc);

      const firstRecur = selectedHolidays[0].is_recurring;
      const allSameRecur = selectedHolidays.every((h) => h.is_recurring === firstRecur);

      const firstTab = selectedHolidays[0].tab || '';
      const allSameTab = selectedHolidays.every((h) => (h.tab || '') === firstTab);

      editForm.setFieldsValue({
        description: allSameDesc ? firstDesc : undefined,
        is_recurring: allSameRecur ? firstRecur : false,
        tab: allSameTab ? firstTab : '__unchanged__',
      });

      setEditingItem({
        isBulk: true,
        items: selectedHolidays,
        allSameDesc,
      });
    } else {
      setEditingItem({ isBulk: true, items: [] });
    }
    setEditModalOpen(true);
  };

  const handleToggleFederalHoliday = async (
    holidayName: string,
    dateStr: string,
    isObserved: boolean
  ) => {
    if (!userSettings) return;

    try {
      let ignoredList = userSettings.ignored_federal_holidays || [];

      if (!isObserved) {
        if (!ignoredList.includes(holidayName) && !ignoredList.includes(dateStr)) {
          ignoredList = [...ignoredList, holidayName];
        }
      } else {
        ignoredList = ignoredList.filter((name) => name !== holidayName && name !== dateStr);
      }

      await updateUserSettings({ ignored_federal_holidays: ignoredList });
      messageApi.success(`${holidayName} is now ${isObserved ? 'observed' : 'ignored'}`);

      fetchData();
    } catch (error) {
      messageApi.error('Failed to update observed holiday settings');
      console.error(error);
    }
  };

  const handleToggleLockGroup = async (groupItem: any) => {
    const newLockState = !groupItem.is_locked;
    try {
      await Promise.all(
        groupItem.items.map((i: any) => updateHoliday(i.id, { is_locked: newLockState }))
      );
      messageApi.success(`Collection ${newLockState ? 'locked' : 'unlocked'}`);
      fetchData();
    } catch (error) {
      messageApi.error(`Failed to toggle lock for collection`);
      fetchData();
    }
  };

  const handleDeleteGroup = (groupItem: any) => {
    Modal.confirm({
      title: 'Delete Holiday Collection',
      content: `Are you sure you want to delete all ${groupItem.items.length} days in this collection?`,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await Promise.all(groupItem.items.map((i: any) => deleteHoliday(i.id)));
          messageApi.success('Holiday collection deleted');
          fetchData();
        } catch (error) {
          messageApi.error('Failed to delete some holidays in the collection');
          fetchData();
        }
      },
    });
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

  const handleExportWrapper = async (format: string) => {
    const response = await exportHolidays(format);
    return {
      data: response.data,
      headers: response.headers as unknown as Record<string, string>,
    };
  };

  const renderHolidayListTab = (_tabKey: string, tabLabel: string) => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Add Form */}
      <Card id="holiday-create-form" title="Add New Holiday">
        <Form
          scrollToFirstError={SCROLL_TO_FIRST_ERROR}
          form={form}
          layout="vertical"
          onFinish={handleAdd}
          initialValues={{ is_recurring: false }}
        >
          <Row gutter={16}>
            <Col span={24} md={24} lg={24}>
              <Form.Item style={{ marginBottom: 0 }}>
                <Space style={{ marginBottom: 12 }}>
                  <Switch
                    checked={isRangeMode}
                    onChange={setIsRangeMode}
                    checkedChildren="Range"
                    unCheckedChildren="Single Day"
                  />
                  <Text type="secondary">Switch to Date Range</Text>
                </Space>
              </Form.Item>
            </Col>

            <Col span={24} md={8}>
              {isRangeMode ? (
                <Form.Item
                  name="dateRange"
                  label="Date Range"
                  rules={[{ required: true, message: 'Select dates' }]}
                >
                  <RangePicker style={{ width: '100%' }} />
                </Form.Item>
              ) : (
                <Form.Item
                  name="date"
                  label="Date"
                  rules={[{ required: true, message: 'Select date' }]}
                >
                  <DatePicker inputReadOnly style={{ width: '100%' }} />
                </Form.Item>
              )}
            </Col>
            <Col span={24} md={8}>
              <Form.Item name="name" label="Name">
                <Input placeholder="Winter Break" />
              </Form.Item>
            </Col>
            <Col span={24} md={8}>
              <Form.Item label=" " colon={false} style={{ marginBottom: 0 }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Form.Item name="is_recurring" valuePropName="checked" noStyle>
                    <Checkbox>Recurring (Yearly)</Checkbox>
                  </Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<PlusOutlined />}
                    size="large"
                    className="w-full sm:w-auto"
                  >
                    Add
                  </Button>
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* List */}
      <Card
        className="holiday-list-card"
        title={
          <BulkActionHeader
            className="holiday-list-header"
            selectedCount={selectedIds.length}
            totalCount={sortedHolidays.length}
            onSelectAll={handleSelectAll}
            onCancelSelection={() => setSelectedIds([])}
            title={`${tabLabel} (${activeTabHolidays.length})`}
            bulkActions={
              <>
                <Button onClick={() => handleBulkToggleLock(true)} icon={<LockOutlined />}>
                  Lock
                </Button>
                <Button onClick={() => handleBulkToggleLock(false)} icon={<UnlockOutlined />}>
                  Unlock
                </Button>
                <Button onClick={handleBulkEditClick} icon={<EditOutlined />}>
                  Edit
                </Button>
                <Tooltip
                  title={isAnySelectedLocked ? 'Cannot delete while locked items are selected' : ''}
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
              </>
            }
            defaultActions={
              <div className="holiday-list-toolbar">
                <Select
                  className="holiday-sort-select"
                  aria-label="Sort holidays by"
                  value={sortBy}
                  onChange={setSortBy}
                  options={[
                    { value: 'date', label: 'By Date' },
                    { value: 'name', label: 'By Name' },
                  ]}
                  style={{ width: 120 }}
                />
                <Button
                  className="holiday-sort-direction"
                  aria-label={`Sort holidays ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                  icon={
                    sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />
                  }
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                />
                <Popconfirm
                  title="Delete All Unlocked?"
                  description={`This will delete all unlocked holidays in "${tabLabel}". This cannot be undone.`}
                  okText="Delete All"
                  okType="danger"
                  onConfirm={async () => {
                    try {
                      const toDelete = activeTabHolidays.filter((h) => !h.is_locked);
                      await Promise.all(toDelete.map((h) => deleteHoliday(h.id)));
                      messageApi.success('All unlocked holidays deleted');
                      fetchData();
                    } catch (e) {
                      messageApi.error('Failed to delete all');
                    }
                  }}
                  disabled={activeTabHolidays.length === 0}
                >
                  <Button
                    className="holiday-delete-all"
                    danger
                    disabled={activeTabHolidays.length === 0}
                    icon={<DeleteOutlined />}
                  >
                    Delete All
                  </Button>
                </Popconfirm>
              </div>
            }
          />
        }
      >
        {loading ? (
          <ListSkeleton count={4} />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={groupedHolidays}
            renderItem={(item) => {
              if (item.isGroup) {
                return (
                  <GroupedHolidayItem
                    key={`group-${item.id}`}
                    item={item}
                    handleToggleLockGroup={handleToggleLockGroup}
                    handleDeleteGroup={handleDeleteGroup}
                    toggleLock={toggleLock}
                    handleDelete={handleDelete}
                    handleEditItem={handleEditClick}
                    handleDuplicateHoliday={handleDuplicateHoliday}
                    selectedIds={selectedIds}
                    onSelectChange={handleSelectChange}
                    onSelectGroup={handleSelectGroup}
                  />
                );
              }

              const titleText = item.description || 'Holiday';
              const itemDayjs = dayjs(item.date);
              const monthText = itemDayjs.format('MMM').toUpperCase();
              const dayText = itemDayjs.format('DD');
              const formattedDate = itemDayjs.format('MMM D, YYYY');

              return (
                <List.Item key={`item-${item.id}`} className="holiday-list-item">
                  <div className="group w-full rounded-xl border border-slate-200/80 bg-white px-5 py-3.5 sm:px-6 sm:py-4 shadow-2xs transition-all duration-200 hover:border-red-200 hover:shadow-xs">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <SelectionCheckbox
                          selectionLabel={`${titleText} on ${itemDayjs.format('MMMM D, YYYY')}`}
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) => handleSelectChange(item.id, e.target.checked)}
                        />

                        {/* Unified Red Mini Calendar Tile */}
                        <div className="flex shrink-0 flex-col items-center overflow-hidden rounded-xl border border-red-200/80 bg-white shadow-2xs">
                          <div className="w-full bg-gradient-to-r from-red-500 via-rose-500 to-red-600 px-2.5 py-0.5 text-center">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-white">
                              {monthText}
                            </span>
                          </div>
                          <div className="flex flex-1 items-center justify-center px-3 py-1.5 min-w-[42px]">
                            <span className="font-extrabold text-slate-800 text-sm tracking-tight whitespace-nowrap">
                              {dayText}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900 text-base sm:text-lg leading-tight truncate">
                              {titleText}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-medium text-slate-600">{formattedDate}</span>

                            {item.is_recurring && (
                              <Tag
                                color="blue"
                                icon={<SyncOutlined />}
                                className="m-0 rounded border-sky-200 bg-sky-50 text-sky-700 text-xs font-medium px-1.5 py-0"
                              >
                                Yearly
                              </Tag>
                            )}

                            {item.is_locked && (
                              <Tag
                                color="gold"
                                icon={<LockOutlined />}
                                className="m-0 rounded border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium px-1.5 py-0"
                              >
                                Locked
                              </Tag>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="holiday-item-actions flex shrink-0 items-center justify-end">
                        <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 p-0.5">
                          <RowActions
                            key={`actions-${item.id}`}
                            size="middle"
                            isLocked={item.is_locked}
                            onToggleLock={() => toggleLock(item)}
                            onEdit={() => handleEditClick(item)}
                            onDuplicate={() => handleDuplicateHoliday(item)}
                            onDelete={() => handleDelete(item.id)}
                            disableDelete={item.is_locked}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </List.Item>
              );
            }}
            locale={{
              emptyText: (
                <PageState
                  title={
                    selectedYear === 'all' ? 'No holidays yet' : `No holidays in ${selectedYear}`
                  }
                  description={
                    selectedYear === 'all'
                      ? 'Add a personal holiday or time-off range using the form above.'
                      : 'Add one above or show all years to review older entries.'
                  }
                  actionLabel={selectedYear === 'all' ? undefined : 'Show all years'}
                  onAction={selectedYear === 'all' ? undefined : () => setSelectedYear('all')}
                />
              ),
            }}
          />
        )}
      </Card>
    </Space>
  );

  const items = [
    {
      key: 'custom',
      label: 'Manage Custom',
      children: renderHolidayListTab('custom', 'Manage Custom'),
    },
    ...customTabs.map((t) => ({
      key: t.id,
      label: (
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: getHolidayTabColor(t.color).dot }}
          />
          {t.name}
        </span>
      ),
      children: renderHolidayListTab(t.id, t.name),
    })),
    {
      key: 'federal',
      label: 'Observed Holidays',
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Card>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <Space align="start">
                <LockOutlined style={{ fontSize: 20, color: '#2563eb', marginTop: 4 }} />
                <div>
                  <Text strong>Observed Holidays</Text>
                  <div>
                    <Text type="secondary">
                      Federal holidays are included automatically. Add company holidays, wellness
                      days, or other shared days off here.
                    </Text>
                  </div>
                </div>
              </Space>

              <Space direction="vertical" align="end" size={2}>
                <Space size={16}>
                  {isAdvancedMode && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        federalForm.resetFields();
                        setIsFederalRangeMode(false);
                        setAddFederalModalOpen(true);
                      }}
                    >
                      Add Observed Holiday
                    </Button>
                  )}
                  <Space>
                    <Text strong>Advanced Options</Text>
                    <Switch checked={isAdvancedMode} onChange={setIsAdvancedMode} />
                  </Space>
                </Space>
                {isAdvancedMode && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Toggle specific holidays on or off or add custom ones
                  </Text>
                )}
              </Space>
            </div>
          </Card>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="enterprise-card p-5 space-y-4" style={{ height: 166 }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full shimmer-bg" />
                    <div className="space-y-2 flex-1">
                      <div className="shimmer-bg h-4 w-40 rounded-full" />
                      <div className="shimmer-bg h-3 w-20 rounded-full" />
                    </div>
                  </div>
                  <div className="shimmer-bg h-4 w-11/12 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <List
              grid={{ gutter: 24, column: 3, xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 3 }}
              dataSource={groupedFederalHolidays}
              renderItem={(item) => (
                <List.Item style={{ height: '100%', width: '100%' }}>
                  <FederalHolidayCard
                    item={item}
                    isAdvancedMode={isAdvancedMode}
                    onDeleteHoliday={(id) => void handleDelete(id)}
                    onDeleteRange={(group) => void handleDeleteFederalRange(group)}
                    onToggleObserved={handleToggleFederalHoliday}
                  />
                </List.Item>
              )}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <div className="w-full">
        <div className="mb-6">
          <PageActionToolbar
            title="Holidays"
            subtitle="Manage personal time off and observed holidays."
            showExtraActionsOnMobile
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
            availableYears={availableYears}
            extraActions={
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
            }
            onExport={handleExportWrapper}
            exportFilename="holidays"
            onImport={() => setShowImport(true)}
          />
        </div>

        {loadError && !hasLoadedData ? (
          <PageState
            tone="error"
            title="Holidays unavailable"
            description="We couldn't load your holidays and calendar data. Your saved settings have not been changed."
            actionLabel="Try again"
            onAction={fetchData}
          />
        ) : contentView === 'list' ? (
          <Tabs
            className="holiday-manager-tabs"
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key);
              setSelectedIds([]);
            }}
            items={items}
            type="card"
          />
        ) : (
          <CalendarView
            events={events}
            customHolidays={holidaysForSelectedYear}
            federalHolidays={federalHolidays}
            categories={categories}
            holidayTabs={customTabs}
            addActionHighlight="holidays"
            loading={loading}
            onEventSelect={handleCalendarEventSelect}
            onHolidaySelect={handleCalendarHolidaySelect}
            onAddEvent={handleCalendarAddEvent}
            onAddHoliday={handleCalendarHolidayAdd}
          />
        )}

        {/* Edit Modal */}
        <Modal
          title={
            editingItem?.isGroup
              ? 'Edit Holiday Collection'
              : editingItem?.isBulk
                ? `Edit ${editingItem.items.length} Holidays`
                : 'Edit Holiday'
          }
          open={editModalOpen}
          onCancel={() => setEditModalOpen(false)}
          onOk={handleEditSubmit}
          okText="Save"
        >
          <Form scrollToFirstError={SCROLL_TO_FIRST_ERROR} form={editForm} layout="vertical">
            {editingItem?.isBulk && !editingItem?.allSameDesc && (
              <div className="mb-4 text-gray-500 text-sm italic">
                You are editing multiple holidays with different names. Leave the name field blank
                to keep their original names, or type a new name to overwrite all of them.
              </div>
            )}
            <Form.Item
              name="description"
              label="Name"
              rules={
                editingItem?.isBulk && !editingItem?.allSameDesc
                  ? []
                  : [{ required: true, message: 'Please enter a name' }]
              }
            >
              <Input
                placeholder={
                  editingItem?.isBulk && !editingItem?.allSameDesc
                    ? 'Leave blank to keep original names...'
                    : 'Winter Break'
                }
              />
            </Form.Item>
            <Form.Item name="is_recurring" valuePropName="checked">
              <Checkbox>Recurring (Yearly)</Checkbox>
            </Form.Item>
            {customTabs.length > 0 && (
              <Form.Item name="tab" label="Tab">
                <Select>
                  {editingItem?.isBulk && (
                    <Select.Option value="__unchanged__">
                      <span className="text-gray-400 italic">Leave unchanged</span>
                    </Select.Option>
                  )}
                  <Select.Option value="">Manage Custom (default)</Select.Option>
                  {customTabs.map((t) => (
                    <Select.Option key={t.id} value={t.id}>
                      {t.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}
          </Form>
        </Modal>

        {/* Import Modal */}
        <Modal
          title="Import Holidays"
          open={showImport}
          onCancel={() => setShowImport(false)}
          onOk={handleImportUpload}
          okText="Upload"
          confirmLoading={loading}
        >
          <Input
            type="file"
            onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
          />
        </Modal>

        {/* Add Observed Holiday Modal */}
        <Modal
          title="Add Observed Holiday"
          open={addFederalModalOpen}
          onCancel={closeFederalModal}
          onOk={handleAddFederal}
          okText={isFederalRangeMode ? 'Add Range' : 'Add Holiday'}
        >
          <Form scrollToFirstError={SCROLL_TO_FIRST_ERROR} form={federalForm} layout="vertical">
            <div className="mb-4 text-gray-500 text-sm">
              Add a company holiday, wellness day, or another shared day off as one date or a
              continuous range.
            </div>
            <div className="mb-5">
              <SegmentedToggle
                value={isFederalRangeMode ? 'range' : 'single'}
                onChange={(value) => {
                  const nextIsRange = value === 'range';
                  setIsFederalRangeMode(nextIsRange);
                  federalForm.setFieldsValue(
                    nextIsRange ? { date: undefined } : { dateRange: undefined }
                  );
                }}
                wrapperClassName="w-full rounded-xl bg-gray-100 p-1"
                buttonClassName="flex-1 justify-center px-4 py-2.5"
                options={[
                  { value: 'single', label: 'Single Day' },
                  { value: 'range', label: 'Date Range' },
                ]}
              />
            </div>
            {isFederalRangeMode ? (
              <Form.Item
                name="dateRange"
                label="Date Range"
                rules={[{ required: true, message: 'Please select a date range' }]}
              >
                <RangePicker inputReadOnly className="w-full" />
              </Form.Item>
            ) : (
              <Form.Item
                name="date"
                label="Date"
                rules={[{ required: true, message: 'Please select a date' }]}
              >
                <DatePicker inputReadOnly className="w-full" />
              </Form.Item>
            )}
            <Form.Item
              name="description"
              label="Holiday Name"
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder="E.g., Company Founders Day" />
            </Form.Item>
            <Form.Item name="is_recurring" valuePropName="checked">
              <Checkbox>Recurring (Yearly)</Checkbox>
            </Form.Item>
          </Form>
        </Modal>

        <EventViewModal
          event={viewingEvent}
          onClose={() => setViewingEvent(null)}
          onEdit={handleEventEdit}
          onDelete={handleCalendarEventDelete}
        />

        <EventEditorModal
          open={isEventFormOpen}
          editingId={editingEventId}
          form={eventForm}
          onCancel={() => setIsEventFormOpen(false)}
          onFinish={handleEventFormFinish}
          defaultDuration={defaultEventDuration}
          categories={categories}
          newCategoryName={newCategoryName}
          onNewCategoryNameChange={setNewCategoryName}
          newCategoryIcon={newCategoryIcon}
          onNewCategoryIconChange={setNewCategoryIcon}
          onCreateCategory={handleCreateEventCategory}
          locationType={locationType}
          onLocationTypeChange={setLocationType}
          recurrenceRule={recurrenceRule}
          onOpenRecurrence={() => setShowRecurrenceModal(true)}
          onClearRecurrence={() => setRecurrenceRule(null)}
          applications={applications}
        />

        <RecurrenceModal
          isOpen={showRecurrenceModal}
          onClose={() => setShowRecurrenceModal(false)}
          onSave={(rule) => {
            setRecurrenceRule(rule);
            setShowRecurrenceModal(false);
          }}
          initialRule={recurrenceRule || undefined}
        />

        <CalendarHolidayModal
          open={!!pendingCalendarHoliday || !!editingCalendarHoliday}
          mode={editingCalendarHoliday && editingCalendarHoliday.id ? 'edit' : 'add'}
          date={pendingCalendarHoliday?.date}
          target={pendingCalendarHoliday?.target}
          holiday={editingCalendarHoliday}
          holidayTabs={customTabs}
          onCancel={() => {
            setPendingCalendarHoliday(null);
            setEditingCalendarHoliday(null);
          }}
          onSubmit={handleCalendarHolidaySubmit}
          onDelete={handleCalendarHolidayDelete}
        />
      </div>
    </>
  );
};

export default Holidays;
