import { compareAsc, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import type { Task } from '../types';
import { daysUntil } from '../utils/eventReminders';
import {
  getDeadlineStatus,
  isDecisionSettled,
  type OfferDeadlineSource,
} from '../utils/offerDeadline';

export type DeadlinePriority = 'P0' | 'P1' | 'P2';

export interface DeadlineItem {
  id: string;
  kind: 'task' | 'offer';
  // Tasks only: nothing else can be marked done.
  taskId?: number;
  title: string;
  subtitle: string;
  linkTo: string;
  priority: DeadlinePriority;
  dueLabel: string;
  dueDate: Date;
}

export type RankedDeadline = DeadlineItem & { rank: number };

export const countdownLabel = (date: string) => {
  const away = daysUntil(date, new Date());
  if (away < 0) return 'Past';
  if (away === 0) return 'Today';
  if (away === 1) return 'Tomorrow';
  return `In ${away} days`;
};

export const DEADLINE_SNOOZE_KEY = 'deadline_radar_snooze';
export const MAX_DEADLINE_DAYS = 7;

export const buildTaskDeadlines = (
  tasks: Task[],
  snoozed: Record<string, string>
): RankedDeadline[] => {
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

export const buildOfferDeadlines = (
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

export const mergeDeadlines = (...groups: RankedDeadline[][]): DeadlineItem[] =>
  groups
    .flat()
    .sort((a, b) => a.rank - b.rank || compareAsc(a.dueDate, b.dueDate))
    .slice(0, 10)
    .map(({ rank: _rank, ...rest }) => rest);
