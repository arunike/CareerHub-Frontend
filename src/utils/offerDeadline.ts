import dayjs from 'dayjs';

export const DEADLINE_WARNING_DAYS = 7;

export type DeadlineTone = 'expired' | 'critical' | 'warning' | 'calm';

export interface DeadlineStatus {
  date: string;
  // Whole days from today. Negative once the deadline has passed.
  daysRemaining: number;
  tone: DeadlineTone;
  label: string;
  isExpired: boolean;
  isUrgent: boolean;
}

export const getDeadlineStatus = (
  deadline: string | null | undefined,
  now: dayjs.Dayjs = dayjs()
): DeadlineStatus | null => {
  if (!deadline) return null;
  const parsed = dayjs(deadline);
  if (!parsed.isValid()) return null;

  const daysRemaining = parsed.startOf('day').diff(now.startOf('day'), 'day');

  if (daysRemaining < 0) {
    const overdue = Math.abs(daysRemaining);
    return {
      date: deadline,
      daysRemaining,
      tone: 'expired',
      label: `Expired ${overdue} day${overdue === 1 ? '' : 's'} ago`,
      isExpired: true,
      isUrgent: false,
    };
  }

  if (daysRemaining === 0) {
    return {
      date: deadline,
      daysRemaining,
      tone: 'critical',
      label: 'Expires today',
      isExpired: false,
      isUrgent: true,
    };
  }

  const tone: DeadlineTone =
    daysRemaining <= 2 ? 'critical' : daysRemaining <= DEADLINE_WARNING_DAYS ? 'warning' : 'calm';

  return {
    date: deadline,
    daysRemaining,
    tone,
    label: `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`,
    isExpired: false,
    isUrgent: daysRemaining <= DEADLINE_WARNING_DAYS,
  };
};

export const DEADLINE_TONE_CLASSES: Record<DeadlineTone, string> = {
  expired:
    'border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-ink-800 text-slate-500 dark:text-ink-400',
  critical:
    'border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300',
  warning:
    'border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300',
  calm: 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 text-slate-600 dark:text-ink-200',
};

// The offer shape the notification bell needs to render a countdown.
export interface OfferDeadlineSource {
  id?: number;
  deadline?: string | null;
  final_decision_status?: string;
  application_details?: { company?: string };
}

const SETTLED_DECISION_STATUSES = ['ACCEPTED', 'REJECTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'];

export const isDecisionSettled = (value: unknown) =>
  typeof value === 'string' && SETTLED_DECISION_STATUSES.includes(value);
