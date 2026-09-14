import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useState } from 'react';
import clsx from 'clsx';
import { Tooltip } from 'antd';
import {
  CalendarCompactDayEntries,
  CalendarMobileDaySummary,
  canDragEvent,
} from './CalendarDayContent';
import type { CalendarDragItem } from './CalendarDayContent';
import {
  buildWeekSpans,
  eventSpanCandidates,
  holidayGroupCandidates,
  isMultiDay,
  type WeekSpan,
} from './spanLayout';
import { eventSpanDays, eventTimeLabel } from './utils';
import { getEventColor } from '../../utils/eventCategoryColors';
import { UNTABBED_HOLIDAY_LABEL, getHolidayTabColor } from '../../utils/holidayTabColors';
import type { Event, Holiday } from '../../types';
import type { GetDayData } from './types';
import { WEEKDAY_LABELS } from './types';
import useCalendarDoubleTap from './useCalendarDoubleTap';

type Props = {
  anchorDate: Date;
  today: Date;
  selectedDate: Date;
  onDateSelect: (day: Date) => void;
  onDateDoubleClick?: (day: Date) => void;
  onViewMore?: (day: Date) => void;
  onEventSelect?: (event: Event, day?: Date) => void;
  onHolidaySelect?: (holiday: Holiday) => void;
  onItemDrop?: (item: CalendarDragItem, day: Date) => void;
  getDayData: GetDayData;
};

// One element drawn over the grid, so cell borders and padding cannot break the bar up.
const SpanBar = ({
  span,
  onSelect,
  onHolidaySelect,
  onDragStart,
  onDragEnd,
}: {
  span: WeekSpan;
  onSelect?: (event: Event, day?: Date) => void;
  onHolidaySelect?: (holiday: Holiday) => void;
  onDragStart?: (item: CalendarDragItem) => void;
  onDragEnd?: () => void;
}) => {
  const { subject, startCol, endCol, lane, continuesLeft, continuesRight } = span;
  const isEvent = subject.kind === 'event';
  const event = isEvent ? subject.event : null;
  const group = isEvent ? null : subject.group;
  const color = event ? getEventColor(event) : getHolidayTabColor(group!.holiday.tab_color);
  const name = event ? event.name : group!.holiday.description;
  const label = !event || event.is_all_day ? name : `${event.start_time.substring(0, 5)} ${name}`;
  const tooltip = event
    ? `${name} (${eventTimeLabel(event)} · ${eventSpanDays(event)} days)`
    : `${group!.holiday.tab_name || UNTABBED_HOLIDAY_LABEL}: ${name} · ${group!.days} days`;
  // Moving one day of a grouped span has no unambiguous meaning, so only events drag.
  const draggable = Boolean(onDragStart) && Boolean(event) && canDragEvent(event!);

  return (
    <Tooltip title={tooltip}>
      <button
        type="button"
        draggable={draggable}
        onDragStart={(dragEvent) => {
          if (!event) return;
          dragEvent.dataTransfer.effectAllowed = 'move';
          dragEvent.dataTransfer.setData('text/plain', String(event.id));
          onDragStart?.({ kind: 'event', event });
        }}
        onDragEnd={() => onDragEnd?.()}
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          if (event) onSelect?.(event);
          else onHolidaySelect?.(group!.holiday);
        }}
        className={clsx(
          'pointer-events-auto mx-0.5 h-[18px] truncate px-1.5 text-left text-[11px] font-medium leading-[18px] transition-opacity hover:opacity-85',
          continuesLeft ? 'rounded-l-none' : 'rounded-l',
          continuesRight ? 'rounded-r-none' : 'rounded-r'
        )}
        style={{
          gridColumn: `${startCol + 1} / ${endCol + 2}`,
          gridRow: lane + 1,
          backgroundColor: color.bg,
          color: color.text,
          borderLeft: continuesLeft ? 'none' : `1px solid ${color.border}`,
          borderRight: continuesRight ? 'none' : `1px solid ${color.border}`,
          borderTop: `1px solid ${color.border}`,
          borderBottom: `1px solid ${color.border}`,
        }}
      >
        {/* Only the true start names it; a continuation shows an arrow instead. */}
        {continuesLeft ? `↳ ${name}` : label}
      </button>
    </Tooltip>
  );
};

