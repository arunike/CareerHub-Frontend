import { useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import Modal from '../../components/MobileModal';
import { deleteEvent, updateEvent } from '../../api';
import type { Event } from '../../types';

export const useEventSelection = ({
  events,
  fetchData,
  messageApi,
}: {
  events: Event[];
  fetchData: () => Promise<void> | void;
  fetchCalendarData: () => Promise<void> | void;
  messageApi: MessageInstance;
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleSelectChange = (id: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(events.map((event) => event.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = () => {
    Modal.confirm({
      title: 'Delete Selected Events',
      content: `Are you sure you want to delete ${selectedIds.length} events?`,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          const realIds = selectedIds.filter((id) => id > 0);
          await Promise.all(realIds.map((id) => deleteEvent(id)));
          messageApi.success(`${realIds.length} events deleted`);
          setSelectedIds([]);
          fetchData();
        } catch {
          messageApi.error('Failed to delete some events');
          fetchData();
        }
      },
    });
  };

  const handleBulkToggleLock = async (lock: boolean) => {
    try {
      const realIds = selectedIds.filter((id) => id > 0);
      await Promise.all(realIds.map((id) => updateEvent(id, { is_locked: lock })));
      messageApi.success(`${realIds.length} events ${lock ? 'locked' : 'unlocked'}`);
      setSelectedIds([]);
      fetchData();
    } catch {
      messageApi.error(`Failed to ${lock ? 'lock' : 'unlock'} some events`);
      fetchData();
    }
  };

  const isAnySelectedLocked = selectedIds.some((id) => {
    const ev = events.find((e) => e.id === id);
    return ev?.is_locked;
  });

  return {
    selectedIds,
    setSelectedIds,
    isAnySelectedLocked,
    handleSelectChange,
    handleSelectAll,
    handleBulkDelete,
    handleBulkToggleLock,
  };
};
