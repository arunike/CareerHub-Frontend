import { useState, useEffect } from 'react';
import {
  Typography,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Card,
  Tooltip,
  Button,
} from 'antd';
import { PlusOutlined, LockOutlined, UnlockOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { Event, EventCategory, RecurrenceRule } from '../../types';
import {
  getEvents,
  deleteEvent,
  createEvent,
  updateEvent,
  importData,
  getCategories,
  setRecurrence,
  createCategory,
  getRecurringInstances,
  updateRecurringSeries,
  deleteRecurringSeries,
  deleteRecurringInstance,
  getApplications,
  getUserSettings,
  exportEvents,
} from '../../api';
import RecurrenceModal from '../../components/RecurrenceModal';
import PageActionToolbar from '../../components/PageActionToolbar';
import BulkActionHeader from '../../components/BulkActionHeader';
import EventsFilterBar from './components/EventsFilterBar';
import EventsGrid from './components/EventsGrid';
import EventEditorModal from './components/EventEditorModal';
import EventViewModal from './components/EventViewModal';
import { getAvailableYears, filterByYear, getCurrentYear } from '../../utils/yearFilter';
import { usePersistedState } from '../../hooks/usePersistedState';

dayjs.extend(customParseFormat);

const { Text } = Typography;

const Events = () => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // Data State
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [applications, setApplications] = useState<
    Array<{
      id: number;
      company_details?: { name: string };
      role_title: string;
      [key: string]: unknown;
    }>
  >([]);

  // Filter/Sort State
  const [categoryFilter, setCategoryFilter] = useState<number | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'duration'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [userTimezone, setUserTimezone] = usePersistedState<string>(
    'userTimezone',
    'PT',
    {
      serialize: (value) => value,
      deserialize: (raw) => raw,
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

  // UI State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Recurrence & Extra
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [locationType, setLocationType] = useState<'in_person' | 'virtual' | 'hybrid'>('virtual');

  // Defaults
  const [defaultDuration, setDefaultDuration] = useState(60);
  const [defaultCategory, setDefaultCategory] = useState<number | undefined>(undefined);

  // Initial Fetch
  const fetchData = async () => {
    try {
      setLoading(true);
      const today = dayjs();
      // Expanded range to catch more events
      const startStr = today.subtract(1, 'month').format('YYYY-MM-DD');
      const endStr = today.add(12, 'month').format('YYYY-MM-DD');

      const [eventsResp, recurringResp, settingsResp] = await Promise.all([
        getEvents(),
        getRecurringInstances(startStr, endStr),
        getUserSettings(),
      ]);

      if (settingsResp.data) {
        if (settingsResp.data.default_event_duration) {
          setDefaultDuration(parseInt(settingsResp.data.default_event_duration));
        }
        if (settingsResp.data.default_event_category) {
          setDefaultCategory(settingsResp.data.default_event_category);
        }
      }

      const regularEvents = eventsResp.data;
      const recurringInstances = recurringResp.data;

      const virtualEvents = recurringInstances.map(
        (evt: Record<string, unknown>, index: number) => ({
          ...evt,
          id: -1 * (index + 1 + Date.now()),
          parent_event: evt.parent_event_id,
          is_virtual: true,
        })
      );

      const nonRecurringEvents = regularEvents.filter((e: Event) => !e.is_recurring);
      const allEvents = [...nonRecurringEvents, ...virtualEvents].sort((a: Event, b: Event) => {
        return dayjs(`${a.date}T${a.start_time}`).diff(dayjs(`${b.date}T${b.start_time}`));
      });

      setEvents(allEvents);
    } catch (error) {
      messageApi.error('Failed to load events');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getCategories();
      setCategories(res.data);
    } catch (error) {
      messageApi.error('Failed to load categories');
      console.error(error);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await getApplications();
      setApplications(res.data);
    } catch (error) {
      messageApi.error('Failed to load applications');
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCategories();
    fetchApplications();
  }, []);

  // Filter Logic
  const filteredEvents = filterByYear(events, selectedYear, 'date')
    .filter((event) => {
      if (categoryFilter !== 'ALL' && event.category !== categoryFilter) return false;
      if (dateRange && dateRange[0] && dateRange[1]) {
        const eventDate = dayjs(event.date);
        if (eventDate.isBefore(dateRange[0], 'day') || eventDate.isAfter(dateRange[1], 'day'))
          return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = dayjs(`${a.date}T${a.start_time}`).diff(dayjs(`${b.date}T${b.start_time}`));
      } else {
        // Duration
        const getDiff = (e: Event) =>
          dayjs(`${e.date}T${e.end_time}`).diff(dayjs(`${e.date}T${e.start_time}`));
        comparison = getDiff(a) - getDiff(b);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Get available years from all events
  const availableYears = getAvailableYears(events, 'date');

  // Handle year change and persist to localStorage
  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
  };

  // Form Handlers
  const handleAdd = () => {
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
      date: dayjs(),
      start_time: start,
      end_time: end,
      timezone: 'PT',
      category: defaultCategory,
      location_type: 'virtual',
    });
  };

  const handleEdit = (event: Event) => {
    setEditingId(event.id);
    setIsFormOpen(true);
    setRecurrenceRule(event.recurrence_rule as RecurrenceRule); // Cast if needed but type matches
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
    // Placeholder for delete all
    messageApi.info('Delete all not implemented yet');
    setIsDeleteAllOpen(false);
  };

  const onFinish = async (values: any) => {
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
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.conflict) {
        Modal.confirm({
          title: 'Schedule Conflict',
          content: 'Conflict detected. Force save?',
          onOk: async () => {
            if (editingId) await updateEvent(editingId, payload, { force: true });
            else await createEvent(payload, { force: true });
            setIsFormOpen(false);
            fetchData();
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
    } catch (error) {
      messageApi.error('Failed to toggle lock');
      console.error(error);
    }
  };

  const handleSelectChange = (id: number, checked: boolean) => {
    setSelectedIds((prev) => 
      checked ? [...prev, id] : prev.filter(selectedId => selectedId !== id)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredEvents.map(e => e.id);
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
          // Virtual events (negative IDs) must be handled differently or ignored
          const realIds = selectedIds.filter(id => id > 0);
          await Promise.all(realIds.map(id => deleteEvent(id)));
          messageApi.success(`${realIds.length} events deleted`);
          setSelectedIds([]);
          fetchData();
        } catch (error) {
          messageApi.error('Failed to delete some events');
          fetchData();
        }
      },
    });
  };

  const handleBulkToggleLock = async (lock: boolean) => {
    try {
      const realIds = selectedIds.filter(id => id > 0);
      await Promise.all(realIds.map(id => updateEvent(id, { is_locked: lock })));
      messageApi.success(`${realIds.length} events ${lock ? 'locked' : 'unlocked'}`);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      messageApi.error(`Failed to ${lock ? 'lock' : 'unlock'} some events`);
      fetchData();
    }
  };

  const isAnySelectedLocked = selectedIds.some((id) => {
    const ev = events.find((e) => e.id === id);
    return ev?.is_locked;
  });

  const formatEventTime = (event: Event, userTz: string) => {
    const offsets: Record<string, number> = {
      PT: -8,
      MT: -7,
      CT: -6,
      ET: -5,
      UTC: 0,
    };

    const eventTz = event.timezone || 'PT';
    if (eventTz === userTz) return null;

    const diffHours = (offsets[userTz] || 0) - (offsets[eventTz] || 0);
    if (diffHours === 0) return null;

    try {
      const startDt = dayjs(`${event.date}T${event.start_time}`).add(diffHours, 'hour');
      const endDt = dayjs(`${event.date}T${event.end_time}`).add(diffHours, 'hour');

      if (!startDt.isValid() || !endDt.isValid()) return null;

      return `(${startDt.format('HH:mm')} - ${endDt.format('HH:mm')} ${userTz})`;
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
            subtitle={`${filteredEvents.length} events`}
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
            availableYears={availableYears}
            extraActions={
              <Select
                defaultValue={userTimezone}
                onChange={setUserTimezone}
                style={{ width: 160 }}
                className="toolbar-select"
                size="large"
                options={[
                  { value: 'PT', label: 'Pacific (PT)' },
                  { value: 'MT', label: 'Mountain (MT)' },
                  { value: 'CT', label: 'Central (CT)' },
                  { value: 'ET', label: 'Eastern (ET)' },
                ]}
              />
            }
            onDeleteAll={() => setIsDeleteAllOpen(true)}
            deleteAllDisabled={events.length === 0}
            onExport={handleExportWrapper}
            exportFilename="events"
            onImport={() => setShowImport(true)}
            onPrimaryAction={handleAdd}
            primaryActionLabel="Add Event"
            primaryActionIcon={<PlusOutlined />}
          />

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

          <Card
            title={
              <BulkActionHeader
                selectedCount={selectedIds.length}
                totalCount={filteredEvents.length}
                onSelectAll={handleSelectAll}
                onCancelSelection={() => setSelectedIds([])}
                title="All Events"
                bulkActions={
                  <>
                    <Button onClick={() => handleBulkToggleLock(true)} icon={<LockOutlined />}>
                      Lock
                    </Button>
                    <Button onClick={() => handleBulkToggleLock(false)} icon={<UnlockOutlined />}>
                      Unlock
                    </Button>
                    <Tooltip title={isAnySelectedLocked ? "Cannot delete while locked items are selected" : ""}>
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
              />
            }
          >
            <EventsGrid
              loading={loading}
              events={filteredEvents}
              userTimezone={userTimezone}
              onToggleLock={toggleLock}
              onView={setViewingEvent}
              onEdit={handleEdit}
              onDelete={handleDeleteAction}
              formatEventTime={formatEventTime}
              selectedIds={selectedIds}
              onSelectChange={handleSelectChange}
            />
          </Card>
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
            color: '#1890ff',
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

      <EventViewModal event={viewingEvent} onClose={() => setViewingEvent(null)} onEdit={handleEdit} />

      {/* Import Modal */}
      <Modal
        title="Import Data"
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

      {/* Delete All Modal */}
      <Modal
        title="Delete All Events"
        open={isDeleteAllOpen}
        onCancel={() => setIsDeleteAllOpen(false)}
        onOk={handleDeleteAll}
        okType="danger"
        okText="Delete All"
      >
        <Text>Are you sure you want to delete all events? This cannot be undone.</Text>
      </Modal>
    </>
  );
};

export default Events;
