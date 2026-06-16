import { format } from 'date-fns';
import { Tooltip } from 'antd';
import type { CSSProperties, MouseEvent } from 'react';
import type { Event } from '../../types';
import { getEventColor } from '../../utils/eventCategoryColors';
import { getHolidayTabColor } from '../../utils/holidayTabColors';
import type { DayData } from './types';
import { hasDayItems } from './utils';

type DayDataProps = {
  dayData: DayData;
  onEventSelect?: (event: Event) => void;
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

export const CalendarCompactDayEntries = ({ dayData, onEventSelect }: DayDataProps) => (
  <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar text-xs mt-1">
    {dayData.federalHolidays.map((holiday, index) => (
      <Tooltip
        key={`fed-${index}-${holiday.description}`}
        title={`Federal Holiday: ${holiday.description}`}
        mouseEnterDelay={0}
      >
        <div className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded truncate">
          Federal: {holiday.description}
        </div>
      </Tooltip>
    ))}

    {dayData.customHolidays.map((holiday, index) => (
      <Tooltip
        key={`cust-${index}-${holiday.description}`}
        title={`${holiday.tab_name || 'My Holiday'}: ${holiday.description}`}
        mouseEnterDelay={0}
      >
        <div
          className="px-1.5 py-0.5 rounded truncate"
          style={{
            backgroundColor: getHolidayTabColor(holiday.tab_color).bg,
            color: getHolidayTabColor(holiday.tab_color).text,
          }}
        >
          ★ {holiday.description}
        </div>
      </Tooltip>
    ))}

    {dayData.events.map((event) => {
      const eventColor = getEventColor(event);
      const titlePrefix = event.category_details?.name ? `${event.category_details.name}: ` : '';

      return (
        <Tooltip
          key={event.id}
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
  </div>
);

export const CalendarDayAgendaEntries = ({ dayData, onEventSelect }: DayDataProps) => {
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

      {dayData.customHolidays.map((holiday, index) => (
        <div
          key={`cust-${index}-${holiday.description}`}
          className="rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: getHolidayTabColor(holiday.tab_color).border,
            backgroundColor: getHolidayTabColor(holiday.tab_color).bg,
            color: getHolidayTabColor(holiday.tab_color).text,
          }}
        >
          <div className="text-xs font-semibold uppercase tracking-wide opacity-75">
            {holiday.tab_name || 'My Holiday'}
          </div>
          <div className="mt-1">
            {holiday.description}
            {holiday.is_recurring ? ' (Yearly)' : ''}
          </div>
        </div>
      ))}

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
