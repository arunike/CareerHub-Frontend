import { useState } from 'react';
import dayjs from 'dayjs';
import type { MessageInstance } from 'antd/es/message/interface';
import { createHoliday, deleteHoliday, updateEvent, updateHoliday } from '../../api';
import type { Holiday } from '../../types';
import type { CalendarHolidayTarget } from '../../components/CalendarView/types';
import type { CalendarHolidayFormValues } from '../../components/CalendarView/CalendarHolidayModal';
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

export const useCalendarHolidays = ({
  fetchData,
  messageApi,
  holidays,
}: {
  fetchData: () => Promise<void> | void;
  messageApi: MessageInstance;
  // Needed to find the other days of a grouped trip before its dates are changed.
  holidays: Holiday[];
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
        const result = planHolidayGroupEdit(
          holidayGroupMembers(holidays, editingCalendarHoliday),
          values,
          editingCalendarHoliday.description
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
