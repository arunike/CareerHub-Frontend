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
    `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors md:text-sm ${
      active
        ? 'border-gray-200 bg-white text-gray-700 shadow-sm hover:border-blue-200'
        : 'border-gray-200 bg-gray-50 text-gray-400 hover:text-gray-500'
    } ${loading ? 'cursor-not-allowed opacity-60' : ''}`;

  return (
    <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarOutlined className="text-xl text-blue-600" />
            {headerLabel}
          </h2>

          <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-1 py-1 shadow-sm">
            <button
              type="button"
              onClick={() => onShiftRange('prev')}
              disabled={loading}
              className="rounded-full p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LeftOutlined className="text-base text-gray-600" />
            </button>
            <button
              type="button"
              onClick={() => onShiftRange('next')}
              disabled={loading}
              className="rounded-full p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RightOutlined className="text-base text-gray-600" />
            </button>
          </div>

          <button
            type="button"
            onClick={onGoToToday}
            disabled={loading}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Today
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
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

      <div className="overflow-x-auto pb-1">
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
