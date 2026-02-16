import React, { useState, useEffect } from 'react';
import { getEvents } from '../api';
import { format, parseISO, isAfter, isToday, isTomorrow, compareAsc } from 'date-fns';
import { ClockCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { Event } from '../types';

const UpcomingEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const resp = await getEvents();
      const allEvents = resp.data;
      const now = new Date();

      // Filter for future events and sort by date/time
      const upcoming = allEvents
        .filter((e: Event) => {
          // Combine date and time for comparison
          const eventStart = new Date(`${e.date}T${e.start_time}`);
          return isAfter(eventStart, now);
        })
        .sort((a: Event, b: Event) => {
          const dateA = new Date(`${a.date}T${a.start_time}`);
          const dateB = new Date(`${b.date}T${b.start_time}`);
          return compareAsc(dateA, dateB);
        })
        .slice(0, 3); // Take next 3

      setEvents(upcoming);
    } catch (err) {
      console.error('Failed to fetch upcoming events', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null; // Or skeleton

  if (events.length === 0) {
    return (
      <div className="mt-6 px-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Upcoming
        </h3>
        <p className="text-sm text-gray-500 italic">No upcoming events.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 px-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upcoming</h3>
        <Link to="/events" className="text-xs text-blue-600 hover:text-blue-800">
          View all
        </Link>
      </div>

      <div className="space-y-3">
        {events.map((event) => {
          const eventDate = parseISO(event.date);
          let dateLabel = format(eventDate, 'MMM d');
          if (isToday(eventDate)) dateLabel = 'Today';
          if (isTomorrow(eventDate)) dateLabel = 'Tomorrow';

          return (
            <div
              key={event.id}
              className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="font-medium text-sm text-gray-900 truncate" title={event.name}>
                {event.name}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <div
                  className={`text-xs px-1.5 py-0.5 rounded ${isToday(eventDate) ? 'bg-green-100 text-green-700 font-medium' : 'bg-white text-gray-500 border border-gray-200'}`}
                >
                  {dateLabel}
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <ClockCircleOutlined className="text-xs mr-1" />
                  {format(new Date(`2000-01-01T${event.start_time}`), 'h:mm a')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingEvents;
