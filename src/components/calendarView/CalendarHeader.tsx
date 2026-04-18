import {
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import SegmentedToggle from '../SegmentedToggle';
import type { CalendarViewMode } from './types';
import { VIEW_OPTIONS } from './types';

type Props = {
  headerLabel: string;
  viewMode: CalendarViewMode;
  onViewModeChange: (nextViewMode: CalendarViewMode) => void;
  onShiftRange: (direction: 'prev' | 'next') => void;
  onGoToToday: () => void;
};

const CalendarHeader = ({
  headerLabel,
  viewMode,
  onViewModeChange,
  onShiftRange,
  onGoToToday,
}: Props) => {
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
              className="rounded-full p-2 transition-colors hover:bg-gray-100"
            >
              <LeftOutlined className="text-base text-gray-600" />
            </button>
            <button
              type="button"
              onClick={() => onShiftRange('next')}
              className="rounded-full p-2 transition-colors hover:bg-gray-100"
            >
              <RightOutlined className="text-base text-gray-600" />
            </button>
          </div>

          <button
            type="button"
            onClick={onGoToToday}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-blue-200 hover:text-blue-700"
          >
            Today
          </button>
        </div>

        <div className="flex flex-wrap gap-3 text-xs md:text-sm">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Event</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span>My Holiday</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
            <span>Federal</span>
          </div>
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
