import { format } from 'date-fns';
import { Tooltip } from 'antd';
import type { CSSProperties, MouseEvent } from 'react';
import type { Event, Holiday } from '../../types';
import { getEventColor } from '../../utils/eventCategoryColors';
import {
  UNTABBED_HOLIDAY_LABEL,
  getFederalHolidayColor,
  getHolidayTabColor,
} from '../../utils/holidayTabColors';
import type { DayData } from './types';
import { eventTimeLabel, eventTimeRangeLabel, hasDayItems } from './utils';

type DayDataProps = {
  dayData: DayData;
  onEventSelect?: (event: Event, day?: Date) => void;
  onHolidaySelect?: (holiday: Holiday) => void;
  onViewMore?: () => void;
  onItemDragStart?: (item: CalendarDragItem) => void;
  onItemDragEnd?: () => void;
  day?: Date;
};

// What is being dragged between days, so the drop target can act on either kind.
export type CalendarDragItem =
  | { kind: 'event'; event: Event }
  | { kind: 'holiday'; holiday: Holiday };

// A locked event is deliberately pinned, and one occurrence of a series has no obvious
// meaning on its own, so neither can be dragged to another day.
export const canDragEvent = (event: Event) =>
  !event.is_locked && !event.is_recurring && !event.parent_event;

// Federal holidays are fixed calendar facts; only your own custom ones can move.
export const canDragHoliday = (holiday: Holiday) =>
  Boolean(holiday.id) &&
  holiday.holiday_type !== 'federal' &&
  !holiday.is_locked &&
  !holiday.is_recurring;

type DayTooltipProps = {
  day: Date;
  dayData: DayData;
};

export const CalendarDayTooltipContent = ({ day, dayData }: DayTooltipProps) => {
  if (!hasDayItems(dayData)) {
    return null;
  }

  return (
    <div className="space-y-1 text-xs">
      <div className="font-semibold text-white/95">{format(day, 'MMMM d, yyyy')}</div>
      {dayData.federalHolidays.map((holiday, index) => (
        <div key={`fed-${index}`}>Federal: {holiday.description}</div>
      ))}
      {dayData.customHolidays.map((holiday, index) => (
        // Same label as every other surface: the tab it belongs to, not a generic word.
        <div key={`cust-${index}`}>
          {holiday.tab_name || UNTABBED_HOLIDAY_LABEL}: {holiday.description}
        </div>
      ))}
      {dayData.events.map((event) => (
        <div key={event.id}>
          {eventTimeLabel(event)} {event.name}
        </div>
      ))}
    </div>
  );
};

const handleEventEntryClick = (
  event: Event,
  onEventSelect: ((event: Event, day?: Date) => void) | undefined,
  clickEvent: MouseEvent<HTMLElement>,
  day?: Date
) => {
  if (!onEventSelect) return;
  clickEvent.stopPropagation();
  // The clicked day matters for a multi-day span: it decides which day an edit targets.
  onEventSelect(event, day);
};

const handleHolidayEntryClick = (
  holiday: Holiday,
  onHolidaySelect: ((holiday: Holiday) => void) | undefined,
  clickEvent: MouseEvent<HTMLElement>
) => {
  if (!onHolidaySelect) return;
  clickEvent.stopPropagation();
  onHolidaySelect(holiday);
};

const getCompactItems = (dayData: DayData) => [
  ...dayData.federalHolidays.map((holiday, index) => ({
    kind: 'federal' as const,
    holiday,
    key: `fed-${index}-${holiday.description}`,
  })),
  ...dayData.customHolidays.map((holiday, index) => ({
    kind: 'custom' as const,
    holiday,
    key: `cust-${index}-${holiday.description}`,
  })),
  ...dayData.events.map((event) => ({
    kind: 'event' as const,
    event,
    key: `event-${event.id}`,
  })),
];

