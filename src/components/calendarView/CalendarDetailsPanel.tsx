import { format } from 'date-fns';
import { ClockCircleOutlined } from '@ant-design/icons';
import { hasDayItems } from './utils';
import type { DayData } from './types';

type Props = {
  selectedDate: Date;
  dayData: DayData;
};

const CalendarDetailsPanel = ({ selectedDate, dayData }: Props) => {
  return (
    <div className="mt-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
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
            {dayData.customHolidays.map((holiday, index) => (
              <div
                key={`selected-cust-${index}-${holiday.description}`}
                className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg border border-green-100"
              >
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="font-medium">My Holiday:</span> {holiday.description}{' '}
                {holiday.is_recurring && '(Yearly)'}
              </div>
            ))}
            {dayData.events.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="font-mono text-blue-600 bg-blue-100 px-1 rounded">
                  {event.start_time.substring(0, 5)} - {event.end_time.substring(0, 5)}
                </span>
                <span className="font-medium">{event.name}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default CalendarDetailsPanel;
