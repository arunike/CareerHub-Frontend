import { useState, useEffect } from 'react';
import { Tabs, Space, Form, Input, message } from 'antd';
import Modal from '../../components/MobileModal';
import { deleteHoliday } from '../../api';
import PageActionToolbar from '../../components/PageActionToolbar';
import CalendarView from '../../components/CalendarView';
import RecurrenceModal from '../../components/RecurrenceModal';
import SegmentedToggle from '../../components/SegmentedToggle';
import { getCurrentYear } from '../../utils/yearFilter';
import HolidayAddForm from './HolidayAddForm';
import { useHolidayEvents } from './useHolidayEvents';
import { useHolidaySelection } from './useHolidaySelection';
import { useFederalHolidays } from './useFederalHolidays';
import { useCalendarHolidays } from './useCalendarHolidays';
import { useHolidayCrud } from './useHolidayCrud';
import { useHolidayData } from './useHolidayData';
import FederalHolidayModal from './FederalHolidayModal';
import HolidayEditModal from './HolidayEditModal';
import HolidayListCard from './HolidayListCard';
import { usePersistedState } from '../../hooks/usePersistedState';
import {
  FEDERAL_HOLIDAY_LABEL,
  UNTABBED_HOLIDAY_LABEL,
  getFederalHolidayColor,
  getHolidayTabColor,
} from '../../utils/holidayTabColors';
import EventEditorModal from '../Events/components/EventEditorModal';
import EventViewModal from '../Events/components/EventViewModal';
import CalendarHolidayModal from '../../components/calendarView/CalendarHolidayModal';
import { PageState } from '../../components/PageState';
import { useLocation, useNavigate } from 'react-router-dom';
import YearFilter from '../../components/YearFilter';
import FederalHolidayTabPanel from './FederalHolidayTabPanel';

