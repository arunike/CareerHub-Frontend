import { useState } from 'react';
import type React from 'react';
import type { HolidayTab, UserSettings } from '../../types';
import { DEFAULT_HOLIDAY_TAB_COLOR } from '../../utils/holidayTabColors';

export const useHolidayTabEditor = ({
  settings,
  setSettings,
}: {
  settings: UserSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
}) => {
  const [isHolidayTabsLocked, setIsHolidayTabsLocked] = useState(false);

  const [isAddingHolidayTab, setIsAddingHolidayTab] = useState(false);
  const [editingHolidayTab, setEditingHolidayTab] = useState<HolidayTab | null>(null);
  const [newTabName, setNewTabName] = useState('');
  const [newTabColor, setNewTabColor] = useState(DEFAULT_HOLIDAY_TAB_COLOR);

  const getHolidayTabs = (): HolidayTab[] => settings?.holiday_tabs || [];

  const toTabId = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

  const handleSaveHolidayTab = () => {
    if (!newTabName.trim() || !settings) return;
    const current = getHolidayTabs();
    if (editingHolidayTab) {
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              holiday_tabs: current.map((t) =>
                t.id === editingHolidayTab.id ? { ...t, name: newTabName, color: newTabColor } : t
              ),
            }
          : null
      );
    } else {
      const id = toTabId(newTabName);
      if (current.some((t) => t.id === id)) return;
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              holiday_tabs: [...current, { id, name: newTabName, color: newTabColor }],
            }
          : null
      );
    }
    setIsAddingHolidayTab(false);
    setEditingHolidayTab(null);
    setNewTabName('');
    setNewTabColor(DEFAULT_HOLIDAY_TAB_COLOR);
  };

  const handleEditHolidayTab = (t: HolidayTab) => {
    setEditingHolidayTab(t);
    setNewTabName(t.name);
    setNewTabColor(t.color || DEFAULT_HOLIDAY_TAB_COLOR);
    setIsAddingHolidayTab(true);
  };

  const handleDeleteHolidayTab = (id: string) => {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            holiday_tabs: getHolidayTabs().filter((t) => t.id !== id),
          }
        : null
    );
  };

  const handleCancelHolidayTab = () => {
    setIsAddingHolidayTab(false);
    setEditingHolidayTab(null);
    setNewTabName('');
    setNewTabColor(DEFAULT_HOLIDAY_TAB_COLOR);
  };

  return {
    isHolidayTabsLocked,
    setIsHolidayTabsLocked,
    isAddingHolidayTab,
    setIsAddingHolidayTab,
    editingHolidayTab,
    newTabName,
    setNewTabName,
    newTabColor,
    setNewTabColor,
    toTabId,
    getHolidayTabs,
    handleSaveHolidayTab,
    handleEditHolidayTab,
    handleDeleteHolidayTab,
    handleCancelHolidayTab,
  };
};
