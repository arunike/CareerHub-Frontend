import React, { useState } from 'react';
import { Popover, Switch, Tooltip } from 'antd';
import { CalendarOutlined, LeftOutlined, MoreOutlined, RightOutlined } from '@ant-design/icons';
import type { EventCategory, HolidayTab } from '../../types';
import { getEventCategoryColor } from '../../utils/eventCategoryColors';
import {
  UNTABBED_HOLIDAY_LABEL,
  getObservedHolidayColor,
  getHolidayTabColor,
} from '../../utils/holidayTabColors';
import SegmentedToggle from '../inputs/SegmentedToggle';
import { UNTABBED_KEY } from '../../utils/TimeOff/ptoTabs';
import type { PtoTabPolicy } from '../../utils/TimeOff/ptoTabs';
import type { CalendarFilters, CalendarViewMode } from './types';
import { VIEW_OPTIONS } from './types';

type Props = {
  headerLabel: string;
  viewMode: CalendarViewMode;
  onViewModeChange: (nextViewMode: CalendarViewMode) => void;
  onShiftRange: (direction: 'prev' | 'next') => void;
  onGoToToday: () => void;
  // Sits ahead of the prev/Today/next group, where a per-page control belongs.
  navLeading?: React.ReactNode;
  categories?: EventCategory[];
  holidayTabs?: HolidayTab[];
  filters: CalendarFilters;
  hasUncategorizedEvents?: boolean;
  loading?: boolean;
  onToggleEventCategory: (categoryId: number | 'uncategorized') => void;
  onToggleCustomHolidayTab: (tabId: string | 'default') => void;
  onToggleObserved: () => void;
  // Merged in here rather than sitting in an otherwise empty band under the page title.
  pageControls?: React.ReactNode;
  defaultHolidayColor?: string;
  observedHolidayColor?: string;
  // Advanced Options only: flip whether a whole tab charges the PTO allowance.
  ptoTabPolicy?: PtoTabPolicy;
  onSetTabCharges?: (tabId: string, charges: boolean) => void;
};

