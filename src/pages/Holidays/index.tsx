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
  Collapse,
  Tooltip,
} from 'antd';
import Modal from '../../components/MobileModal';
import {
  DeleteOutlined,
  CalendarOutlined,
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
import { getAvailableYears, filterByYear, getCurrentYear } from '../../utils/yearFilter';
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

const { Text } = Typography;
const { RangePicker } = DatePicker;

type EventFormValues = {
  date: dayjs.Dayjs;
  start_time: dayjs.Dayjs;
  end_time: dayjs.Dayjs;
  [key: string]: unknown;
};

type ApiError = { response?: { status?: number; data?: { conflict?: boolean } } };

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

  return (
    <List.Item
      key={`group-item-${item.id}`}
      className="enterprise-card-list-item px-3 py-3 sm:px-4 sm:py-4"
    >
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <SelectionCheckbox
            selectionLabel={`${item.description || 'holiday range'} from ${dayjs(startDate).format('MMMM D, YYYY')} to ${dayjs(endDate).format('MMMM D, YYYY')}`}
            checked={allSelected}
            indeterminate={someSelected}
            onChange={() => onSelectGroup(item.items, !allSelected)}
            style={{ marginTop: 2 }}
          />
          <CalendarOutlined
            style={{ fontSize: 20, color: '#2563eb', marginTop: 2 }}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900 whitespace-nowrap text-sm sm:text-base">
                {dayjs(startDate).format('YYYY-MM-DD')} to {dayjs(endDate).format('YYYY-MM-DD')}
              </span>
              {item.is_recurring && (
                <Tag color="blue" icon={<SyncOutlined />} className="m-0">
                  Yearly
                </Tag>
              )}
              {item.is_locked && <LockOutlined style={{ color: '#faad14' }} />}
            </div>
            <div className="mt-2 w-full">
              <Collapse
                ghost
                size="small"
                className="bg-transparent"
                style={{ padding: 0 }}
                onChange={(keys) => setIsExpanded(keys.length > 0)}
              >
                <Collapse.Panel
                  header={
                    <Text type="secondary" className="hover:text-blue-500 transition-colors">
                      {item.description || 'View Individual Days'}
                    </Text>
                  }
                  key="1"
                >
                  <div className="pl-4 border-l-2 border-dashed border-gray-200 ml-1 mt-2">
                    <List
                      size="small"
                      split={false}
                      dataSource={item.items}
                      renderItem={(subItem: any) => (
                        <List.Item
                          className="group hover:bg-gray-50 transition-colors rounded-lg mb-1 relative flex flex-wrap items-center justify-between gap-2"
                          style={{ padding: '8px 12px' }}
                        >
                          {/* Tree Branch Connector */}
                          <div className="absolute left-[-16px] top-1/2 w-4 h-px border-t-2 border-dashed border-gray-200" />

                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <SelectionCheckbox
                              selectionLabel={`holiday on ${dayjs(subItem.date).format('MMMM D, YYYY')}`}
                              checked={selectedIds.includes(subItem.id)}
                              onChange={(e) => onSelectChange(subItem.id, e.target.checked)}
                            />
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                              <span className="whitespace-nowrap text-gray-600 font-medium text-xs sm:text-sm">
                                {dayjs(subItem.date).format('dddd, MMMM D, YYYY')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 shrink-0">
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
                        </List.Item>
                      )}
                    />
                  </div>
                </Collapse.Panel>
              </Collapse>
            </div>
          </div>
        </div>

        {!isExpanded && (
          <div className="flex items-center justify-end shrink-0 pt-1 sm:pt-0">
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
      const [customResp, federalResp, settingsResp, eventsResp, categoriesResp] = await Promise.all(
        [getHolidays(), getFederalHolidays(), getUserSettings(), getEvents(), getCategories()]
      );
      setHolidays(customResp.data);
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
  }, [messageApi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const customTabs = React.useMemo<HolidayTab[]>(
    () => userSettings?.holiday_tabs || [],
    [userSettings?.holiday_tabs]
  );
  const defaultEventDuration = Number(userSettings?.default_event_duration) || 60;
  const userTimezone = normalizeTimeZone(userSettings?.primary_timezone || getBrowserTimeZone());

  const activeTabHolidays = React.useMemo(() => {
    if (activeTab === 'custom') {
      return holidays.filter((h) => !h.tab || !customTabs.some((t) => t.id === h.tab));
    }
    if (activeTab === 'federal') return [];
    return holidays.filter((h) => h.tab === activeTab);
  }, [holidays, activeTab, customTabs]);

  const sortedHolidays = filterByYear(activeTabHolidays, selectedYear, 'date').sort((a, b) => {
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

  const sortedFederalHolidays = filterByYear(federalHolidays, selectedYear, 'date').sort((a, b) =>
    dayjs(a.date).diff(dayjs(b.date))
  );

  const availableYears = getAvailableYears(holidays, 'date');
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

      const groupId = crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15);
      const promises = [];
      let current = start.clone();

      while (current.isBefore(end) || current.isSame(end, 'day')) {
        promises.push(
          createHoliday({
            date: current.format('YYYY-MM-DD'),
            group_id: groupId,
            description,
            is_recurring: isRecurring,
            tab: tabValue,
          })
        );
        current = current.add(1, 'day');
      }

      try {
        await Promise.allSettled(promises);
        messageApi.success('Holiday collection added');
        form.resetFields();
        fetchData();
      } catch (e) {
        messageApi.error('Failed to create holiday collection');
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

  const handleAddFederal = async () => {
    try {
      const values = await federalForm.validateFields();
      await createHoliday({
        date: values.date.format('YYYY-MM-DD'),
        description: values.description,
        holiday_type: 'federal',
        is_recurring: values.is_recurring || false,
      });
      messageApi.success('Custom Federal Holiday added');
      federalForm.resetFields();
      setAddFederalModalOpen(false);
      fetchData();
    } catch (error) {
      if (error && (error as any).errorFields) {
        return;
      }
      messageApi.error('Failed to create custom federal holiday');
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
      messageApi.error('Failed to update federal holiday settings');
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
        title={
          <BulkActionHeader
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
              <>
                <Select
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
                    danger
                    disabled={activeTabHolidays.length === 0}
                    icon={<DeleteOutlined />}
                  >
                    Delete All
                  </Button>
                </Popconfirm>
              </>
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

              return (
                <List.Item
                  key={`item-${item.id}`}
                  className="enterprise-card-list-item px-3 py-3 sm:px-4 sm:py-4"
                >
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <SelectionCheckbox
                        selectionLabel={`${item.description || 'holiday'} on ${dayjs(item.date).format('MMMM D, YYYY')}`}
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) => handleSelectChange(item.id, e.target.checked)}
                        style={{ marginTop: 2 }}
                      />
                      <CalendarOutlined
                        style={{ fontSize: 20, color: '#2563eb', marginTop: 2 }}
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 whitespace-nowrap text-sm sm:text-base">
                            {dayjs(item.date).format('YYYY-MM-DD')}
                          </span>
                          {item.is_recurring && (
                            <Tag color="blue" icon={<SyncOutlined />} className="m-0">
                              Yearly
                            </Tag>
                          )}
                          {item.is_locked && <LockOutlined style={{ color: '#faad14' }} />}
                        </div>
                        <div className="mt-1 text-sm text-slate-600 break-words">
                          {item.description || 'No description'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end shrink-0 pt-1 sm:pt-0">
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
      label: 'View Federal',
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Card>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <Space align="start">
                <LockOutlined style={{ fontSize: 20, color: '#2563eb', marginTop: 4 }} />
                <div>
                  <Text strong>Federal Holidays are Automatic</Text>
                  <div>
                    <Text type="secondary">
                      These are automatically excluded from availability. You don't need to add
                      them.
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
                      onClick={() => setAddFederalModalOpen(true)}
                    >
                      Add Federal Holiday
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
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
              dataSource={sortedFederalHolidays}
              renderItem={(item) => (
                <List.Item style={{ height: '100%', width: '100%' }}>
                  <div
                    className={`flex flex-col rounded-xl border p-5 transition-all duration-300 w-full ${
                      !isAdvancedMode
                        ? 'bg-gray-50 border-gray-200 opacity-60 grayscale cursor-default'
                        : item.is_ignored
                          ? 'bg-gray-100 border-dashed border-gray-300 opacity-60 grayscale-[70%]'
                          : 'bg-white border-blue-100 shadow-sm hover:shadow-md hover:border-blue-300'
                    }`}
                    style={{ height: isAdvancedMode ? 220 : 166 }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        {item.is_ignored ? (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                            <CalendarOutlined className="text-lg" />
                          </div>
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${isAdvancedMode ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-400'}`}
                          >
                            <CalendarOutlined className="text-lg" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <Text
                            strong
                            delete={item.is_ignored}
                            className={`text-base ${item.is_ignored ? 'text-gray-400' : 'text-gray-800'}`}
                          >
                            {dayjs(item.date).format('MMMM D, YYYY')}
                          </Text>
                          <Text
                            className={`text-xs ${item.is_ignored ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            {dayjs(item.date).format('dddd')}
                          </Text>
                        </div>
                      </div>
                      <Space>
                        {item.is_ignored ? (
                          <Tag
                            className="m-0 border-gray-300 text-gray-500 bg-gray-100 px-3 py-1 rounded-full"
                            color="default"
                          >
                            Ignored
                          </Tag>
                        ) : (
                          <Tag
                            className={`m-0 px-3 py-1 rounded-full ${isAdvancedMode ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-500 bg-gray-100'}`}
                            color={isAdvancedMode ? 'blue' : 'default'}
                          >
                            Observed
                          </Tag>
                        )}
                        {isAdvancedMode && item.holiday_type === 'federal' && (
                          <Popconfirm
                            title="Delete custom federal holiday?"
                            onConfirm={() => handleDelete(item.id)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                          </Popconfirm>
                        )}
                      </Space>
                    </div>

                    <div className="flex-grow mb-4 h-10 overflow-hidden">
                      <Text
                        className={`text-sm line-clamp-2 ${item.is_ignored ? 'text-gray-400 line-through' : 'text-gray-600'}`}
                        title={item.description}
                      >
                        {item.description}
                      </Text>
                    </div>

                    {isAdvancedMode && (
                      <div
                        className={`mt-auto pt-4 border-t flex justify-between items-center ${
                          item.is_ignored ? 'border-gray-200' : 'border-blue-50'
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${item.is_ignored ? 'text-gray-400' : 'text-blue-400'}`}
                        >
                          Observance Status
                        </Text>
                        <Switch
                          checked={!item.is_ignored}
                          onChange={(checked) =>
                            handleToggleFederalHoliday(item.description, item.date, checked)
                          }
                        />
                      </div>
                    )}
                  </div>
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
            subtitle="Manage personal time off and automatic federal holidays."
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
            customHolidays={holidays}
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
          <Form form={editForm} layout="vertical">
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

        {/* Add Federal Holiday Modal */}
        <Modal
          title="Add Custom Federal Holiday"
          open={addFederalModalOpen}
          onCancel={() => setAddFederalModalOpen(false)}
          onOk={handleAddFederal}
          okText="Add"
        >
          <Form form={federalForm} layout="vertical">
            <div className="mb-4 text-gray-500 text-sm">
              Custom federal holidays will appear globally in your federal holiday list alongside
              native federal holidays.
            </div>
            <Form.Item
              name="date"
              label="Date"
              rules={[{ required: true, message: 'Please select a date' }]}
            >
              <DatePicker inputReadOnly className="w-full" />
            </Form.Item>
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
