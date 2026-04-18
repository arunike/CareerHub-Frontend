import { format } from 'date-fns';
import { Tooltip } from 'antd';
import type { DayData } from './types';
import { hasDayItems } from './utils';

type DayDataProps = {
  dayData: DayData;
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

export const CalendarCompactDayEntries = ({ dayData }: DayDataProps) => (
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
        title={`My Holiday: ${holiday.description}`}
        mouseEnterDelay={0}
      >
        <div className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded truncate">
          ★ {holiday.description}
        </div>
      </Tooltip>
    ))}

    {dayData.events.map((event) => (
      <Tooltip
        key={event.id}
        title={`${event.name} (${event.start_time.substring(0, 5)})`}
        mouseEnterDelay={0}
      >
        <div className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded truncate">
          {event.start_time.substring(0, 5)} {event.name}
        </div>
      </Tooltip>
    ))}
  </div>
);

export const CalendarDayAgendaEntries = ({ dayData }: DayDataProps) => {
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
          className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-green-500">
            My Holiday
          </div>
          <div className="mt-1">
            {holiday.description}
            {holiday.is_recurring ? ' (Yearly)' : ''}
          </div>
        </div>
      ))}

      {dayData.events.map((event) => (
        <div
          key={event.id}
          className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800"
        >
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs text-blue-700">
              {event.start_time.substring(0, 5)} - {event.end_time.substring(0, 5)}
            </span>
            <span className="font-medium">{event.name}</span>
          </div>
          {event.location_type === 'virtual' && event.meeting_link && (
            <div className="mt-1 text-xs text-blue-600">Virtual meeting</div>
          )}
          {event.location_type !== 'virtual' && event.location && (
            <div className="mt-1 text-xs text-blue-600">{event.location}</div>
          )}
        </div>
      ))}
    </div>
  );
};