const Holidays = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

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
    'calendar',
    {
      serialize: (value) => value,
      deserialize: (raw) => (raw === 'calendar' ? 'calendar' : 'list'),
    }
  );

  const [isRangeMode, setIsRangeMode] = useState(false);

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

  const {
    events,
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
  } = useHolidayData({ selectedYear, activeTab, sortBy, sortOrder, messageApi });

  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
  };

  const {
    federalForm,
    addFederalModalOpen,
    setAddFederalModalOpen,
    isFederalRangeMode,
    setIsFederalRangeMode,
    groupedFederalHolidays,
    closeFederalModal,
    handleAddFederal,
    handleDeleteFederalRange,
    handleToggleFederalHoliday,
  } = useFederalHolidays({ federalHolidays, userSettings, fetchData, messageApi });

  const {
    pendingCalendarHoliday,
    setPendingCalendarHoliday,
    editingCalendarHoliday,
    setEditingCalendarHoliday,
    handleCalendarHolidayAdd,
    handleCalendarHolidaySelect,
    handleCalendarHolidaySubmit,
    handleCalendarItemDrop,
  } = useCalendarHolidays({ fetchData, messageApi });

  const {
    eventForm,
    viewingEvent,
    setViewingEvent,
    isEventFormOpen,
    setIsEventFormOpen,
    editingEventId,
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
    handleCalendarEventSelect,
    handleCalendarAddEvent,
    handleEventEdit,
    handleCalendarEventDelete,
    handleEventFormFinish,
    handleCreateEventCategory,
  } = useHolidayEvents({
    events,
    setCategories,
    defaultEventDuration,
    userTimezone,
    fetchData,
    messageApi,
  });

  const {
    selectedIds,
    setSelectedIds,
    isAnySelectedLocked,
    handleSelectChange,
    handleSelectGroup,
    handleSelectAll,
    handleBulkDelete,
    handleBulkToggleLock,
    handleBulkEditClick,
    handleToggleLockGroup,
    handleDeleteGroup,
  } = useHolidaySelection({
    holidays,
    editForm,
    setEditingItem,
    setEditModalOpen,
    fetchData,
    messageApi,
  });

  const {
    showImport,
    setShowImport,
    setImportFile,
    handleAdd,
    handleDelete,
    handleCalendarHolidayDelete,
    handleDuplicateHoliday,
    handleEditClick,
    handleEditSubmit,
    toggleLock,
    handleImportUpload,
    handleExportWrapper,
  } = useHolidayCrud({
    holidays,
    setHolidays,
    activeTab,
    isRangeMode,
    form,
    setEditingCalendarHoliday,
    setPendingCalendarHoliday,
    clearSelection: () => setSelectedIds([]),
    editForm,
    editingItem,
    setEditModalOpen,
    setEditingItem,
    fetchData,
    messageApi,
  });

  const renderHolidayListTab = (_tabKey: string, tabLabel: string) => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Add Form */}
      <HolidayAddForm
        form={form}
        handleAdd={handleAdd}
        isRangeMode={isRangeMode}
        setIsRangeMode={setIsRangeMode}
      />

      {/* List */}
      <HolidayListCard
        onDeleteAllUnlocked={async () => {
          try {
            const toDelete = activeTabHolidays.filter((h) => !h.is_locked);
            await Promise.all(toDelete.map((h) => deleteHoliday(h.id)));
            messageApi.success('All unlocked time off deleted');
            fetchData();
          } catch {
            messageApi.error('Failed to delete all');
          }
        }}
        tabLabel={tabLabel}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        activeTabHolidays={activeTabHolidays}
        fetchData={fetchData}
        groupedHolidays={groupedHolidays}
        handleBulkDelete={handleBulkDelete}
        handleBulkEditClick={handleBulkEditClick}
        handleBulkToggleLock={handleBulkToggleLock}
        handleDelete={handleDelete}
        handleDeleteGroup={handleDeleteGroup}
        handleDuplicateHoliday={handleDuplicateHoliday}
        handleEditClick={handleEditClick}
        handleSelectAll={(checked: boolean) => handleSelectAll(checked, sortedHolidays)}
        handleSelectChange={handleSelectChange}
        handleSelectGroup={handleSelectGroup}
        handleToggleLockGroup={handleToggleLockGroup}
        isAnySelectedLocked={isAnySelectedLocked}
        loading={loading}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        setSortBy={setSortBy}
        setSortOrder={setSortOrder}
        sortBy={sortBy}
        sortOrder={sortOrder}
        sortedHolidays={sortedHolidays}
        toggleLock={toggleLock}
      />
    </Space>
  );

  const items = [
    {
      key: 'custom',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: getHolidayTabColor(userSettings?.default_holiday_color).dot,
            }}
          />
          {UNTABBED_HOLIDAY_LABEL}
        </span>
      ),
      children: renderHolidayListTab('custom', UNTABBED_HOLIDAY_LABEL),
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
      label: (
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: getFederalHolidayColor(userSettings?.federal_holiday_color).dot,
            }}
          />
          {FEDERAL_HOLIDAY_LABEL}
        </span>
      ),
      children: (
        <FederalHolidayTabPanel
          federalForm={federalForm}
          groupedFederalHolidays={groupedFederalHolidays}
          handleDelete={handleDelete}
          handleDeleteFederalRange={handleDeleteFederalRange}
          handleToggleFederalHoliday={handleToggleFederalHoliday}
          loading={loading}
          setAddFederalModalOpen={setAddFederalModalOpen}
          setIsFederalRangeMode={setIsFederalRangeMode}
          isAdvancedMode={isAdvancedMode}
          setIsAdvancedMode={setIsAdvancedMode}
        />
      ),
    },
  ];

  // Inside the calendar header, so the page title is not followed by a band of controls.
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
    </>
  );

  return (
    <>
      {contextHolder}
      <div className="w-full">
        <div className="mb-6">
          <PageActionToolbar
            title="Holidays"
            subtitle="Manage personal time off and observed holidays."
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
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">{viewControls}</div>
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
          </>
        ) : (
          <CalendarView
            pageControls={viewControls}
            onItemDrop={handleCalendarItemDrop}
            events={events}
            customHolidays={holidaysForSelectedYear}
            federalHolidays={federalHolidays}
            categories={categories}
            holidayTabs={customTabs}
            defaultHolidayColor={userSettings?.default_holiday_color}
            federalHolidayColor={userSettings?.federal_holiday_color}
            addActionHighlight="holidays"
            loading={loading}
            onEventSelect={handleCalendarEventSelect}
            onHolidaySelect={handleCalendarHolidaySelect}
            onAddEvent={handleCalendarAddEvent}
            onAddHoliday={handleCalendarHolidayAdd}
          />
        )}

        {/* Edit Modal */}
        <HolidayEditModal
          editForm={editForm}
          customTabs={customTabs}
          editModalOpen={editModalOpen}
          editingItem={editingItem}
          handleEditSubmit={handleEditSubmit}
          holidays={holidays}
          setEditModalOpen={setEditModalOpen}
        />

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
        <FederalHolidayModal
          federalForm={federalForm}
          addFederalModalOpen={addFederalModalOpen}
          closeFederalModal={closeFederalModal}
          handleAddFederal={handleAddFederal}
          isFederalRangeMode={isFederalRangeMode}
          setIsFederalRangeMode={setIsFederalRangeMode}
        />

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
