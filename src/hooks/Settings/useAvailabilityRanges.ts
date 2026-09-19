import { useState } from 'react';
import type React from 'react';
import type { UserSettings } from '../../types';
import type { AvailabilityTimeRange } from '../../utils/Settings/availabilityHours';
import { availabilityGroupKey } from '../../utils/Settings/availabilityGroups';

export const useAvailabilityRanges = ({
  settings,
  setSettings,
}: {
  settings: UserSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
}) => {
  // Keyed by day set, not by index: adding a block must not move which card is open.
  const [expandedAvailabilityGroup, setExpandedAvailabilityGroup] = useState<string | null>(null);

  const defaultDays = () => (settings?.work_days?.length ? settings.work_days : [0, 1, 2, 3, 4]);

  const addAvailabilityRange = (days?: number[]) => {
    if (!settings) return;
    const ranges = settings.work_time_ranges || [];
    const groupDays = days ?? defaultDays();
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            work_time_ranges: [...ranges, { start: '09:00:00', end: '17:00:00', days: groupDays }],
          }
        : null
    );
    setExpandedAvailabilityGroup(availabilityGroupKey([...groupDays].sort((a, b) => a - b)));
  };

  const removeAvailabilityRange = (idx: number) => {
    if (!settings) return;
    const updated = settings.work_time_ranges.filter((_, rangeIndex) => rangeIndex !== idx);
    setSettings((prev) => (prev ? { ...prev, work_time_ranges: updated } : null));
  };

  const removeAvailabilityGroup = (indices: number[]) => {
    if (!settings) return;
    const drop = new Set(indices);
    const updated = settings.work_time_ranges.filter((_, rangeIndex) => !drop.has(rangeIndex));
    setSettings((prev) => (prev ? { ...prev, work_time_ranges: updated } : null));
    setExpandedAvailabilityGroup(null);
  };

  const updateAvailabilityRange = (idx: number, patch: Partial<AvailabilityTimeRange>) => {
    if (!settings) return;
    const updated = [...settings.work_time_ranges];
    updated[idx] = { ...updated[idx], ...patch };
    setSettings((prev) => (prev ? { ...prev, work_time_ranges: updated } : null));
  };

  // The day set belongs to the card, so every block in it moves together or the group splits.
  const setAvailabilityGroupDays = (indices: number[], nextDays: number[]) => {
    if (!settings) return;
    const enabledDays = settings.work_days ?? [];
    const days = [...new Set(nextDays)]
      .filter((day) => enabledDays.includes(day))
      .sort((a, b) => a - b);
    const touch = new Set(indices);
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            work_time_ranges: prev.work_time_ranges.map((range, rangeIndex) =>
              touch.has(rangeIndex) ? { ...range, days } : range
            ),
          }
        : null
    );
    // The key is the day set, so follow the card the edit just renamed.
    setExpandedAvailabilityGroup(availabilityGroupKey(days));
  };

  const updateWorkDays = (nextDays: number[]) => {
    setSettings((prev) => {
      if (!prev) return null;
      const currentDays = prev.work_days || [];

      return {
        ...prev,
        work_days: nextDays,
        work_time_ranges: (prev.work_time_ranges || []).map((range) => {
          const rangeDays = (range.days ?? currentDays).filter((day) => nextDays.includes(day));
          return { ...range, days: rangeDays };
        }),
      };
    });
  };

  return {
    expandedAvailabilityGroup,
    setExpandedAvailabilityGroup,
    addAvailabilityRange,
    removeAvailabilityRange,
    removeAvailabilityGroup,
    updateAvailabilityRange,
    setAvailabilityGroupDays,
    updateWorkDays,
  };
};
