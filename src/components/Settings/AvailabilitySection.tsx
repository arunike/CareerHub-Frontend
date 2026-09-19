import type React from 'react';
import type { EventCategory, UserSettings } from '../../types';
import { PlusOutlined, CloseOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import EditableNumberInput from '../inputs/EditableNumberInput';
import FriendlyTimeInput from '../inputs/FriendlyTimeInput';
import { SECTION_ICONS, SettingsSection } from './settingsChrome';
import { TIMEZONE_OPTIONS, normalizeTimeZone } from '../../lib/timezones';
import {
  WORK_DAY_OPTIONS,
  formatAvailabilityTime,
  summarizeSelectedDays,
} from '../../utils/Settings/availabilityHours';
import type { AvailabilityTimeRange } from '../../utils/Settings/availabilityHours';
import { groupAvailabilityRanges } from '../../utils/Settings/availabilityGroups';

type Props = {
  addAvailabilityRange: (days?: number[]) => void;
  categories: EventCategory[];
  expandedAvailabilityGroup: string | null;
  removeAvailabilityGroup: (indices: number[]) => void;
  removeAvailabilityRange: (idx: number) => void;
  setAvailabilityGroupDays: (indices: number[], nextDays: number[]) => void;
  setExpandedAvailabilityGroup: React.Dispatch<React.SetStateAction<string | null>>;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
  settings: UserSettings;
  updateAvailabilityRange: (idx: number, patch: Partial<AvailabilityTimeRange>) => void;
  updateWorkDays: (nextDays: number[]) => void;
};

const AvailabilitySection = ({
  addAvailabilityRange,
  categories,
  expandedAvailabilityGroup,
  removeAvailabilityGroup,
  removeAvailabilityRange,
  setAvailabilityGroupDays,
  setExpandedAvailabilityGroup,
  setSettings,
  settings,
  updateAvailabilityRange,
  updateWorkDays,
}: Props) => {
  const enabledDays = settings.work_days || [];

  return (
    <SettingsSection
      id="availability"
      icon={SECTION_ICONS.availability}
      title="Availability"
      description="The working window bookings and events are offered inside."
    >
      {/* Work Days */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-2">
          Work Days
        </label>
        <div className="flex flex-wrap gap-2">
          {WORK_DAY_OPTIONS.map((day) => {
            const isSelected = (settings.work_days || []).includes(day.val);
            return (
              <button
                key={day.val}
                type="button"
                onClick={() => {
                  const currentDays = settings.work_days || [];
                  const newDays = isSelected
                    ? currentDays.filter((d: number) => d !== day.val)
                    : [...currentDays, day.val].sort();
                  updateWorkDays(newDays);
                }}
                className={`min-h-11 min-w-11 rounded-lg border px-3 text-sm font-medium transition-colors ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 dark:border-white/[0.12] bg-white dark:bg-ink-900 text-slate-700 dark:text-ink-100 hover:border-blue-300 hover:bg-blue-50'
                }`}
                aria-pressed={isSelected}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Work Hours */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-ink-100">
            Available Time Ranges
          </label>
          <button
            type="button"
            onClick={() => addAvailabilityRange()}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-medium text-blue-700 dark:text-blue-300 transition-colors hover:bg-blue-50"
          >
            <PlusOutlined /> Add Range
          </button>
        </div>

        {(settings.work_time_ranges?.length ?? 0) === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-ink-400 mb-1">Start</label>
              <FriendlyTimeInput
                className="w-full text-base py-1.5 rounded-lg border-gray-300 dark:border-white/[0.12] hover:border-blue-500 focus:border-blue-500"
                value={
                  settings.work_start_time
                    ? dayjs(settings.work_start_time, 'HH:mm:ss')
                    : dayjs('09:00:00', 'HH:mm:ss')
                }
                onChange={(time) => {
                  if (time)
                    setSettings((prev) =>
                      prev ? { ...prev, work_start_time: time.format('HH:mm:ss') } : null
                    );
                }}
                minuteStep={1}
                allowClear={false}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-ink-400 mb-1">End</label>
              <FriendlyTimeInput
                className="w-full text-base py-1.5 rounded-lg border-gray-300 dark:border-white/[0.12] hover:border-blue-500 focus:border-blue-500"
                value={
                  settings.work_end_time
                    ? dayjs(settings.work_end_time, 'HH:mm:ss')
                    : dayjs('17:00:00', 'HH:mm:ss')
                }
                onChange={(time) => {
                  if (time)
                    setSettings((prev) =>
                      prev ? { ...prev, work_end_time: time.format('HH:mm:ss') } : null
                    );
                }}
                minuteStep={1}
                allowClear={false}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {groupAvailabilityRanges(settings.work_time_ranges, enabledDays).map(
              (group, groupIndex) => {
                const isExpanded = expandedAvailabilityGroup === group.key;
                const daySummary = summarizeSelectedDays(group.days);
                const blockSummary = group.blocks
                  .map(
                    ({ range }) =>
                      `${formatAvailabilityTime(range.start, '09:00:00')}–${formatAvailabilityTime(
                        range.end,
                        '17:00:00'
                      )}`
                  )
                  .join(' · ');
                const editorId = `availability-group-editor-${group.key}`;

                return (
                  <div
                    key={group.key}
                    className={`overflow-hidden rounded-xl border bg-white dark:bg-ink-900 transition-colors ${
                      isExpanded
                        ? 'border-blue-200 dark:border-blue-500/25'
                        : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 p-2 sm:p-3">
                      <button
                        type="button"
                        onClick={() => setExpandedAvailabilityGroup(isExpanded ? null : group.key)}
                        aria-expanded={isExpanded}
                        aria-controls={editorId}
                        aria-label={`Edit availability for ${daySummary}: ${blockSummary}`}
                        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-ink-800 text-sm font-bold text-slate-600 dark:text-ink-200">
                          {groupIndex + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-ink-50">
                            {daySummary}
                          </span>
                          <span className="mt-0.5 block truncate text-xs tabular-nums text-slate-600 dark:text-ink-200">
                            {blockSummary}
                          </span>
                        </span>
                        {/* Says how many windows the card holds without opening it. */}
                        {group.blocks.length > 1 ? (
                          <span className="shrink-0 rounded-full bg-slate-100 dark:bg-ink-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-ink-200">
                            {group.blocks.length} blocks
                          </span>
                        ) : null}
                        <span
                          className="shrink-0 text-slate-400 dark:text-ink-500"
                          aria-hidden="true"
                        >
                          {isExpanded ? <DownOutlined /> : <RightOutlined />}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          removeAvailabilityGroup(group.blocks.map(({ index }) => index))
                        }
                        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 dark:text-ink-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                        aria-label={`Remove all availability on ${daySummary}`}
                      >
                        <CloseOutlined />
                      </button>
                    </div>

                    {isExpanded ? (
                      <div
                        id={editorId}
                        role="region"
                        aria-label={`Availability editor for ${daySummary}`}
                        className="space-y-4 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/40 dark:bg-ink-900/40 p-4"
                      >
                        <div className="space-y-3">
                          {group.blocks.map(({ index, range }, blockIndex) => (
                            <div
                              key={index}
                              className={`grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end sm:rounded-none sm:border-0 sm:p-0 ${
                                group.blocks.length > 1
                                  ? 'rounded-lg border border-slate-200 p-3 dark:border-white/[0.08]'
                                  : ''
                              }`}
                            >
                              <div className="min-w-0">
                                {/* Labelled once: a second Start/End pair under the first reads as a new form. */}
                                {blockIndex === 0 ? (
                                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-ink-200">
                                    Start
                                  </label>
                                ) : null}
                                <FriendlyTimeInput
                                  className="w-full rounded-lg border-gray-300 dark:border-white/[0.12] py-1.5 text-base hover:border-blue-500 focus:border-blue-500"
                                  value={
                                    range.start
                                      ? dayjs(range.start, 'HH:mm:ss')
                                      : dayjs('09:00:00', 'HH:mm:ss')
                                  }
                                  onChange={(time) => {
                                    if (time) {
                                      updateAvailabilityRange(index, {
                                        start: time.format('HH:mm:ss'),
                                      });
                                    }
                                  }}
                                  minuteStep={1}
                                  allowClear={false}
                                  ariaLabel={`Start time, block ${blockIndex + 1} on ${daySummary}`}
                                />
                              </div>
                              <span className="hidden pb-2 text-slate-400 dark:text-ink-500 sm:block">
                                –
                              </span>
                              <div className="min-w-0">
                                {blockIndex === 0 ? (
                                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-ink-200">
                                    End
                                  </label>
                                ) : null}
                                <FriendlyTimeInput
                                  className="w-full rounded-lg border-gray-300 dark:border-white/[0.12] py-1.5 text-base hover:border-blue-500 focus:border-blue-500"
                                  value={
                                    range.end
                                      ? dayjs(range.end, 'HH:mm:ss')
                                      : dayjs('17:00:00', 'HH:mm:ss')
                                  }
                                  onChange={(time) => {
                                    if (time) {
                                      updateAvailabilityRange(index, {
                                        end: time.format('HH:mm:ss'),
                                      });
                                    }
                                  }}
                                  minuteStep={1}
                                  allowClear={false}
                                  ariaLabel={`End time, block ${blockIndex + 1} on ${daySummary}`}
                                />
                              </div>
                              {/* The last block has no remove: clearing the card is what the header X does. */}
                              {group.blocks.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => removeAvailabilityRange(index)}
                                  className="inline-flex min-h-11 min-w-11 items-center justify-center justify-self-start rounded-lg text-slate-400 dark:text-ink-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 sm:justify-self-auto"
                                  aria-label={`Remove block ${blockIndex + 1} on ${daySummary}`}
                                >
                                  <CloseOutlined />
                                </button>
                              ) : (
                                <span className="hidden sm:block sm:min-w-11" aria-hidden="true" />
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => addAvailabilityRange(group.days)}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-white/[0.12] px-3 py-1 text-xs font-medium text-slate-600 dark:text-ink-200 transition hover:border-blue-400 hover:text-blue-600 active:scale-[0.98] sm:min-h-8 sm:rounded-md"
                        >
                          <PlusOutlined /> Add time block
                        </button>

                        <div className="space-y-3">
                          <span className="block text-xs font-medium text-slate-600 dark:text-ink-200">
                            Apply to
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {WORK_DAY_OPTIONS.map((day) => {
                              const isEnabledWorkDay = enabledDays.includes(day.val);
                              const isSelected = group.days.includes(day.val);
                              return (
                                <button
                                  key={day.val}
                                  type="button"
                                  disabled={!isEnabledWorkDay}
                                  onClick={() =>
                                    setAvailabilityGroupDays(
                                      group.blocks.map(({ index }) => index),
                                      isSelected
                                        ? group.days.filter((item) => item !== day.val)
                                        : [...group.days, day.val]
                                    )
                                  }
                                  className={`min-h-11 min-w-12 rounded-xl border px-2.5 py-1 text-xs font-medium transition active:scale-[0.98] sm:min-h-8 sm:rounded-md ${
                                    isSelected
                                      ? 'border-blue-200 dark:border-blue-500/25 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                      : isEnabledWorkDay
                                        ? 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 text-gray-600 dark:text-ink-200 hover:bg-gray-50'
                                        : 'cursor-not-allowed border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-ink-900 text-gray-300 dark:text-ink-600'
                                  }`}
                                  title={
                                    isEnabledWorkDay ? undefined : 'Enable this day in Work Days'
                                  }
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setAvailabilityGroupDays(
                                  group.blocks.map(({ index }) => index),
                                  enabledDays
                                )
                              }
                              className="min-h-11 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-3 py-1 text-xs font-medium text-gray-600 dark:text-ink-200 transition hover:bg-gray-50 active:scale-[0.98] sm:min-h-8 sm:rounded-md"
                            >
                              Use work days
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      <div>
        <label
          htmlFor="settings-default-event-duration"
          className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1"
        >
          Default Event Duration
        </label>
        <EditableNumberInput
          id="settings-default-event-duration"
          unit="min"
          min={15}
          step={15}
          value={settings.default_event_duration || 60}
          fallbackValue={60}
          onCommit={(value) =>
            setSettings((prev) => (prev ? { ...prev, default_event_duration: value } : null))
          }
        />
      </div>

      <div>
        <label
          htmlFor="settings-default-event-category"
          className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1"
        >
          Default Event Category
        </label>
        <select
          id="settings-default-event-category"
          className="min-h-11 w-full rounded-lg border border-gray-300 dark:border-white/[0.12] px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-ink-900"
          value={settings.default_event_category || ''}
          onChange={(e) =>
            setSettings((prev) =>
              prev
                ? {
                    ...prev,
                    default_event_category: e.target.value ? Number(e.target.value) : null,
                  }
                : null
            )
          }
        >
          <option value="">No Default Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="settings-buffer-time"
          className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1"
        >
          Buffer Time
        </label>
        <EditableNumberInput
          id="settings-buffer-time"
          unit="min"
          min={0}
          step={5}
          ariaDescribedBy="settings-buffer-time-help"
          value={settings.buffer_time || 0}
          fallbackValue={0}
          onCommit={(value) =>
            setSettings((prev) => (prev ? { ...prev, buffer_time: value } : null))
          }
        />
        <p id="settings-buffer-time-help" className="text-xs text-gray-500 dark:text-ink-400 mt-1">
          Time buffer between events
        </p>
      </div>

      <div>
        <label
          htmlFor="settings-primary-timezone"
          className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1"
        >
          Primary Timezone
        </label>
        <select
          id="settings-primary-timezone"
          className="min-h-11 w-full rounded-lg border border-gray-300 dark:border-white/[0.12] px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-ink-900"
          value={normalizeTimeZone(settings.primary_timezone)}
          onChange={(e) =>
            setSettings((prev) => (prev ? { ...prev, primary_timezone: e.target.value } : null))
          }
        >
          {TIMEZONE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </SettingsSection>
  );
};

export default AvailabilitySection;
