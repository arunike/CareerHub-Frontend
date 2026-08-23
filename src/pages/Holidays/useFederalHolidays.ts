import { useState } from 'react';
import { Form } from 'antd';
import dayjs from 'dayjs';
import type { MessageInstance } from 'antd/es/message/interface';
import { createHoliday, deleteHoliday, updateUserSettings } from '../../api';
import type { Holiday, UserSettings } from '../../types';
import { createHolidayGroupId, getInclusiveHolidayDates } from './holidayGrouping';
import { groupFederalHolidays, type FederalHolidayGroup } from './components/FederalHolidayCard';

export const useFederalHolidays = ({
  federalHolidays,
  userSettings,
  fetchData,
  messageApi,
}: {
  federalHolidays: Holiday[];
  userSettings: UserSettings | null;
  fetchData: () => Promise<void> | void;
  messageApi: MessageInstance;
}) => {
  const [federalForm] = Form.useForm();
  const [addFederalModalOpen, setAddFederalModalOpen] = useState(false);
  const [isFederalRangeMode, setIsFederalRangeMode] = useState(false);

  const sortedFederalHolidays = [...federalHolidays].sort((a, b) =>
    dayjs(a.date).diff(dayjs(b.date))
  );
  const groupedFederalHolidays = groupFederalHolidays(sortedFederalHolidays);

  const closeFederalModal = () => {
    federalForm.resetFields();
    setIsFederalRangeMode(false);
    setAddFederalModalOpen(false);
  };

  const handleAddFederal = async () => {
    try {
      const values = await federalForm.validateFields();
      const description = values.description.trim();
      const isRecurring = values.is_recurring || false;

      if (isFederalRangeMode) {
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
              holiday_type: 'federal',
            })
          )
        );
        messageApi.success('Observed holiday range added');
      } else {
        await createHoliday({
          date: values.date.format('YYYY-MM-DD'),
          description,
          is_recurring: isRecurring,
          holiday_type: 'federal',
        });
        messageApi.success('Observed holiday added');
      }

      closeFederalModal();
      fetchData();
    } catch (error) {
      if (error && (error as any).errorFields) {
        return;
      }
      messageApi.error('Failed to create observed holiday');
      fetchData();
    }
  };

  const handleDeleteFederalRange = async (group: FederalHolidayGroup) => {
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

  const handleToggleFederalHoliday = async (
    holidayName: string,
    dateStr: string,
    isObserved: boolean
  ) => {
    if (!userSettings) return;

    try {
      let ignoredList = userSettings.ignored_federal_holidays || [];

      if (!isObserved) {
        if (!ignoredList.includes(holidayName) && !ignoredList.includes(dateStr)) {
          ignoredList = [...ignoredList, holidayName];
        }
      } else {
        ignoredList = ignoredList.filter((name) => name !== holidayName && name !== dateStr);
      }

      await updateUserSettings({ ignored_federal_holidays: ignoredList });
      messageApi.success(`${holidayName} is now ${isObserved ? 'observed' : 'ignored'}`);

      fetchData();
    } catch (error) {
      messageApi.error('Failed to update observed holiday settings');
      console.error(error);
    }
  };

  return {
    federalForm,
    addFederalModalOpen,
    setAddFederalModalOpen,
    isFederalRangeMode,
    setIsFederalRangeMode,
    sortedFederalHolidays,
    groupedFederalHolidays,
    closeFederalModal,
    handleAddFederal,
    handleDeleteFederalRange,
    handleToggleFederalHoliday,
  };
};
