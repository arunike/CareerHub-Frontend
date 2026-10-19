import { confirmDestructive } from '../../components/modals/confirmDestructive';
import { useState } from 'react';
import type React from 'react';
import type { FormInstance } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { deleteHoliday } from '../../api';
import type { Holiday } from '../../types';

export const useHolidaySelection = ({
  holidays,
  editForm,
  setEditingItem,
  setEditModalOpen,
  fetchData,
  messageApi,
}: {
  holidays: Holiday[];
  editForm: FormInstance;
  setEditingItem: React.Dispatch<React.SetStateAction<any>>;
  setEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  fetchData: () => Promise<void> | void;
  messageApi: MessageInstance;
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleSelectChange = (id: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    );
  };

  const handleSelectGroup = (items: any[], checked: boolean) => {
    const itemIds = items.map((i) => i.id);
    setSelectedIds((prev) => {
      if (checked) {
        const newIds = [...prev];
        itemIds.forEach((id) => {
          if (!newIds.includes(id)) newIds.push(id);
        });
        return newIds;
      } else {
        return prev.filter((id) => !itemIds.includes(id));
      }
    });
  };

  const handleSelectAll = (checked: boolean, visibleHolidays: Holiday[]) => {
    if (checked) {
      setSelectedIds(visibleHolidays.map((holiday) => holiday.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = () => {
    confirmDestructive({
      title: 'Delete Selected Time Off',
      content: `Are you sure you want to delete ${selectedIds.length} holidays?`,
      okText: 'Yes',
      cancelText: 'No',
      onOk: async () => {
        try {
          await Promise.all(selectedIds.map((id) => deleteHoliday(id)));
          messageApi.success(`${selectedIds.length} holidays deleted`);
          setSelectedIds([]);
          fetchData();
        } catch (error) {
          messageApi.error('Failed to delete some time off');
          fetchData();
        }
      },
    });
  };

  const handleBulkEditClick = () => {
    editForm.resetFields();

    const selectedHolidays = selectedIds
      .map((id) => holidays.find((h) => h.id === id))
      .filter(Boolean) as Holiday[];

    if (selectedHolidays.length > 0) {
      const firstDesc = selectedHolidays[0].description;
      const allSameDesc = selectedHolidays.every((h) => h.description === firstDesc);

      const firstRecur = selectedHolidays[0].is_recurring;
      const allSameRecur = selectedHolidays.every((h) => h.is_recurring === firstRecur);

      const firstTab = selectedHolidays[0].tab || '';
      const allSameTab = selectedHolidays.every((h) => (h.tab || '') === firstTab);

      editForm.setFieldsValue({
        description: allSameDesc ? firstDesc : undefined,
        is_recurring: allSameRecur ? firstRecur : false,
        tab: allSameTab ? firstTab : '__unchanged__',
      });

      setEditingItem({
        isBulk: true,
        items: selectedHolidays,
        allSameDesc,
      });
    } else {
      setEditingItem({ isBulk: true, items: [] });
    }
    setEditModalOpen(true);
  };

  const handleDeleteGroup = (groupItem: any) => {
    confirmDestructive({
      title: 'Delete Time Off Collection',
      content: `Are you sure you want to delete all ${groupItem.items.length} days in this collection?`,
      okText: 'Yes',
      cancelText: 'No',
      onOk: async () => {
        try {
          await Promise.all(groupItem.items.map((i: any) => deleteHoliday(i.id)));
          messageApi.success('Time off collection deleted');
          fetchData();
        } catch (error) {
          messageApi.error('Failed to delete some time off in the collection');
          fetchData();
        }
      },
    });
  };

  return {
    selectedIds,
    setSelectedIds,
    handleSelectChange,
    handleSelectGroup,
    handleSelectAll,
    handleBulkDelete,
    handleBulkEditClick,
    handleDeleteGroup,
  };
};
