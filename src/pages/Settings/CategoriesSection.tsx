import type { ReactNode } from 'react';
import type React from 'react';
import type { ColorConflict } from '../../utils/colorConflicts';
import type { UserSettings, HolidayTab } from '../../types';
import { PlusOutlined, CloseOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import ColorSwatchPicker from '../../components/ColorSwatchPicker';
import LockableListItem from '../../components/LockableListItem';
import { SECTION_ICONS } from './settingsChrome';
import {
  FEDERAL_HOLIDAY_COLOR,
  FEDERAL_HOLIDAY_LABEL,
  UNTABBED_HOLIDAY_COLOR,
  UNTABBED_HOLIDAY_LABEL,
  getFederalHolidayColor,
  getHolidayTabColor,
} from '../../utils/holidayTabColors';
import { describeConflict } from '../../utils/colorConflicts';

type Props = {
  colorConflicts: ColorConflict[];
  editingHolidayTab: HolidayTab | null;
  freeColorSuggestion: string | null;
  getHolidayTabs: () => HolidayTab[];
  handleCancelHolidayTab: () => void;
  handleDeleteHolidayTab: (id: string) => void;
  handleEditHolidayTab: (t: HolidayTab) => void;
  handleSaveHolidayTab: () => void;
  isAddingHolidayTab: boolean;
  isHolidayTabsLocked: boolean;
  newTabColor: string;
  newTabName: string;
  renderClashNotice: (
    color: string | null | undefined,
    excluding?: { kind: 'category' | 'holiday'; label: string }
  ) => ReactNode;
  setIsAddingHolidayTab: React.Dispatch<React.SetStateAction<boolean>>;
  setIsHolidayTabsLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setNewTabColor: React.Dispatch<React.SetStateAction<string>>;
  setNewTabName: React.Dispatch<React.SetStateAction<string>>;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
  settings: UserSettings | null;
  toTabId: (s: string) => string;
};

const CategoriesSection = ({
  colorConflicts,
  editingHolidayTab,
  freeColorSuggestion,
  getHolidayTabs,
  handleCancelHolidayTab,
  handleDeleteHolidayTab,
  handleEditHolidayTab,
  handleSaveHolidayTab,
  isAddingHolidayTab,
  isHolidayTabsLocked,
  newTabColor,
  newTabName,
  renderClashNotice,
  setIsAddingHolidayTab,
  setIsHolidayTabsLocked,
  setNewTabColor,
  setNewTabName,
  setSettings,
  settings,
  toTabId,
}: Props) => (
  <div
    id="settings-section-holiday-colors"
    className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
  >
    <div className="mb-4 flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
          <span className="text-slate-400">{SECTION_ICONS.holiday}</span>
          Time Off Colors
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Custom tabs in Holiday Manager — saved with Settings
        </p>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsHolidayTabsLocked((l) => !l)}
          className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors sm:h-9 sm:w-9 ${isHolidayTabsLocked ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}
          title={isHolidayTabsLocked ? 'Unlock section' : 'Lock section'}
          aria-pressed={isHolidayTabsLocked}
        >
          {isHolidayTabsLocked ? (
            <LockOutlined className="text-base" />
          ) : (
            <UnlockOutlined className="text-base" />
          )}
        </button>
        {!isHolidayTabsLocked && (
          <button
            onClick={() => {
              if (isAddingHolidayTab) {
                handleCancelHolidayTab();
              } else {
                setIsAddingHolidayTab(true);
              }
            }}
            className="flex min-h-11 items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 sm:min-h-9 sm:rounded-lg sm:py-1.5"
          >
            {isAddingHolidayTab ? (
              <CloseOutlined className="text-base" />
            ) : (
              <PlusOutlined className="text-base" />
            )}
            {isAddingHolidayTab ? 'Cancel' : 'Add Tab'}
          </button>
        )}
      </div>
    </div>

    {isAddingHolidayTab && !isHolidayTabsLocked && (
      <div className="mb-5 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tab Name</label>
              <input
                type="text"
                placeholder="e.g. Inauspicious Days, Lucky Days"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveHolidayTab()}
                autoFocus
              />
              {!editingHolidayTab && newTabName && (
                <p className="text-xs text-gray-400 mt-1">
                  ID: <code>{toTabId(newTabName)}</code>
                </p>
              )}
            </div>
            <button
              onClick={handleSaveHolidayTab}
              disabled={!newTabName.trim()}
              className="min-h-11 w-full rounded-xl bg-blue-600 px-4 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
            >
              {editingHolidayTab ? 'Update' : 'Add'}
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
            <ColorSwatchPicker value={newTabColor} onChange={setNewTabColor} allowCustomHex />
            {renderClashNotice(
              newTabColor,
              editingHolidayTab ? { kind: 'holiday', label: editingHolidayTab.name } : undefined
            )}
          </div>
        </div>
      </div>
    )}

    {getHolidayTabs().length === 0 ? (
      <p className="text-gray-500 text-sm text-center py-4">
        No custom tabs defined. Add one to get started.
      </p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {getHolidayTabs().map((t) => (
          <LockableListItem
            key={t.id}
            isLocked={!!t.locked}
            sectionLocked={isHolidayTabsLocked}
            onToggleLock={() => {
              const current = getHolidayTabs();
              setSettings((prev) =>
                prev
                  ? {
                      ...prev,
                      holiday_tabs: current.map((x) =>
                        x.id === t.id ? { ...x, locked: !t.locked } : x
                      ),
                    }
                  : null
              );
            }}
            onEdit={() => handleEditHolidayTab(t)}
            onDelete={() => handleDeleteHolidayTab(t.id)}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: getHolidayTabColor(t.color).dot }}
            />
            <span className="min-w-0">
              <span className="block truncate font-medium text-gray-800">{t.name}</span>
              <span className="block truncate text-xs text-gray-400 font-mono">{t.id}</span>
            </span>
          </LockableListItem>
        ))}
      </div>
    )}
    <p className="text-xs text-gray-400 mt-3">
      Deleting a tab moves its time off back to <em>My Time Off</em>.
    </p>

    {/* Time off with no tab used a hardcoded colour, so it could silently match an
        event category. It is a real setting now, and clashes are called out. */}
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{
              backgroundColor: getHolidayTabColor(
                settings?.default_holiday_color ?? UNTABBED_HOLIDAY_COLOR
              ).dot,
            }}
          />
          <span className="text-sm font-medium text-gray-800">{UNTABBED_HOLIDAY_LABEL}</span>
          <span className="text-xs text-gray-400">time off with no tab</span>
        </div>
        <ColorSwatchPicker
          value={settings?.default_holiday_color ?? UNTABBED_HOLIDAY_COLOR}
          onChange={(color) =>
            setSettings((prev) => (prev ? { ...prev, default_holiday_color: color } : prev))
          }
          allowCustomHex
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-3">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{
              backgroundColor: getFederalHolidayColor(
                settings?.federal_holiday_color ?? FEDERAL_HOLIDAY_COLOR
              ).dot,
            }}
          />
          <span className="text-sm font-medium text-gray-800">{FEDERAL_HOLIDAY_LABEL}</span>
          <span className="text-xs text-gray-400">public holidays</span>
        </div>
        <ColorSwatchPicker
          value={settings?.federal_holiday_color ?? FEDERAL_HOLIDAY_COLOR}
          onChange={(color) =>
            setSettings((prev) => (prev ? { ...prev, federal_holiday_color: color } : prev))
          }
          allowCustomHex
        />
      </div>
    </div>

    {colorConflicts.length > 0 && (
      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Colour clash</p>
        <ul className="mt-1.5 space-y-1">
          {colorConflicts.map((conflict) => (
            <li
              key={conflict.dot}
              className="flex items-start gap-2 text-[13px] leading-5 text-amber-900"
            >
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-amber-300"
                style={{ backgroundColor: conflict.dot }}
              />
              <span>{describeConflict(conflict)}</span>
            </li>
          ))}
        </ul>
        {freeColorSuggestion && (
          <p className="mt-2 text-[11px] text-amber-700">
            Nothing is using <span className="font-semibold">{freeColorSuggestion}</span> yet.
          </p>
        )}
      </div>
    )}
  </div>
);

export default CategoriesSection;
