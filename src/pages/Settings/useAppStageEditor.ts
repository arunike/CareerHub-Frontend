import { useState } from 'react';
import type React from 'react';
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { UserSettings } from '../../types';
import { DEFAULT_PALETTE_COLOR, getToneForPaletteColor } from '../../utils/colorPalette';
import type { ApplicationStage } from './SortableStageRow';

export const useAppStageEditor = ({
  settings,
  setSettings,
}: {
  settings: UserSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
}) => {
  const [isAppStagesLocked, setIsAppStagesLocked] = useState(true);
  const [isAddingAppStage, setIsAddingAppStage] = useState(false);
  const [editingAppStage, setEditingAppStage] = useState<ApplicationStage | null>(null);
  const [newAppStageLabel, setNewAppStageLabel] = useState('');
  const [newAppStageShortLabel, setNewAppStageShortLabel] = useState('');
  const [newAppStageTone, setNewAppStageTone] = useState(
    getToneForPaletteColor(DEFAULT_PALETTE_COLOR)
  );

  const getAppStages = (): ApplicationStage[] => settings?.application_stages || [];

  const stageSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleAppStageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const current = getAppStages();
    const from = current.findIndex((stage) => stage.key === active.id);
    const to = current.findIndex((stage) => stage.key === over.id);
    if (from === -1 || to === -1) return;

    const reordered = arrayMove(current, from, to);
    setSettings((prev) => (prev ? { ...prev, application_stages: reordered } : null));
  };

  const handleSaveAppStage = () => {
    if (!newAppStageLabel.trim() || !newAppStageShortLabel.trim() || !settings) return;
    const current = getAppStages();
    if (editingAppStage) {
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              application_stages: current.map((t) =>
                t.key === editingAppStage.key
                  ? {
                      ...t,
                      label: newAppStageLabel,
                      shortLabel: newAppStageShortLabel,
                      tone: newAppStageTone,
                    }
                  : t
              ),
            }
          : null
      );
    } else {
      const key = newAppStageLabel
        .toUpperCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '');
      if (current.some((t) => t.key === key)) return;
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              application_stages: [
                ...current,
                {
                  key,
                  label: newAppStageLabel,
                  shortLabel: newAppStageShortLabel,
                  tone: newAppStageTone,
                },
              ],
            }
          : null
      );
    }
    setIsAddingAppStage(false);
    setEditingAppStage(null);
    setNewAppStageLabel('');
    setNewAppStageShortLabel('');
    setNewAppStageTone(getToneForPaletteColor(DEFAULT_PALETTE_COLOR));
  };

  const handleEditAppStage = (t: ApplicationStage) => {
    setEditingAppStage(t);
    setNewAppStageLabel(t.label);
    setNewAppStageShortLabel(t.shortLabel);
    setNewAppStageTone(t.tone);
    setIsAddingAppStage(true);
  };

  const handleDeleteAppStage = (key: string) => {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            application_stages: getAppStages().filter((t) => t.key !== key),
          }
        : null
    );
  };

  const handleCancelAppStage = () => {
    setIsAddingAppStage(false);
    setEditingAppStage(null);
    setNewAppStageLabel('');
    setNewAppStageShortLabel('');
    setNewAppStageTone(getToneForPaletteColor(DEFAULT_PALETTE_COLOR));
  };

  return {
    isAppStagesLocked,
    setIsAppStagesLocked,
    isAddingAppStage,
    setIsAddingAppStage,
    editingAppStage,
    newAppStageLabel,
    setNewAppStageLabel,
    newAppStageShortLabel,
    setNewAppStageShortLabel,
    newAppStageTone,
    setNewAppStageTone,
    getAppStages,
    stageSensors,
    handleAppStageDragEnd,
    handleSaveAppStage,
    handleEditAppStage,
    handleDeleteAppStage,
    handleCancelAppStage,
  };
};
