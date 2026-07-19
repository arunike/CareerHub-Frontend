import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  cancelHostPublicBooking,
  createCategory,
  createEvent,
  createHoliday,
  deactivateShareLink,
  deactivateSpecificShareLink,
  deletePublicBooking,
  deleteShareLink,
  generateShareLink,
  getAvailability,
  getCategories,
  getCurrentShareLink,
  getEvents,
  getFederalHolidays,
  getHolidays,
  getApplicationOptions,
  getPublicBookings,
  getShareLinks,
  updatePublicBooking,
  updateEvent,
  updateHoliday,
  updateRecurringSeries,
  updateShareLink,
  updateUserSettings,
  getUserSettings,
  setRecurrence,
} from '../../api';
import type {
  Availability as AvailabilityType,
  BookingIntakeQuestion,
  Event,
  EventCategory,
  Holiday,
  HolidayTab,
  PublicBooking,
  RecurrenceRule,
} from '../../types';
import type { CalendarHolidayTarget } from '../../components/calendarView/types';
import {
  addWeeks,
  differenceInCalendarDays,
  format,
  isSameMonth,
  isSameWeek,
  parseISO,
} from 'date-fns';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import CalendarView from '../../components/CalendarView';
import PageActionToolbar from '../../components/PageActionToolbar';
import { PageState, PanelSkeleton } from '../../components/PageState';
import { Form, message, Modal } from 'antd';
import CalendarHolidayModal from '../../components/calendarView/CalendarHolidayModal';
import type { CalendarHolidayFormValues } from '../../components/calendarView/CalendarHolidayModal';
import type { ShareLink } from '../../types';
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
import { getBrowserTimeZone, normalizeTimeZone } from '../../lib/timezones';

dayjs.extend(customParseFormat);

type EventFormValues = {
  date: dayjs.Dayjs;
  start_time: dayjs.Dayjs;
  end_time: dayjs.Dayjs;
  [key: string]: unknown;
};

type ApiError = { response?: { status?: number; data?: { conflict?: boolean } } };

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { error?: unknown } } }).response?.data?.error ===
      'string'
  ) {
    return (error as { response: { data: { error: string } } }).response.data.error;
  }
  return fallback;
};

const canMergeAvailabilityDates = (previousDate: string, nextDate: string) => {
  const previous = parseISO(previousDate);
  const next = parseISO(nextDate);
  const dayGap = differenceInCalendarDays(next, previous);

  return dayGap === 1 && isSameWeek(previous, next, { weekStartsOn: 1 });
};

