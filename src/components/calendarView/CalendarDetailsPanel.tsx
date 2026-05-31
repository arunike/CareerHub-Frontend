import { format } from 'date-fns';
import { ClockCircleOutlined } from '@ant-design/icons';
import type { Event } from '../../types';
import { getHolidayTabColor } from '../../utils/holidayTabColors';
import { hasDayItems } from './utils';
import type { DayData } from './types';

type Props = {
  selectedDate: Date;
  dayData: DayData;
  onEventSelect?: (event: Event) => void;
};

const CalendarDetailsPanel = ({ selectedDate, dayData, onEventSelect }: Props) => {
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

              return (
                <div
                  key={`selected-cust-${index}-${holiday.description}`}
                  className="flex items-center gap-2 rounded-lg border p-2 text-sm"
                  style={{
                    borderColor: tabColor.border,
                    backgroundColor: tabColor.bg,
                    color: tabColor.text,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tabColor.dot }}
                  ></span>
                  <span className="font-medium">{holiday.tab_name || 'My Holiday'}:</span>
                  {holiday.description} {holiday.is_recurring && '(Yearly)'}
                </div>
              );
            })}
            {dayData.events.map((event) => (
              <button
                type="button"
                key={event.id}
                onClick={() => onEventSelect?.(event)}
                className="flex w-full items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 p-2 text-left text-sm text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="font-mono text-blue-600 bg-blue-100 px-1 rounded">
                  {event.start_time.substring(0, 5)} - {event.end_time.substring(0, 5)}
                </span>
                <span className="font-medium">{event.name}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default CalendarDetailsPanel;
