import { useEffect, useState } from 'react';
import { Form } from 'antd';
import Modal from '../../components/MobileModal';
import dayjs from 'dayjs';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  createCategory,
  createEvent,
  createHoliday,
  deleteEvent,
  deleteHoliday,
  deleteRecurringInstance,
  deleteRecurringSeries,
  getCategories,
  getEvents,
  getFederalHolidays,
  getHolidays,
  setRecurrence,
  updateEvent,
  updateHoliday,
  updateRecurringSeries,
} from '../../api';
import type { Event, EventCategory, Holiday, HolidayTab, RecurrenceRule } from '../../types';
import type { CalendarHolidayTarget } from '../../components/calendarView/types';
import type { CalendarHolidayFormValues } from '../../components/calendarView/CalendarHolidayModal';
import type { EventDeleteScope } from '../../components/calendarView/confirmCalendarDeletion';
import type { CalendarDragItem } from '../../components/calendarView/CalendarDayContent';
import {
  confirmEventMove,
  confirmHolidayMove,
} from '../../components/calendarView/confirmCalendarMove';
import { buildEventMovePatch } from '../../components/calendarView/utils';
import { normalizeTimeZone } from '../../lib/timezones';
import { format } from 'date-fns';
import { getErrorMessage, type ApiError, type EventFormValues } from './availabilityFormTypes';

export const useAvailabilityCalendar = ({
  timezone,
  messageApi,
}: {
  timezone: string;
  messageApi: MessageInstance;
}) => {
  const [eventForm] = Form.useForm();
  const [events, setEvents] = useState<Event[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarLoadError, setCalendarLoadError] = useState(false);
  const [customHolidays, setCustomHolidays] = useState<Holiday[]>([]);
  const [federalHolidays, setFederalHolidays] = useState<Holiday[]>([]);
  const [holidayTabs] = useState<HolidayTab[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [locationType, setLocationType] = useState<'in_person' | 'virtual' | 'hybrid'>('virtual');
  const [defaultDuration] = useState(60);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [pendingHolidayAdd, setPendingHolidayAdd] = useState<{
    date: Date;
    target: CalendarHolidayTarget;
  } | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

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
  const handleCalendarItemDrop = (item: CalendarDragItem, day: Date) => {
    const nextDate = dayjs(day).format('YYYY-MM-DD');
    if (item.kind === 'event') {
      if (nextDate === item.event.date) return;
      confirmEventMove(item.event, day, async (event) => {
        try {
          await updateEvent(event.id, buildEventMovePatch(event, day));
          messageApi.success(`Moved "${event.name}" to ${dayjs(day).format('MMM D, YYYY')}`);
          await fetchCalendarData();
        } catch (error) {
          console.error('Failed to move event', error);
          messageApi.error(getErrorMessage(error, 'Could not move the event'));
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
        await fetchCalendarData();
      } catch (error) {
        console.error('Failed to move time off', error);
        messageApi.error(getErrorMessage(error, 'Could not move the time off'));
      }
    });
  };
  const handleCalendarEventSelect = (event: Event) => {
    setViewingEvent(event);
  };

  const handleEventEdit = (event: Event) => {
    setViewingEvent(null);
    setEditingEventId(event.id);
    setIsEventFormOpen(true);
    setRecurrenceRule((event.recurrence_rule as RecurrenceRule) || null);
    setLocationType(event.location_type || 'virtual');

    eventForm.setFieldsValue({
      name: event.name,
      date: dayjs(event.date),
      start_time: dayjs(event.start_time, 'HH:mm:ss'),
      end_time: dayjs(event.end_time, 'HH:mm:ss'),
      is_all_day: Boolean(event.is_all_day),
      is_multi_day: Boolean(event.end_date && event.end_date !== event.date),
      end_date: event.end_date ? dayjs(event.end_date) : null,
      timezone: normalizeTimeZone(event.timezone || timezone),
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
      await fetchCalendarData();
      return true;
    } catch (error) {
      messageApi.error(getErrorMessage(error, 'Failed to delete event'));
      console.error(error);
      return false;
    }
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

  const handleCalendarHolidayDelete = async (holiday: Holiday) => {
    if (holiday.is_locked || !holiday.id) return false;
    try {
      await deleteHoliday(holiday.id);
      messageApi.success('Time off deleted');
      setEditingHoliday(null);
      await fetchCalendarData();
      return true;
    } catch (error) {
      messageApi.error(getErrorMessage(error, 'Failed to delete time off'));
      console.error(error);
      return false;
    }
  };

  const handleEventFormFinish = async (values: EventFormValues) => {
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
        messageApi.success('Time off updated');
      } else if (pendingHolidayAdd) {
        await createHoliday({
          date: format(pendingHolidayAdd.date, 'yyyy-MM-dd'),
          description: values.description?.trim() || pendingHolidayAdd.target.label,
          is_recurring: !!values.is_recurring,
          tab: values.tab || null,
        });
        messageApi.success('Time off added');
      }

      setPendingHolidayAdd(null);
      setEditingHoliday(null);
      await fetchCalendarData();
    } catch (error) {
      messageApi.error(editingHoliday ? 'Failed to update time off' : 'Failed to create time off');
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
  useEffect(() => {
    fetchCalendarData();
    // Loaded once; the calendar refetches through its own handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
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
  };
};
