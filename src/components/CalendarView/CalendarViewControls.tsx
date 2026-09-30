import type { ReactNode } from 'react';

import SegmentedToggle from '../inputs/SegmentedToggle';
import YearFilter from '../inputs/YearFilter';

export type CalendarContentView = 'list' | 'calendar';

const ACTIVE_CLASS = 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300';

type Props = {
  contentView: CalendarContentView;
  onContentViewChange: (next: CalendarContentView) => void;
  selectedYear: number | 'all';
  onYearChange: (year: number | 'all') => void;
  availableYears: number[];
  // A control only one page needs, such as the Events timezone picker.
  children?: ReactNode;
};

// The list/calendar switch and year picker every calendar page shows, in one place.
const CalendarViewControls = ({
  contentView,
  onContentViewChange,
  selectedYear,
  onYearChange,
  availableYears,
  children,
}: Props) => (
  <>
    <SegmentedToggle
      value={contentView}
      onChange={onContentViewChange}
      wrapperClassName="page-toolbar-view-switch w-max rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-1"
      buttonClassName="px-3 py-1.5"
      options={[
        { value: 'list', label: 'List', activeClassName: ACTIVE_CLASS },
        { value: 'calendar', label: 'Calendar', activeClassName: ACTIVE_CLASS },
      ]}
    />
    <YearFilter
      selectedYear={selectedYear}
      onYearChange={onYearChange}
      availableYears={availableYears}
      className="toolbar-select"
    />
    {children}
  </>
);

export default CalendarViewControls;