export const CalendarMobileDaySummary = ({ dayData }: Pick<DayDataProps, 'dayData'>) => {
  const compactItems = getCompactItems(dayData);

  if (compactItems.length === 0) return null;

  return (
    <div
      className="mt-auto flex items-center justify-center gap-1 pb-1 sm:hidden"
      aria-label={`${compactItems.length} calendar ${compactItems.length === 1 ? 'item' : 'items'}`}
    >
      {compactItems.slice(0, 3).map((item) => {
        const color =
          item.kind === 'event'
            ? getEventColor(item.event).dot
            : item.kind === 'custom'
              ? getHolidayTabColor(item.holiday.tab_color).dot
              : getFederalHolidayColor(item.holiday.tab_color).dot;

        return (
          <span
            key={item.key}
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        );
      })}
      {compactItems.length > 3 && (
        <span className="ml-0.5 text-[10px] font-semibold text-slate-500">
          +{compactItems.length - 3}
        </span>
      )}
    </div>
  );
};

export const CalendarCompactDayEntries = ({
  dayData,
  onEventSelect,
  onHolidaySelect,
  onViewMore,
  onItemDragStart,
  onItemDragEnd,
  day,
}: DayDataProps) => {
  const compactItems = getCompactItems(dayData);
  const visibleItems = compactItems.slice(0, 3);
  const hiddenCount = compactItems.length - visibleItems.length;

  return (
    <div className="flex-1 space-y-1 overflow-hidden text-xs mt-1">
      {visibleItems.map((item) => {
        if (item.kind === 'federal') {
          const { holiday } = item;

          return (
            <Tooltip
              key={item.key}
              title={`Observed Holiday: ${holiday.description}`}
              mouseEnterDelay={0}
            >
              <div className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded truncate">
                Federal: {holiday.description}
              </div>
            </Tooltip>
          );
        }

        if (item.kind === 'custom') {
          const { holiday } = item;
          const holidayColor = getHolidayTabColor(holiday.tab_color);

          return (
            <Tooltip
              key={item.key}
              title={`${holiday.tab_name || UNTABBED_HOLIDAY_LABEL}: ${holiday.description}`}
              mouseEnterDelay={0}
            >
              {onHolidaySelect ? (
                <button
                  type="button"
                  draggable={Boolean(onItemDragStart) && canDragHoliday(holiday)}
                  onDragStart={(dragEvent) => {
                    dragEvent.dataTransfer.effectAllowed = 'move';
                    dragEvent.dataTransfer.setData('text/plain', String(holiday.id));
                    onItemDragStart?.({ kind: 'holiday', holiday });
                  }}
                  onDragEnd={() => onItemDragEnd?.()}
                  onClick={(clickEvent) =>
                    handleHolidayEntryClick(holiday, onHolidaySelect, clickEvent)
                  }
                  className="block w-full rounded px-1.5 py-0.5 text-left font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
                  style={
                    {
                      backgroundColor: holidayColor.bg,
                      color: holidayColor.text,
                      '--tw-ring-color': holidayColor.border,
                    } as CSSProperties
                  }
                >
                  <span className="block truncate">{holiday.description}</span>
                </button>
              ) : (
                <div
                  className="truncate rounded px-1.5 py-0.5"
                  style={{
                    backgroundColor: holidayColor.bg,
                    color: holidayColor.text,
                  }}
                >
                  {holiday.description}
                </div>
              )}
            </Tooltip>
          );
        }

        const { event } = item;
        const eventColor = getEventColor(event);
        const titlePrefix = event.category_details?.name ? `${event.category_details.name}: ` : '';
        return (
          <Tooltip
            key={item.key}
            title={`${titlePrefix}${event.name} (${eventTimeLabel(event)})`}
            mouseEnterDelay={0}
          >
            <button
              type="button"
              draggable={Boolean(onItemDragStart) && canDragEvent(event)}
              onDragStart={(dragEvent) => {
                dragEvent.dataTransfer.effectAllowed = 'move';
                // Firefox ignores a drag that sets no data.
                dragEvent.dataTransfer.setData('text/plain', String(event.id));
                onItemDragStart?.({ kind: 'event', event });
              }}
              onDragEnd={() => onItemDragEnd?.()}
              onClick={(clickEvent) => handleEventEntryClick(event, onEventSelect, clickEvent, day)}
              className="block w-full rounded border px-1.5 py-0.5 text-left font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
              style={
                {
                  backgroundColor: eventColor.bg,
                  borderColor: eventColor.border,
                  color: eventColor.text,
                  '--tw-ring-color': eventColor.focusRing,
                } as CSSProperties
              }
              onMouseEnter={(mouseEvent) => {
                mouseEvent.currentTarget.style.backgroundColor = eventColor.hoverBg;
              }}
              onMouseLeave={(mouseEvent) => {
                mouseEvent.currentTarget.style.backgroundColor = eventColor.bg;
              }}
            >
              <span className="block truncate">
                {eventTimeLabel(event)} {event.name}
              </span>
            </button>
          </Tooltip>
        );
      })}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            onViewMore?.();
          }}
          className="w-full rounded border border-gray-200 bg-white/85 px-1.5 py-0.5 text-left font-medium text-gray-500 transition-colors hover:border-blue-200 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          View {hiddenCount} more
        </button>
      )}
    </div>
  );
};

