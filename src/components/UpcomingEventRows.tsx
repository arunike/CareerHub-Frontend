import { countdownLabel } from './notificationDeadlines';
import type React from 'react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { CloseOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { Event } from '../types';
import { getPaletteColor } from '../utils/colorPalette';

type Props = {
  dismissEvent: (event: Event, clickEvent: React.MouseEvent) => void;
  otherUpcoming: Event[];
  setViewingEvent: React.Dispatch<React.SetStateAction<Event | null>>;
};

const UpcomingEventRows = ({ dismissEvent, otherUpcoming, setViewingEvent }: Props) => (
  <>
    {otherUpcoming.map((event) => {
      const eventDate = parseISO(event.date);
      const timeLabel = format(new Date(`2000-01-01T${event.start_time}`), 'h:mm a');
      let dayLabel = format(eventDate, 'MMM d');

      if (isToday(eventDate)) dayLabel = 'Today';
      if (isTomorrow(eventDate)) dayLabel = 'Tmrw';

      return (
        <div key={event.id} className="group relative">
          <button
            type="button"
            onClick={(clickEvent) => dismissEvent(event, clickEvent)}
            aria-label={`Dismiss ${event.name}`}
            title="Dismiss"
            // Always visible: a hover-only control is unreachable on a touch screen.
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <CloseOutlined className="text-[11px]" />
          </button>
          <button
            type="button"
            onClick={() => setViewingEvent(event)}
            className="block w-full p-3 pr-10 text-left transition-colors hover:bg-gray-50"
          >
            <div className="flex justify-between items-start gap-2">
              <span className="font-medium text-sm text-gray-900 line-clamp-1">{event.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                  isToday(eventDate)
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {dayLabel}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
              <ClockCircleOutlined className="text-xs" />
              <span>{timeLabel}</span>
              <span>•</span>
              <span className="font-medium text-slate-600">{countdownLabel(event.date)}</span>
              {event.category_details && (
                <>
                  <span>•</span>
                  {/* The raw category colour is often too light to read here. */}
                  <span
                    style={{
                      color: getPaletteColor(event.category_details.color).text,
                    }}
                  >
                    {event.category_details.name}
                  </span>
                </>
              )}
            </div>
          </button>
        </div>
      );
    })}
  </>
);

export default UpcomingEventRows;
