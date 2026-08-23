import { useMemo, useState } from 'react';
import type React from 'react';
import type { FormInstance } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import Modal from '../../components/MobileModal';
import { deleteHoliday, updateHoliday } from '../../api';
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

  const isAnySelectedLocked = useMemo(
    () => selectedIds.some((id) => holidays.find((holiday) => holiday.id === id)?.is_locked),
    [selectedIds, holidays]
  );

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
    Modal.confirm({
      title: 'Delete Selected Time Off',
      content: `Are you sure you want to delete ${selectedIds.length} holidays?`,
      okText: 'Yes',
      okType: 'danger',
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

  const handleBulkToggleLock = async (lock: boolean) => {
    try {
      await Promise.all(selectedIds.map((id) => updateHoliday(id, { is_locked: lock })));
      messageApi.success(`${selectedIds.length} holidays ${lock ? 'locked' : 'unlocked'}`);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      messageApi.error(`Failed to ${lock ? 'lock' : 'unlock'} some holidays`);
      fetchData();
    }
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

  const handleToggleLockGroup = async (groupItem: any) => {
    const newLockState = !groupItem.is_locked;
    try {
      await Promise.all(
        groupItem.items.map((i: any) => updateHoliday(i.id, { is_locked: newLockState }))
      );
      messageApi.success(`Collection ${newLockState ? 'locked' : 'unlocked'}`);
      fetchData();
    } catch (error) {
      messageApi.error(`Failed to toggle lock for collection`);
      fetchData();
    }
  };

  const handleDeleteGroup = (groupItem: any) => {
    Modal.confirm({
      title: 'Delete Time Off Collection',
      content: `Are you sure you want to delete all ${groupItem.items.length} days in this collection?`,
      okText: 'Yes',
      okType: 'danger',
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
    isAnySelectedLocked,
    handleSelectChange,
    handleSelectGroup,
    handleSelectAll,
    handleBulkDelete,
    handleBulkToggleLock,
    handleBulkEditClick,
    handleToggleLockGroup,
    handleDeleteGroup,
  };
};