const CalendarMonthView = ({
  anchorDate,
  today,
  selectedDate,
  onDateSelect,
  onDateDoubleClick,
  onViewMore,
  onEventSelect,
  onHolidaySelect,
  onItemDrop,
  getDayData,
}: Props) => {
  const handlePointerUp = useCalendarDoubleTap(onDateDoubleClick);
  const [dragging, setDragging] = useState<CalendarDragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const rows = [];
  let days = [];
  let weekDays: Date[] = [];
  let weekEvents: Event[] = [];
  let day = gridStart;

  const gridHolidays: Holiday[] = [];
  for (let probe = gridStart; probe <= gridEnd; probe = addDays(probe, 1)) {
    gridHolidays.push(...getDayData(probe).customHolidays);
  }
  const holidayCandidates = holidayGroupCandidates(gridHolidays);
  // Keyed by date, not group: a lone day left over from a split trip is still its own chip.
  const spannedHolidayDates = new Set(
    holidayCandidates.flatMap((candidate) =>
      candidate.subject.kind === 'holiday' ? candidate.subject.group.dates : []
    )
  );

  while (day <= gridEnd) {
    weekDays = [];
    weekEvents = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const probe = addDays(day, offset);
      weekDays.push(probe);
      for (const event of getDayData(probe).events) {
        if (isMultiDay(event) && !weekEvents.some((seen) => seen.id === event.id)) {
          weekEvents.push(event);
        }
      }
    }
    const { spans, lanes } = buildWeekSpans(weekDays, [
      ...eventSpanCandidates(weekEvents),
      ...holidayCandidates,
    ]);

    for (let index = 0; index < 7; index++) {
      const cloneDay = day;
      const rawDayData = getDayData(cloneDay);
      // Multi-day events are drawn as bars over the row, so keep them out of the cell list.
      const dayData = {
        ...rawDayData,
        events: rawDayData.events.filter((event) => !isMultiDay(event)),
        customHolidays: rawDayData.customHolidays.filter(
          (holiday) => !spannedHolidayDates.has(holiday.date)
        ),
      };
      const isTodayDate = isSameDay(cloneDay, today);
      const isSelected = isSameDay(cloneDay, selectedDate);
      const isCurrentMonth = isSameMonth(cloneDay, monthStart);

      const dayKey = cloneDay.toDateString();
      // Dropping an event back on the day it already sits on is a no-op, so do not invite it.
      const draggingDate =
        dragging && (dragging.kind === 'event' ? dragging.event.date : dragging.holiday.date);
      const isDropCandidate =
        Boolean(dragging) && !isSameDay(cloneDay, new Date(`${draggingDate}T00:00:00`));

      days.push(
        <div
          key={cloneDay.toString()}
          className={clsx(
            'relative flex h-18 touch-manipulation cursor-pointer flex-col gap-1 border border-gray-100 dark:border-white/[0.07] p-1 transition-all [@media(hover:hover)]:hover:bg-gray-50 sm:h-28 sm:p-2 md:h-32',
            !isCurrentMonth && 'bg-gray-50/50 dark:bg-ink-900/50 text-gray-400 dark:text-ink-500',
            // Both can be true; which class wins is stylesheet order, not this order.
            isTodayDate && !isSelected && 'bg-blue-50/30 dark:bg-blue-500/10',
            // Square: a rounded ring in a hairline grid reads as a sticker over the cell.
            isSelected && 'z-10 bg-blue-50 dark:bg-blue-500/10 ring-1 ring-inset ring-blue-500',
            isDropCandidate && 'border-dashed border-blue-300 dark:border-blue-500/30',
            dropTarget === dayKey &&
              'z-10 bg-blue-100/70 dark:bg-blue-500/10 ring-1 ring-inset ring-blue-500'
          )}
          onClick={() => onDateSelect(cloneDay)}
          onDoubleClick={() => onDateDoubleClick?.(cloneDay)}
          onPointerUp={(pointerEvent) => handlePointerUp(pointerEvent, cloneDay)}
          onDragOver={(dragEvent) => {
            if (!isDropCandidate) return;
            // Without preventDefault the browser refuses the drop outright.
            dragEvent.preventDefault();
            dragEvent.dataTransfer.dropEffect = 'move';
            if (dropTarget !== dayKey) setDropTarget(dayKey);
          }}
          onDragLeave={() => setDropTarget((current) => (current === dayKey ? null : current))}
          onDrop={(dragEvent) => {
            dragEvent.preventDefault();
            const dropped = dragging;
            setDropTarget(null);
            setDragging(null);
            if (dropped && isDropCandidate) onItemDrop?.(dropped, cloneDay);
          }}
        >
          <div className="-mx-1 -mt-1 flex items-start justify-between sm:m-0">
            <button
              type="button"
              aria-label={format(cloneDay, 'MMMM d, yyyy')}
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                onDateSelect(cloneDay);
              }}
              // The circle is on the inner span, so rounded-full cannot stretch into a stadium.
              className="flex h-11 w-full min-w-11 shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-7 sm:w-7 sm:min-w-0"
            >
              <span
                className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium sm:text-sm',
                  isTodayDate
                    ? 'bg-blue-600 text-white'
                    : isSelected
                      ? 'bg-blue-100 dark:bg-blue-500/15 font-semibold text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-ink-100'
                )}
              >
                {format(cloneDay, 'd')}
              </span>
            </button>
          </div>

          {/* Uses unfiltered day data: span bars are hidden below sm, so a multi-day event would vanish. */}
          <CalendarMobileDaySummary dayData={rawDayData} />
          {lanes > 0 && <div className="hidden shrink-0 sm:block" style={{ height: lanes * 20 }} />}
          <div className="hidden min-h-0 flex-1 sm:flex">
            <CalendarCompactDayEntries
              dayData={dayData}
              onEventSelect={onEventSelect}
              onHolidaySelect={onHolidaySelect}
              day={cloneDay}
              onViewMore={() => onViewMore?.(cloneDay)}
              onItemDragStart={onItemDrop ? setDragging : undefined}
              onItemDragEnd={() => {
                setDragging(null);
                setDropTarget(null);
              }}
            />
          </div>
        </div>
      );
      day = addDays(day, 1);
    }

    rows.push(
      <div className="relative" key={day.toString()}>
        <div className="grid grid-cols-7">{days}</div>
        {spans.length > 0 && (
          <div
            // Above the day cells: a selected cell is z-10 and opaque, so it would paint over the bar.
            className="pointer-events-none absolute inset-x-0 z-20 hidden grid-cols-7 gap-y-0.5 px-px sm:grid"
            // The day number occupies 9-37px, so bars start below it.
            style={{ top: 40 }}
          >
            {spans.map((span) => (
              <SpanBar
                key={`${span.id}-${span.startCol}`}
                span={span}
                onSelect={onEventSelect}
                onHolidaySelect={onHolidaySelect}
                onDragStart={onItemDrop ? setDragging : undefined}
                onDragEnd={() => {
                  setDragging(null);
                  setDropTarget(null);
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
    days = [];
  }

  return (
    <>
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAY_LABELS.map((label) => (
          <div
            className="text-center font-medium text-gray-400 dark:text-ink-500 text-xs py-2"
            key={label}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-ink-900 rounded-xl border border-gray-200 dark:border-white/[0.08] overflow-hidden shadow-sm">
        {rows}
      </div>
    </>
  );
};

export default CalendarMonthView;
