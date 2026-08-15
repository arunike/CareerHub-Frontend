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
import { buildWeekSpans, isMultiDay, type WeekSpan } from './spanLayout';
import { eventSpanDays, eventTimeLabel } from './utils';
import { getEventColor } from '../../utils/eventCategoryColors';
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

// One continuous bar across however many day columns the span covers in this row. Drawn as
// a single element over the grid, so cell borders and padding cannot break it up.
const SpanBar = ({
  span,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  span: WeekSpan;
  onSelect?: (event: Event, day?: Date) => void;
  onDragStart?: (item: CalendarDragItem) => void;
  onDragEnd?: () => void;
}) => {
  const { event, startCol, endCol, lane, continuesLeft, continuesRight } = span;
  const color = getEventColor(event);
  const label = event.is_all_day ? event.name : `${event.start_time.substring(0, 5)} ${event.name}`;

  return (
    <Tooltip title={`${event.name} (${eventTimeLabel(event)} · ${eventSpanDays(event)} days)`}>
      <button
        type="button"
        draggable={Boolean(onDragStart) && canDragEvent(event)}
        onDragStart={(dragEvent) => {
          dragEvent.dataTransfer.effectAllowed = 'move';
          dragEvent.dataTransfer.setData('text/plain', String(event.id));
          onDragStart?.({ kind: 'event', event });
        }}
        onDragEnd={() => onDragEnd?.()}
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          onSelect?.(event);
        }}
        className={clsx(
          'pointer-events-auto mx-0.5 h-[18px] truncate px-1.5 text-left text-[11px] leading-[18px] transition-opacity hover:opacity-85',
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
        {continuesLeft ? `↳ ${event.name}` : label}
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
    const { spans, lanes } = buildWeekSpans(weekDays, weekEvents);

    for (let index = 0; index < 7; index++) {
      const cloneDay = day;
      const rawDayData = getDayData(cloneDay);
      // Multi-day events are drawn as bars over the row, so keep them out of the cell list.
      const dayData = {
        ...rawDayData,
        events: rawDayData.events.filter((event) => !isMultiDay(event)),
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
            'relative flex h-18 touch-manipulation cursor-pointer flex-col gap-1 border border-gray-100 p-1 transition-all [@media(hover:hover)]:hover:bg-gray-50 sm:h-28 sm:p-2 md:h-32',
            !isCurrentMonth && 'bg-gray-50/50 text-gray-400',
            // Both can be true; which class wins is stylesheet order, not this order.
            isTodayDate && !isSelected && 'bg-blue-50/30',
            // Square, grid-aligned: a rounded ring inside a hairline grid reads as a
            // sticker pasted over the cell, with the cell's own corners peeking out.
            isSelected && 'z-10 bg-blue-50 ring-1 ring-inset ring-blue-500',
            isDropCandidate && 'border-dashed border-blue-300',
            dropTarget === dayKey && 'z-10 bg-blue-100/70 ring-1 ring-inset ring-blue-500'
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
              // The button stays a full-width tap target on mobile; the circle lives on
              // the span inside, so `rounded-full` cannot stretch into a stadium.
              className="flex h-11 w-full min-w-11 shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-7 sm:w-7 sm:min-w-0"
            >
              <span
                className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium sm:text-sm',
                  isTodayDate
                    ? 'bg-blue-600 text-white'
                    : isSelected
                      ? 'bg-blue-100 font-semibold text-blue-700'
                      : 'text-gray-700'
                )}
              >
                {format(cloneDay, 'd')}
              </span>
            </button>
          </div>

          {/* Span bars are hidden below sm, so the mobile dots use the unfiltered day data
              or a multi-day event would render nowhere at all on a phone. */}
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
            // z-20 keeps the bars above the day cells. A selected cell is z-10 with an
            // opaque background, which otherwise paints over the start of the bar and
            // hides its title, leaving what looks like a blank stripe.
            className="pointer-events-none absolute inset-x-0 z-20 hidden grid-cols-7 gap-y-0.5 px-px sm:grid"
            // The day number occupies 9-37px of the cell, so bars start below it with a
            // small gap. 34 overlapped it by 3px, which only showed once the bars were
            // raised above the cell background.
            style={{ top: 40 }}
          >
            {spans.map((span) => (
              <SpanBar
                key={`${span.event.id}-${span.startCol}`}
                span={span}
                onSelect={onEventSelect}
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
          <div className="text-center font-medium text-gray-400 text-xs py-2" key={label}>
            {label}
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {rows}
      </div>
    </>
  );
};

export default CalendarMonthView;
