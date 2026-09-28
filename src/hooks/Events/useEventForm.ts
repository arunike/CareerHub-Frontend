import { useEffect, useCallback, useRef, useState } from 'react';
import { Form, Modal } from 'antd';
import dayjs from 'dayjs';
import { useLocation, useNavigate } from 'react-router-dom';
import type { MessageInstance } from 'antd/es/message/interface';
import { createEvent, setRecurrence, updateEvent, updateRecurringSeries } from '../../api';
import type { Event, EventCategory, RecurrenceRule } from '../../types';
import { normalizeTimeZone } from '../../lib/timezones';
import { useSpanScope } from './useSpanScope';
import type { SpanEditScope } from '../../components/CalendarView/SpanDateFields';
import { eventPayload } from '../../utils/Events/eventFormTypes';
import type { ApiError, EventFormValues } from '../../utils/Events/eventFormTypes';

export const useEventForm = ({
  events,
  form,
  defaultDuration,
  defaultCategory,
  userTimezone,
  fetchData,
  fetchCalendarData,
  messageApi,
}: {
  events: Event[];
  form: ReturnType<typeof Form.useForm>[0];
  categories: EventCategory[];
  setCategories: React.Dispatch<React.SetStateAction<EventCategory[]>>;
  defaultDuration: number;
  defaultCategory: number | null;
  userTimezone: string;
  fetchData: () => Promise<void> | void;
  fetchCalendarData: () => Promise<void> | void;
  messageApi: MessageInstance;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [locationType, setLocationType] = useState<'in_person' | 'virtual' | 'hybrid'>('virtual');
  const handledDeepLink = useRef(false);

  const handleAdd = useCallback(
    (dateArg?: Date) => {
      const date = dateArg instanceof Date ? dateArg : undefined;
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
        date: date ? dayjs(date) : dayjs(),
        start_time: start,
        end_time: end,
        timezone: normalizeTimeZone(userTimezone),
        category: defaultCategory ?? undefined,
        location_type: 'virtual',
      });
    },
    [defaultCategory, defaultDuration, form, userTimezone]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') !== 'create') return;
    handleAdd();
    navigate('/events', { replace: true });
  }, [handleAdd, location.search, navigate]);

  useEffect(() => {
    if (handledDeepLink.current || events.length === 0) return;
    const requested = new URLSearchParams(location.search).get('event');
    if (!requested) return;
    const target = events.find((candidate) => String(candidate.id) === requested);
    if (!target) return;
    handledDeepLink.current = true;
    handleEdit(target);
    navigate('/events', { replace: true });
    // One-shot: adding the stable handlers would re-run it every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, location.search]);

  // The form asks which days it applies to, rather than a dialog gating it before it opens.
  const handleEdit = (event: Event, clickedDay?: string) => {
    beginSpanEdit(event, clickedDay);
    openEditForm(event);
  };

  const { spanEditDays, beginSpanEdit, clearSpanScope, onScopeChange, saveWithScope } =
    useSpanScope({
      events,
      editingId,
      form,
      messageApi,
      onSaved: () => {
        setIsFormOpen(false);
        fetchData();
        fetchCalendarData();
      },
    });

  const openEditForm = (event: Event, dayOverride?: string) => {
    setEditingId(event.id);
    setIsFormOpen(true);
    setRecurrenceRule(event.recurrence_rule as RecurrenceRule);
    setLocationType(event.location_type);

    form.setFieldsValue({
      name: event.name,
      scope: 'all',
      date: dayjs(dayOverride || event.date),
      start_time: dayjs(event.start_time, 'HH:mm:ss'),
      end_time: dayjs(event.end_time, 'HH:mm:ss'),
      is_all_day: Boolean(event.is_all_day),
      is_multi_day: Boolean(event.end_date && event.end_date !== event.date),
      end_date: event.end_date ? dayjs(event.end_date) : null,
      timezone: event.timezone,
      category: event.category,
      location_type: event.location_type,
      location: event.location,
      meeting_link: event.meeting_link,
      notes: event.notes,
      application: event.application,
    });
  };

  const handleDuplicate = (event: Event) => {
    setEditingId(null);
    setIsFormOpen(true);
    setRecurrenceRule(event.recurrence_rule as RecurrenceRule);
    setLocationType(event.location_type);

    form.setFieldsValue({
      name: `${event.name} (Copy)`,
      date: dayjs(event.date),
      start_time: dayjs(event.start_time, 'HH:mm:ss'),
      end_time: dayjs(event.end_time, 'HH:mm:ss'),
      is_all_day: Boolean(event.is_all_day),
      is_multi_day: Boolean(event.end_date && event.end_date !== event.date),
      end_date: event.end_date ? dayjs(event.end_date) : null,
      timezone: event.timezone,
      category: event.category,
      location_type: event.location_type,
      location: event.location,
      meeting_link: event.meeting_link,
      notes: event.notes,
      application: event.application,
    });
  };

  const onFinish = async (values: EventFormValues) => {
    const payload = eventPayload(values, recurrenceRule);

    // The scope decides the save when a run is being edited; otherwise fall through as normal.
    if (await saveWithScope({ scope: values.scope as SpanEditScope | undefined, payload })) return;

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
              fetchCalendarData();
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
      fetchCalendarData();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if (apiError.response?.status === 400 && apiError.response?.data?.conflict) {
        Modal.confirm({
          title: 'Schedule Conflict',
          content: 'Conflict detected. Force save?',
          onOk: async () => {
            if (editingId) await updateEvent(editingId, payload, { force: true });
            else await createEvent(payload, { force: true });
            setIsFormOpen(false);
            fetchData();
            fetchCalendarData();
          },
        });
      } else {
        messageApi.error('Failed to save event');
      }
    }
  };

  return {
    isFormOpen,
    setIsFormOpen,
    editingId,
    setEditingId,
    spanEditDays,
    onSpanScopeChange: onScopeChange,
    clearSpanScope,
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
    openEditForm,
    handleDuplicate,
    onFinish,
  };
};
