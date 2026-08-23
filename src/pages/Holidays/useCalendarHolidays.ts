import { useState } from 'react';
import dayjs from 'dayjs';
import type { MessageInstance } from 'antd/es/message/interface';
import { createHoliday, updateEvent, updateHoliday } from '../../api';
import type { Holiday } from '../../types';
import type { CalendarHolidayTarget } from '../../components/calendarView/types';
import type { CalendarHolidayFormValues } from '../../components/calendarView/CalendarHolidayModal';
import type { CalendarDragItem } from '../../components/calendarView/CalendarDayContent';
import {
  confirmEventMove,
  confirmHolidayMove,
} from '../../components/calendarView/confirmCalendarMove';
import { buildEventMovePatch } from '../../components/calendarView/utils';
import { getApiErrorMessage } from '../../utils/apiError';

export const useCalendarHolidays = ({
  fetchData,
  messageApi,
}: {
  fetchData: () => Promise<void> | void;
  messageApi: MessageInstance;
}) => {
  const [pendingCalendarHoliday, setPendingCalendarHoliday] = useState<{
    date: Date;
    target: CalendarHolidayTarget;
  } | null>(null);
  const [editingCalendarHoliday, setEditingCalendarHoliday] = useState<Holiday | null>(null);

  const handleCalendarHolidayAdd = (date: Date, target: CalendarHolidayTarget) => {
    setEditingCalendarHoliday(null);
    setPendingCalendarHoliday({ date, target });
  };

  const handleCalendarHolidaySelect = (holiday: Holiday) => {
    setPendingCalendarHoliday(null);
    setEditingCalendarHoliday(holiday);
  };

  const handleCalendarHolidaySubmit = async (values: CalendarHolidayFormValues) => {
    try {
      if (editingCalendarHoliday) {
        await updateHoliday(editingCalendarHoliday.id, {
          description: values.description?.trim() || editingCalendarHoliday.description,
          is_recurring: !!values.is_recurring,
          tab: values.tab || null,
        });
        messageApi.success('Time off updated');
      } else if (pendingCalendarHoliday) {
        await createHoliday({
          date: dayjs(pendingCalendarHoliday.date).format('YYYY-MM-DD'),
          description: values.description?.trim() || pendingCalendarHoliday.target.label,
          is_recurring: !!values.is_recurring,
          tab: values.tab || null,
        });
        messageApi.success('Time off added');
      }

      setPendingCalendarHoliday(null);
      setEditingCalendarHoliday(null);
      fetchData();
    } catch (error) {
      messageApi.error(
        editingCalendarHoliday ? 'Failed to update time off' : 'Failed to create time off'
      );
      console.error(error);
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
      } catch (error) {
        console.error('Failed to move time off', error);
        messageApi.error(getApiErrorMessage(error, 'Could not move the time off'));
      }
    });
  };

  return {
    pendingCalendarHoliday,
    setPendingCalendarHoliday,
    editingCalendarHoliday,
    setEditingCalendarHoliday,
    handleCalendarHolidayAdd,
    handleCalendarHolidaySelect,
    handleCalendarHolidaySubmit,
    handleCalendarItemDrop,
  };
};
