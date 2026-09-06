import type React from 'react';
import { useSensors } from '@dnd-kit/core';
import type { UserSettings } from '../../types';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PlusOutlined, CloseOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import ColorSwatchPicker from '../../components/ColorSwatchPicker';
import { SECTION_ICONS } from './settingsChrome';
import { getPaletteColorFromTone } from '../../utils/colorPalette';
import { SortableStageRow } from './SortableStageRow';
import type { ApplicationStage } from './SortableStageRow';

type Props = {
  editingAppStage: ApplicationStage | null;
  getAppStages: () => ApplicationStage[];
  handleAppStageDragEnd: (event: DragEndEvent) => void;
  handleCancelAppStage: () => void;
  handleDeleteAppStage: (key: string) => void;
  handleEditAppStage: (t: ApplicationStage) => void;
  handleSaveAppStage: () => void;
  isAddingAppStage: boolean;
  isAppStagesLocked: boolean;
  isLocked: boolean;
  newAppStageLabel: string;
  newAppStageShortLabel: string;
  newAppStageTone: string;
  setIsAddingAppStage: React.Dispatch<React.SetStateAction<boolean>>;
  setIsAppStagesLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setNewAppStageLabel: React.Dispatch<React.SetStateAction<string>>;
  setNewAppStageShortLabel: React.Dispatch<React.SetStateAction<string>>;
  setNewAppStageTone: React.Dispatch<React.SetStateAction<string>>;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
  settings: UserSettings | null;
  stageSensors: ReturnType<typeof useSensors>;
};

const ApplicationStagesSection = ({
  editingAppStage,
  getAppStages,
  handleAppStageDragEnd,
  handleCancelAppStage,
  handleDeleteAppStage,
  handleEditAppStage,
  handleSaveAppStage,
  isAddingAppStage,
  isAppStagesLocked,
  newAppStageLabel,
  newAppStageShortLabel,
  newAppStageTone,
  setIsAddingAppStage,
  setIsAppStagesLocked,
  setNewAppStageLabel,
  setNewAppStageShortLabel,
  setNewAppStageTone,
  setSettings,
  stageSensors,
}: Props) => (
  <div
    id="settings-section-application-stages"
    className="mt-6 scroll-mt-24 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-4 shadow-sm sm:p-6"
  >
    <div className="mb-4 flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-ink-50">
          <span className="text-slate-400 dark:text-ink-500">{SECTION_ICONS.stages}</span>
          Application Timeline Stages
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-ink-400">
          Custom stages for your job applications pipeline
        </p>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsAppStagesLocked((l) => !l)}
          className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors sm:h-9 sm:w-9 ${isAppStagesLocked ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-100' : 'text-gray-600 dark:text-ink-200 hover:bg-gray-100 hover:text-gray-800'}`}
          title={isAppStagesLocked ? 'Unlock section' : 'Lock section'}
          aria-pressed={isAppStagesLocked}
        >
          {isAppStagesLocked ? (
            <LockOutlined className="text-base" />
          ) : (
            <UnlockOutlined className="text-base" />
          )}
        </button>
        {!isAppStagesLocked && (
          <button
            onClick={() => {
              if (isAddingAppStage) {
                handleCancelAppStage();
              } else {
                setIsAddingAppStage(true);
              }
            }}
            className="flex min-h-11 items-center gap-1 rounded-xl bg-blue-50 dark:bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 transition hover:bg-blue-100 sm:min-h-9 sm:rounded-lg sm:py-1.5"
          >
            {isAddingAppStage ? (
              <CloseOutlined className="text-base" />
            ) : (
              <PlusOutlined className="text-base" />
            )}
            {isAddingAppStage ? 'Cancel' : 'Add Stage'}
          </button>
        )}
      </div>
    </div>

    {isAddingAppStage && !isAppStagesLocked && (
      <div className="mb-5 bg-gray-50 dark:bg-ink-900 p-4 rounded-lg border border-gray-200 dark:border-white/[0.08]">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(140px,0.55fr)_auto] lg:items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-ink-400 mb-1">
                Label (e.g. Online Assessment)
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 dark:border-white/[0.12] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={newAppStageLabel}
                onChange={(e) => setNewAppStageLabel(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-ink-400 mb-1">
                Short Label
              </label>
              <input
                type="text"
                placeholder="OA"
                className="w-full rounded-lg border border-gray-300 dark:border-white/[0.12] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={newAppStageShortLabel}
                onChange={(e) => setNewAppStageShortLabel(e.target.value)}
              />
            </div>
            <button
              onClick={handleSaveAppStage}
              disabled={!newAppStageLabel.trim() || !newAppStageShortLabel.trim()}
              className="min-h-11 w-full rounded-xl bg-blue-600 px-4 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
            >
              {editingAppStage ? 'Update' : 'Add'}
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-ink-400 mb-1">
              Color
            </label>
            <ColorSwatchPicker
              value={newAppStageTone}
              onChange={setNewAppStageTone}
              mode="tone"
              allowCustomHex
            />
          </div>
        </div>
      </div>
    )}

    {getAppStages().length === 0 ? (
      <p className="text-gray-500 dark:text-ink-400 text-sm text-center py-4">
        No custom stages defined. Add one to get started.
      </p>
    ) : (
      <DndContext
        sensors={stageSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleAppStageDragEnd}
      >
        <SortableContext
          items={getAppStages().map((t) => t.key)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {getAppStages().map((t) => (
              <SortableStageRow
                key={t.key}
                id={t.key}
                disabled={isAppStagesLocked || !!t.locked}
                isLocked={!!t.locked}
                sectionLocked={isAppStagesLocked}
                onToggleLock={() => {
                  const current = getAppStages();
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          application_stages: current.map((x) =>
                            x.key === t.key ? { ...x, locked: !t.locked } : x
                          ),
                        }
                      : null
                  );
                }}
                onEdit={() => handleEditAppStage(t)}
                onDelete={() => handleDeleteAppStage(t.key)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getPaletteColorFromTone(t.tone).dot }}
                  ></div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800 dark:text-ink-50 leading-tight">
                      {t.label}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-ink-500 font-mono mt-0.5">
                      {t.key} · {t.shortLabel}
                    </span>
                  </div>
                </div>
              </SortableStageRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    )}
  </div>
);

export default ApplicationStagesSection;
