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
  daysUntil,
  dismissUntil,
  dueReminders,
  urgentReminders,
  pruneReminderState,
  readReminderState,
  reminderUrgency,
  resolveSettings,
  writeReminderState,
  type ReminderSettings,
  type ReminderState,
} from '../utils/eventReminders';
import {
  format,
  parseISO,
  isAfter,
  isToday,
  isTomorrow,
  compareAsc,
  differenceInCalendarDays,
  startOfDay,
  addDays,
} from 'date-fns';
import {
  BellOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  CheckOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import EventViewModal from '../pages/Events/components/EventViewModal';
import type { ConflictAlert, Event, Task } from '../types';
import ConfirmModal from './ConfirmModal';
import { Button, Spin, message, notification } from 'antd';
import {
  getDeadlineStatus,
  isDecisionSettled,
  type OfferDeadlineSource,
} from '../utils/offerDeadline';

interface NotificationBellProps {
  placement?: 'bottom-right' | 'top-left';
}

type DeadlinePriority = 'P0' | 'P1' | 'P2';

interface DeadlineItem {
  id: string;
  kind: 'task' | 'offer';
  // Only present for tasks, which are the only kind that can be marked done.
  taskId?: number;
  title: string;
  subtitle: string;
  linkTo: string;
  priority: DeadlinePriority;
  dueLabel: string;
  dueDate: Date;
}

const DEADLINE_SNOOZE_KEY = 'deadline_radar_snooze';
// Only surface deadlines inside this window.
const MAX_DEADLINE_DAYS = 7;

// Colour carries the urgency, so the card reads before the text does.
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

const countdownLabel = (date: string) => {
  const away = daysUntil(date, new Date());
  if (away < 0) return 'Past';
  if (away === 0) return 'Today';
  if (away === 1) return 'Tomorrow';
  return `In ${away} days`;
};

type RankedDeadline = DeadlineItem & { rank: number };
const TASKS_UPDATED_EVENT = 'careerhub:tasks-updated';
// Survives dropdown open/close and remounts; reopening the bell should not refetch.
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
  // Toasts wait for this, otherwise the first one uses the default duration and window.
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const toastedRef = useRef<Set<number>>(new Set());

  const dropdownRef = useRef<HTMLDivElement>(null);
  // Mirrors `snoozed` so fetchData can read it without depending on it.
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
            // A write, so it only runs when actually refreshing rather than on every open.
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

        const upcoming = allEvents
          .filter((e: Event) => {
            const eventStart = new Date(`${e.date}T${e.start_time}`);
            return isAfter(eventStart, now);
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
      // Snooze is read through a ref so dismissing something cannot retrigger a fetch.
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

  // Loaded up front so the badge is accurate before the bell is ever clicked.
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

  const dueSoon = dueReminders(events, reminderSettings, reminderState);
  // Dismissing today's popup must not calm the bell — the event is still days away.
  const urgent = urgentReminders(events, reminderSettings, reminderState);
  const dueSoonIds = new Set(dueSoon.map((event) => event.id));
  // Anything already shown under "Coming up" is not repeated under "Upcoming".
  const otherUpcoming = events.filter((event) => !dueSoonIds.has(event.id));

  // Keyed on the ids themselves, so this fires as soon as the data lands rather than
  // depending on a re-render producing a new array.
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

  const hasConflicts = conflicts.length > 0;
  const hasDeadlines = deadlines.length > 0;
  const totalNotifications = events.length + conflicts.length + deadlines.length;
  const needsAttention = urgent.length > 0 || hasConflicts || hasDeadlines;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 outline-none transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        aria-label="Open notifications"
        aria-expanded={isOpen}
      >
        {/* Rings only when something actually needs attention, not merely because
            future events exist — otherwise it would move almost all the time. */}
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
                              onClick={() => setReminder(event.id, dismissUntil(reminderSettings))}
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
                  <div className="bg-amber-50/40">
                    <div className="px-3 py-2 text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                      <FlagOutlined className="text-xs" />
                      Deadline Radar
                    </div>
                    {deadlines.map((deadline) => (
                      <div key={deadline.id} className="p-3 hover:bg-amber-50 transition-colors">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-gray-900 truncate">
                              {deadline.title}
                            </div>
                            <div className="text-[11px] text-gray-600 mt-1">
                              {deadline.subtitle}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap font-medium ${
                              deadline.priority === 'P0'
                                ? 'bg-red-100 text-red-700'
                                : deadline.priority === 'P1'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {deadline.dueLabel}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <Link
                            to={deadline.linkTo}
                            className="inline-flex min-h-11 items-center text-xs font-semibold text-blue-600 hover:text-blue-700"
                            onClick={() => setIsOpen(false)}
                          >
                            Open
                          </Link>
                          <div className="flex items-center gap-2">
                            {deadline.kind === 'task' && deadline.taskId != null && (
                              <button
                                type="button"
                                onClick={(e) => markTaskDone(deadline.taskId!, deadline.id, e)}
                                className="min-h-11 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-600 hover:text-white"
                              >
                                Done
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => snoozeDeadline(deadline.id, e)}
                              className="min-h-11 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                            >
                              Dismiss 1d
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {otherUpcoming.length > 0 && (
                  <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    Upcoming
                  </div>
                )}
                {otherUpcoming.map((event) => {
                  const eventDate = parseISO(event.date);
                  const timeLabel = format(new Date(`2000-01-01T${event.start_time}`), 'h:mm a');
                  let dayLabel = format(eventDate, 'MMM d');

                  if (isToday(eventDate)) dayLabel = 'Today';
                  if (isTomorrow(eventDate)) dayLabel = 'Tmrw';

                  return (
                    <button
                      type="button"
                      key={event.id}
                      onClick={() => setViewingEvent(event)}
                      className="block w-full p-3 text-left transition-colors hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-medium text-sm text-gray-900 line-clamp-1">
                          {event.name}
                        </span>
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
                        <span className="font-medium text-slate-600">
                          {countdownLabel(event.date)}
                        </span>
                        {event.category_details && (
                          <>
                            <span>•</span>
                            <span style={{ color: event.category_details.color }}>
                              {event.category_details.name}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
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

const buildTaskDeadlines = (tasks: Task[], snoozed: Record<string, string>): RankedDeadline[] => {
  const now = new Date();
  const maxDays = MAX_DEADLINE_DAYS;
  const items: RankedDeadline[] = [];

  const isVisible = (id: string) => {
    const until = snoozed[id];
    if (!until) return true;
    return new Date(until).getTime() <= now.getTime();
  };

  tasks.forEach((task) => {
    if (!task.due_date || task.status === 'DONE') return;
    const dueDate = parseISO(task.due_date);
    const diff = differenceInCalendarDays(startOfDay(dueDate), startOfDay(now));
    if (diff > maxDays) return;

    let priority: DeadlinePriority = 'P2';
    let rank = 2;
    let dueLabel = `${diff}d left`;

    if (diff <= 0) {
      priority = 'P0';
      rank = 0;
      dueLabel = diff < 0 ? 'Overdue' : 'Today';
    } else if (diff <= 3) {
      priority = 'P1';
      rank = 1;
      dueLabel = `${diff}d left`;
    }

    const id = `task-${task.id}`;
    if (!isVisible(id)) return;

    items.push({
      id,
      kind: 'task',
      taskId: task.id,
      title: task.title,
      subtitle: 'Action Item',
      linkTo: `/tasks?taskId=${task.id}&mode=view`,
      priority,
      dueLabel,
      dueDate,
      rank,
    });
  });

  return items;
};

const buildOfferDeadlines = (
  offers: OfferDeadlineSource[],
  snoozed: Record<string, string>
): RankedDeadline[] => {
  const now = new Date();
  const items: RankedDeadline[] = [];

  offers.forEach((offer) => {
    if (offer.id == null) return;
    if (isDecisionSettled(offer.final_decision_status)) return;

    const status = getDeadlineStatus(offer.deadline);
    if (!status || status.isExpired) return;
    if (status.daysRemaining > MAX_DEADLINE_DAYS) return;

    const id = `offer-${offer.id}`;
    const until = snoozed[id];
    if (until && new Date(until).getTime() > now.getTime()) return;

    const priority: DeadlinePriority =
      status.daysRemaining <= 0 ? 'P0' : status.daysRemaining <= 3 ? 'P1' : 'P2';

    items.push({
      id,
      kind: 'offer',
      title: offer.application_details?.company || `Offer #${offer.id}`,
      subtitle: 'Offer decision',
      linkTo: '/offers',
      priority,
      dueLabel: status.daysRemaining === 0 ? 'Today' : `${status.daysRemaining}d left`,
      dueDate: parseISO(status.date),
      rank: status.daysRemaining <= 0 ? 0 : status.daysRemaining <= 3 ? 1 : 2,
    });
  });

  return items;
};

const mergeDeadlines = (...groups: RankedDeadline[][]): DeadlineItem[] =>
  groups
    .flat()
    .sort((a, b) => a.rank - b.rank || compareAsc(a.dueDate, b.dueDate))
    .slice(0, 10)
    .map(({ rank: _rank, ...rest }) => rest);
