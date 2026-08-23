import { useMemo, useState } from 'react';
import { Typography, Space, Form, Input, Select, message, Button, Grid } from 'antd';
import Modal from '../../components/MobileModal';
import { LinkOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';
import type { Event } from '../../types';
import { createCategory } from '../../api';
import type { Holiday } from '../../types';
import RecurrenceModal from '../../components/RecurrenceModal';
import PageActionToolbar from '../../components/PageActionToolbar';
import { PageState } from '../../components/PageState';
import CalendarView from '../../components/CalendarView';
import type { CalendarHolidayTarget } from '../../components/calendarView/types';
import CalendarHolidayModal from '../../components/calendarView/CalendarHolidayModal';
import SegmentedToggle from '../../components/SegmentedToggle';
import EventsFilterBar from './components/EventsFilterBar';
import { useEventsData } from './useEventsData';
import { useEventSelection } from './useEventSelection';
import { useEventForm } from './useEventForm';
import { useEventMutations } from './useEventMutations';
import EventEditorModal from './components/EventEditorModal';
import EventViewModal from './components/EventViewModal';
import { getCurrentYear } from '../../utils/yearFilter';
import { usePersistedState } from '../../hooks/usePersistedState';
import { TIMEZONE_OPTIONS, getBrowserTimeZone, normalizeTimeZone } from '../../lib/timezones';
import LinkInterviewsModal from './components/LinkInterviewsModal';
import YearFilter from '../../components/YearFilter';
import EventsListSection from './EventsListSection';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezonePlugin);

const { Text } = Typography;

const Events = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

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

  // How the next save applies to a multi-day span, and which day was clicked.
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [viewingDay, setViewingDay] = useState<string | null>(null);
  const [isLinkInterviewsOpen, setIsLinkInterviewsOpen] = useState(false);
  const [pendingCalendarHoliday, setPendingCalendarHoliday] = useState<{
    date: Date;
    target: CalendarHolidayTarget;
  } | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  const [contentView, setContentView] = usePersistedState<'list' | 'calendar'>(
    'eventsContentView',
    'calendar',
    {
      serialize: (value) => value,
      deserialize: (raw) => (raw === 'calendar' ? 'calendar' : 'list'),
    }
  );

  const {
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
  } = useEventsData({
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
  });

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
  const listLoadFailed = loadError && events.length === 0;
  const calendarLoadFailed =
    calendarLoadError &&
    calendarEvents.length === 0 &&
    customHolidays.length === 0 &&
    federalHolidays.length === 0;

  const handleCalendarHolidayAdd = (date: Date, target: CalendarHolidayTarget) => {
    setEditingHoliday(null);
    setPendingCalendarHoliday({ date, target });
  };

  const handleHolidaySelect = (holiday: Holiday) => {
    setPendingCalendarHoliday(null);
    setEditingHoliday(holiday);
  };

  const {
    isFormOpen,
    setIsFormOpen,
    editingId,
    showRecurrenceModal,
    setShowRecurrenceModal,
    recurrenceRule,
    setRecurrenceRule,
    newCategoryName,
    setNewCategoryName,
    newCategoryIcon,
    setNewCategoryIcon,
    locationType,
    setLocationType,
    handleAdd,
    handleEdit,
    handleDuplicate,
    onFinish,
  } = useEventForm({
    events,
    form,
    categories,
    setCategories,
    defaultDuration,
    defaultCategory,
    userTimezone,
    fetchData,
    fetchCalendarData,
    messageApi,
  });

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

  const {
    selectedIds,
    setSelectedIds,
    isAnySelectedLocked,
    handleSelectChange,
    handleSelectAll,
    handleBulkDelete,
    handleBulkToggleLock,
  } = useEventSelection({ events, fetchData, fetchCalendarData, messageApi });

  const {
    isDeleteAllOpen,
    setIsDeleteAllOpen,
    showImport,
    setShowImport,
    setImportFile,
    handleDelete,
    handleDeleteAction,
    handleCalendarHolidayDelete,
    handleDeleteAll,
    handleImportUpload,
    handleCalendarHolidaySubmit,
    handleExportWrapper,
    toggleLock,
    formatEventTime,
    handleCalendarItemDrop,
  } = useEventMutations({
    setEvents,
    setCalendarEvents,
    pendingCalendarHoliday,
    editingHoliday,
    setPendingCalendarHoliday,
    setEditingHoliday,
    setViewingEvent,
    setSelectedIds,
    fetchData,
    fetchCalendarData,
    messageApi,
  });

  const viewControls = (
    <>
      <SegmentedToggle
        value={contentView}
        onChange={setContentView}
        wrapperClassName="page-toolbar-view-switch w-max rounded-xl border border-gray-200 bg-white p-1"
        buttonClassName="px-3 py-1.5"
        options={[
          { value: 'list', label: 'List', activeClassName: 'bg-blue-50 text-blue-700' },
          { value: 'calendar', label: 'Calendar', activeClassName: 'bg-blue-50 text-blue-700' },
        ]}
      />
      <YearFilter
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        availableYears={availableYears}
        className="toolbar-select"
      />
      <Select
        aria-label="Display timezone"
        value={normalizeTimeZone(userTimezone)}
        onChange={(value) => setUserTimezone(normalizeTimeZone(value))}
        className="toolbar-select w-full sm:w-[220px]"
        showSearch
        optionFilterProp="label"
        options={TIMEZONE_OPTIONS}
      />
    </>
  );

  return (
    <>
      {contextHolder}
      <div className="p-0">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header & Actions */}
          <PageActionToolbar
            title="Events"
            subtitle={`${eventsTotal.toLocaleString()} events`}
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
              <div className="mb-3 flex flex-wrap items-center gap-2">{viewControls}</div>
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
                <EventsListSection
                  events={events}
                  eventsTotal={eventsTotal}
                  formatEventTime={formatEventTime}
                  handleBulkDelete={handleBulkDelete}
                  handleBulkToggleLock={handleBulkToggleLock}
                  handleDeleteAction={handleDeleteAction}
                  handleDuplicate={handleDuplicate}
                  handleEdit={handleEdit}
                  handleSelectAll={handleSelectAll}
                  handleSelectChange={handleSelectChange}
                  isAnySelectedLocked={isAnySelectedLocked}
                  loading={loading}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                  toggleLock={toggleLock}
                  userTimezone={userTimezone}
                  currentPage={currentPage}
                  isMobile={isMobile}
                  pageSize={pageSize}
                  paginatedEvents={paginatedEvents}
                  setCurrentPage={setCurrentPage}
                  setPageSize={setPageSize}
                  setViewingEvent={setViewingEvent}
                  viewingDay={viewingDay}
                />
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
              pageControls={viewControls}
              onItemDrop={handleCalendarItemDrop}
              events={calendarEvents}
              customHolidays={customHolidays}
              federalHolidays={federalHolidays}
              categories={categories}
              holidayTabs={holidayTabs}
              defaultHolidayColor={defaultHolidayColor}
              federalHolidayColor={federalHolidayColor}
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
