import type React from 'react';
import type { EventCategory, UserSettings } from '../../types';
import { PlusOutlined, CloseOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import EditableNumberInput from '../../components/EditableNumberInput';
import FriendlyTimeInput from '../../components/FriendlyTimeInput';
import { SECTION_ICONS, SettingsSection } from './settingsChrome';
import { TIMEZONE_OPTIONS, normalizeTimeZone } from '../../lib/timezones';
import {
  WORK_DAY_OPTIONS,
  formatAvailabilityTime,
  summarizeSelectedDays,
} from './availabilityHours';
import type { AvailabilityTimeRange } from './availabilityHours';

type Props = {
  addAvailabilityRange: () => void;
  applyWorkDaysToAvailabilityRange: (idx: number) => void;
  categories: EventCategory[];
  clearAvailabilityRangeDays: (idx: number) => void;
  expandedAvailabilityRange: number | null;
  removeAvailabilityRange: (idx: number) => void;
  setExpandedAvailabilityRange: React.Dispatch<React.SetStateAction<number | null>>;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
  settings: UserSettings;
  toggleAvailabilityRangeDay: (range: AvailabilityTimeRange, idx: number, day: number) => void;
  updateAvailabilityRange: (idx: number, patch: Partial<AvailabilityTimeRange>) => void;
  updateWorkDays: (nextDays: number[]) => void;
};

const AvailabilitySection = ({
  addAvailabilityRange,
  applyWorkDaysToAvailabilityRange,
  categories,
  clearAvailabilityRangeDays,
  expandedAvailabilityRange,
  removeAvailabilityRange,
  setExpandedAvailabilityRange,
  setSettings,
  settings,
  toggleAvailabilityRangeDay,
  updateAvailabilityRange,
  updateWorkDays,
}: Props) => (
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
          onClick={addAvailabilityRange}
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
          {settings.work_time_ranges.map((range, idx) => {
            const enabledDays = settings.work_days || [];
            const selectedDays = (range.days ?? enabledDays).filter((day) =>
              enabledDays.includes(day)
            );
            const isExpanded = expandedAvailabilityRange === idx;
            const daySummary = summarizeSelectedDays(selectedDays);
            const timeSummary = `${formatAvailabilityTime(
              range.start,
              '09:00:00'
            )}–${formatAvailabilityTime(range.end, '17:00:00')}`;
            return (
              <div
                key={idx}
                className={`overflow-hidden rounded-xl border bg-white dark:bg-ink-900 transition-colors ${
                  isExpanded
                    ? 'border-blue-200 dark:border-blue-500/25'
                    : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 p-2 sm:p-3">
                  <button
                    type="button"
                    onClick={() => setExpandedAvailabilityRange(isExpanded ? null : idx)}
                    aria-expanded={isExpanded}
                    aria-controls={`availability-range-editor-${idx}`}
                    aria-label={`Edit availability range ${idx + 1}: ${daySummary}, ${timeSummary}`}
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-ink-800 text-sm font-bold text-slate-600 dark:text-ink-200">
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900 dark:text-ink-50">
                        {daySummary}
                      </span>
                      <span className="mt-0.5 block text-xs tabular-nums text-slate-600 dark:text-ink-200">
                        {timeSummary}
                      </span>
                    </span>
                    <span className="shrink-0 text-slate-400 dark:text-ink-500" aria-hidden="true">
                      {isExpanded ? <DownOutlined /> : <RightOutlined />}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAvailabilityRange(idx)}
                    className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 dark:text-ink-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                    aria-label={`Remove availability range ${idx + 1}`}
                  >
                    <CloseOutlined />
                  </button>
                </div>

                {isExpanded ? (
                  <div
                    id={`availability-range-editor-${idx}`}
                    role="region"
                    aria-label={`Availability range ${idx + 1} editor`}
                    className="space-y-4 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/40 dark:bg-ink-900/40 p-4"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-ink-200">
                          Start
                        </label>
                        <FriendlyTimeInput
                          className="w-full rounded-lg border-gray-300 dark:border-white/[0.12] py-1.5 text-base hover:border-blue-500 focus:border-blue-500"
                          value={
                            range.start
                              ? dayjs(range.start, 'HH:mm:ss')
                              : dayjs('09:00:00', 'HH:mm:ss')
                          }
                          onChange={(time) => {
                            if (time) {
                              updateAvailabilityRange(idx, {
                                start: time.format('HH:mm:ss'),
                              });
                            }
                          }}
                          minuteStep={1}
                          allowClear={false}
                        />
                      </div>
                      <span className="hidden pb-2 text-slate-400 dark:text-ink-500 sm:block">
                        –
                      </span>
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-ink-200">
                          End
                        </label>
                        <FriendlyTimeInput
                          className="w-full rounded-lg border-gray-300 dark:border-white/[0.12] py-1.5 text-base hover:border-blue-500 focus:border-blue-500"
                          value={
                            range.end ? dayjs(range.end, 'HH:mm:ss') : dayjs('17:00:00', 'HH:mm:ss')
                          }
                          onChange={(time) => {
                            if (time) {
                              updateAvailabilityRange(idx, {
                                end: time.format('HH:mm:ss'),
                              });
                            }
                          }}
                          minuteStep={1}
                          allowClear={false}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <span className="block text-xs font-medium text-slate-600 dark:text-ink-200">
                        Apply to
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {WORK_DAY_OPTIONS.map((day) => {
                          const isEnabledWorkDay = enabledDays.includes(day.val);
                          const isSelected = selectedDays.includes(day.val);
                          return (
                            <button
                              key={day.val}
                              type="button"
                              disabled={!isEnabledWorkDay}
                              onClick={() => toggleAvailabilityRangeDay(range, idx, day.val)}
                              className={`min-h-11 min-w-12 rounded-xl border px-2.5 py-1 text-xs font-medium transition active:scale-[0.98] sm:min-h-8 sm:rounded-md ${
                                isSelected
                                  ? 'border-blue-200 dark:border-blue-500/25 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                  : isEnabledWorkDay
                                    ? 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 text-gray-600 dark:text-ink-200 hover:bg-gray-50'
                                    : 'cursor-not-allowed border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-ink-900 text-gray-300 dark:text-ink-600'
                              }`}
                              title={isEnabledWorkDay ? undefined : 'Enable this day in Work Days'}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => applyWorkDaysToAvailabilityRange(idx)}
                          className="min-h-11 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-3 py-1 text-xs font-medium text-gray-600 dark:text-ink-200 transition hover:bg-gray-50 active:scale-[0.98] sm:min-h-8 sm:rounded-md"
                        >
                          Use work days
                        </button>
                        <button
                          type="button"
                          onClick={() => clearAvailabilityRangeDays(idx)}
                          className="min-h-11 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-3 py-1 text-xs font-medium text-gray-500 dark:text-ink-400 transition hover:bg-gray-50 active:scale-[0.98] sm:min-h-8 sm:rounded-md"
                        >
                          Clear days
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
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
        onCommit={(value) => setSettings((prev) => (prev ? { ...prev, buffer_time: value } : null))}
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

export default AvailabilitySection;
