import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getEvents,
  getUnresolvedConflicts,
  resolveConflict,
  detectConflicts,
  getTasks,
  updateTask,
} from '../api';
import { getOffers } from '../api/career';
import { getUserSettings } from '../api/availability';
import {
  DEFAULT_REMINDER_SETTINGS,
  dismissUntil,
  dueReminders,
  pruneReminderState,
  readReminderState,
  reminderUrgency,
  resolveSettings,
  writeReminderState,
  type ReminderSettings,
  type ReminderState,
} from '../utils/eventReminders';
import { format, isAfter, compareAsc, addDays } from 'date-fns';
import { BellOutlined, CalendarOutlined, AlertOutlined, CheckOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import EventViewModal from '../pages/Events/components/EventViewModal';
import type { ConflictAlert, Event, Task } from '../types';
import ConfirmModal from './ConfirmModal';
import {
  DEADLINE_SNOOZE_KEY,
  buildOfferDeadlines,
  countdownLabel,
  buildTaskDeadlines,
  mergeDeadlines,
  type DeadlineItem,
} from './notificationDeadlines';
import { Button, Spin, message, notification } from 'antd';
import { type OfferDeadlineSource } from '../utils/offerDeadline';
import DueSoonSection from './DueSoonSection';
import DeadlineRadarSection from './DeadlineRadarSection';
import UpcomingEventRows from './UpcomingEventRows';

interface NotificationBellProps {
  placement?: 'bottom-right' | 'top-left';
}

// Beyond this an event is calendar business, not a notification.
const MAX_EVENT_DAYS = 14;
// Keyed by event date so dismissals clean themselves up instead of growing forever.
const EVENT_DISMISS_KEY = 'notification_dismissed_events';

const URGENCY_TONE = {
  today: {
    card: 'border-l-4 border-l-rose-500 !bg-rose-50',
    title: 'text-rose-700',
    icon: 'text-rose-600 text-lg',
  },
  tomorrow: {
    card: 'border-l-4 border-l-amber-500 !bg-amber-50',
    title: 'text-amber-700',
    icon: 'text-amber-600 text-lg',
  },
  soon: {
    card: 'border-l-4 border-l-blue-500 !bg-blue-50/70',
    title: 'text-blue-700',
    icon: 'text-blue-600 text-lg',
  },
} as const;

const TASKS_UPDATED_EVENT = 'careerhub:tasks-updated';
// Reopening the bell should not refetch.
const CACHE_TTL_MS = 3 * 60 * 1000;
let notificationCache: {
  at: number;
  events: Event[];
  conflicts: ConflictAlert[];
  tasks: Task[];
  offers: OfferDeadlineSource[];
} | null = null;

const NotificationBell: React.FC<NotificationBellProps> = ({ placement = 'bottom-right' }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [notificationApi, notificationHolder] = notification.useNotification();
  const [events, setEvents] = useState<Event[]>([]);
  const [conflicts, setConflicts] = useState<ConflictAlert[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const [dismissedEvents, setDismissedEvents] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(EVENT_DISMISS_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      const today = format(new Date(), 'yyyy-MM-dd');
      return Object.fromEntries(Object.entries(parsed).filter(([, date]) => date >= today));
    } catch {
      return {};
    }
  });

  const [snoozed, setSnoozed] = useState<Record<string, string>>(() => {
    const raw = localStorage.getItem(DEADLINE_SNOOZE_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return {};
    }
  });
  const [reminderSettings, setReminderSettings] =
    useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [reminderState, setReminderState] = useState<ReminderState>(() => readReminderState());
  // Toasts wait for this, or the first uses the default duration.
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const toastedRef = useRef<Set<number>>(new Set());

  const dropdownRef = useRef<HTMLDivElement>(null);
  // So fetchData can read it without depending on it.
  const snoozedRef = useRef(snoozed);
  useEffect(() => {
    snoozedRef.current = snoozed;
  }, [snoozed]);

  const fetchData = useCallback(
    async (options?: { force?: boolean }) => {
      const fresh =
        notificationCache && Date.now() - notificationCache.at < CACHE_TTL_MS && !options?.force;
      try {
        if (!fresh) setLoading(true);

        if (!fresh) {
          try {
            await detectConflicts();
          } catch (error) {
            console.error('Detection failed', error);
          }

          const [eventsResp, conflictsResp, tasksResp, offersResp] = await Promise.all([
            getEvents(),
            getUnresolvedConflicts(),
            getTasks(),
            getOffers().catch(() => ({ data: [] })),
          ]);
          notificationCache = {
            at: Date.now(),
            events: eventsResp.data as Event[],
            conflicts: conflictsResp.data as ConflictAlert[],
            tasks: tasksResp.data as Task[],
            offers: offersResp.data as OfferDeadlineSource[],
          };
        }

        const cached = notificationCache!;
        const allEvents = cached.events;
        const now = new Date();

        const horizon = addDays(now, MAX_EVENT_DAYS);
        const upcoming = allEvents
          .filter((e: Event) => {
            const eventStart = new Date(`${e.date}T${e.start_time}`);
            return isAfter(eventStart, now) && !isAfter(eventStart, horizon);
          })
          .sort((a: Event, b: Event) => {
            const dateA = new Date(`${a.date}T${a.start_time}`);
            const dateB = new Date(`${b.date}T${b.start_time}`);
            return compareAsc(dateA, dateB);
          })
          .slice(0, 5);

        setEvents(upcoming);
        setConflicts(cached.conflicts);
        setDeadlines(
          mergeDeadlines(
            buildTaskDeadlines(cached.tasks, snoozedRef.current),
            buildOfferDeadlines(cached.offers, snoozedRef.current)
          )
        );
      } catch (error) {
        messageApi.error('Failed to fetch data');
        console.error('Failed to fetch data', error);
      } finally {
        setLoading(false);
      }
      // Snooze is read through a ref so a dismissal cannot retrigger a fetch.
    },
    [messageApi]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const refreshOnTaskUpdate = () => {
      void fetchData({ force: true });
    };
    window.addEventListener(TASKS_UPDATED_EVENT, refreshOnTaskUpdate);
    return () => window.removeEventListener(TASKS_UPDATED_EVENT, refreshOnTaskUpdate);
  }, [fetchData, isOpen]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    void getUserSettings()
      .then((response) =>
        setReminderSettings(
          resolveSettings(response.data?.notification_preferences?.eventReminders)
        )
      )
      .catch(() => undefined)
      .finally(() => setSettingsLoaded(true));
  }, []);

  const visibleEvents = events.filter((event) => !dismissedEvents[String(event.id)]);

  const dismissEvent = (event: Event, clickEvent: React.MouseEvent) => {
    clickEvent.stopPropagation();
    clickEvent.preventDefault();
    setDismissedEvents((prev) => {
      const next = { ...prev, [String(event.id)]: event.date };
      localStorage.setItem(EVENT_DISMISS_KEY, JSON.stringify(next));
      return next;
    });
    messageApi.success('Dismissed');
  };

  const dueSoon = dueReminders(visibleEvents, reminderSettings, reminderState);
  const dueSoonIds = new Set(dueSoon.map((event) => event.id));
  const otherUpcoming = visibleEvents.filter((event) => !dueSoonIds.has(event.id));

  // Keyed on the ids, so this fires when the data lands, not on a new array.
  const dueSoonKey = dueSoon
    .map((event) => event.id)
    .sort((a, b) => a - b)
    .join(',');

  useEffect(() => {
    if (!dueSoonKey || !settingsLoaded) return;
    dueSoon.forEach((event) => {
      if (toastedRef.current.has(event.id)) return;
      toastedRef.current.add(event.id);
      const urgency = reminderUrgency(event.date);
      const tone = URGENCY_TONE[urgency];
      notificationApi.open({
        key: `event-${event.id}`,
        message: (
          <span className={`text-sm font-bold ${tone.title}`}>
            {countdownLabel(event.date)}
            {!event.is_all_day && ` · ${event.start_time.substring(0, 5)}`}
          </span>
        ),
        description: <span className="text-sm text-slate-700">{event.name}</span>,
        placement: 'topRight',
        // 0 tells antd to keep it up until dismissed.
        duration: reminderSettings.toastDurationSeconds || 0,
        className: `careerhub-reminder-toast ${tone.card}`,
        icon: <CalendarOutlined className={tone.icon} />,
        btn: (
          <div className="flex gap-2">
            <Button
              size="small"
              onClick={() => {
                setReminder(event.id, dismissUntil(reminderSettings));
                notificationApi.destroy(`event-${event.id}`);
              }}
            >
              Dismiss
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={() => {
                setViewingEvent(event);
                notificationApi.destroy(`event-${event.id}`);
              }}
            >
              View
            </Button>
          </div>
        ),
      });
    });
    // dueSoon is derived each render; the id list is what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueSoonKey, settingsLoaded]);

  const setReminder = (eventId: number, until: string) => {
    setReminderState((prev) => {
      const next = pruneReminderState({ ...prev, [String(eventId)]: until }, events);
      writeReminderState(next);
      return next;
    });
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleResolve = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setConfirmModal({
      isOpen: true,
      title: 'Resolve Conflict',
      message: 'Are you sure you want to mark this conflict as resolved?',
      onConfirm: async () => {
        try {
          await resolveConflict(id);
          setConflicts((prev) => prev.filter((c) => c.id !== id));
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          messageApi.success('Conflict resolved');
        } catch (error) {
          messageApi.error('Failed to resolve conflict');
          console.error(error);
        }
      },
    });
  };

  const snoozeDeadline = (deadlineId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const until = addDays(new Date(), 1).toISOString();
    setSnoozed((prev) => {
      const next = { ...prev, [deadlineId]: until };
      localStorage.setItem(DEADLINE_SNOOZE_KEY, JSON.stringify(next));
      return next;
    });
    setDeadlines((prev) => prev.filter((d) => d.id !== deadlineId));
    messageApi.success('Snoozed for 1 day');
  };

  const markTaskDone = async (taskId: number, deadlineId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await updateTask(taskId, { status: 'DONE' });
      setDeadlines((prev) => prev.filter((d) => d.id !== deadlineId));
      window.dispatchEvent(new Event(TASKS_UPDATED_EVENT));
      messageApi.success('Task marked done');
    } catch (error) {
      messageApi.error('Failed to mark task done');
      console.error(error);
    }
  };

  const hasDeadlines = deadlines.length > 0;
  const totalNotifications = visibleEvents.length + conflicts.length + deadlines.length;
  // Honest now the window is 14 days and every row can be dismissed.
  const needsAttention = totalNotifications > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 outline-none transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        aria-label="Open notifications"
        aria-expanded={isOpen}
      >
        {/* Keeps ringing until the list is empty, so something outstanding cannot be
            missed; every row has a Dismiss action to stop it. */}
        <BellOutlined className={`text-xl ${needsAttention ? 'careerhub-bell-alert' : ''}`} />
        {totalNotifications > 0 && (
          <span
            className={`absolute right-1.5 top-1 h-2 w-2 rounded-full ring-2 ring-white ${
              needsAttention ? 'careerhub-bell-dot-alert bg-red-600' : 'bg-red-500'
            }`}
          />
        )}
      </button>

      {contextHolder}
      {notificationHolder}

      {/* Read-only from here: editing and deleting belong on the Events page, which this
          links out to rather than duplicating those flows in the header. */}
      <EventViewModal
        event={viewingEvent}
        onClose={() => setViewingEvent(null)}
        onEdit={(event) => {
          setViewingEvent(null);
          setIsOpen(false);
          navigate(`/events?event=${event.id}`);
        }}
      />

      {isOpen && (
        <div
          className={`
            absolute z-50 w-[calc(100vw-1rem)] max-w-80 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_24px_72px_-46px_rgba(15,23,42,0.78)]
            ${
              placement === 'bottom-right'
                ? 'top-full right-0 mt-2 origin-top-right'
                : 'bottom-full left-0 mb-2 origin-bottom-left'
            }
          `}
        >
          <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-4 py-3">
            <h3 className="text-sm font-bold tracking-[-0.01em] text-slate-950">Notifications</h3>
            <Link
              to="/?view=calendar"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              onClick={() => setIsOpen(false)}
            >
              View Calendar
            </Link>
          </div>

          <div className="max-h-75 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-6 text-xs text-slate-400">
                <Spin size="small" />
                Checking your calendar…
              </div>
            ) : totalNotifications === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-600">No notifications</p>
                <p className="mt-1 text-xs text-slate-400">You're all clear</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {dueSoon.length > 0 && (
                  <DueSoonSection
                    reminderSettings={reminderSettings}
                    dismissEvent={dismissEvent}
                    dueSoon={dueSoon}
                    setReminder={setReminder}
                    setViewingEvent={setViewingEvent}
                  />
                )}

                {conflicts.length > 0 && (
                  <div className="bg-red-50/50">
                    <div className="px-3 py-2 text-xs font-bold text-red-800 uppercase tracking-wider flex items-center gap-2">
                      <AlertOutlined className="text-xs" />
                      Conflicts Detected
                    </div>
                    {conflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className="p-3 hover:bg-red-50 transition-colors relative group"
                      >
                        <div className="text-xs font-medium text-gray-900 mb-1">
                          Overlap Detected
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-gray-600 border-l-2 border-red-200 pl-2">
                          <div className="truncate">
                            {conflict.event1_details?.name || 'Unknown Event'}
                          </div>
                          <div className="text-red-400 font-bold text-[10px]">VS</div>
                          <div className="truncate">
                            {conflict.event2_details?.name || 'Unknown Event'}
                          </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => handleResolve(conflict.id, e)}
                            className="flex min-h-11 items-center gap-1 rounded border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-600 hover:text-white"
                          >
                            <CheckOutlined className="text-xs" />
                            Resolve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {hasDeadlines && (
                  <DeadlineRadarSection
                    deadlines={deadlines}
                    markTaskDone={markTaskDone}
                    setIsOpen={setIsOpen}
                    snoozeDeadline={snoozeDeadline}
                  />
                )}

                {otherUpcoming.length > 0 && (
                  <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    Upcoming
                  </div>
                )}
                <UpcomingEventRows
                  dismissEvent={dismissEvent}
                  otherUpcoming={otherUpcoming}
                  setViewingEvent={setViewingEvent}
                />
              </div>
            )}
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        type="info"
        confirmText="Resolve"
      />
    </div>
  );
};

export default NotificationBell;
