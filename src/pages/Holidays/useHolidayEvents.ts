import { useState } from 'react';
import { Form } from 'antd';
import Modal from '../../components/MobileModal';
import dayjs from 'dayjs';
import type React from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  createCategory,
  createEvent,
  deleteEvent,
  deleteRecurringInstance,
  deleteRecurringSeries,
  getCategories,
  setRecurrence,
  updateEvent,
  updateRecurringSeries,
} from '../../api';
import type { Event, EventCategory, RecurrenceRule } from '../../types';
import type { EventDeleteScope } from '../../components/calendarView/confirmCalendarDeletion';
import { normalizeTimeZone } from '../../lib/timezones';
import type { ApiError, EventFormValues } from './holidayGrouping';

export const useHolidayEvents = ({
  events,
  setCategories,
  defaultEventDuration,
  userTimezone,
  fetchData,
  messageApi,
}: {
  events: Event[];
  setCategories: React.Dispatch<React.SetStateAction<EventCategory[]>>;
  defaultEventDuration: number;
  userTimezone: string;
  fetchData: () => Promise<void> | void;
  messageApi: MessageInstance;
}) => {
  const [eventForm] = Form.useForm();
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [locationType, setLocationType] = useState<'in_person' | 'virtual' | 'hybrid'>('virtual');

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

  return {
    eventForm,
    viewingEvent,
    setViewingEvent,
    isEventFormOpen,
    setIsEventFormOpen,
    editingEventId,
    setEditingEventId,
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
  };
};
