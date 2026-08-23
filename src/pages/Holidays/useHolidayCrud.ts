import { useState } from 'react';
import type { FormInstance } from 'antd';
import type React from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import { createHoliday, deleteHoliday, exportHolidays, importData, updateHoliday } from '../../api';
import type { Holiday } from '../../types';
import { createHolidayGroupId, getInclusiveHolidayDates } from './holidayGrouping';
import type { CalendarHolidayTarget } from '../../components/calendarView/types';

export const useHolidayCrud = ({
  setHolidays,
  activeTab,
  isRangeMode,
  form,
  setEditingCalendarHoliday,
  setPendingCalendarHoliday,
  clearSelection,
  editForm,
  editingItem,
  setEditModalOpen,
  setEditingItem,
  fetchData,
  messageApi,
}: {
  holidays: Holiday[];
  setHolidays: React.Dispatch<React.SetStateAction<Holiday[]>>;
  activeTab: string;
  isRangeMode: boolean;
  form: FormInstance;
  setEditingCalendarHoliday: React.Dispatch<React.SetStateAction<Holiday | null>>;
  setPendingCalendarHoliday: React.Dispatch<
    React.SetStateAction<{ date: Date; target: CalendarHolidayTarget } | null>
  >;
  clearSelection: () => void;
  editForm: FormInstance;
  editingItem: any;
  setEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingItem: React.Dispatch<React.SetStateAction<any>>;
  fetchData: () => Promise<void> | void;
  messageApi: MessageInstance;
}) => {
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleAdd = async (values: any) => {
    const description = values.name || 'Time off';
    const isRecurring = values.is_recurring;
    const tabValue = activeTab === 'custom' ? undefined : activeTab;

    if (isRangeMode && values.dateRange) {
      const [start, end] = values.dateRange;
      if (end.isBefore(start)) {
        messageApi.error('End date must be after start date');
        return;
      }

      const groupId = createHolidayGroupId();
      const promises = getInclusiveHolidayDates(start, end).map((date) =>
        createHoliday({
          date: date.format('YYYY-MM-DD'),
          group_id: groupId,
          description,
          is_recurring: isRecurring,
          tab: tabValue,
        })
      );

      try {
        await Promise.all(promises);
        messageApi.success('Time off collection added');
        form.resetFields();
        fetchData();
      } catch (e) {
        messageApi.error('Failed to create time off collection');
        fetchData();
      }
    } else if (values.date) {
      try {
        await createHoliday({
          date: values.date.format('YYYY-MM-DD'),
          description,
          is_recurring: isRecurring,
          tab: tabValue,
        });
        messageApi.success('Time off added');
        form.resetFields();
        fetchData();
      } catch (error) {
        messageApi.error('Failed to create time off');
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteHoliday(id);
      messageApi.success('Time off deleted');
      fetchData();
      return true;
    } catch (error) {
      messageApi.error('Failed to delete time off');
      console.error(error);
      return false;
    }
  };

  const handleCalendarHolidayDelete = async (holiday: Holiday) => {
    if (holiday.is_locked || !holiday.id) return false;
    const deleted = await handleDelete(holiday.id);
    if (deleted) setEditingCalendarHoliday(null);
    return deleted;
  };

  const handleDuplicateHoliday = (item: any) => {
    const sampleItem = item.isGroup ? item.items[0] : item;
    setEditingCalendarHoliday(null);
    setPendingCalendarHoliday({
      date: sampleItem.date ? new Date(sampleItem.date) : new Date(),
      target: { tab: sampleItem.tab || null, label: sampleItem.tab_name || 'My Time Off' },
    });
    setEditingCalendarHoliday({
      ...sampleItem,
      id: 0,
      description: sampleItem.description ? `${sampleItem.description} (Copy)` : 'Time off (Copy)',
    });
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    const sampleItem = item.isGroup ? item.items[0] : item;
    editForm.setFieldsValue({
      description: sampleItem.description,
      is_recurring: sampleItem.is_recurring,
      tab: sampleItem.tab || '',
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();

      let itemsToUpdate: any[] = [];
      if (editingItem.isBulk) {
        itemsToUpdate = editingItem.items;
      } else if (editingItem.isGroup) {
        itemsToUpdate = editingItem.items;
      } else {
        itemsToUpdate = [editingItem];
      }

      await Promise.all(
        itemsToUpdate.map((i: any) => {
          const updatePayload: any = { is_recurring: values.is_recurring };
          if (values.tab !== '__unchanged__') {
            updatePayload.tab = values.tab || null;
          }
          if (values.description !== undefined && values.description !== '') {
            updatePayload.description = values.description;
          } else if (!(editingItem.isBulk && !editingItem.allSameDesc)) {
            updatePayload.description = values.description;
          }
          return updateHoliday(i.id, updatePayload);
        })
      );

      messageApi.success('Time off updated');
      setEditModalOpen(false);
      clearSelection();
      fetchData();
    } catch (error) {
      if (error && (error as any).errorFields) {
        return;
      }
      messageApi.error('Failed to update time off');
      console.error(error);
    }
  };

  const toggleLock = async (holiday: Holiday) => {
    try {
      await updateHoliday(holiday.id, { is_locked: !holiday.is_locked });
      setHolidays((prev) =>
        prev.map((h) => (h.id === holiday.id ? { ...h, is_locked: !h.is_locked } : h))
      );
      messageApi.success(holiday.is_locked ? 'Unlocked' : 'Locked');
    } catch (error) {
      messageApi.error('Failed to toggle lock');
      console.error(error);
    }
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

  const handleExportWrapper = async (format: string) => {
    const response = await exportHolidays(format);
    return {
      data: response.data,
      headers: response.headers as unknown as Record<string, string>,
    };
  };

  return {
    showImport,
    setShowImport,
    importFile,
    setImportFile,
    handleAdd,
    handleDelete,
    handleCalendarHolidayDelete,
    handleDuplicateHoliday,
    handleEditClick,
    handleEditSubmit,
    toggleLock,
    handleImportUpload,
    handleExportWrapper,
  };
};