const CalendarHeader = ({
  headerLabel,
  viewMode,
  onViewModeChange,
  onShiftRange,
  onGoToToday,
  navLeading,
  categories = [],
  holidayTabs = [],
  filters,
  hasUncategorizedEvents = false,
  loading = false,
  onToggleEventCategory,
  onToggleCustomHolidayTab,
  onToggleObserved,
  pageControls,
  defaultHolidayColor,
  observedHolidayColor,
  ptoTabPolicy,
  onSetTabCharges,
}: Props) => {
  const filterButtonClassName = (active: boolean) =>
    `inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors md:min-h-0 md:px-2.5 md:py-1 md:text-sm ${
      active
        ? 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 text-gray-700 dark:text-ink-100 shadow-sm hover:border-blue-200'
        : 'border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-ink-900 text-gray-400 dark:text-ink-500 hover:text-gray-500'
    } ${loading ? 'cursor-not-allowed opacity-60' : ''}`;

  // Kept open-aware: the trigger is hover-revealed, and losing it mid-interaction shuts the panel.
  const [openOptionsTab, setOpenOptionsTab] = useState<string | null>(null);

  const tabOptions = (tabId: string, tabName: string) => {
    if (!ptoTabPolicy || !onSetTabCharges) return null;
    const charges = ptoTabPolicy.chargingTabs.has(tabId);
    const open = openOptionsTab === tabId;
    return (
      <Popover
        open={open}
        onOpenChange={(next) => setOpenOptionsTab(next ? tabId : null)}
        trigger="click"
        placement="bottomLeft"
        overlayClassName="calendar-tab-options"
        content={
          <div className="w-full space-y-3 sm:w-64">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-500">
              {tabName}
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-700 dark:text-ink-100">
                  Counts against my PTO
                </span>
                <span className="block text-xs text-slate-500 dark:text-ink-400">
                  Applies to every day in this tab. A single day can still opt out.
                </span>
              </span>
              <Switch
                size="small"
                checked={charges}
                onChange={(next) => onSetTabCharges(tabId, next)}
                aria-label={`${tabName} charges PTO`}
              />
            </div>
          </div>
        }
      >
        <Tooltip title={open ? '' : `${tabName} options`}>
          <button
            type="button"
            disabled={loading}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`${tabName} options`}
            className={`size-11 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors dark:border-white/[0.08] dark:text-ink-500 md:size-6 md:hover:text-gray-600 md:dark:hover:text-ink-200 ${
              open
                ? 'inline-flex bg-white text-gray-600 dark:bg-ink-900 dark:text-ink-200'
                : 'inline-flex bg-gray-50 dark:bg-ink-900 md:hidden md:group-focus-within:inline-flex md:group-hover:inline-flex'
            } ${loading ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <MoreOutlined className="text-sm" />
          </button>
        </Tooltip>
      </Popover>
    );
  };

  const rangeButtonClassName =
    'inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 text-slate-600 dark:text-ink-200 transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-ink-800 hover:text-slate-900 dark:hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 sm:size-9';

  const navCluster = (
    <div
      className="flex items-center justify-end gap-1.5"
      role="group"
      aria-label="Calendar navigation"
    >
      {navLeading}
      <button
        type="button"
        onClick={() => onShiftRange('prev')}
        disabled={loading}
        aria-label="Previous calendar period"
        className={rangeButtonClassName}
      >
        <LeftOutlined className="text-sm" />
      </button>

      <button
        type="button"
        onClick={onGoToToday}
        disabled={loading}
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-3.5 text-sm font-medium text-slate-700 dark:text-ink-100 transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-ink-800 hover:text-slate-950 dark:hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:px-3"
      >
        Today
      </button>

      <button
        type="button"
        onClick={() => onShiftRange('next')}
        disabled={loading}
        aria-label="Next calendar period"
        className={rangeButtonClassName}
      >
        <RightOutlined className="text-sm" />
      </button>
    </div>
  );

  return (
    <div className="mb-4 flex flex-col gap-4 sm:mb-6 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-x-6 xl:gap-y-3">
      <div className="flex flex-col gap-3 xl:contents">
        <div className="flex items-center justify-between gap-2 xl:col-start-1 xl:row-start-1">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold text-slate-800 dark:text-ink-50 sm:text-xl">
            <CalendarOutlined className="text-lg text-slate-500 dark:text-ink-400" />
            {headerLabel}
          </h2>
          {/* Beside the label on a phone, where a calendar's month arrows are expected. */}
          <div className="shrink-0 xl:hidden">{navCluster}</div>
        </div>

        {/* One scrolling line at every width: wrapping pushed the grid down a row as tabs were added. */}
        <div className="calendar-legend-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 xl:col-start-1 xl:row-start-2">
          {categories.map((category) => {
            const categoryColor = getEventCategoryColor(category);
            const active = filters.eventCategoryIds.has(category.id);

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onToggleEventCategory(category.id)}
                disabled={loading}
                aria-pressed={active}
                className={filterButtonClassName(active)}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: active ? categoryColor.dot : '#d1d5db' }}
                />
                <span>{category.name}</span>
              </button>
            );
          })}

          {(categories.length === 0 || hasUncategorizedEvents) && (
            <button
              type="button"
              onClick={() => onToggleEventCategory('uncategorized')}
              disabled={loading}
              aria-pressed={filters.eventCategoryIds.has('uncategorized')}
              className={filterButtonClassName(filters.eventCategoryIds.has('uncategorized'))}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: filters.eventCategoryIds.has('uncategorized')
                    ? '#2563eb'
                    : '#d1d5db',
                }}
              />
              <span>Event</span>
            </button>
          )}

          <span className="group inline-flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleCustomHolidayTab('default')}
              disabled={loading}
              aria-pressed={filters.customHolidayTabs.has('default')}
              className={filterButtonClassName(filters.customHolidayTabs.has('default'))}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: filters.customHolidayTabs.has('default')
                    ? getHolidayTabColor(defaultHolidayColor).dot
                    : '#d1d5db',
                }}
              />
              <span>{UNTABBED_HOLIDAY_LABEL}</span>
            </button>
            {tabOptions(UNTABBED_KEY, UNTABBED_HOLIDAY_LABEL)}
          </span>

          {holidayTabs.map((tab) => {
            const tabColor = getHolidayTabColor(tab.color);
            const active = filters.customHolidayTabs.has(tab.id);

            return (
              <span className="group inline-flex shrink-0 items-center gap-1" key={tab.id}>
                <button
                  type="button"
                  onClick={() => onToggleCustomHolidayTab(tab.id)}
                  disabled={loading}
                  aria-pressed={active}
                  className={filterButtonClassName(active)}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: active ? tabColor.dot : '#d1d5db' }}
                  />
                  <span>{tab.name}</span>
                </button>
                {tabOptions(tab.id, tab.name)}
              </span>
            );
          })}

          <button
            type="button"
            onClick={onToggleObserved}
            disabled={loading}
            aria-pressed={filters.observed}
            className={filterButtonClassName(filters.observed)}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: filters.observed
                  ? getObservedHolidayColor(observedHolidayColor).dot
                  : '#d1d5db',
              }}
            />
            <span>Observed</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:items-end xl:contents">
        {/* Shares the view-mode line; three right-hand rows left a dead gap down the middle. */}
        <div className="calendar-header-controls flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end xl:col-start-2 xl:row-start-1">
          {pageControls}
          <div className="scrollbar-none -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <SegmentedToggle
              value={viewMode}
              onChange={onViewModeChange}
              wrapperClassName="w-max rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-1 shadow-sm"
              buttonClassName="px-3 py-1.5"
              options={VIEW_OPTIONS.map((option) => ({
                ...option,
                activeClassName: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300',
              }))}
            />
          </div>
        </div>

        <div className="hidden xl:col-start-2 xl:row-start-2 xl:flex xl:justify-end">
          {navCluster}
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