export const CalendarDayAgendaEntries = ({
  dayData,
  onEventSelect,
  onHolidaySelect,
  day,
}: DayDataProps) => {
  if (!hasDayItems(dayData)) {
    return <div className="text-sm text-gray-400 italic">No events or time off scheduled.</div>;
  }

  return (
    <div className="space-y-2">
      {dayData.federalHolidays.map((holiday, index) => (
        <div
          key={`fed-${index}-${holiday.description}`}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Observed Holiday
          </div>
          <div className="mt-1">{holiday.description}</div>
        </div>
      ))}

      {dayData.customHolidays.map((holiday, index) => {
        const holidayColor = getHolidayTabColor(holiday.tab_color);
        const content = (
          <>
            <div className="text-xs font-semibold uppercase tracking-wide opacity-75">
              {holiday.tab_name || UNTABBED_HOLIDAY_LABEL}
            </div>
            <div className="mt-1">
              {holiday.description}
              {holiday.is_recurring ? ' (Yearly)' : ''}
            </div>
          </>
        );

        return onHolidaySelect ? (
          <button
            type="button"
            key={`cust-${index}-${holiday.description}`}
            onClick={(clickEvent) => handleHolidayEntryClick(holiday, onHolidaySelect, clickEvent)}
            className="block w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
            style={
              {
                borderColor: holidayColor.border,
                backgroundColor: holidayColor.bg,
                color: holidayColor.text,
                '--tw-ring-color': holidayColor.border,
              } as CSSProperties
            }
          >
            {content}
          </button>
        ) : (
          <div
            key={`cust-${index}-${holiday.description}`}
            className="rounded-xl border px-3 py-2 text-sm"
            style={{
              borderColor: holidayColor.border,
              backgroundColor: holidayColor.bg,
              color: holidayColor.text,
            }}
          >
            {content}
          </div>
        );
      })}

      {dayData.events.map((event) => {
        const eventColor = getEventColor(event);

        return (
          <button
            type="button"
            key={event.id}
            onClick={(clickEvent) => handleEventEntryClick(event, onEventSelect, clickEvent, day)}
            className="block w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
            style={
              {
                backgroundColor: eventColor.bg,
                borderColor: eventColor.border,
                color: eventColor.text,
                '--tw-ring-color': eventColor.focusRing,
              } as CSSProperties
            }
            onMouseEnter={(mouseEvent) => {
              mouseEvent.currentTarget.style.backgroundColor = eventColor.hoverBg;
            }}
            onMouseLeave={(mouseEvent) => {
              mouseEvent.currentTarget.style.backgroundColor = eventColor.bg;
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="rounded px-1.5 py-0.5 font-mono text-xs"
                style={{ backgroundColor: eventColor.hoverBg, color: eventColor.text }}
              >
                {eventTimeRangeLabel(event)}
              </span>
              <span className="font-medium">{event.name}</span>
              {event.category_details && (
                <span className="text-xs opacity-75">{event.category_details.name}</span>
              )}
            </div>
            {event.location_type === 'virtual' && event.meeting_link && (
              <div className="mt-1 text-xs opacity-80">Virtual meeting</div>
            )}
            {event.location_type !== 'virtual' && event.location && (
              <div className="mt-1 text-xs opacity-80">{event.location}</div>
            )}
          </button>
        );
      })}
    </div>
  );
};