const Availability = () => {
  const { user } = useAuth();
  const [eventForm] = Form.useForm();
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
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [publicBookings, setPublicBookings] = useState<PublicBooking[]>([]);
  const [shareTitle, setShareTitle] = useState('Book a time with me');
  const [hostDisplayName, setHostDisplayName] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [publicNote, setPublicNote] = useState('');
  const [shareDuration, setShareDuration] = useState<number>(14);
  const [bookingBlockMinutes, setBookingBlockMinutes] = useState<number>(30);
  const [bufferMinutes, setBufferMinutes] = useState<number>(10);
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState<number>(3);
  const [allowRescheduleCancel, setAllowRescheduleCancel] = useState(true);
  const [rescheduleCancelDeadlineHours, setRescheduleCancelDeadlineHours] = useState(24);
  const [intakeQuestions, setIntakeQuestions] = useState<BookingIntakeQuestion[]>([]);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [deactivatingLink, setDeactivatingLink] = useState(false);

  const [events, setEvents] = useState<Event[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarLoadError, setCalendarLoadError] = useState(false);
  const [customHolidays, setCustomHolidays] = useState<Holiday[]>([]);
  const [federalHolidays, setFederalHolidays] = useState<Holiday[]>([]);
  const [holidayTabs, setHolidayTabs] = useState<HolidayTab[]>([]);
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
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [locationType, setLocationType] = useState<'in_person' | 'virtual' | 'hybrid'>('virtual');
  const [defaultDuration, setDefaultDuration] = useState(60);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [pendingHolidayAdd, setPendingHolidayAdd] = useState<{
    date: Date;
    target: CalendarHolidayTarget;
  } | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [bookingDataLoading, setBookingDataLoading] = useState(true);
  const [bookingDataError, setBookingDataError] = useState(false);

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

  const fetchCalendarData = async () => {
    setCalendarLoading(true);
    setCalendarLoadError(false);
    try {
      const [eventsResp, holidaysResp, fedResp, categoriesResp] = await Promise.all([
        getEvents(),
        getHolidays(),
        getFederalHolidays(),
        getCategories(),
      ]);
      setEvents(eventsResp.data);
      setCustomHolidays(holidaysResp.data);
      setFederalHolidays(fedResp.data);
      setCategories(categoriesResp.data);
    } catch (error) {
      setCalendarLoadError(true);
      messageApi.error('Failed to fetch calendar data');
      console.error('Failed to fetch calendar data', error);
    } finally {
      setCalendarLoading(false);
    }
  };

  const ensureApplicationsLoaded = async () => {
    if (hasLoadedApplications) return;

    try {
      const applicationsResp = await getApplicationOptions({ page_size: 100 });
      setApplications(applicationsResp.data);
      setHasLoadedApplications(true);
    } catch (error) {
      messageApi.error('Failed to load applications');
      console.error('Failed to load applications', error);
    }
  };

  const fetchShareLink = async () => {
    setBookingDataLoading(true);
    setBookingDataError(false);
    try {
      const [currentResp, linksResp, bookingsResp, settingsResp] = await Promise.all([
        getCurrentShareLink(),
        getShareLinks(),
        getPublicBookings(),
        getUserSettings(),
      ]);
      setShareLink(currentResp.data.active);
      setShareLinks(linksResp.data);
      setPublicBookings(bookingsResp.data);

      const activeLink = currentResp.data.active;
      const nextAvailabilityWeeks = settingsResp.data.availability_weeks || 2;
      setAvailabilityWeeks(nextAvailabilityWeeks);
      if (settingsResp.data.default_event_duration) {
        setDefaultDuration(parseInt(settingsResp.data.default_event_duration));
      }
      setHolidayTabs(settingsResp.data.holiday_tabs || []);

      if (activeLink) {
        if (activeLink.booking_block_minutes) {
          setBookingBlockMinutes(activeLink.booking_block_minutes);
        }
        if (activeLink.host_display_name) {
          setHostDisplayName(activeLink.host_display_name);
        }
        if (activeLink.host_email) {
          setHostEmail(activeLink.host_email);
        }
        setAllowRescheduleCancel(activeLink.allow_reschedule_cancel);
        setRescheduleCancelDeadlineHours(activeLink.reschedule_cancel_deadline_hours || 0);
        setIntakeQuestions(activeLink.intake_questions || []);
      } else {
        if (settingsResp.data.display_name) {
          setHostDisplayName(settingsResp.data.display_name);
        }
        if (settingsResp.data.email) {
          setHostEmail(settingsResp.data.email);
        }
      }

      if (nextAvailabilityWeeks !== availabilityWeeks) {
        try {
          const availabilityResp = await getAvailability(
            startDate,
            timezone,
            nextAvailabilityWeeks
          );
          setData(availabilityResp.data);
        } catch (error) {
          setAvailabilityError(true);
          console.error('Failed to refresh saved availability range', error);
        }
      }
    } catch (error) {
      setBookingDataError(true);
      console.error('Failed to fetch share link', error);
    } finally {
      setBookingDataLoading(false);
    }
  };

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
  }, [hostDisplayName, hostEmail, user]);

  useEffect(() => {
    fetchAvailability();
    fetchCalendarData();
    fetchShareLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateShareLink = async () => {
    if (!hostDisplayName.trim() || !hostEmail.trim()) {
      messageApi.error('Display Name and Host Email are required.');
      return;
    }

    setGeneratingLink(true);
    try {
      const resp = await generateShareLink({
        title: shareTitle.trim() || 'Book a time with me',
        host_display_name: hostDisplayName.trim(),
        host_email: hostEmail.trim(),
        public_note: publicNote.trim(),
        duration_days: shareDuration,
        booking_block_minutes: bookingBlockMinutes,
        buffer_minutes: bufferMinutes,
        max_bookings_per_day: maxBookingsPerDay,
        allow_reschedule_cancel: allowRescheduleCancel,
        reschedule_cancel_deadline_hours: allowRescheduleCancel ? rescheduleCancelDeadlineHours : 0,
        intake_questions: intakeQuestions.filter((question) => question.label.trim()),
      });
      setShareLink(resp.data);
      await fetchShareLink();
      messageApi.success('Booking link generated');
    } catch (error) {
      messageApi.error('Failed to generate booking link');
      console.error(error);
    } finally {
      setGeneratingLink(false);
    }
  };

  const getShareLinkUrl = () => {
    if (!shareLink) return '';
    return `${window.location.origin}/book/${shareLink.uuid}`;
  };

  const handleCalendarEventSelect = (event: Event) => {
    setViewingEvent(event);
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
      timezone: normalizeTimeZone(event.timezone || timezone),
      category: event.category,
      location_type: event.location_type || 'virtual',
      location: event.location,
      meeting_link: event.meeting_link,
      notes: event.notes,
      application: event.application,
    });
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
      end_time: start.add(defaultDuration, 'minute'),
      timezone: normalizeTimeZone(timezone),
      location_type: 'virtual',
    });
  };

  const handleCalendarAddHoliday = (date: Date, target: CalendarHolidayTarget) => {
    setEditingHoliday(null);
    setPendingHolidayAdd({ date, target });
  };

  const handleCalendarHolidaySelect = (holiday: Holiday) => {
    setPendingHolidayAdd(null);
    setEditingHoliday(holiday);
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
      await fetchCalendarData();
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
            fetchCalendarData();
          },
        });
        return;
      }

      messageApi.error('Failed to save event');
    }
  };

  const handleHolidayFormFinish = async (values: CalendarHolidayFormValues) => {
    try {
      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, {
          description: values.description?.trim() || editingHoliday.description,
          is_recurring: !!values.is_recurring,
          tab: values.tab || null,
        });
        messageApi.success('Holiday updated');
      } else if (pendingHolidayAdd) {
        await createHoliday({
          date: format(pendingHolidayAdd.date, 'yyyy-MM-dd'),
          description: values.description?.trim() || pendingHolidayAdd.target.label,
          is_recurring: !!values.is_recurring,
          tab: values.tab || null,
        });
        messageApi.success('Holiday added');
      }

      setPendingHolidayAdd(null);
      setEditingHoliday(null);
      await fetchCalendarData();
    } catch (error) {
      messageApi.error(editingHoliday ? 'Failed to update holiday' : 'Failed to create holiday');
      console.error(error);
    }
  };

  const handleCreateEventCategory = async () => {
    if (!newCategoryName.trim()) return;

    await createCategory({
      name: newCategoryName.trim(),
      color: '#2563eb',
      icon: newCategoryIcon,
    });
    setNewCategoryName('');
    setNewCategoryIcon('tag');
    const categoriesResp = await getCategories();
    setCategories(categoriesResp.data);
  };

  const getAnyShareLinkUrl = (link: ShareLink) => `${window.location.origin}/book/${link.uuid}`;

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    const url = getShareLinkUrl();
    await navigator.clipboard.writeText(url);
    messageApi.success('Booking link copied');
  };

  const handleDeactivateShareLink = async () => {
    setDeactivatingLink(true);
    try {
      await deactivateShareLink();
      setShareLink(null);
      await fetchShareLink();
      messageApi.success('Booking link deactivated');
    } catch (error) {
      messageApi.error('Failed to deactivate link');
      console.error(error);
    } finally {
      setDeactivatingLink(false);
    }
  };

  const handleCopySpecificShareLink = async (link: ShareLink) => {
    await navigator.clipboard.writeText(getAnyShareLinkUrl(link));
    messageApi.success('Booking link copied');
  };

  const handleDeactivateSpecificShareLink = async (id: number) => {
    try {
      await deactivateSpecificShareLink(id);
      await fetchShareLink();
      messageApi.success('Booking link deactivated');
    } catch (error) {
      messageApi.error('Failed to deactivate link');
      console.error(error);
    }
  };

  const handleBulkDeactivateLinks = async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) => deactivateSpecificShareLink(id)));
      await fetchShareLink();
      messageApi.success(`${ids.length} links deactivated`);
    } catch (error) {
      messageApi.error('Failed to deactivate some links');
      console.error(error);
    }
  };

  const handleBulkDeleteLinks = async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) => deleteShareLink(id)));
      await fetchShareLink();
      messageApi.success(`${ids.length} links deleted`);
    } catch (error) {
      messageApi.error('Failed to delete some links');
      console.error(error);
    }
  };

  const handleBulkDeleteBookings = async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) => deletePublicBooking(id)));
      await fetchShareLink();
      messageApi.success(`${ids.length} bookings deleted`);
    } catch (error) {
      messageApi.error('Failed to delete some bookings');
      console.error(error);
    }
  };

  const handleBulkToggleLockLinks = async (ids: number[], lock: boolean) => {
    try {
      await Promise.all(ids.map((id) => updateShareLink(id, { is_locked: lock })));
      await fetchShareLink();
      messageApi.success(`${ids.length} links ${lock ? 'locked' : 'unlocked'}`);
    } catch (error) {
      messageApi.error(`Failed to ${lock ? 'lock' : 'unlock'} some links`);
      console.error(error);
    }
  };

  const handleBulkToggleLockBookings = async (ids: number[], lock: boolean) => {
    try {
      await Promise.all(ids.map((id) => updatePublicBooking(id, { is_locked: lock })));
      await fetchShareLink();
      messageApi.success(`${ids.length} bookings ${lock ? 'locked' : 'unlocked'}`);
    } catch (error) {
      messageApi.error(`Failed to ${lock ? 'lock' : 'unlock'} some bookings`);
      console.error(error);
    }
  };

  const handleCancelHostBooking = (booking: PublicBooking) => {
    Modal.confirm({
      title: `Cancel booking with ${booking.name}?`,
      content:
        'This cancels the booking from your host account and removes its locked calendar event. Guest reschedule/cancel cutoff settings do not apply to host actions.',
      okText: 'Cancel booking',
      okType: 'danger',
      cancelText: 'Keep booking',
      onOk: async () => {
        try {
          const resp = await cancelHostPublicBooking(booking.id);
          await fetchShareLink();
          messageApi.success(resp.data.message || 'Booking canceled');
        } catch (error) {
          messageApi.error(getErrorMessage(error, 'Could not cancel booking from host account.'));
          console.error(error);
        }
      },
    });
  };

  const handleBulkUpdateLinks = async (ids: number[], updates: Partial<ShareLink>) => {
    try {
      await Promise.all(ids.map((id) => updateShareLink(id, updates)));
      await fetchShareLink();
      messageApi.success(`${ids.length} links updated`);
    } catch (error) {
      messageApi.error('Failed to update some links');
      console.error(error);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const groupedData = useMemo(() => {
    if (!data.length) return [];

    const start = parseISO(startDate);

    const groups: { title: string; items: AvailabilityType[] }[] = [
      { title: 'This Week', items: [] },
      { title: 'Next Week', items: [] },
      { title: 'The Following Week', items: [] },
    ];

    data.forEach((item) => {
      const itemDate = parseISO(item.date);

      if (isSameWeek(itemDate, start, { weekStartsOn: 1 })) {
        groups[0].items.push(item);
      } else if (isSameWeek(itemDate, addWeeks(start, 1), { weekStartsOn: 1 })) {
        groups[1].items.push(item);
      } else if (isSameWeek(itemDate, addWeeks(start, 2), { weekStartsOn: 1 })) {
        groups[2].items.push(item);
      } else {
        let lastGroup = groups.find((g) => g.title === 'Later');
        if (!lastGroup) {
          lastGroup = { title: 'Later', items: [] };
          groups.push(lastGroup);
        }
        lastGroup.items.push(item);
      }
    });

    return groups.filter((g) => g.items.length > 0);
  }, [data, startDate]);

  const processGroupItems = (items: AvailabilityType[]) => {
    if (textMode === 'detailed')
      return items.map((item) => ({
        ...item,
        displayDate: `${item.day_name}, ${item.readable_date}`,
        availability: item.availability || 'Unknown',
        fullText: `${item.day_name}, ${item.readable_date}, ${item.availability || 'Unknown'}`,
      }));

    const condensed: { displayDate: string; availability: string; fullText: string }[] = [];

    if (items.length === 0) return [];

    let currentStart = items[0];
    let currentEnd = items[0];

    for (let i = 1; i < items.length; i++) {
      const canMerge =
        items[i].availability === currentStart.availability &&
        canMergeAvailabilityDates(currentEnd.date, items[i].date);

      if (canMerge) {
        currentEnd = items[i];
      } else {
        condensed.push(formatRange(currentStart, currentEnd));
        currentStart = items[i];
        currentEnd = items[i];
      }
    }
    condensed.push(formatRange(currentStart, currentEnd));

    return condensed;
  };

  const formatRange = (start: AvailabilityType, end: AvailabilityType) => {
    const sDate = parseISO(start.date);
    const eDate = parseISO(end.date);
    let dateStr = '';

    if (start.date === end.date) {
      dateStr = `${start.readable_date}`;
    } else if (isSameMonth(sDate, eDate)) {
      dateStr = `${format(sDate, 'MMM d')} - ${format(eDate, 'd')}`;
    } else {
      dateStr = `${format(sDate, 'MMM d')} - ${format(eDate, 'MMM d')}`;
    }

    return {
      displayDate: dateStr,
      availability: start.availability || 'Unknown',
      fullText: `${dateStr}, ${start.availability || 'Unknown'}`,
    };
  };

  const generateFullCopyText = () => {
    let text = `Availability Schedule (${timezone}):\n`;
    text += '--------------------------------------------------\n';

    groupedData.forEach((group) => {
      text += `${group.title}:\n`;
      const processed = processGroupItems(group.items);
      processed.forEach((item) => {
        text += `${item.fullText}\n`;
      });
      text += '\n';
    });

    return text.trim();
  };

  const renderedGroups = groupedData
    .map((group) => ({
      title: group.title,
      items: processGroupItems(group.items),
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
        showExtraActionsOnMobile
        extraActions={
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
                onCopyAll={() => copyToClipboard(generateFullCopyText(), 'ALL')}
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
      />
    </div>
  );
};
export default Availability;
