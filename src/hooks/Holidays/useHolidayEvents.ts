import { useState } from 'react';
import { Form } from 'antd';
import dayjs from 'dayjs';
import { useEventSave } from '../Events/useEventSave';
import type React from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  createCategory,
  deleteEvent,
  deleteRecurringInstance,
  deleteRecurringSeries,
  getCategories,
} from '../../api';
import type { Event, EventCategory, RecurrenceRule } from '../../types';
import { useSpanScope } from '../Events/useSpanScope';
import type {} from '../../components/CalendarView/SpanDateFields';
import type { EventDeleteScope } from '../../components/CalendarView/confirmCalendarDeletion';
import { normalizeTimeZone } from '../../lib/timezones';
import type {} from '../../utils/Holidays/holidayGrouping';

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

  // The same owner the Events page uses, so a run of days behaves identically on both.
  const { spanEditDays, beginSpanEdit, onScopeChange, saveWithScope } = useSpanScope({
    events,
    editingId: editingEventId,
    form: eventForm,
    messageApi,
    onSaved: () => {
      setIsEventFormOpen(false);
      void fetchData();
    },
  });

  // The calendar opens the editor directly rather than a read-only card first.
  const handleCalendarEventSelect = (event: Event, day?: Date) => {
    beginSpanEdit(event, day ? dayjs(day).format('YYYY-MM-DD') : undefined);
    handleEventEdit(event);
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

  const { submit: handleEventFormFinish } = useEventSave({
    events,
    editingId: editingEventId,
    recurrenceRule,
    messageApi,
    onSaved: () => {
      setIsEventFormOpen(false);
      fetchData();
    },
    saveWithScope,
  });

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
    spanEditDays,
    onSpanScopeChange: onScopeChange,
    handleCalendarAddEvent,
    handleEventEdit,
    handleCalendarEventDelete,
    handleEventFormFinish,
    handleCreateEventCategory,
  };
};
