import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAvailability, updateUserSettings } from '../../api';
import type { Availability as AvailabilityType } from '../../types';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import CalendarView from '../../components/CalendarView';
import PageActionToolbar from '../../components/PageActionToolbar';
import { PageState, PanelSkeleton } from '../../components/PageState';
import { message } from 'antd';
import CalendarHolidayModal from '../../components/calendarView/CalendarHolidayModal';
import RecurrenceModal from '../../components/RecurrenceModal';
import EventEditorModal from '../Events/components/EventEditorModal';
import EventViewModal from '../Events/components/EventViewModal';
import {
  AvailabilityBookingCard,
  AvailabilityGeneratorCard,
  AvailabilityGroups,
  AvailabilityTextControls,
  AvailabilityViewToggle,
  PublicBookingManager,
} from './components';
import { useAuth } from '../../context/AuthContext';
import { getBrowserTimeZone } from '../../lib/timezones';
import { useAvailabilityCalendar } from './useAvailabilityCalendar';
import { useShareLinks } from './useShareLinks';
import {
  buildAvailabilityCopyText,
  groupAvailabilityByWeek,
  processGroupItems,
} from './availabilityText';

dayjs.extend(customParseFormat);

const Availability = () => {
  const { user } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewTab = searchParams.get('view') === 'calendar' ? 'calendar' : 'text';

  const [loading, setLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [data, setData] = useState<AvailabilityType[]>([]);
  const [timezone, setTimezone] = useState(() => getBrowserTimeZone());
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [availabilityWeeks, setAvailabilityWeeks] = useState(2);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const [textMode, setTextMode] = useState<'detailed' | 'combined'>('combined');

  const fetchAvailability = async () => {
    setLoading(true);
    setAvailabilityError(false);
    try {
      const resp = await getAvailability(startDate, timezone, availabilityWeeks);
      setData(resp.data);
    } catch (error) {
      setAvailabilityError(true);
      messageApi.error('Failed to fetch availability');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const {
    eventForm,
    events,
    calendarLoading,
    calendarLoadError,
    customHolidays,
    federalHolidays,
    holidayTabs,
    categories,
    viewingEvent,
    setViewingEvent,
    isEventFormOpen,
    setIsEventFormOpen,
    editingEventId,
    showRecurrenceModal,
    setShowRecurrenceModal,
    recurrenceRule,
    setRecurrenceRule,
    locationType,
    setLocationType,
    defaultDuration,
    newCategoryName,
    setNewCategoryName,
    newCategoryIcon,
    setNewCategoryIcon,
    pendingHolidayAdd,
    setPendingHolidayAdd,
    editingHoliday,
    setEditingHoliday,
    fetchCalendarData,
    handleCalendarItemDrop,
    handleCalendarEventSelect,
    handleEventEdit,
    handleCalendarEventDelete,
    handleCalendarAddEvent,
    handleCalendarAddHoliday,
    handleCalendarHolidaySelect,
    handleCalendarHolidayDelete,
    handleEventFormFinish,
    handleHolidayFormFinish,
    handleCreateEventCategory,
  } = useAvailabilityCalendar({ timezone, messageApi });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const {
    shareLink,
    setShareLink,
    shareLinks,
    publicBookings,
    shareTitle,
    setShareTitle,
    hostDisplayName,
    setHostDisplayName,
    hostEmail,
    setHostEmail,
    publicNote,
    setPublicNote,
    shareDuration,
    setShareDuration,
    bookingBlockMinutes,
    setBookingBlockMinutes,
    bufferMinutes,
    setBufferMinutes,
    maxBookingsPerDay,
    setMaxBookingsPerDay,
    allowRescheduleCancel,
    setAllowRescheduleCancel,
    rescheduleCancelDeadlineHours,
    setRescheduleCancelDeadlineHours,
    intakeQuestions,
    setIntakeQuestions,
    generatingLink,
    deactivatingLink,
    bookingDataLoading,
    bookingDataError,
    fetchShareLink,
    handleGenerateShareLink,
    getShareLinkUrl,
    handleCopyShareLink,
    handleDeactivateShareLink,
    handleCopySpecificShareLink,
    handleDeactivateSpecificShareLink,
    handleBulkDeactivateLinks,
    handleBulkDeleteLinks,
    handleBulkDeleteBookings,
    handleBulkToggleLockLinks,
    handleBulkToggleLockBookings,
    handleCancelHostBooking,
    handleBulkUpdateLinks,
  } = useShareLinks({
    timezone,
    startDate,
    availabilityWeeks,
    setAvailabilityWeeks,
    onAvailabilityRefetched: setData,
    onAvailabilityRefetchFailed: () => setAvailabilityError(true),
    messageApi,
  });

  const handleAvailabilityWeeksChange = async (value: number) => {
    const nextWeeks = Math.max(1, Math.floor(value || 2));
    if (nextWeeks === availabilityWeeks) return;
    setAvailabilityWeeks(nextWeeks);
    try {
      await updateUserSettings({ availability_weeks: nextWeeks });
    } catch (error) {
      messageApi.error('Failed to save availability range');
      console.error(error);
    }
  };

  useEffect(() => {
    if (user) {
      if (!hostDisplayName) setHostDisplayName(user.full_name || '');
      if (!hostEmail) setHostEmail(user.email || '');
    }
  }, [hostDisplayName, hostEmail, user, setHostDisplayName, setHostEmail]);

  useEffect(() => {
    fetchAvailability();
    fetchCalendarData();
    fetchShareLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupedData = useMemo(() => groupAvailabilityByWeek(data, startDate), [data, startDate]);

  const renderedGroups = groupedData
    .map((group) => ({
      title: group.title,
      items: processGroupItems(group.items, textMode),
    }))
    .filter((group) => group.items.length > 0);

  const hasCalendarData =
    events.length > 0 ||
    customHolidays.length > 0 ||
    federalHolidays.length > 0 ||
    categories.length > 0;
  const hasBookingData = shareLink !== null || shareLinks.length > 0 || publicBookings.length > 0;

  return (
    <div className="space-y-6">
      {contextHolder}
      <PageActionToolbar
        title="Availability"
        subtitle="Generate shareable times and manage public booking links."
        viewSwitch={
          <AvailabilityViewToggle
            viewTab={viewTab}
            onChange={(next) => setSearchParams({ view: next })}
          />
        }
      />

      {viewTab === 'calendar' ? (
        calendarLoadError && !hasCalendarData ? (
          <PageState
            tone="error"
            title="Calendar unavailable"
            description="We couldn't load your events and holidays. Your saved data has not been changed."
            actionLabel="Try again"
            onAction={fetchCalendarData}
          />
        ) : (
          <CalendarView
            onItemDrop={handleCalendarItemDrop}
            events={events}
            customHolidays={customHolidays}
            federalHolidays={federalHolidays}
            categories={categories}
            holidayTabs={holidayTabs}
            addActionHighlight="all"
            loading={calendarLoading}
            onEventSelect={handleCalendarEventSelect}
            onHolidaySelect={handleCalendarHolidaySelect}
            onAddEvent={handleCalendarAddEvent}
            onAddHoliday={handleCalendarAddHoliday}
          />
        )
      ) : (
        <>
          <AvailabilityGeneratorCard
            startDate={startDate}
            onStartDateChange={setStartDate}
            timezone={timezone}
            onTimezoneChange={setTimezone}
            availabilityWeeks={availabilityWeeks}
            onAvailabilityWeeksChange={handleAvailabilityWeeksChange}
            loading={loading}
            onGenerate={fetchAvailability}
          />

          {bookingDataLoading && !hasBookingData ? (
            <PanelSkeleton rows={3} />
          ) : bookingDataError && !hasBookingData ? (
            <PageState
              tone="error"
              title="Booking links unavailable"
              description="We couldn't load your public links and bookings. Your saved booking settings have not been changed."
              actionLabel="Try again"
              onAction={fetchShareLink}
            />
          ) : (
            <>
              <AvailabilityBookingCard
                shareLink={shareLink}
                shareTitle={shareTitle}
                onShareTitleChange={setShareTitle}
                hostDisplayName={hostDisplayName}
                onHostDisplayNameChange={setHostDisplayName}
                hostEmail={hostEmail}
                onHostEmailChange={setHostEmail}
                publicNote={publicNote}
                onPublicNoteChange={setPublicNote}
                shareDuration={shareDuration}
                onShareDurationChange={setShareDuration}
                bookingBlockMinutes={bookingBlockMinutes}
                onBookingBlockMinutesChange={setBookingBlockMinutes}
                bufferMinutes={bufferMinutes}
                onBufferMinutesChange={setBufferMinutes}
                maxBookingsPerDay={maxBookingsPerDay}
                onMaxBookingsPerDayChange={setMaxBookingsPerDay}
                allowRescheduleCancel={allowRescheduleCancel}
                onAllowRescheduleCancelChange={setAllowRescheduleCancel}
                rescheduleCancelDeadlineHours={rescheduleCancelDeadlineHours}
                onRescheduleCancelDeadlineHoursChange={setRescheduleCancelDeadlineHours}
                intakeQuestions={intakeQuestions}
                onIntakeQuestionsChange={setIntakeQuestions}
                generatingLink={generatingLink}
                onGenerateShareLink={handleGenerateShareLink}
                onCopyShareLink={handleCopyShareLink}
                deactivatingLink={deactivatingLink}
                onDeactivateShareLink={handleDeactivateShareLink}
                getShareLinkUrl={getShareLinkUrl}
                onReset={() => setShareLink(null)}
              />

              <PublicBookingManager
                links={shareLinks}
                bookings={publicBookings}
                onCopyLink={handleCopySpecificShareLink}
                onDeactivateLink={handleDeactivateSpecificShareLink}
                onDeactivateLinks={handleBulkDeactivateLinks}
                onDeleteLinks={handleBulkDeleteLinks}
                onDeleteBookings={handleBulkDeleteBookings}
                onToggleLockLinks={handleBulkToggleLockLinks}
                onToggleLockBookings={handleBulkToggleLockBookings}
                onBulkUpdateLinks={handleBulkUpdateLinks}
                onCancelBooking={handleCancelHostBooking}
              />
            </>
          )}

          {availabilityError && data.length === 0 ? (
            <PageState
              tone="error"
              title="Availability unavailable"
              description="We couldn't generate your availability. Check your connection and try again."
              actionLabel="Try again"
              onAction={fetchAvailability}
            />
          ) : (
            <>
              <AvailabilityTextControls
                hasData={data.length > 0}
                textMode={textMode}
                onTextModeChange={setTextMode}
                copiedIndex={copiedIndex}
                onCopyAll={() =>
                  copyToClipboard(buildAvailabilityCopyText(groupedData, textMode, timezone), 'ALL')
                }
              />

              <AvailabilityGroups
                groupedData={renderedGroups}
                loading={loading}
                hasData={data.length > 0}
                copiedIndex={copiedIndex}
                onCopy={copyToClipboard}
                onUpdate={fetchAvailability}
              />
            </>
          )}
        </>
      )}

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
        defaultDuration={defaultDuration}
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
        open={!!pendingHolidayAdd || !!editingHoliday}
        mode={editingHoliday ? 'edit' : 'add'}
        date={pendingHolidayAdd?.date}
        target={pendingHolidayAdd?.target}
        holiday={editingHoliday}
        holidayTabs={holidayTabs}
        onCancel={() => {
          setPendingHolidayAdd(null);
          setEditingHoliday(null);
        }}
        onSubmit={handleHolidayFormFinish}
        onDelete={handleCalendarHolidayDelete}
      />
    </div>
  );
};
export default Availability;
