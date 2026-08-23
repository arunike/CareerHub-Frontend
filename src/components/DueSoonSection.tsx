import type { ReminderSettings } from '../utils/eventReminders';
import type React from 'react';
import { daysUntil, dismissUntil } from '../utils/eventReminders';
import type { Event } from '../types';

type Props = {
  reminderSettings: ReminderSettings;
  dismissEvent: (event: Event, clickEvent: React.MouseEvent) => void;
  dueSoon: Event[];
  setReminder: (eventId: number, until: string) => void;
  setViewingEvent: React.Dispatch<React.SetStateAction<Event | null>>;
};

const DueSoonSection = ({
  dismissEvent,
  dueSoon,
  setReminder,
  setViewingEvent,
  reminderSettings,
}: Props) => (
  <div className="bg-amber-50/50">
    <p className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">
      Coming up
    </p>
    {dueSoon.map((event) => {
      const away = daysUntil(event.date, new Date());
      return (
        <div key={`due-${event.id}`} className="px-4 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              className="min-w-0 text-left"
              onClick={() => setViewingEvent(event)}
            >
              <p className="truncate text-sm font-medium text-slate-900 hover:text-blue-700">
                {event.name}
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                {away === 0 ? 'Today' : away === 1 ? 'Tomorrow' : `In ${away} days`}
                {!event.is_all_day && ` · ${event.start_time.substring(0, 5)}`}
              </p>
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <button
              type="button"
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              onClick={(clickEvent) => {
                // Clear the entry too, or the bell keeps ringing after a dismiss.
                setReminder(event.id, dismissUntil(reminderSettings));
                dismissEvent(event, clickEvent);
              }}
            >
              Dismiss
            </button>
            {reminderSettings.allowForeverIgnore && (
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-600"
                onClick={() => setReminder(event.id, 'forever')}
              >
                Never remind me
              </button>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

export default DueSoonSection;
