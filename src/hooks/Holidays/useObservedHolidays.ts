import { useState } from 'react';
import { Form } from 'antd';
import dayjs from 'dayjs';
import type { MessageInstance } from 'antd/es/message/interface';
import { createHoliday, deleteHoliday, updateHoliday, updateUserSettings } from '../../api';
import type { Holiday, UserSettings } from '../../types';
import {
  createHolidayGroupId,
  getInclusiveHolidayDates,
} from '../../utils/Holidays/holidayGrouping';
import {
  groupObservedHolidays,
  type ObservedHolidayGroup,
} from '../../components/Holidays/ObservedHolidayCard';
import { ignoreListAfter } from '../../utils/Holidays/observance';

export const useObservedHolidays = ({
  observedHolidays,
  userSettings,
  fetchData,
  messageApi,
}: {
  observedHolidays: Holiday[];
  userSettings: UserSettings | null;
  fetchData: () => Promise<void> | void;
  messageApi: MessageInstance;
}) => {
  const [observedForm] = Form.useForm();
  const [addObservedModalOpen, setAddObservedModalOpen] = useState(false);
  const [isObservedRangeMode, setIsObservedRangeMode] = useState(false);

  const sortedObservedHolidays = [...observedHolidays].sort((a, b) =>
    dayjs(a.date).diff(dayjs(b.date))
  );
  const groupedObservedHolidays = groupObservedHolidays(sortedObservedHolidays);

  const closeObservedModal = () => {
    observedForm.resetFields();
    setIsObservedRangeMode(false);
    setAddObservedModalOpen(false);
  };

  const handleAddObserved = async () => {
    try {
      const values = await observedForm.validateFields();
      const description = values.description.trim();
      const isRecurring = values.is_recurring || false;

      if (isObservedRangeMode) {
        const [start, end] = values.dateRange;
        if (end.isBefore(start, 'day')) {
          messageApi.error('End date must be after start date');
          return;
        }

        const groupId = createHolidayGroupId();
        await Promise.all(
          getInclusiveHolidayDates(start, end).map((date) =>
            createHoliday({
              date: date.format('YYYY-MM-DD'),
              group_id: groupId,
              description,
              is_recurring: isRecurring,
              holiday_type: 'observed',
            })
          )
        );
        messageApi.success('Observed holiday range added');
      } else {
        await createHoliday({
          date: values.date.format('YYYY-MM-DD'),
          description,
          is_recurring: isRecurring,
          holiday_type: 'observed',
        });
        messageApi.success('Observed holiday added');
      }

      closeObservedModal();
      fetchData();
    } catch (error) {
      if (error && (error as any).errorFields) {
        return;
      }
      messageApi.error('Failed to create observed holiday');
      fetchData();
    }
  };

  const handleDeleteObservedRange = async (group: ObservedHolidayGroup) => {
    try {
      await Promise.all(group.items.map((item) => deleteHoliday(item.id)));
      messageApi.success('Observed holiday range deleted');
      fetchData();
    } catch (error) {
      messageApi.error('Failed to delete the complete observed holiday range');
      console.error(error);
      fetchData();
    }
  };

  // The ignore list is keyed by name, so a rename has to carry that entry across with it.
  const handleRenameObservedHoliday = async (
    item: { id?: number; items?: { id: number }[]; description: string },
    nextName: string
  ) => {
    const ids = item.items?.map((row) => row.id) ?? (item.id === undefined ? [] : [item.id]);
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => updateHoliday(id, { description: nextName })));
      const ignoredList = userSettings?.ignored_observed_holidays ?? [];
      if (ignoredList.includes(item.description)) {
        await updateUserSettings({
          ignored_observed_holidays: ignoredList.map((name) =>
            name === item.description ? nextName : name
          ),
        });
      }
      messageApi.success('Renamed');
      fetchData();
    } catch {
      messageApi.error('Could not rename this holiday');
    }
  };

  const handleToggleObservedHoliday = async (
    holidayName: string,
    dateStr: string,
    isObserved: boolean
  ) => {
    if (!userSettings) return;

    try {
      const ignoredList = ignoreListAfter(
        userSettings.ignored_observed_holidays || [],
        holidayName,
        dateStr,
        isObserved
      );

      await updateUserSettings({ ignored_observed_holidays: ignoredList });
      messageApi.success(`${holidayName} is now ${isObserved ? 'observed' : 'ignored'}`);

      fetchData();
    } catch (error) {
      messageApi.error('Failed to update observed holiday settings');
      console.error(error);
    }
  };

  return {
    observedForm,
    addObservedModalOpen,
    setAddObservedModalOpen,
    isObservedRangeMode,
    setIsObservedRangeMode,
    sortedObservedHolidays,
    groupedObservedHolidays,
    closeObservedModal,
    handleAddObserved,
    handleDeleteObservedRange,
    handleToggleObservedHoliday,
    handleRenameObservedHoliday,
  };
};
