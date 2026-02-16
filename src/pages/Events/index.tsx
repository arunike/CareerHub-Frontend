import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Typography,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  message,
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Empty,
  Collapse,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  VideoCameraOutlined,
  LockOutlined,
  UnlockOutlined,
  UploadOutlined,
  FilterOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
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
import CategoryBadge from '../../components/CategoryBadge';
import IconPicker from '../../components/IconPicker';
import ExportButton from '../../components/ExportButton';
import YearFilter from '../../components/YearFilter';
import { getAvailableYears, filterByYear, getCurrentYear } from '../../utils/yearFilter';

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

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
  const [userTimezone, setUserTimezone] = useState(
    () => localStorage.getItem('userTimezone') || 'PT'
  );
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(() => {
    const saved = localStorage.getItem('eventsSelectedYear');
    return saved ? (saved === 'all' ? 'all' : parseInt(saved)) : getCurrentYear();
  });

  // UI State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Recurrence & Extra
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [locationType, setLocationType] = useState<'in_person' | 'virtual' | 'hybrid'>('virtual');

  // Defaults
  const [defaultDuration, setDefaultDuration] = useState(60);
  const [defaultCategory, setDefaultCategory] = useState<number | undefined>(undefined);

  useEffect(() => {
    localStorage.setItem('userTimezone', userTimezone);
  }, [userTimezone]);

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
    } catch (err) {
      console.error(err);
      messageApi.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getCategories();
      setCategories(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await getApplications();
      setApplications(res.data);
    } catch (e) {
      console.error(e);
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
    localStorage.setItem('eventsSelectedYear', year.toString());
  };

  // Form Handlers
  const handleAdd = () => {
    setEditingId(null);
    setRecurrenceRule(null);
    setLocationType('virtual');
    setIsFormOpen(true);
    form.resetFields();

    const start = dayjs().hour(12).minute(0).second(0);
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
    } catch (e) {
      messageApi.error('Failed to delete event');
    }
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
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.conflict) {
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
    } catch (e) {
      messageApi.error('Import failed');
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
    } catch (e) {
      messageApi.error('Failed to toggle lock');
    }
  };

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
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <Title level={2} style={{ margin: 0 }}>
                Events
              </Title>
              <Text type="secondary">{filteredEvents.length} events</Text>
            </div>
            <Space wrap>
              <YearFilter
                selectedYear={selectedYear}
                onYearChange={handleYearChange}
                availableYears={availableYears}
              />
              <Select
                defaultValue={userTimezone}
                onChange={setUserTimezone}
                style={{ width: 140 }}
                options={[
                  { value: 'PT', label: 'Pacific (PT)' },
                  { value: 'MT', label: 'Mountain (MT)' },
                  { value: 'CT', label: 'Central (CT)' },
                  { value: 'ET', label: 'Eastern (ET)' },
                ]}
                // addonBefore={<GlobalOutlined />} // Not supported on Select
              />
              <Tooltip title="Delete All Events">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setIsDeleteAllOpen(true)}
                  disabled={events.length === 0}
                >
                  Delete All
                </Button>
              </Tooltip>

              <ExportButton onExport={handleExportWrapper} filename="events" />

              <Button icon={<UploadOutlined />} onClick={() => setShowImport(true)}>
                Import
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                Add Event
              </Button>
            </Space>
          </div>

          {/* Filters */}
          <Card bodyStyle={{ padding: '16px' }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={8} md={6}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="All Categories"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={[
                    { value: 'ALL', label: 'All Categories' },
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={10} md={8}>
                <RangePicker
                  style={{ width: '100%' }}
                  onChange={(dates) => setDateRange(dates as any)}
                />
              </Col>
              <Col xs={24} sm={6} md={6}>
                <Select
                  style={{ width: '100%' }}
                  value={sortBy}
                  onChange={setSortBy}
                  options={[
                    { value: 'date', label: 'Sort by Date' },
                    { value: 'duration', label: 'Sort by Duration' },
                  ]}
                />
              </Col>
              <Col flex="auto" style={{ textAlign: 'right' }}>
                <Button
                  icon={sortOrder === 'asc' ? <FilterOutlined /> : <FilterOutlined rotate={180} />}
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                >
                  {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Event List */}
          {loading ? (
            <div className="flex justify-center p-12">
              <Typography.Text type="secondary">Loading events...</Typography.Text>
            </div>
          ) : filteredEvents.length === 0 ? (
            <Empty description="No events found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredEvents.map((event) => (
                <div key={event.id} style={{ height: '100%' }}>
                  <Card
                    hoverable
                    style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    bodyStyle={{ flex: 1 }}
                    title={
                      <Space>
                        <Text strong ellipsis style={{ maxWidth: 180 }} title={event.name}>
                          {event.name}
                        </Text>
                        {event.is_locked && <LockOutlined style={{ color: '#faad14' }} />}
                      </Space>
                    }
                    extra={
                      <Space>
                        <Tooltip title={event.is_locked ? 'Unlock' : 'Lock'}>
                          <Button
                            type="text"
                            size="small"
                            icon={
                              event.is_locked ? (
                                <UnlockOutlined style={{ fontSize: '16px' }} />
                              ) : (
                                <LockOutlined style={{ fontSize: '16px' }} />
                              )
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLock(event);
                            }}
                          />
                        </Tooltip>
                        <Tooltip title="View">
                          <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined style={{ fontSize: '16px' }} />}
                            onClick={() => setViewingEvent(event)}
                          />
                        </Tooltip>
                        <Tooltip title="Edit">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined style={{ fontSize: '16px' }} />}
                            onClick={() => handleEdit(event)}
                            disabled={event.is_locked}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="Delete event?"
                          disabled={event.is_locked}
                          onConfirm={() => handleDelete(event, 'series')}
                          description={
                            event.is_virtual ? 'Delete options for series?' : 'Are you sure?'
                          }
                        >
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined style={{ fontSize: '16px' }} />}
                            disabled={event.is_locked}
                            onClick={(e) => {
                              if (event.is_virtual && event.parent_event) {
                                e.stopPropagation();
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
                              }
                            }}
                          />
                        </Popconfirm>
                      </Space>
                    }
                    actions={[
                      <Space key="time">
                        <ClockCircleOutlined style={{ fontSize: '16px' }} />
                        {event.start_time.substring(0, 5)} - {event.end_time.substring(0, 5)}
                        {formatEventTime(event, userTimezone)}
                      </Space>,
                    ]}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        {event.category_details && (
                          <CategoryBadge category={event.category_details} size="sm" />
                        )}
                        {event.location_type !== 'virtual' && (
                          <Tag icon={<EnvironmentOutlined style={{ fontSize: '14px' }} />}>
                            On-site
                          </Tag>
                        )}
                        {event.location_type === 'virtual' && (
                          <Tag icon={<VideoCameraOutlined style={{ fontSize: '14px' }} />}>
                            Virtual
                          </Tag>
                        )}
                      </Space>
                      <Space>
                        <CalendarOutlined style={{ color: '#8c8c8c', fontSize: '16px' }} />
                        <Text type="secondary">{dayjs(event.date).format('MMM D, YYYY')}</Text>
                      </Space>
                      {event.application_details && (
                        <Tag color="blue">💼 {event.application_details.company}</Tag>
                      )}
                    </Space>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </Space>
      </div>

      {/* Edit/Create Modal */}
      <Modal
        title={editingId ? 'Edit Event' : 'Add Event'}
        open={isFormOpen}
        onCancel={() => setIsFormOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Event Name" rules={[{ required: true }]}>
            <Input placeholder="Team Sync" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="timezone" label="Timezone">
                <Select options={['PT', 'MT', 'CT', 'ET'].map((t) => ({ label: t, value: t }))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="start_time" label="Start Time" rules={[{ required: true }]}>
                <TimePicker
                  use12Hours
                  format="h:mm a"
                  style={{ width: '100%' }}
                  minuteStep={5}
                  onChange={(val) => {
                    if (val) {
                      const end = val.add(defaultDuration, 'minute');
                      form.setFieldValue('end_time', end);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="end_time" label="End Time" rules={[{ required: true }]}>
                <TimePicker use12Hours format="h:mm a" style={{ width: '100%' }} minuteStep={5} />
              </Form.Item>
            </Col>
          </Row>

          <Collapse
            ghost
            items={[
              {
                key: 'advanced',
                label: <Text type="secondary">Advanced Options (Category, Location, Linking)</Text>,
                forceRender: true,
                children: (
                  <>
                    <Form.Item name="category" label="Category">
                      <Select
                        options={categories.map((c) => ({
                          label: <CategoryBadge category={c} size="sm" />,
                          value: c.id,
                        }))}
                        placeholder="Select Category"
                        dropdownRender={(menu) => (
                          <>
                            {menu}
                            <Space style={{ padding: '0 8px 4px' }}>
                              <Input
                                placeholder="New Category"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                style={{ width: 120 }}
                              />
                              <IconPicker value={newCategoryIcon} onChange={setNewCategoryIcon} />
                              <Button
                                type="text"
                                icon={<PlusOutlined />}
                                onClick={async () => {
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
                              >
                                Add
                              </Button>
                            </Space>
                          </>
                        )}
                      />
                    </Form.Item>

                    <Form.Item name="location_type" label="Location Type">
                      <Select
                        options={[
                          { label: 'Virtual', value: 'virtual' },
                          { label: 'In Person', value: 'in_person' },
                          { label: 'Hybrid', value: 'hybrid' },
                        ]}
                        onChange={setLocationType}
                      />
                    </Form.Item>

                    {(locationType === 'virtual' || locationType === 'hybrid') && (
                      <Form.Item name="meeting_link" label="Meeting Link">
                        <Input prefix={<VideoCameraOutlined />} placeholder="https://zoom.us/..." />
                      </Form.Item>
                    )}

                    {(locationType === 'in_person' || locationType === 'hybrid') && (
                      <Form.Item name="location" label="Location">
                        <Input prefix={<EnvironmentOutlined />} placeholder="Address" />
                      </Form.Item>
                    )}

                    <Form.Item label="Recurrence">
                      <Button onClick={() => setShowRecurrenceModal(true)}>
                        {recurrenceRule ? `Repeats ${recurrenceRule.frequency}` : 'Set Recurrence'}
                      </Button>
                      {recurrenceRule && (
                        <Button type="text" danger onClick={() => setRecurrenceRule(null)}>
                          Clear
                        </Button>
                      )}
                    </Form.Item>

                    <Form.Item name="application" label="Link Application">
                      <Select
                        allowClear
                        options={applications.map((a) => ({
                          label: `${a.company_details?.name || 'Unknown'} - ${a.role_title}`,
                          value: a.id,
                        }))}
                      />
                    </Form.Item>

                    <Form.Item name="notes" label="Notes">
                      <TextArea rows={3} />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Save
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

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

      {/* View Modal */}
      <Modal
        title={viewingEvent?.name}
        open={!!viewingEvent}
        onCancel={() => setViewingEvent(null)}
        footer={[
          <Button key="close" onClick={() => setViewingEvent(null)}>
            Close
          </Button>,
          <Button
            key="edit"
            type="primary"
            onClick={() => {
              if (viewingEvent) {
                handleEdit(viewingEvent);
                setViewingEvent(null);
              }
            }}
          >
            Edit
          </Button>,
        ]}
      >
        {viewingEvent && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Row>
              <Col span={12}>
                <Text type="secondary">Date</Text>
                <div>{dayjs(viewingEvent.date).format('MMMM D, YYYY')}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Time</Text>
                <div>
                  {viewingEvent.start_time} - {viewingEvent.end_time}
                </div>
              </Col>
            </Row>
            {viewingEvent.meeting_link && (
              <div>
                <Text type="secondary">Meeting</Text>
                <div>
                  <a href={viewingEvent.meeting_link} target="_blank" rel="noreferrer">
                    {viewingEvent.meeting_link}
                  </a>
                </div>
              </div>
            )}
            {viewingEvent.notes && (
              <div>
                <Text type="secondary">Notes</Text>
                <div style={{ whiteSpace: 'pre-wrap' }}>{viewingEvent.notes}</div>
              </div>
            )}
          </Space>
        )}
      </Modal>

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
