import { format } from 'date-fns';
import { Tooltip } from 'antd';
import type { CSSProperties, MouseEvent } from 'react';
import type { Event, Holiday } from '../../types';
import { getEventColor } from '../../utils/eventCategoryColors';
import { getHolidayTabColor } from '../../utils/holidayTabColors';
import type { DayData } from './types';
import { hasDayItems } from './utils';

type DayDataProps = {
  dayData: DayData;
  onEventSelect?: (event: Event) => void;
  onHolidaySelect?: (holiday: Holiday) => void;
  onViewMore?: () => void;
};

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
        <div key={`cust-${index}`}>Holiday: {holiday.description}</div>
      ))}
      {dayData.events.map((event) => (
        <div key={event.id}>
          {event.start_time.substring(0, 5)} {event.name}
        </div>
      ))}
    </div>
  );
};

const handleEventEntryClick = (
  event: Event,
  onEventSelect: ((event: Event) => void) | undefined,
  clickEvent: MouseEvent<HTMLElement>
) => {
  if (!onEventSelect) return;
  clickEvent.stopPropagation();
  onEventSelect(event);
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

export const CalendarCompactDayEntries = ({
  dayData,
  onEventSelect,
  onHolidaySelect,
  onViewMore,
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
              title={`Federal Holiday: ${holiday.description}`}
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
              title={`${holiday.tab_name || 'My Holiday'}: ${holiday.description}`}
              mouseEnterDelay={0}
            >
              {onHolidaySelect ? (
                <button
                  type="button"
                  onClick={(clickEvent) =>
                    handleHolidayEntryClick(holiday, onHolidaySelect, clickEvent)
                  }
                  className="block w-full rounded px-1.5 py-0.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
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
            title={`${titlePrefix}${event.name} (${event.start_time.substring(0, 5)})`}
            mouseEnterDelay={0}
          >
            <button
              type="button"
              onClick={(clickEvent) => handleEventEntryClick(event, onEventSelect, clickEvent)}
              className="block w-full rounded border px-1.5 py-0.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
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
                {event.start_time.substring(0, 5)} {event.name}
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
}: DayDataProps) => {
  if (!hasDayItems(dayData)) {
    return <div className="text-sm text-gray-400 italic">No events or holidays scheduled.</div>;
  }

  return (
    <div className="space-y-2">
      {dayData.federalHolidays.map((holiday, index) => (
        <div
          key={`fed-${index}-${holiday.description}`}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Federal Holiday
          </div>
          <div className="mt-1">{holiday.description}</div>
        </div>
      ))}

      {dayData.customHolidays.map((holiday, index) => {
        const holidayColor = getHolidayTabColor(holiday.tab_color);
        const content = (
          <>
            <div className="text-xs font-semibold uppercase tracking-wide opacity-75">
              {holiday.tab_name || 'My Holiday'}
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
            onClick={(clickEvent) => handleEventEntryClick(event, onEventSelect, clickEvent)}
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
                {event.start_time.substring(0, 5)} - {event.end_time.substring(0, 5)}
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
