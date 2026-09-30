import type { ComponentProps, ReactNode } from 'react';

import CalendarView from './CalendarView';
import CalendarViewControls from './CalendarViewControls';
import type { CalendarContentView } from './CalendarViewControls';

type CalendarProps = Omit<ComponentProps<typeof CalendarView>, 'pageControls'>;

export type CalendarWorkspaceProps = CalendarProps & {
  contentView: CalendarContentView;
  onContentViewChange: (next: CalendarContentView) => void;
  selectedYear: number | 'all';
  onYearChange: (year: number | 'all') => void;
  availableYears: number[];
  // Shown under the same toolbar when the list is selected.
  listView: ReactNode;
  // A control only one page needs, such as the Events timezone picker.
  extraControls?: ReactNode;
};

// The toolbar and the list/calendar switch together, so a page only supplies its own list.
const CalendarWorkspace = ({
  contentView,
  onContentViewChange,
  selectedYear,
  onYearChange,
  availableYears,
  listView,
  extraControls,
  ...calendar
}: CalendarWorkspaceProps) => {
  const controls = (
    <CalendarViewControls
      contentView={contentView}
      onContentViewChange={onContentViewChange}
      selectedYear={selectedYear}
      onYearChange={onYearChange}
      availableYears={availableYears}
    >
      {extraControls}
    </CalendarViewControls>
  );

  if (contentView === 'list') {
    return (
      <>
        <div className="mb-3 flex flex-wrap items-center gap-2">{controls}</div>
        {listView}
      </>
    );
  }

  return <CalendarView {...calendar} pageControls={controls} />;
};

export default CalendarWorkspace;
