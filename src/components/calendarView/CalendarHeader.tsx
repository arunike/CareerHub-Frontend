import { CalendarOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { EventCategory, HolidayTab } from '../../types';
import { getEventCategoryColor } from '../../utils/eventCategoryColors';
import { getHolidayTabColor } from '../../utils/holidayTabColors';
import SegmentedToggle from '../SegmentedToggle';
import type { CalendarFilters, CalendarViewMode } from './types';
import { VIEW_OPTIONS } from './types';

type Props = {
  headerLabel: string;
  viewMode: CalendarViewMode;
  onViewModeChange: (nextViewMode: CalendarViewMode) => void;
  onShiftRange: (direction: 'prev' | 'next') => void;
  onGoToToday: () => void;
  categories?: EventCategory[];
  holidayTabs?: HolidayTab[];
  filters: CalendarFilters;
  hasUncategorizedEvents?: boolean;
  loading?: boolean;
  onToggleEventCategory: (categoryId: number | 'uncategorized') => void;
  onToggleCustomHolidayTab: (tabId: string | 'default') => void;
  onToggleFederal: () => void;
};

const CalendarHeader = ({
  headerLabel,
  viewMode,
  onViewModeChange,
  onShiftRange,
  onGoToToday,
  categories = [],
  holidayTabs = [],
  filters,
  hasUncategorizedEvents = false,
  loading = false,
  onToggleEventCategory,
  onToggleCustomHolidayTab,
  onToggleFederal,
}: Props) => {
  const filterButtonClassName = (active: boolean) =>
    `inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors md:min-h-0 md:px-2.5 md:py-1 md:text-sm ${
      active
        ? 'border-gray-200 bg-white text-gray-700 shadow-sm hover:border-blue-200'
        : 'border-gray-200 bg-gray-50 text-gray-400 hover:text-gray-500'
    } ${loading ? 'cursor-not-allowed opacity-60' : ''}`;

  const rangeButtonClassName =
    'inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 sm:size-9';

  return (
    <div className="mb-4 flex flex-col gap-4 sm:mb-6 xl:flex-row xl:items-start xl:justify-between">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h2 className="mr-auto flex min-w-0 items-center gap-2 text-lg font-semibold text-slate-800 sm:text-xl">
            <CalendarOutlined className="text-lg text-slate-500" />
            {headerLabel}
          </h2>

          <div className="flex items-center gap-1.5" role="group" aria-label="Calendar navigation">
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
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:px-3"
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
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
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
                backgroundColor: filters.customHolidayTabs.has('default') ? '#22c55e' : '#d1d5db',
              }}
            />
            <span>My Holiday</span>
          </button>

          {holidayTabs.map((tab) => {
            const tabColor = getHolidayTabColor(tab.color);
            const active = filters.customHolidayTabs.has(tab.id);

            return (
              <button
                key={tab.id}
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
            );
          })}

          <button
            type="button"
            onClick={onToggleFederal}
            disabled={loading}
            aria-pressed={filters.federal}
            className={filterButtonClassName(filters.federal)}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: filters.federal ? '#9ca3af' : '#d1d5db' }}
            />
            <span>Federal</span>
          </button>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <SegmentedToggle
          value={viewMode}
          onChange={onViewModeChange}
          wrapperClassName="w-max rounded-xl border border-gray-200 bg-white p-1 shadow-sm"
          buttonClassName="px-3 py-2"
          options={VIEW_OPTIONS.map((option) => ({
            ...option,
            activeClassName: 'bg-blue-50 text-blue-700',
          }))}
        />
      </div>
    </div>
  );
};

export default CalendarHeader;
