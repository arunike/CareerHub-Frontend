import React, { useState, useEffect, useRef } from 'react';
import {
  getEvents,
  getUnresolvedConflicts,
  resolveConflict,
  detectConflicts,
  getTasks,
  updateTask,
} from '../api';
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
  ClockCircleOutlined,
  AlertOutlined,
  CheckOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { ConflictAlert, Event, Task } from '../types';
import ConfirmModal from './ConfirmModal';
import { message } from 'antd';

interface NotificationBellProps {
  placement?: 'bottom-right' | 'top-left';
}

type DeadlinePriority = 'P0' | 'P1' | 'P2';

interface DeadlineItem {
  id: string;
  taskId: number;
  title: string;
  priority: DeadlinePriority;
  dueLabel: string;
  dueDate: Date;
}

const DEADLINE_SNOOZE_KEY = 'deadline_radar_snooze';

const NotificationBell: React.FC<NotificationBellProps> = ({ placement = 'bottom-right' }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [events, setEvents] = useState<Event[]>([]);
  const [conflicts, setConflicts] = useState<ConflictAlert[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [snoozed, setSnoozed] = useState<Record<string, string>>(() => {
    const raw = localStorage.getItem(DEADLINE_SNOOZE_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return {};
    }
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      try {
        await detectConflicts();
      } catch (error) {
        messageApi.error('Detection failed');
        console.error('Detection failed', error);
      }

      const [eventsResp, conflictsResp, tasksResp] = await Promise.all([
        getEvents(),
        getUnresolvedConflicts(),
        getTasks(),
      ]);

      const allEvents = eventsResp.data;
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
      setConflicts(conflictsResp.data);
      setDeadlines(buildTaskDeadlines(tasksResp.data as Task[], snoozed));
    } catch (error) {
      messageApi.error('Failed to fetch data');
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
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
      messageApi.success('Task marked done');
    } catch (error) {
      messageApi.error('Failed to mark task done');
      console.error(error);
    }
  };

  const hasEvents = events.length > 0;
  const hasConflicts = conflicts.length > 0;
  const hasDeadlines = deadlines.length > 0;
  const totalNotifications = events.length + conflicts.length + deadlines.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors outline-none focus:ring-2 focus:ring-blue-100"
      >
        <BellOutlined className="text-xl" />
        {totalNotifications > 0 && (
          <span
            className={`absolute top-1 right-1.5 w-2 h-2 rounded-full ring-2 ring-white ${hasConflicts || hasDeadlines ? 'bg-red-600 animate-pulse' : 'bg-red-500'}`}
          />
        )}
      </button>

      {contextHolder}

      {isOpen && (
        <div
          className={`
            absolute w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100
            ${
              placement === 'bottom-right'
                ? 'top-full right-0 mt-2 origin-top-right'
                : 'bottom-full left-0 mb-2 origin-bottom-left'
            }
          `}
        >
          <div className="px-4 py-3 border-b border-gray-50 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-sm text-gray-900">Notifications</h3>
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
              <div className="p-4 text-center text-xs text-gray-400">Loading...</div>
            ) : totalNotifications === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">No notifications</p>
                <p className="text-xs text-gray-400 mt-1">You're all clear!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
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
                        <div className="text-xs font-medium text-gray-900 mb-1">Overlap Detected</div>
                        <div className="flex flex-col gap-1 text-xs text-gray-600 border-l-2 border-red-200 pl-2">
                          <div className="truncate">{conflict.event1_details?.name || 'Unknown Event'}</div>
                          <div className="text-red-400 font-bold text-[10px]">VS</div>
                          <div className="truncate">{conflict.event2_details?.name || 'Unknown Event'}</div>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={(e) => handleResolve(conflict.id, e)}
                            className="text-[10px] bg-white border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-600 hover:text-white transition-colors flex items-center gap-1 shadow-sm"
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
                      Deadline Radar (Tasks)
                    </div>
                    {deadlines.map((deadline) => (
                      <div key={deadline.id} className="p-3 hover:bg-amber-50 transition-colors">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-gray-900 truncate">{deadline.title}</div>
                            <div className="text-[11px] text-gray-600 mt-1">Action Item</div>
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
                            to="/tasks"
                            className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                            onClick={() => setIsOpen(false)}
                          >
                            Open
                          </Link>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => markTaskDone(deadline.taskId, deadline.id, e)}
                              className="text-[10px] bg-green-50 border border-green-200 text-green-700 px-2 py-1 rounded hover:bg-green-600 hover:text-white transition-colors"
                            >
                              Done
                            </button>
                            <button
                              onClick={(e) => snoozeDeadline(deadline.id, e)}
                              className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                            >
                              Snooze 1d
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {hasEvents && (
                  <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    Upcoming
                  </div>
                )}
                {events.map((event) => {
                  const eventDate = parseISO(event.date);
                  const timeLabel = format(new Date(`2000-01-01T${event.start_time}`), 'h:mm a');
                  let dayLabel = format(eventDate, 'MMM d');

                  if (isToday(eventDate)) dayLabel = 'Today';
                  if (isTomorrow(eventDate)) dayLabel = 'Tmrw';

                  return (
                    <div key={event.id} className="p-3 hover:bg-gray-50 transition-colors">
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
                        {event.category_details && (
                          <>
                            <span>•</span>
                            <span style={{ color: event.category_details.color }}>
                              {event.category_details.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
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

const buildTaskDeadlines = (tasks: Task[], snoozed: Record<string, string>): DeadlineItem[] => {
  const now = new Date();
  const maxDays = 7;
  const items: Array<DeadlineItem & { rank: number }> = [];

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
      taskId: task.id,
      title: task.title,
      priority,
      dueLabel,
      dueDate,
      rank,
    });
  });

  return items
    .sort((a, b) => a.rank - b.rank || compareAsc(a.dueDate, b.dueDate))
    .slice(0, 10)
    .map(({ rank, ...rest }) => rest);
};
