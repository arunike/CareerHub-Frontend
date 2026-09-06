import type React from 'react';
import type { UserSettings, EmploymentType } from '../../types';
import { PlusOutlined, CloseOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import ColorSwatchPicker from '../../components/ColorSwatchPicker';
import LockableListItem from '../../components/LockableListItem';
import { SECTION_ICONS } from './settingsChrome';
import { getPaletteColor } from '../../utils/colorPalette';

type Props = {
  editingEmpType: EmploymentType | null;
  getEmpTypes: () => EmploymentType[];
  handleCancelEmpType: () => void;
  handleDeleteEmpType: (value: string) => void;
  handleEditEmpType: (t: EmploymentType) => void;
  handleSaveEmpType: () => void;
  isAddingEmpType: boolean;
  isEmpTypesLocked: boolean;
  isLocked: boolean;
  newEmpColor: string;
  newEmpLabel: string;
  setIsAddingEmpType: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEmpTypesLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setNewEmpColor: React.Dispatch<React.SetStateAction<string>>;
  setNewEmpLabel: React.Dispatch<React.SetStateAction<string>>;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
  settings: UserSettings | null;
  toSlug: (s: string) => string;
};

const EmploymentTypesSection = ({
  editingEmpType,
  getEmpTypes,
  handleCancelEmpType,
  handleDeleteEmpType,
  handleEditEmpType,
  handleSaveEmpType,
  isAddingEmpType,
  isEmpTypesLocked,
  newEmpColor,
  newEmpLabel,
  setIsAddingEmpType,
  setIsEmpTypesLocked,
  setNewEmpColor,
  setNewEmpLabel,
  setSettings,
  toSlug,
}: Props) => (
  <div
    id="settings-section-employment-types"
    className="scroll-mt-24 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-4 shadow-sm sm:p-6"
  >
    <div className="mb-4 flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-ink-50">
          <span className="text-slate-400 dark:text-ink-500">{SECTION_ICONS.employment}</span>
          Employment Types
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-ink-400">
          Used in Experience & Applications — saved with Settings
        </p>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsEmpTypesLocked((l) => !l)}
          className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors sm:h-9 sm:w-9 ${isEmpTypesLocked ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-100' : 'text-gray-600 dark:text-ink-200 hover:bg-gray-100 hover:text-gray-800'}`}
          title={isEmpTypesLocked ? 'Unlock section' : 'Lock section'}
          aria-pressed={isEmpTypesLocked}
        >
          {isEmpTypesLocked ? (
            <LockOutlined className="text-base" />
          ) : (
            <UnlockOutlined className="text-base" />
          )}
        </button>
        {!isEmpTypesLocked && (
          <button
            onClick={() => {
              if (isAddingEmpType) {
                handleCancelEmpType();
              } else {
                setIsAddingEmpType(true);
              }
            }}
            className="flex min-h-11 items-center gap-1 rounded-xl bg-blue-50 dark:bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 transition hover:bg-blue-100 sm:min-h-9 sm:rounded-lg sm:py-1.5"
          >
            {isAddingEmpType ? (
              <CloseOutlined className="text-base" />
            ) : (
              <PlusOutlined className="text-base" />
            )}
            {isAddingEmpType ? 'Cancel' : 'Add Type'}
          </button>
        )}
      </div>
    </div>

    {isAddingEmpType && !isEmpTypesLocked && (
      <div className="mb-5 bg-gray-50 dark:bg-ink-900 p-4 rounded-lg border border-gray-200 dark:border-white/[0.08]">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-ink-400 mb-1">
                Label
              </label>
              <input
                type="text"
                placeholder="e.g. Co-op, Volunteer"
                className="w-full rounded-lg border border-gray-300 dark:border-white/[0.12] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={newEmpLabel}
                onChange={(e) => setNewEmpLabel(e.target.value)}
                autoFocus
              />
              {!editingEmpType && newEmpLabel && (
                <p className="text-xs text-gray-400 dark:text-ink-500 mt-1">
                  Value: <code>{toSlug(newEmpLabel)}</code>
                </p>
              )}
            </div>
            <button
              onClick={handleSaveEmpType}
              disabled={!newEmpLabel.trim()}
              className="min-h-11 w-full rounded-xl bg-blue-600 px-4 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
            >
              {editingEmpType ? 'Update' : 'Add'}
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-ink-400 mb-1">
              Color
            </label>
            <ColorSwatchPicker value={newEmpColor} onChange={setNewEmpColor} allowCustomHex />
          </div>
        </div>
      </div>
    )}

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {getEmpTypes().map((t) => {
        const colorOpt = getPaletteColor(t.color);
        return (
          <LockableListItem
            key={t.value}
            isLocked={!!t.locked}
            sectionLocked={isEmpTypesLocked}
            onToggleLock={() => {
              const current = getEmpTypes();
              setSettings((prev) =>
                prev
                  ? {
                      ...prev,
                      employment_types: current.map((x) =>
                        x.value === t.value ? { ...x, locked: !t.locked } : x
                      ),
                    }
                  : null
              );
            }}
            onEdit={() => handleEditEmpType(t)}
            onDelete={() => handleDeleteEmpType(t.value)}
          >
            <span
              style={{ backgroundColor: colorOpt?.bg, color: colorOpt?.text }}
              className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-transparent"
            >
              {t.label}
            </span>
            <span className="text-xs text-gray-400 dark:text-ink-500 font-mono">{t.value}</span>
          </LockableListItem>
        );
      })}
    </div>
  </div>
);

export default EmploymentTypesSection;
