import { useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';
import type React from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  createHoliday,
  deleteEvent,
  deleteHoliday,
  deleteRecurringInstance,
  deleteRecurringSeries,
  exportEvents,
  importData,
  updateEvent,
  updateHoliday,
} from '../../api';
import type { Event, Holiday } from '../../types';
import { normalizeTimeZone } from '../../lib/timezones';
import { confirmEventDeletion } from '../../components/CalendarView/confirmCalendarDeletion';
import type { CalendarHolidayFormValues } from '../../components/CalendarView/CalendarHolidayModal';
import type { CalendarHolidayTarget } from '../../components/CalendarView/types';
import type { CalendarDragItem } from '../../components/CalendarView/CalendarDayContent';
import {
  confirmEventMove,
  confirmHolidayMove,
} from '../../components/CalendarView/confirmCalendarMove';
import { buildEventMovePatch } from '../../components/CalendarView/utils';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  buildHolidayRangePayloads,
  holidayGroupMembers,
  planHolidayGroupEdit,
} from '../../utils/Holidays/holidayGrouping';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

export const useEventMutations = ({
  setEvents,
  pendingCalendarHoliday,
  editingHoliday,
  customHolidays,
  setPendingCalendarHoliday,
  setEditingHoliday,
  setViewingEvent,
  fetchData,
  fetchCalendarData,
  messageApi,
}: {
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  setCalendarEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  pendingCalendarHoliday: { date: Date; target: CalendarHolidayTarget } | null;
  editingHoliday: Holiday | null;
  // Needed to find the other days of a grouped trip before its dates are changed.
  customHolidays: Holiday[];
  setPendingCalendarHoliday: React.Dispatch<
    React.SetStateAction<{ date: Date; target: CalendarHolidayTarget } | null>
  >;
  setEditingHoliday: React.Dispatch<React.SetStateAction<Holiday | null>>;
  setViewingEvent: React.Dispatch<React.SetStateAction<Event | null>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
  fetchData: () => Promise<void> | void;
  fetchCalendarData: () => Promise<void> | void;
  messageApi: MessageInstance;
}) => {
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

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
      fetchCalendarData();
      setViewingEvent(null);
      return true;
    } catch (error) {
      messageApi.error('Failed to delete event');
      console.error(error);
      return false;
    }
  };

  const handleDeleteAction = (event: Event) => confirmEventDeletion(event, handleDelete);

  const handleCalendarHolidayDelete = async (holiday: Holiday) => {
    if (holiday.is_locked || !holiday.id) return false;
    try {
      await deleteHoliday(holiday.id);
      messageApi.success('Time off deleted');
      setEditingHoliday(null);
      await fetchCalendarData();
      return true;
    } catch (error) {
      messageApi.error('Failed to delete time off');
      console.error(error);
      return false;
    }
  };

  const handleDeleteAll = async () => {
    messageApi.info('Delete all not implemented yet');
    setIsDeleteAllOpen(false);
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

  const handleCalendarHolidaySelect = (holiday: Holiday) => {
    setPendingCalendarHoliday(null);
    setEditingHoliday(holiday);
  };

  const handleCalendarHolidaySubmit = async (values: CalendarHolidayFormValues) => {
    try {
      if (editingHoliday) {
        const result = planHolidayGroupEdit(
          holidayGroupMembers(customHolidays, editingHoliday),
          values,
          editingHoliday.description
        );
        if (!result) return;
        if (!result.ok) {
          messageApi.error(
            result.reason === 'locked'
              ? 'Unlock the pinned days before changing these dates'
              : 'End date must be after start date'
          );
          return;
        }
        const { plan } = result;
        await Promise.all([
          ...plan.update.map(({ id, patch }) => updateHoliday(id, patch)),
          ...plan.create.map((payload) => createHoliday(payload)),
          ...plan.deleteIds.map((id) => deleteHoliday(id)),
        ]);
        messageApi.success(
          plan.create.length || plan.deleteIds.length
            ? `Time off now covers ${plan.update.length + plan.create.length} days`
            : 'Time off updated'
        );
      } else if (pendingCalendarHoliday) {
        const payloads = buildHolidayRangePayloads(
          values,
          dayjs(pendingCalendarHoliday.date),
          pendingCalendarHoliday.target.label
        );
        if (!payloads) {
          messageApi.error('End date must be after start date');
          return;
        }
        await Promise.all(payloads.map((payload) => createHoliday(payload)));
        messageApi.success(
          payloads.length > 1 ? `Time off added for ${payloads.length} days` : 'Time off added'
        );
      }

      setEditingHoliday(null);
      setPendingCalendarHoliday(null);
      fetchCalendarData();
    } catch (error) {
      messageApi.error(editingHoliday ? 'Failed to update time off' : 'Failed to create time off');
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
      fetchCalendarData();
    } catch (error) {
      messageApi.error('Failed to toggle lock');
      console.error(error);
    }
  };

  const formatEventTime = (event: Event, userTz: string) => {
    const eventTz = normalizeTimeZone(event.timezone);
    const displayTz = normalizeTimeZone(userTz);
    if (eventTz === displayTz) return null;

    try {
      const startDt = dayjs
        .tz(`${event.date} ${event.start_time}`, 'YYYY-MM-DD HH:mm:ss', eventTz)
        .tz(displayTz);
      const endDt = dayjs
        .tz(`${event.date} ${event.end_time}`, 'YYYY-MM-DD HH:mm:ss', eventTz)
        .tz(displayTz);

      if (!startDt.isValid() || !endDt.isValid()) return null;

      return `(${startDt.format('HH:mm')} - ${endDt.format('HH:mm')} ${displayTz})`;
    } catch {
      return null;
    }
  };

  // Confirmed before saving: a drop is easy to trigger by accident on a dense month grid.
  const handleCalendarItemDrop = (item: CalendarDragItem, day: Date) => {
    const nextDate = dayjs(day).format('YYYY-MM-DD');
    if (item.kind === 'event') {
      if (nextDate === item.event.date) return;
      confirmEventMove(item.event, day, async (event) => {
        try {
          await updateEvent(event.id, buildEventMovePatch(event, day));
          messageApi.success(`Moved "${event.name}" to ${dayjs(day).format('MMM D, YYYY')}`);
          await fetchData();
          await fetchCalendarData();
        } catch (error) {
          console.error('Failed to move event', error);
          messageApi.error(getApiErrorMessage(error, 'Could not move the event'));
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
        await fetchData();
        await fetchCalendarData();
      } catch (error) {
        console.error('Failed to move time off', error);
        messageApi.error(getApiErrorMessage(error, 'Could not move the time off'));
      }
    });
  };

  // View-only controls; they ride in the calendar header instead of an empty band.
  return {
    isDeleteAllOpen,
    setIsDeleteAllOpen,
    showImport,
    setShowImport,
    importFile,
    setImportFile,
    handleDelete,
    handleDeleteAction,
    handleCalendarHolidayDelete,
    handleDeleteAll,
    handleImportUpload,
    handleCalendarHolidaySelect,
    handleCalendarHolidaySubmit,
    handleExportWrapper,
    toggleLock,
    formatEventTime,
    handleCalendarItemDrop,
  };
};
