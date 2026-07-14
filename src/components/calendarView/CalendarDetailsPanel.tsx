import { format } from 'date-fns';
import { ClockCircleOutlined } from '@ant-design/icons';
import type { CSSProperties } from 'react';
import type { Event, Holiday } from '../../types';
import { getEventColor } from '../../utils/eventCategoryColors';
import { getHolidayTabColor } from '../../utils/holidayTabColors';
import { hasDayItems } from './utils';
import type { DayData } from './types';

type Props = {
  selectedDate: Date;
  dayData: DayData;
  onEventSelect?: (event: Event) => void;
  onHolidaySelect?: (holiday: Holiday) => void;
};

const CalendarDetailsPanel = ({ selectedDate, dayData, onEventSelect, onHolidaySelect }: Props) => {
  return (
    <div className="enterprise-section mt-4 p-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <ClockCircleOutlined className="text-base text-blue-500 mr-2" />
        Details for {format(selectedDate, 'MMMM d, yyyy')}
      </h3>
      <div className="space-y-2">
        {!hasDayItems(dayData) ? (
          <div className="text-gray-400 text-sm italic">No events or holidays scheduled.</div>
        ) : (
          <>
            {dayData.federalHolidays.map((holiday, index) => (
              <div
                key={`selected-fed-${index}-${holiday.description}`}
                className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100"
              >
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                <span className="font-medium">Federal Holiday:</span> {holiday.description}
              </div>
            ))}
            {dayData.customHolidays.map((holiday, index) => {
              const tabColor = getHolidayTabColor(holiday.tab_color);
              const content = (
                <>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tabColor.dot }}
                  ></span>
                  <span className="font-medium">{holiday.tab_name || 'My Holiday'}:</span>
                  {holiday.description} {holiday.is_recurring && '(Yearly)'}
                </>
              );

              return onHolidaySelect ? (
                <button
                  type="button"
                  key={`selected-cust-${index}-${holiday.description}`}
                  onClick={() => onHolidaySelect?.(holiday)}
                  className="flex w-full items-center gap-2 rounded-lg border p-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
                  style={
                    {
                      borderColor: tabColor.border,
                      backgroundColor: tabColor.bg,
                      color: tabColor.text,
                      '--tw-ring-color': tabColor.border,
                    } as CSSProperties
                  }
                >
                  {content}
                </button>
              ) : (
                <div
                  key={`selected-cust-${index}-${holiday.description}`}
                  className="flex items-center gap-2 rounded-lg border p-2 text-sm"
                  style={{
                    borderColor: tabColor.border,
                    backgroundColor: tabColor.bg,
                    color: tabColor.text,
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
                  onClick={() => onEventSelect?.(event)}
                  className="flex w-full items-center gap-2 rounded-lg border p-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
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
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: eventColor.dot }}
                  ></span>
                  <span
                    className="rounded px-1 font-mono"
                    style={{ backgroundColor: eventColor.hoverBg, color: eventColor.text }}
                  >
                    {event.start_time.substring(0, 5)} - {event.end_time.substring(0, 5)}
                  </span>
                  {event.category_details && (
                    <span className="font-medium">{event.category_details.name}:</span>
                  )}
                  <span className="font-medium">{event.name}</span>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default CalendarDetailsPanel;
