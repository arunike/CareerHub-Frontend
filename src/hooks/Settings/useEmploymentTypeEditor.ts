import { useState } from 'react';
import type React from 'react';
import type { EmploymentType, UserSettings } from '../../types';
import { DEFAULT_PALETTE_COLOR } from '../../utils/colorPalette';

export const useEmploymentTypeEditor = ({
  settings,
  setSettings,
}: {
  settings: UserSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
}) => {
  const [isEmpTypesLocked, setIsEmpTypesLocked] = useState(false);
  const [isAddingEmpType, setIsAddingEmpType] = useState(false);
  const [editingEmpType, setEditingEmpType] = useState<EmploymentType | null>(null);
  const [newEmpLabel, setNewEmpLabel] = useState('');
  const [newEmpColor, setNewEmpColor] = useState(DEFAULT_PALETTE_COLOR);

  const DEFAULT_EMP_TYPES: EmploymentType[] = [
    { value: 'full_time', label: 'Full-time', color: 'blue' },
    { value: 'part_time', label: 'Part-time', color: 'teal' },
    { value: 'internship', label: 'Internship', color: 'amber' },
    { value: 'contract', label: 'Contract', color: 'purple' },
    { value: 'freelance', label: 'Freelance', color: 'orange' },
  ];

  const getEmpTypes = (): EmploymentType[] =>
    settings?.employment_types && settings.employment_types.length > 0
      ? settings.employment_types
      : DEFAULT_EMP_TYPES;

  const toSlug = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

  const handleSaveEmpType = () => {
    if (!newEmpLabel.trim() || !settings) return;
    const current = getEmpTypes();
    if (editingEmpType) {
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              employment_types: current.map((t) =>
                t.value === editingEmpType.value
                  ? { ...t, label: newEmpLabel, color: newEmpColor }
                  : t
              ),
            }
          : null
      );
    } else {
      const value = toSlug(newEmpLabel);
      if (current.some((t) => t.value === value)) return;
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              employment_types: [...current, { value, label: newEmpLabel, color: newEmpColor }],
            }
          : null
      );
    }
    setIsAddingEmpType(false);
    setEditingEmpType(null);
    setNewEmpLabel('');
    setNewEmpColor(DEFAULT_PALETTE_COLOR);
  };

  const handleEditEmpType = (t: EmploymentType) => {
    setEditingEmpType(t);
    setNewEmpLabel(t.label);
    setNewEmpColor(t.color);
    setIsAddingEmpType(true);
  };

  const handleDeleteEmpType = (value: string) => {
    const current = getEmpTypes();
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            employment_types: current.filter((t) => t.value !== value),
          }
        : null
    );
  };

  const handleCancelEmpType = () => {
    setIsAddingEmpType(false);
    setEditingEmpType(null);
    setNewEmpLabel('');
    setNewEmpColor(DEFAULT_PALETTE_COLOR);
  };

  return {
    DEFAULT_EMP_TYPES,
    isEmpTypesLocked,
    setIsEmpTypesLocked,
    isAddingEmpType,
    setIsAddingEmpType,
    editingEmpType,
    newEmpLabel,
    setNewEmpLabel,
    newEmpColor,
    setNewEmpColor,
    toSlug,
    getEmpTypes,
    handleSaveEmpType,
    handleEditEmpType,
    handleDeleteEmpType,
    handleCancelEmpType,
  };
};
