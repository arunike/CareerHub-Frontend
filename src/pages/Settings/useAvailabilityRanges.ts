import { useState } from 'react';
import type React from 'react';
import type { UserSettings } from '../../types';
import type { AvailabilityTimeRange } from './availabilityHours';

export const useAvailabilityRanges = ({
  settings,
  setSettings,
}: {
  settings: UserSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
}) => {
  const [expandedAvailabilityRange, setExpandedAvailabilityRange] = useState<number | null>(null);

  const addAvailabilityRange = () => {
    if (!settings) return;
    const ranges = settings.work_time_ranges || [];
    const days = settings.work_days?.length ? settings.work_days : [0, 1, 2, 3, 4];
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            work_time_ranges: [...ranges, { start: '09:00:00', end: '17:00:00', days }],
          }
        : null
    );
    setExpandedAvailabilityRange(ranges.length);
  };

  const removeAvailabilityRange = (idx: number) => {
    if (!settings) return;
    const updated = settings.work_time_ranges.filter((_, rangeIndex) => rangeIndex !== idx);
    setSettings((prev) => (prev ? { ...prev, work_time_ranges: updated } : null));
    setExpandedAvailabilityRange((current) => {
      if (current === null) return null;
      if (current === idx) return null;
      return current > idx ? current - 1 : current;
    });
  };

  const updateAvailabilityRange = (idx: number, patch: Partial<AvailabilityTimeRange>) => {
    if (!settings) return;
    const updated = [...settings.work_time_ranges];
    updated[idx] = { ...updated[idx], ...patch };
    setSettings((prev) => (prev ? { ...prev, work_time_ranges: updated } : null));
  };

  const toggleAvailabilityRangeDay = (range: AvailabilityTimeRange, idx: number, day: number) => {
    if (!settings) return;
    const enabledDays = settings.work_days ?? [];
    if (!enabledDays.includes(day)) return;

    const selectedDays = (range.days ?? enabledDays).filter((item) => enabledDays.includes(item));
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter((item) => item !== day)
      : [...selectedDays, day].sort();
    updateAvailabilityRange(idx, { days: nextDays });
  };

  const applyWorkDaysToAvailabilityRange = (idx: number) => {
    if (!settings) return;
    updateAvailabilityRange(idx, { days: [...(settings.work_days || [])].sort() });
  };

  const clearAvailabilityRangeDays = (idx: number) => {
    updateAvailabilityRange(idx, { days: [] });
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

  // Categories and time-off colours share the calendar, so a repeat makes it unreadable.

  return {
    expandedAvailabilityRange,
    setExpandedAvailabilityRange,
    addAvailabilityRange,
    removeAvailabilityRange,
    updateAvailabilityRange,
    toggleAvailabilityRangeDay,
    applyWorkDaysToAvailabilityRange,
    clearAvailabilityRangeDays,
    updateWorkDays,
  };
};
